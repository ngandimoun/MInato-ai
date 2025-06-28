import OpenAI from "openai";
import { logger } from "@/memory-framework/config";
import { 
  XmlNluAnalysis, 
  ChatMessage, 
  UserState,
  PredefinedPersona, 
  UserPersona,
  XmlToolRanking
} from "@/lib/types";
import { appConfig, injectPromptVariables } from "../config";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import { summarizeUserState } from "./helpers";
import { generateStructuredJson } from "../providers/llm_clients";
import { stripSystemPrefixes } from "./helpers";
import { featureFlags } from "../config";

const NLU_DISAMBIGUATION_PROMPT = `
<nlu_disambiguation>
  <user_query>{{USER_QUERY}}</user_query>
  <conversation_history>
{{CONVERSATION_HISTORY}}
  </conversation_history>
  <user_profile>
{{USER_PROFILE}}
  </user_profile>
  
  <instruction>
    Analyze the user's query to disambiguate any references, resolve co-references, and extract the true intent.
    Focus on the following:
    
    1. Entity Recognition & Linking: Identify named entities (people, places, objects, dates) and link them to known concepts or previous mentions.
    2. Co-reference Resolution: Understand pronouns and references like "it", "that", "these", "those", etc.
    3. Ambiguity Resolution: When a query is vague, use context to determine the most likely meaning.
    4. Implicit Need Identification: Identify what the user needs but hasn't explicitly stated.
    
    Produce a detailed analysis in the following format:
  </instruction>
  
  <output_format>
    <nlu_analysis>
      <original_query>The exact user query</original_query>
      <disambiguated_query>The query with all references resolved</disambiguated_query>
      <entities>
        <entity>
          <name>Entity name</name>
          <type>person|place|object|date|concept|etc</type>
          <reference_type>direct|pronoun|demonstrative|implied</reference_type>
          <linked_to>Original entity if this is a reference</linked_to>
        </entity>
        <!-- Additional entities as needed -->
      </entities>
      <references>
        <reference>
          <expression>The reference expression (e.g., "it", "that", "these")</expression>
          <resolved_to>What the reference points to</resolved_to>
          <confidence>high|medium|low</confidence>
        </reference>
        <!-- Additional references as needed -->
      </references>
      <implicit_needs>
        <need>An implicit need identified from the query</need>
        <!-- Additional needs as needed -->
      </implicit_needs>
      <true_intent>The disambiguated intent behind the user's query</true_intent>
    </nlu_analysis>
  </output_format>
</nlu_disambiguation>
`;

const NLU_SYSTEM_PROMPT = `You are an expert Natural Language Understanding system. Your task is to analyze user queries in the context of a conversation history, resolving references and disambiguating intent.

Provide your analysis in a structured XML format that follows this pattern:

<nlu_analysis>
  <original_query>The exact user query</original_query>
  <disambiguated_query>The query with all references resolved clearly</disambiguated_query>
  <entities>
    <entity>
      <name>Entity name</name>
      <type>person|place|object|date|concept</type>
      <reference_type>direct|pronoun|demonstrative|implied</reference_type>
      <linked_to>What this entity refers to in the conversation history (if applicable)</linked_to>
    </entity>
    <!-- Additional entities as needed -->
  </entities>
  <references>
    <reference>
      <expression>The reference expression (e.g., "it", "that", "these")</expression>
      <resolved_to>What this reference actually means</resolved_to>
      <confidence>high|medium|low</confidence>
    </reference>
    <!-- Additional references as needed -->
  </references>
  <implicit_needs>
    <need>Any implicit need detected</need>
    <!-- Additional needs as needed -->
  </implicit_needs>
  <true_intent>A clear statement of what the user actually wants</true_intent>
</nlu_analysis>`;

/**
 * Formats conversation history for NLU context
 */
function formatHistoryForNLU(history: ChatMessage[], maxTurns: number = 5): string {
  const recentHistory = history.slice(-maxTurns * 2);
  let formattedHistory = "";
  
  for (const message of recentHistory) {
    const role = message.role === 'assistant' ? 'ASSISTANT' : 
                 message.role === 'user' ? 'USER' : 
                 message.role.toUpperCase();
    
    let content = "";
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      // Handle content parts
      const textParts = message.content
        .filter(part => part.type === 'text')
        .map(part => (part as any).text)
        .join(' ');
      
      const imageParts = message.content
        .filter(part => part.type === 'input_image')
        .map(_ => '[IMAGE]');
      
      content = [...textParts, ...imageParts].join(' ');
    }
    
    formattedHistory += `    <turn role="${role}">${content}</turn>\n`;
  }
  
  return formattedHistory;
}

/**
 * Formats user profile information for NLU context
 */
