import { logger } from "@/memory-framework/config";
import { 
  ChatMessage, 
  UserState,
  UserWorkflowPreferences,
  PredefinedPersona,
  UserPersona
} from "@/lib/types";
import { appConfig, injectPromptVariables, featureFlags } from "../config";
import { USER_MEMORY_CONTEXT_ENRICHMENT_PROMPT_TEMPLATE } from "../prompts";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import { generateStructuredJson } from "../providers/llm_clients";
import { stripSystemPrefixes } from "./helpers";

/**
 * NOTE: The personalization functionality has been completely DISABLED
 * This file is kept for backwards compatibility only.
 * The feature flags (useDynamicPersonalization, useDynamicPersonalizationForAudio) have been set to FALSE.
 */

// Type for the memory context analysis XML output
interface MemoryContextAnalysis {
  preference_context: {
    topics: string[];
    entities: string[];
    preference_types: string[];
    relevance: 'high' | 'medium' | 'low';
  };
  learning_context: {
    topics: string[];
    progress_indicators: string[];
    relevance: 'high' | 'medium' | 'low';
  };
  project_context: {
    project_indicators: string[];
    timeframe_indicators: string[];
    relevance: 'high' | 'medium' | 'low';
  };
  relationship_context: {
    entities: string[];
    relationship_types: string[];
    relevance: 'high' | 'medium' | 'low';
  };
  memory_query_suggestions: string[];
}

/**
 * Formats conversation history for memory context enrichment
 */
function formatHistoryForEnrichment(history: ChatMessage[], maxTurns: number = 5): string {
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
      
      content = textParts;
    }
    
    formattedHistory += `    <turn role="${role}">${content}</turn>\n`;
  }
  
  return formattedHistory;
}

/**
 * Formats user profile information for memory context enrichment
 */
function formatUserProfileForEnrichment(userState: UserState | null): string {
  if (!userState) return "    <info>No user profile available</info>";
  
  const parts: string[] = [];
  
  if (userState.user_first_name) 
    parts.push(`    <info type="name">${userState.user_first_name}</info>`);
  
  if (userState.preferred_locale) 
    parts.push(`    <info type="locale">${userState.preferred_locale}</info>`);
  
  if (userState.timezone) 
    parts.push(`    <info type="timezone">${userState.timezone}</info>`);
  
  // Add workflow preferences if available
  const workflowPrefs = userState.workflow_preferences;
  if (workflowPrefs) {
    // Add interest categories
    if (workflowPrefs.interestCategories && workflowPrefs.interestCategories.length > 0) {
      parts.push(`    <info type="interests">${workflowPrefs.interestCategories.join(', ')}</info>`);
    }
    
    // Add recipe preferences
    if (workflowPrefs.recipePreferredCuisines && workflowPrefs.recipePreferredCuisines.length > 0) {
      parts.push(`    <info type="cuisine_preferences">${workflowPrefs.recipePreferredCuisines.join(', ')}</info>`);
    }
    
    // Add diet preferences
    if (workflowPrefs.recipePreferredDiets && workflowPrefs.recipePreferredDiets.length > 0) {
      parts.push(`    <info type="diet_preferences">${workflowPrefs.recipePreferredDiets.join(', ')}</info>`);
    }
    
    // Add sports preferences
    if (workflowPrefs.sportsPreferredTeams && workflowPrefs.sportsPreferredTeams.length > 0) {
      parts.push(`    <info type="sports_teams">${workflowPrefs.sportsPreferredTeams.join(', ')}</info>`);
    }
  }
  
  // Add persona traits if available
  if ((userState as any).active_persona_traits && Array.isArray((userState as any).active_persona_traits)) {
    const traits = (userState as any).active_persona_traits.join(', ');
    parts.push(`    <info type="persona_traits">${traits}</info>`);
  }
  
  return parts.join('\n') || "    <info>Basic user profile</info>";
}

/**
 * Parse XML memory context analysis into structured object
 */