function formatUserProfileForNLU(userState: UserState | null): string {
  if (!userState) return "    <info>No user profile available</info>";
  
  const parts: string[] = [];
  
  if (userState.user_first_name) 
    parts.push(`    <info type="name">${userState.user_first_name}</info>`);
  
  if (userState.preferred_locale) 
    parts.push(`    <info type="locale">${userState.preferred_locale}</info>`);
  
  if (userState.timezone) 
    parts.push(`    <info type="timezone">${userState.timezone}</info>`);
  
  // Add persona traits if available
  if ((userState as any).active_persona_traits && Array.isArray((userState as any).active_persona_traits)) {
    const traits = (userState as any).active_persona_traits.join(', ');
    parts.push(`    <info type="persona_traits">${traits}</info>`);
  }
  
  return parts.join('\n') || "    <info>Basic user profile</info>";
}

/**
 * Analyzes a user query with NLU techniques to disambiguate references and extract intent
 */
export async function analyzeUserQuery(
  userQuery: string,
  history: ChatMessage[],
  userState: UserState | null,
  userId: string
): Promise<XmlNluAnalysis | null> {
  const logPrefix = `[NLU-Disambiguation] User:${userId.substring(0, 6)}`;
  
  try {
    // Don't process if the feature flag is turned off
    if (!featureFlags.useNluDisambiguation) {
      return null;
    }
    
    // Clean the user query
    const cleanQuery = stripSystemPrefixes(userQuery);
    
    // Skip NLU for very short or simple queries
    if (cleanQuery.length < 5 || /^(yes|no|ok|sure|thanks?|hi|hello)$/i.test(cleanQuery)) {
      logger.info(`${logPrefix} Skipping NLU for simple query: "${cleanQuery}"`);
      return null;
    }
    
    // Format the conversation history
    const formattedHistory = formatHistoryForNLU(history);
    
    // Format the user profile
    const formattedProfile = formatUserProfileForNLU(userState);
    
    // Prepare the prompt
    const prompt = NLU_DISAMBIGUATION_PROMPT
      .replace("{{USER_QUERY}}", cleanQuery)
      .replace("{{CONVERSATION_HISTORY}}", formattedHistory)
      .replace("{{USER_PROFILE}}", formattedProfile);
    
    logger.info(`${logPrefix} Running NLU analysis`);
    
    // Create a JSON schema for NLU analysis
    const nluSchema = {
      type: "object",
      properties: {
        original_query: { type: "string" },
        disambiguated_query: { type: "string" },
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              reference_type: { type: "string" },
              linked_to: { type: "string" }
            }
          }
        },
        references: {
          type: "array",
          items: {
            type: "object",
            properties: {
              expression: { type: "string" },
              resolved_to: { type: "string" },
              confidence: { type: "string" }
            }
          }
        },
        implicit_needs: {
          type: "array",
          items: { type: "string" }
        },
        true_intent: { type: "string" }
      },
      required: ["original_query", "disambiguated_query", "true_intent"]
    };

    // Call the LLM with structured JSON schema
    const nluResponse = await generateStructuredJson<XmlNluAnalysis>(
      NLU_SYSTEM_PROMPT,
      cleanQuery,
      nluSchema,
      "minato_nlu_disambiguation",
      history,
      (appConfig.openai.planningModel || "gpt-4o-mini"),
      userId
    );
    
    // Check the response
    if (nluResponse && typeof nluResponse === 'object' && !('error' in nluResponse)) {
      const analysis = nluResponse as XmlNluAnalysis;
      logger.info(`${logPrefix} NLU analysis successful, disambiguated query: "${analysis.disambiguated_query}"`);
      return analysis;
    } else if (nluResponse && typeof nluResponse === 'object' && 'error' in nluResponse) {
      logger.warn(`${logPrefix} NLU analysis failed: ${(nluResponse as any).error}`);
    } else {
      logger.warn(`${logPrefix} NLU analysis failed, unexpected response type: ${typeof nluResponse}`);
    }
    
    return null;
  } catch (error: any) {
    logger.error(`${logPrefix} NLU analysis error: ${error.message}`, error);
    return null;
  }
}

/**
 * Finds relevant past interactions in the conversation history based on references
 */
export function findReferencedInteractions(
  entities: XmlNluAnalysis['entities'], 
  history: ChatMessage[]
): ChatMessage[] {
  if (!entities || entities.length === 0 || !history || history.length === 0) {
    return [];
  }
  
  const relevantMessages: ChatMessage[] = [];
  const entityNames = entities.map(e => e.name.toLowerCase());
  const entityTypes = entities.map(e => e.type.toLowerCase());
  
  // Look for messages that might contain the referenced entities
  for (const message of history) {
    let content = '';
    
    if (typeof message.content === 'string') {
      content = message.content.toLowerCase();
    } else if (Array.isArray(message.content)) {
      const textParts = message.content
        .filter(part => part.type === 'text')
        .map(part => (part as any).text.toLowerCase());
      content = textParts.join(' ');
    }
    
    // Check if message contains any of the entity names
    const containsEntity = entityNames.some(entity => content.includes(entity));
    
    // Check for dates if we're looking for a date entity
    const isDateReference = entityTypes.includes('date') && 
      /\b(yesterday|today|tomorrow|last week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(content);
    
    if (containsEntity || isDateReference) {
      relevantMessages.push(message);
    }
  }
  
  return relevantMessages;
}

/**
 * Extracts key phrases from a disambiguated query that might be important for search or memory retrieval
 */
export function extractKeyPhrasesFromQuery(analysis: XmlNluAnalysis): string[] {
  const keyPhrases: string[] = [];
  
  // Add entities as key phrases
  if (analysis.entities && analysis.entities.length > 0) {
    for (const entity of analysis.entities) {
      if (entity.name && entity.name.trim()) {
        keyPhrases.push(entity.name.trim());
      }
    }
  }
  
  // Add resolved references as key phrases
  if (analysis.references && analysis.references.length > 0) {
    for (const ref of analysis.references) {
      if (ref.resolved_to && ref.resolved_to.trim()) {
        keyPhrases.push(ref.resolved_to.trim());
      }
    }
  }
  
  // Extract potential key phrases from the disambiguated query
  // This uses a simple approach of looking for noun phrases
  const query = analysis.disambiguated_query;
  const nounPhrasePattern = /\b([A-Z][a-z]*\s)?([A-Z][a-z]*\s)?([a-z]+\s)?(information|details|data|results|items|records|events|meetings|tasks|products|services|options|plans)\b/g;
  
  let match;
  while ((match = nounPhrasePattern.exec(query)) !== null) {
    const phrase = match[0].trim();
    if (phrase && !keyPhrases.includes(phrase)) {
      keyPhrases.push(phrase);
    }
  }
  
  return [...new Set(keyPhrases)]; // Remove duplicates
}

/**
 * Run NLU disambiguation to resolve ambiguous intents using conversation history
 * @param userId User ID
 * @param userQuery Current user query that may have ambiguities
 * @param history Conversation history
 * @param userState User state data
 * @param memoryFramework Memory framework instance
 * @returns Resolved query and NLU analysis
 */
export async function runNluDisambiguation(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  userState: UserState | null,
  memoryFramework: CompanionCoreMemory
): Promise<{ 
  resolvedQuery: string;
  nluAnalysis: XmlNluAnalysis | null;
  recommendedTools?: XmlToolRanking[];
  languageDetected?: string;
}> {
  const logPrefix = `[NluDisambiguation User:${userId.substring(0, 8)}]`;
  
  try {
    // Skip NLU for very short or simple queries
    const cleanQuery = stripSystemPrefixes(userQuery);
    if (cleanQuery.length < 5 || /^(yes|no|ok|sure|thanks?|hi|hello)$/i.test(cleanQuery)) {
      logger.info(`${logPrefix} Skipping NLU for simple query: "${cleanQuery}"`);
      return { resolvedQuery: userQuery, nluAnalysis: null };
    }
    
    // Perform the NLU analysis
    const nluAnalysis = await analyzeUserQuery(userQuery, history, userState, userId);
    
    if (nluAnalysis) {
      // Use the disambiguated query or true intent if available
      const resolvedQuery = nluAnalysis.disambiguated_query || nluAnalysis.true_intent || userQuery;
      
      if (resolvedQuery !== userQuery) {
        logger.info(`${logPrefix} Query disambiguated: "${userQuery}" -> "${resolvedQuery}"`);
      }
      
      // Log potential tool recommendations if available
      if (nluAnalysis.potential_tools && nluAnalysis.potential_tools.length > 0) {
        const topTool = nluAnalysis.potential_tools[0];
        logger.info(`${logPrefix} Top recommended tool: ${topTool.tool_name} (confidence: ${topTool.confidence})`);
      }
      
      // Log language detection if available
      if (nluAnalysis.language_detected && nluAnalysis.language_detected !== 'en') {
        logger.info(`${logPrefix} Non-English language detected: ${nluAnalysis.language_detected}`);
      }
      
      return { 
        resolvedQuery,
        nluAnalysis,
        recommendedTools: nluAnalysis.potential_tools,
        languageDetected: nluAnalysis.language_detected
      };
    }
    
    // Return original if no analysis was possible
    return { resolvedQuery: userQuery, nluAnalysis: null };
  } catch (error) {
    logger.error(`${logPrefix} Disambiguation error:`, error);
    return { resolvedQuery: userQuery, nluAnalysis: null };
  }
} 