function parseMemoryContextAnalysis(xmlString: string): MemoryContextAnalysis | null {
  try {
    // Basic XML parsing - in a production environment, use a proper XML parser
    // Extract preference context
    const preferenceTopicsMatch = xmlString.match(/<preference_context>[\s\S]*?<topics>([\s\S]*?)<\/topics>/);
    const preferenceEntitiesMatch = xmlString.match(/<preference_context>[\s\S]*?<entities>([\s\S]*?)<\/entities>/);
    const preferenceTypesMatch = xmlString.match(/<preference_context>[\s\S]*?<preference_types>([\s\S]*?)<\/preference_types>/);
    const preferenceRelevanceMatch = xmlString.match(/<preference_context>[\s\S]*?<relevance>(high|medium|low)<\/relevance>/);
    
    // Extract learning context
    const learningTopicsMatch = xmlString.match(/<learning_context>[\s\S]*?<topics>([\s\S]*?)<\/topics>/);
    const learningIndicatorsMatch = xmlString.match(/<learning_context>[\s\S]*?<progress_indicators>([\s\S]*?)<\/progress_indicators>/);
    const learningRelevanceMatch = xmlString.match(/<learning_context>[\s\S]*?<relevance>(high|medium|low)<\/relevance>/);
    
    // Extract project context
    const projectIndicatorsMatch = xmlString.match(/<project_context>[\s\S]*?<project_indicators>([\s\S]*?)<\/project_indicators>/);
    const timeframeIndicatorsMatch = xmlString.match(/<project_context>[\s\S]*?<timeframe_indicators>([\s\S]*?)<\/timeframe_indicators>/);
    const projectRelevanceMatch = xmlString.match(/<project_context>[\s\S]*?<relevance>(high|medium|low)<\/relevance>/);
    
    // Extract relationship context
    const relationshipEntitiesMatch = xmlString.match(/<relationship_context>[\s\S]*?<entities>([\s\S]*?)<\/entities>/);
    const relationshipTypesMatch = xmlString.match(/<relationship_context>[\s\S]*?<relationship_types>([\s\S]*?)<\/relationship_types>/);
    const relationshipRelevanceMatch = xmlString.match(/<relationship_context>[\s\S]*?<relevance>(high|medium|low)<\/relevance>/);
    
    // Extract memory query suggestions
    const memoryQueriesMatch = xmlString.match(/<memory_query_suggestions>([\s\S]*?)<\/memory_query_suggestions>/);
    
    // Helper function to extract topic elements
    function extractElements(match: RegExpMatchArray | null, tagName: string = 'topic'): string[] {
      if (!match || !match[1]) return [];
      
      const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 'g');
      const elements: string[] = [];
      let m;
      
      while ((m = regex.exec(match[1])) !== null) {
        if (m[1] && m[1].trim()) {
          elements.push(m[1].trim());
        }
      }
      
      return elements;
    }
    
    return {
      preference_context: {
        topics: extractElements(preferenceTopicsMatch, 'topic'),
        entities: extractElements(preferenceEntitiesMatch, 'entity'),
        preference_types: extractElements(preferenceTypesMatch, 'type'),
        relevance: (preferenceRelevanceMatch && preferenceRelevanceMatch[1]) as 'high' | 'medium' | 'low' || 'low'
      },
      learning_context: {
        topics: extractElements(learningTopicsMatch, 'topic'),
        progress_indicators: extractElements(learningIndicatorsMatch, 'indicator'),
        relevance: (learningRelevanceMatch && learningRelevanceMatch[1]) as 'high' | 'medium' | 'low' || 'low'
      },
      project_context: {
        project_indicators: extractElements(projectIndicatorsMatch, 'indicator'),
        timeframe_indicators: extractElements(timeframeIndicatorsMatch, 'indicator'),
        relevance: (projectRelevanceMatch && projectRelevanceMatch[1]) as 'high' | 'medium' | 'low' || 'low'
      },
      relationship_context: {
        entities: extractElements(relationshipEntitiesMatch, 'entity'),
        relationship_types: extractElements(relationshipTypesMatch, 'type'),
        relevance: (relationshipRelevanceMatch && relationshipRelevanceMatch[1]) as 'high' | 'medium' | 'low' || 'low'
      },
      memory_query_suggestions: extractElements(memoryQueriesMatch, 'query')
    };
  } catch (error) {
    logger.error("[parseMemoryContextAnalysis] Error parsing XML:", error);
    return null;
  }
}

/**
 * Generate memory search queries based on memory context analysis
 */
function generateMemoryQueries(analysis: MemoryContextAnalysis): string[] {
  const queries: string[] = [];
  
  // Add explicit memory query suggestions
  if (analysis.memory_query_suggestions && analysis.memory_query_suggestions.length > 0) {
    queries.push(...analysis.memory_query_suggestions);
  }
  
  // Add high-relevance preference topics
  if (analysis.preference_context.relevance === 'high' && analysis.preference_context.topics.length > 0) {
    analysis.preference_context.topics.forEach(topic => {
      queries.push(`${topic} preference`);
    });
  }
  
  // Add high-relevance learning topics
  if (analysis.learning_context.relevance === 'high' && analysis.learning_context.topics.length > 0) {
    analysis.learning_context.topics.forEach(topic => {
      queries.push(`learning ${topic}`);
    });
  }
  
  // Add high-relevance project indicators
  if (analysis.project_context.relevance === 'high' && analysis.project_context.project_indicators.length > 0) {
    analysis.project_context.project_indicators.forEach(indicator => {
      queries.push(`project ${indicator}`);
    });
  }
  
  // Add high-relevance relationship entities
  if (analysis.relationship_context.relevance === 'high' && analysis.relationship_context.entities.length > 0) {
    analysis.relationship_context.entities.forEach(entity => {
      queries.push(entity);
    });
  }
  
  // Remove duplicates and limit to 5 queries
  return [...new Set(queries)].slice(0, 5);
}

/**
 * Enhanced user memory context for personalization
 * @param userId User ID
 * @param userQuery Current user query 
 * @param history Conversation history
 * @param userState User state data
 * @param memoryFramework Memory framework instance
 * @returns Enhanced memory context for personalization
 */
export async function enhanceUserMemoryContext(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  userState: UserState | null,
  memoryFramework: CompanionCoreMemory
): Promise<{
  enhancedMemoryContext: string;
  memoryContextAnalysis: MemoryContextAnalysis | null;
  memoryQueries: string[];
}> {
  const logPrefix = `[MemoryEnrichment User:${userId.substring(0, 8)}]`;
  
  try {
    // Skip memory context enrichment if the feature flag is turned off
    if (!featureFlags.useDynamicPersonalization) {
      return { 
        enhancedMemoryContext: "",
        memoryContextAnalysis: null,
        memoryQueries: []
      };
    }
    
    // Clean the user query
    const cleanQuery = stripSystemPrefixes(userQuery);
    
    // Skip for very short or simple queries
    if (cleanQuery.length < 5 || /^(yes|no|ok|sure|thanks?|hi|hello)$/i.test(cleanQuery)) {
      logger.info(`${logPrefix} Skipping memory context enrichment for simple query: "${cleanQuery}"`);
      return { 
        enhancedMemoryContext: "",
        memoryContextAnalysis: null,
        memoryQueries: []
      };
    }
    
    // Format the conversation history
    const formattedHistory = formatHistoryForEnrichment(history);
    
    // Format the user profile
    const formattedProfile = formatUserProfileForEnrichment(userState);
    
    // Prepare the prompt
    const prompt = injectPromptVariables(USER_MEMORY_CONTEXT_ENRICHMENT_PROMPT_TEMPLATE, {
      userQuery: cleanQuery,
      conversationHistory: formattedHistory,
      userProfile: formattedProfile
    });
    
    logger.info(`${logPrefix} Running memory context enrichment analysis`);
    
    // Call the LLM with structured prompt
    const enrichmentResponse = await generateStructuredJson(
      prompt,
      cleanQuery,
      { type: "string" }, // Expecting XML string response
      "minato_memory_context_enrichment",
      history,
      (appConfig.openai.extractionModel || "gpt-4.1-nano-2025-04-14"), // Use extraction model for efficiency
      userId
    );
    
    // Parse the response and generate memory context
    if (typeof enrichmentResponse === 'string') {
      const analysis = parseMemoryContextAnalysis(enrichmentResponse);
      
      if (analysis) {
        // Generate memory search queries based on the analysis
        const memoryQueries = generateMemoryQueries(analysis);
        
        // Execute memory queries
        const memoryResults = await Promise.all(
          memoryQueries.map(query => 
            memoryFramework.search_memory(
              query, 
              userId, 
              { limit: 3, offset: 0 }, 
              null, 
              { includeFactsOnly: false, includeReminderDetails: false }
            )
          )
        );
        
        // Compile enhanced memory context
        let enhancedMemoryContext = "PERSONALIZED MEMORY CONTEXT:\n";
        
        memoryResults.forEach((result, index) => {
          if (result.results.length > 0) {
            enhancedMemoryContext += `Memory Context for "${memoryQueries[index]}":\n`;
            
            result.results.forEach(memory => {
              enhancedMemoryContext += `- ${memory.content}\n`;
            });
            
            enhancedMemoryContext += "\n";
          }
        });
        
        logger.info(`${logPrefix} Memory context enrichment successful, found ${memoryResults.reduce((acc, r) => acc + r.results.length, 0)} relevant memories`);
        
        return {
          enhancedMemoryContext,
          memoryContextAnalysis: analysis,
          memoryQueries
        };
      } else {
        logger.warn(`${logPrefix} Failed to parse memory context analysis: ${enrichmentResponse.substring(0, 100)}...`);
      }
    } else {
      logger.warn(`${logPrefix} Memory context enrichment failed, unexpected response type: ${typeof enrichmentResponse}`);
    }
    
    // Return empty if analysis failed
    return { 
      enhancedMemoryContext: "",
      memoryContextAnalysis: null,
      memoryQueries: []
    };
  } catch (error: any) {
    logger.error(`${logPrefix} Memory context enrichment error: ${error.message}`, error);
    return { 
      enhancedMemoryContext: "",
      memoryContextAnalysis: null,
      memoryQueries: []
    };
  }
} 