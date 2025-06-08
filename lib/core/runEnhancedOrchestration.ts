import { runNluDisambiguation } from './nlu-disambiguation';
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import { 
  ChatMessage, 
  UserState,
  AnyToolStructuredData,
  XmlPlan,
  XmlQueryClassification, 
  XmlNluAnalysis,
  MessageAttachment,
  XmlToolRanking,
  XmlClassification,
  XmlChainOfThoughtPlan,
  ChatMessageContentPart
} from "@/lib/types";
import { Orchestrator } from "./orchestrator";
import { logger } from "@/memory-framework/config";
import { BaseTool } from "../tools/base-tool";
import { analyzeUserQuery } from "./nlu-disambiguation";
import { getFirstOrchResponse, summarizeChatHistory, getToolDescriptionsForPlanner } from "./helpers";
import { featureFlags } from "@/lib/config";
import { classifyQueryForMultiToolProcessing, generateMultiToolCotPlan } from "../providers/llm_clients";

/**
 * Integrates NLU disambiguation into the enhanced orchestration flow
 * @param userId User ID
 * @param userQuery Original user query
 * @param history Conversation history
 * @param userState User state
 * @param memoryFramework Memory framework instance
 * @returns Resolved query and additional NLU analysis data
 */
export async function processNluAndResolveQuery(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  userState: UserState | null,
  memoryFramework: CompanionCoreMemory
): Promise<{
  resolvedQuery: string;
  nluAnalysis: XmlNluAnalysis | null;
  originalQuery: string;
  wasAmbiguous: boolean;
  clarificationRequired: boolean;
  suggestedFollowup: string | null;
  recommendedTools?: XmlToolRanking[];
  languageDetected?: string;
}> {
  const logPrefix = `[NluFlow User:${userId.substring(0, 8)}]`;
  
  // Default to the original query
  let result: {
    resolvedQuery: string;
    nluAnalysis: XmlNluAnalysis | null;
    originalQuery: string;
    wasAmbiguous: boolean;
    clarificationRequired: boolean;
    suggestedFollowup: string | null;
    recommendedTools?: XmlToolRanking[];
    languageDetected?: string;
  } = {
    resolvedQuery: userQuery,
    nluAnalysis: null,
    originalQuery: userQuery,
    wasAmbiguous: false,
    clarificationRequired: false,
    suggestedFollowup: null
  };
  
  try {
    // Check if the query might contain ambiguity
    const mightContainAmbiguity = /\b(this|that|these|those|it|them|one|here|there)\b|\?\s*$/i.test(userQuery) || 
      userQuery.length < 10 || // Very short queries often need context
      (/^(no|yes|maybe|sure|ok|okay|fine|great|good|nice|nope|yep|yeah|not)\b/i.test(userQuery)); // Affirmative/negative responses
      
    // If we suspect ambiguity or the query is complex, run NLU disambiguation
    if (mightContainAmbiguity || history.length > 0) {
      logger.info(`${logPrefix} Query might contain ambiguity or references: "${userQuery.substring(0, 50)}..."`);
      
      // Run the NLU disambiguation
      const nluResult = await runNluDisambiguation(
        userId,
        userQuery,
        history,
        userState,
        memoryFramework
      );
      
      if (nluResult.nluAnalysis) {
        const resolvedIntent = nluResult.nluAnalysis.true_intent || nluResult.nluAnalysis.disambiguated_query;
        const wasChanged = resolvedIntent !== userQuery;
        
        // Update result with NLU data
        result.resolvedQuery = resolvedIntent;
        result.nluAnalysis = nluResult.nluAnalysis;
        result.wasAmbiguous = wasChanged;
        result.recommendedTools = nluResult.recommendedTools;
        result.languageDetected = nluResult.languageDetected;
        
        // Determine if we need further clarification
        const lowConfidence = nluResult.nluAnalysis.confidence === 'low';
        const hasAmbiguity = nluResult.nluAnalysis.ambiguity_resolution !== null;
        result.clarificationRequired = lowConfidence && hasAmbiguity;
        
        if (result.clarificationRequired) {
          // Generate a follow-up question for clarification
          result.suggestedFollowup = `Did you mean "${resolvedIntent}"?`;
        }
        
        // Log tool recommendations if available
        if (result.recommendedTools && result.recommendedTools.length > 0) {
          const topTool = result.recommendedTools[0];
          logger.info(`${logPrefix} Top recommended tool: ${topTool.tool_name} (confidence: ${topTool.confidence})`);
        }
        
        // Log language detection if available
        if (result.languageDetected && result.languageDetected !== 'en') {
          logger.info(`${logPrefix} Non-English language detected: ${result.languageDetected}`);
        }
        
        if (wasChanged) {
          logger.info(`${logPrefix} Disambiguated query: "${userQuery}" → "${resolvedIntent}"`);
        }
      }
    }
    
    return result;
  } catch (error) {
    logger.error(`${logPrefix} Error in NLU flow:`, error);
    return result;
  }
}

/**
 * Processes a query to determine if it needs multi-intent Chain-of-Thought planning
 * @param userId User ID
 * @param userQuery User query
 * @param history Conversation history
 * @param toolRegistry Tool registry
 * @param personaCustomization Persona customization information
 * @returns Classification result indicating if multi-intent CoT planning is needed
 */
export async function detectMultiIntentQuery(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  toolRegistry: { [key: string]: BaseTool },
  personaCustomization: string | null
): Promise<{ 
  isMultiIntent: boolean; 
  classification: XmlClassification | null;
  error?: string | null 
}> {
  const logPrefix = `[MultiIntentDetector User:${userId.substring(0, 8)}]`;
  
  try {
    // Skip multi-intent detection for simple queries
    if (userQuery.length < 15 || !userQuery.includes(" ")) {
      logger.info(`${logPrefix} Skipping multi-intent detection for simple query: "${userQuery}"`);
      return { isMultiIntent: false, classification: null };
    }
    
    // Prepare history summary for the classifier
    const historyText = summarizeChatHistory(history, 500);
    
    // Classify the query
    const classificationResult = await classifyQueryForMultiToolProcessing(
      userQuery,
      historyText,
      personaCustomization,
      userId
    );
    
    if (classificationResult.error) {
      logger.warn(`${logPrefix} Error classifying query: ${classificationResult.error}`);
      return { isMultiIntent: false, classification: null, error: classificationResult.error };
    }
    
    if (!classificationResult.classification) {
      logger.warn(`${logPrefix} No classification returned`);
      return { isMultiIntent: false, classification: null };
    }
    
    // Check if this is a multi-intent query
    const classification = classificationResult.classification;
    const isMultiIntent = 
      classification.category === 'multi_intent_complex' || 
      (classification.intent_analysis && 
       classification.intent_analysis.count && 
       parseInt(classification.intent_analysis.count, 10) > 1) ? true : false;
    
    if (isMultiIntent) {
      logger.info(`${logPrefix} Detected multi-intent query with ${classification.intent_analysis?.count || '?'} intents: "${userQuery.substring(0, 50)}..."`);
      
      if (classification.intent_analysis?.primary_intent) {
        logger.info(`${logPrefix} Primary intent: ${classification.intent_analysis.primary_intent}`);
      }
      
      if (classification.intent_analysis?.secondary_intents) {
        logger.info(`${logPrefix} Secondary intents: ${classification.intent_analysis.secondary_intents}`);
      }
    }
    
    return { 
      isMultiIntent, 
      classification,
      error: null
    };
  } catch (error: any) {
    logger.error(`${logPrefix} Error detecting multi-intent query:`, error);
    return { isMultiIntent: false, classification: null, error: error.message };
  }
}

/**
 * Generates a Chain-of-Thought plan for a complex multi-intent query
 * @param userId User ID
 * @param userQuery User query
 * @param history Conversation history
 * @param toolRegistry Tool registry
 * @param userState User state
 * @param personaCustomization Persona customization information
 * @param nluAnalysis Optional NLU analysis
 * @returns Chain-of-Thought plan for the query
 */
export async function generateCoTExecutionPlan(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  toolRegistry: { [key: string]: BaseTool },
  userState: UserState | null,
  personaCustomization: string | null,
  nluAnalysis: XmlNluAnalysis | null = null
): Promise<{
  plan: XmlChainOfThoughtPlan | null;
  error?: string | null;
}> {
  const logPrefix = `[CoTPlanner User:${userId.substring(0, 8)}]`;
  
  try {
    // Get available tools description
    const availableToolsStringified = getToolDescriptionsForPlanner(toolRegistry);
    
    // Prepare history summary
    const historyText = summarizeChatHistory(history, 800);
    
    // Prepare user state summary
    let userStateSummary = "";
    if (userState) {
      userStateSummary = `User: ${userState.user_first_name || "Unknown"}
Locale: ${userState.preferred_locale || "Unknown"}
Timezone: ${userState.timezone || "Unknown"}`;
    }
    
    // Prepare NLU analysis if available
    let nluAnalysisText = null;
    if (nluAnalysis) {
      nluAnalysisText = `
Original Query: ${nluAnalysis.original_query}
Disambiguated Query: ${nluAnalysis.disambiguated_query}
True Intent: ${nluAnalysis.true_intent}
Entities: ${nluAnalysis.entities?.map(e => `${e.name} (${e.type})`).join(', ') || 'None'}
References: ${nluAnalysis.references?.map(r => `${r.expression} -> ${r.resolved_to}`).join(', ') || 'None'}
Implicit Needs: ${nluAnalysis.implicit_needs?.join(', ') || 'None'}
`;
    }
    
    // Generate the CoT plan
    logger.info(`${logPrefix} Generating CoT plan for: "${userQuery.substring(0, 50)}..."`);
    const planResult = await generateMultiToolCotPlan(
      userQuery,
      historyText,
      personaCustomization,
      userStateSummary,
      availableToolsStringified,
      nluAnalysisText,
      userId
    );
    
    if (planResult.error) {
      logger.warn(`${logPrefix} Error generating CoT plan: ${planResult.error}`);
      return { plan: null, error: planResult.error };
    }
    
    if (!planResult.plan) {
      logger.warn(`${logPrefix} No CoT plan generated`);
      return { plan: null, error: "No plan was generated" };
    }
    
    const plan = planResult.plan as XmlChainOfThoughtPlan;
    
    // Log the execution groups and intents
    const numGroups = plan.plan?.execution_groups?.length || 0;
    const numTotalSteps = plan.plan?.execution_groups?.reduce((sum, group) => sum + (group.steps?.length || 0), 0) || 0;
    
    logger.info(`${logPrefix} Generated CoT plan with ${numGroups} execution groups and ${numTotalSteps} total steps`);
    
    // Log each execution group
    if (plan.plan?.execution_groups) {
      plan.plan.execution_groups.forEach((group, index) => {
        logger.info(`${logPrefix} Group ${index + 1}: ${group.intent_addressed} (${group.steps.length} steps)`);
      });
    }
    
    return { plan };
  } catch (error: any) {
    logger.error(`${logPrefix} Error generating CoT execution plan:`, error);
    return { plan: null, error: error.message };
  }
}

/**
 * Detects if the query is about learning a new skill and generates a specialized skill learning plan
 * @param userId User ID
 * @param userQuery User query
 * @param history Conversation history
 * @param toolRegistry Tool registry
 * @param userState User state
 * @param personaCustomization Persona customization information
 * @returns Whether the query is about learning a skill and the corresponding plan
 */
export async function detectSkillLearningQuery(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  toolRegistry: { [key: string]: BaseTool },
  userState: UserState | null,
  personaCustomization: string | null
): Promise<{
  isSkillLearningQuery: boolean;
  plan: any | null;
  error?: string | null;
}> {
  const logPrefix = `[SkillLearningDetector User:${userId.substring(0, 8)}]`;
  
  try {
    // Check if the query is about learning a new skill
    const skillLearningRegex = /(?:learn|teach|start|beginn(?:er|ing)|how to|tutorial for)\s+(?:how to\s+)?([a-z\s]+?)(?:\s+basics|\s+for beginners|\s+tutorial|\s+lesson|\s+course|\s+class|\s+skills?|\s+techniques?)?(?:\?|$)/i;
    const match = userQuery.match(skillLearningRegex);
    
    if (!match) {
      logger.debug(`${logPrefix} Query does not appear to be about learning a skill: "${userQuery.substring(0, 50)}..."`);
      return { isSkillLearningQuery: false, plan: null };
    }
    
    const skillName = match[1].trim();
    logger.info(`${logPrefix} Detected potential skill learning query for: "${skillName}"`);
    
    // Get available tools description
    const availableToolsStringified = getToolDescriptionsForPlanner(toolRegistry);
    
    // Prepare history summary
    const historyText = summarizeChatHistory(history, 500);
    
    // Prepare user state summary
    let userStateSummary = "";
    if (userState) {
      userStateSummary = `User: ${userState.user_first_name || "Unknown"}
Locale: ${userState.preferred_locale || "Unknown"}
Timezone: ${userState.timezone || "Unknown"}`;
    }
    
    // Generate the skill learning plan
    const { generateAdvancedSkillLearningPlan } = require('../providers/llm_clients');
    const planResult = await generateAdvancedSkillLearningPlan(
      userQuery,
      historyText,
      personaCustomization,
      userStateSummary,
      availableToolsStringified,
      userId
    );
    
    if (planResult.error) {
      logger.warn(`${logPrefix} Error generating skill learning plan: ${planResult.error}`);
      return { isSkillLearningQuery: true, plan: null, error: planResult.error };
    }
    
    if (!planResult.plan) {
      logger.warn(`${logPrefix} No skill learning plan generated`);
      return { isSkillLearningQuery: true, plan: null, error: "No plan was generated" };
    }
    
    logger.info(`${logPrefix} Successfully generated skill learning plan for: "${skillName}"`);
    return { isSkillLearningQuery: true, plan: planResult.plan };
  } catch (error: any) {
    logger.error(`${logPrefix} Error detecting skill learning query:`, error);
    return { isSkillLearningQuery: false, plan: null, error: error.message };
  }
}

/**
 * Detects if the query is about news/information aggregation and generates a specialized news aggregation plan
 * @param userId User ID
 * @param userQuery User query
 * @param history Conversation history
 * @param toolRegistry Tool registry
 * @param userState User state
 * @param personaCustomization Persona customization information
 * @returns Whether the query is about news aggregation and the corresponding plan
 */
export async function detectNewsAggregationQuery(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  toolRegistry: { [key: string]: BaseTool },
  userState: UserState | null,
  personaCustomization: string | null
): Promise<{
  isNewsAggregationQuery: boolean;
  plan: any | null;
  error?: string | null;
}> {
  const logPrefix = `[NewsAggregationDetector User:${userId.substring(0, 8)}]`;
  
  try {
    // Check if the query is about news or information aggregation
    const newsAggregationRegex = /(?:what(?:'s| is) (?:the )?(?:latest|recent|current)|tell me about|updates? (?:on|about)|news (?:on|about)|information (?:on|about)|status (?:of|on)|developments? (?:in|on|with))\s+([a-z\s]+?)(?:\?|$)/i;
    const match = userQuery.match(newsAggregationRegex);
    
    if (!match) {
      logger.debug(`${logPrefix} Query does not appear to be about news aggregation: "${userQuery.substring(0, 50)}..."`);
      return { isNewsAggregationQuery: false, plan: null };
    }
    
    const topicName = match[1].trim();
    logger.info(`${logPrefix} Detected potential news aggregation query for: "${topicName}"`);
    
    // Get available tools description
    const availableToolsStringified = getToolDescriptionsForPlanner(toolRegistry);
    
    // Prepare history summary
    const historyText = summarizeChatHistory(history, 500);
    
    // Prepare user state summary
    let userStateSummary = "";
    if (userState) {
      userStateSummary = `User: ${userState.user_first_name || "Unknown"}
Locale: ${userState.preferred_locale || "Unknown"}
Timezone: ${userState.timezone || "Unknown"}`;
    }
    
    // Generate the news aggregation plan
    const { generateNewsAggregatorPlan } = require('../providers/llm_clients');
    const planResult = await generateNewsAggregatorPlan(
      userQuery,
      historyText,
      personaCustomization,
      userStateSummary,
      availableToolsStringified,
      userId
    );
    
    if (planResult.error) {
      logger.warn(`${logPrefix} Error generating news aggregation plan: ${planResult.error}`);
      return { isNewsAggregationQuery: true, plan: null, error: planResult.error };
    }
    
    if (!planResult.plan) {
      logger.warn(`${logPrefix} No news aggregation plan generated`);
      return { isNewsAggregationQuery: true, plan: null, error: "No plan was generated" };
    }
    
    logger.info(`${logPrefix} Successfully generated news aggregation plan for: "${topicName}"`);
    return { isNewsAggregationQuery: true, plan: planResult.plan };
  } catch (error: any) {
    logger.error(`${logPrefix} Error detecting news aggregation query:`, error);
    return { isNewsAggregationQuery: false, plan: null, error: error.message };
  }
}

/**
 * Generates proactive life improvement suggestions based on user memory and context
 * @param userId User ID
 * @param userQuery User query (optional, may be empty for proactive suggestions)
 * @param history Conversation history
 * @param memoryFramework Memory framework
 * @param toolRegistry Tool registry
 * @param userState User state
 * @param personaCustomization Persona customization information
 * @returns Proactive suggestion plan or null if error
 */
export async function generateProactiveSuggestions(
  userId: string,
  userQuery: string | null,
  history: ChatMessage[],
  memoryFramework: CompanionCoreMemory,
  toolRegistry: { [key: string]: BaseTool },
  userState: UserState | null,
  personaCustomization: string | null
): Promise<{
  plan: any | null;
  error?: string | null;
}> {
  const logPrefix = `[ProactiveSuggestions User:${userId.substring(0, 8)}]`;
  
  try {
    logger.info(`${logPrefix} Generating proactive life improvement suggestions`);
    
    // Fetch relevant memory context
    const memoryContext = await fetchRelevantMemoryContext(userId, history, memoryFramework);
    if (!memoryContext) {
      logger.warn(`${logPrefix} No relevant memory context found for proactive suggestions`);
      return { plan: null, error: "Insufficient memory context for proactive suggestions" };
    }
    
    // Get available tools description
    const availableToolsStringified = getToolDescriptionsForPlanner(toolRegistry);
    
    // Prepare history summary
    const historyText = summarizeChatHistory(history, 500);
    
    // Prepare user state summary
    let userStateSummary = "";
    if (userState) {
      userStateSummary = `User: ${userState.user_first_name || "Unknown"}
Locale: ${userState.preferred_locale || "Unknown"}
Timezone: ${userState.timezone || "Unknown"}`;
    }
    
    // Current date/time for context
    const currentDateTime = new Date().toISOString();
    
    // Generate proactive suggestions
    const { generateProactiveLifeImprovementSuggestions } = require('../providers/llm_clients');
    const planResult = await generateProactiveLifeImprovementSuggestions(
      memoryContext,
      historyText,
      personaCustomization,
      userStateSummary,
      currentDateTime,
      availableToolsStringified,
      userId
    );
    
    if (planResult.error) {
      logger.warn(`${logPrefix} Error generating proactive suggestions: ${planResult.error}`);
      return { plan: null, error: planResult.error };
    }
    
    if (!planResult.plan) {
      logger.warn(`${logPrefix} No proactive suggestions generated`);
      return { plan: null, error: "No suggestions were generated" };
    }
    
    logger.info(`${logPrefix} Successfully generated proactive life improvement suggestions`);
    return { plan: planResult.plan };
  } catch (error: any) {
    logger.error(`${logPrefix} Error generating proactive suggestions:`, error);
    return { plan: null, error: error.message };
  }
}

/**
 * Fetches relevant context from user memory for proactive suggestions
 * @param userId User ID
 * @param history Conversation history
 * @param memoryFramework Memory framework
 * @returns Structured memory context or null if insufficient data
 */
async function fetchRelevantMemoryContext(
  userId: string,
  history: ChatMessage[],
  memoryFramework: CompanionCoreMemory
): Promise<string | null> {
  try {
    // Search for important user facts, preferences, and reminders
    const searchResults = await memoryFramework.search_memory(
      "important facts preferences goals reminders interests projects tasks",
      userId,
      { limit: 20, offset: 0 }
    );
    
    if (!searchResults || searchResults.results.length === 0) {
      return null;
    }
    
    // Get due reminders
    const dueBefore = new Date();
    dueBefore.setDate(dueBefore.getDate() + 7); // Next 7 days
    const dueReminders = await memoryFramework.getDueReminders(
      dueBefore.toISOString(),
      userId,
      10
    );
    
    // Structure the context
    let memoryContext = "# User Memory Context\n\n";
    
    // Add important facts
    memoryContext += "## Important Facts\n";
    searchResults.results.forEach((result, index) => {
      if (result.memory_type === "fact" || !result.memory_type) {
        memoryContext += `${index + 1}. ${result.content}\n`;
      }
    });
    
    // Add preferences if available
    const preferences = searchResults.results.filter(r => 
      r.content.includes("like") || 
      r.content.includes("prefer") || 
      r.content.includes("favorite") ||
      r.content.includes("enjoy")
    );
    
    if (preferences.length > 0) {
      memoryContext += "\n## Preferences\n";
      preferences.forEach((pref, index) => {
        memoryContext += `${index + 1}. ${pref.content}\n`;
      });
    }
    
    // Add upcoming reminders
    if (dueReminders && dueReminders.length > 0) {
      memoryContext += "\n## Upcoming Reminders\n";
      dueReminders.forEach((reminder, index) => {
        const reminderDetails = reminder.metadata?.reminder_details;
        if (reminderDetails) {
          const date = new Date(reminderDetails.trigger_datetime).toLocaleString();
          memoryContext += `${index + 1}. ${reminderDetails.original_content} (${date})\n`;
        }
      });
    }
    
    return memoryContext;
  } catch (error) {
    logger.error(`Error fetching memory context for proactive suggestions:`, error);
    return null;
  }
}

/**
 * Detects if the query is related to continuing a learning series or topic from previous conversations
 * @param userId User ID
 * @param userQuery User query
 * @param history Conversation history
 * @param memoryFramework Memory framework
 * @param toolRegistry Tool registry
 * @param userState User state
 * @param personaCustomization Persona customization information
 * @returns Whether the query is related to learning continuity and the corresponding plan
 */
export async function detectLearningContinuityQuery(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  memoryFramework: CompanionCoreMemory,
  toolRegistry: { [key: string]: BaseTool },
  userState: UserState | null,
  personaCustomization: string | null
): Promise<{
  isLearningContinuityQuery: boolean;
  previousTopic: string | null;
  nextStep: string | null;
  plan: any | null;
  error?: string | null;
}> {
  const logPrefix = `[LearningContinuityDetector User:${userId.substring(0, 8)}]`;
  
  try {
    // Check if the query is about continuing a learning topic
    const continuityRegex = /(?:let'?s|okay|ok|continue|next|resume|back to|more about|proceed with|go on with|carry on with|let us|more on)\s+(?:our|the|with|on|about)?\s*(?:lesson|learning|study|topic|session|tutorial|course|discussion|series)?(?:\s+(?:about|on|of|for)?\s*)?(.+?)(?:\s+(?:today|now|again|from|please|where we left|session|last time))?(?:\.|$|\?)/i;
    const match = userQuery.match(continuityRegex);
    
    if (!match) {
      logger.debug(`${logPrefix} Query does not appear to be about continuing learning: "${userQuery.substring(0, 50)}..."`);
      return { isLearningContinuityQuery: false, previousTopic: null, nextStep: null, plan: null };
    }
    
    let previousTopic = match[1]?.trim();
    
    // If no specific topic was mentioned in the query, try to find the most recent learning topic
    if (!previousTopic) {
      // Search recent memory for learning topics
      const recentTopicsResults = await memoryFramework.search_memory(
        "learn teaching tutorial lesson course studying",
        userId,
        { limit: 10, offset: 0 }
      );
      
      if (recentTopicsResults && recentTopicsResults.results.length > 0) {
        // Look for topics in memory content
        const topicRegex = /(?:learning|studying|lesson|tutorial|course|about)\s+([a-z0-9\s]+?)(?:\.|$|\?)/i;
        
        for (const result of recentTopicsResults.results) {
          const topicMatch = result.content.match(topicRegex);
          if (topicMatch && topicMatch[1]) {
            previousTopic = topicMatch[1].trim();
            logger.info(`${logPrefix} Found previous learning topic in memory: "${previousTopic}"`);
            break;
          }
        }
      }
    }
    
    if (!previousTopic) {
      logger.info(`${logPrefix} No specific learning topic found in query or memory`);
      return { isLearningContinuityQuery: false, previousTopic: null, nextStep: null, plan: null };
    }
    
    logger.info(`${logPrefix} Detected learning continuity query for topic: "${previousTopic}"`);
    
    // Get available tools description
    const availableToolsStringified = getToolDescriptionsForPlanner(toolRegistry);
    
    // Prepare history summary
    const historyText = summarizeChatHistory(history, 500);
    
    // Prepare user state summary
    let userStateSummary = "";
    if (userState) {
      userStateSummary = `User: ${userState.user_first_name || "Unknown"}
Locale: ${userState.preferred_locale || "Unknown"}
Timezone: ${userState.timezone || "Unknown"}`;
    }
    
    // Generate the learning continuity plan using the advanced skill learning plan generator
    const { generateAdvancedSkillLearningPlan } = require('../providers/llm_clients');
    
    // Create a modified query that emphasizes continuity
    const enhancedQuery = `Continue the learning series about ${previousTopic}. What should we cover next?`;
    
    const planResult = await generateAdvancedSkillLearningPlan(
      enhancedQuery,
      historyText,
      personaCustomization,
      userStateSummary,
      availableToolsStringified,
      userId
    );
    
    if (planResult.error) {
      logger.warn(`${logPrefix} Error generating learning continuity plan: ${planResult.error}`);
      return { 
        isLearningContinuityQuery: true, 
        previousTopic, 
        nextStep: null, 
        plan: null, 
        error: planResult.error 
      };
    }
    
    if (!planResult.plan) {
      logger.warn(`${logPrefix} No learning continuity plan generated`);
      return { 
        isLearningContinuityQuery: true, 
        previousTopic, 
        nextStep: null, 
        plan: null, 
        error: "No plan was generated" 
      };
    }
    
    // Extract the next step/topic from the plan
    let nextStep = null;
    try {
      // Try to extract next step from the first learning phase
      if (planResult.plan.learning_phases && 
          planResult.plan.learning_phases.length > 0 && 
          planResult.plan.learning_phases[0].name) {
        nextStep = planResult.plan.learning_phases[0].name;
      }
    } catch (extractError) {
      logger.warn(`${logPrefix} Error extracting next step from plan:`, extractError);
    }
    
    logger.info(`${logPrefix} Successfully generated learning continuity plan for: "${previousTopic}"`);
    return { 
      isLearningContinuityQuery: true, 
      previousTopic, 
      nextStep, 
      plan: planResult.plan 
    };
  } catch (error: any) {
    logger.error(`${logPrefix} Error detecting learning continuity query:`, error);
    return { 
      isLearningContinuityQuery: false, 
      previousTopic: null, 
      nextStep: null, 
      plan: null, 
      error: error.message 
    };
  }
}

/**
 * Detects if the query is a progress checkpoint where Minato should check in on user's learning
 * @param userId User ID
 * @param userQuery User query
 * @param history Conversation history
 * @param memoryFramework Memory framework
 * @param toolRegistry Tool registry
 * @param userState User state
 * @param personaCustomization Persona customization information
 * @returns Whether the query is a progress checkpoint and the corresponding plan
 */
export async function detectProgressCheckpointQuery(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  memoryFramework: CompanionCoreMemory,
  toolRegistry: { [key: string]: BaseTool },
  userState: UserState | null,
  personaCustomization: string | null
): Promise<{
  isProgressCheckpoint: boolean;
  learningTopic: string | null;
  progressStage: string | null;
  plan: any | null;
  error?: string | null;
}> {
  const logPrefix = `[ProgressCheckpoint User:${userId.substring(0, 8)}]`;
  
  try {
    // Check if the query is a progress checkpoint
    const checkpointRegex = /(?:check|track|assess|evaluate|review|gauge|monitor|see|how am i doing|progress|status|update)\s+(?:my|on|the|of|with)?\s*(?:progress|status|level|understanding|skill|knowledge|mastery|learning|advancement|development|improvement)(?:\s+(?:on|in|with|about|regarding|for|of)?\s*)?(.+?)(?:\s+(?:lesson|learning|course|topic|skill|study))?(?:\.|$|\?)/i;
    
    const match = userQuery.match(checkpointRegex);
    
    // First check if this is an explicit progress checkpoint query
    if (match) {
      const learningTopic = match[1]?.trim();
      
      if (!learningTopic) {
        // Try to find the most recent learning topic
        const recentTopicsResults = await memoryFramework.search_memory(
          "learn teaching tutorial lesson course studying progress skill",
          userId,
          { limit: 10, offset: 0 }
        );
        
        let extractedTopic = null;
        if (recentTopicsResults && recentTopicsResults.results.length > 0) {
          // Look for topics in memory content
          const topicRegex = /(?:learning|studying|lesson|tutorial|course|about)\s+([a-z0-9\s]+?)(?:\.|$|\?)/i;
          
          for (const result of recentTopicsResults.results) {
            const topicMatch = result.content.match(topicRegex);
            if (topicMatch && topicMatch[1]) {
              extractedTopic = topicMatch[1].trim();
              break;
            }
          }
        }
        
        if (!extractedTopic) {
          logger.info(`${logPrefix} No specific learning topic found for progress checkpoint`);
          return { 
            isProgressCheckpoint: false, 
            learningTopic: null, 
            progressStage: null, 
            plan: null 
          };
        }
        
        logger.info(`${logPrefix} Found previous learning topic for progress checkpoint: "${extractedTopic}"`);
        
        // Generate a progress checkpoint plan
        const { generateProgressCheckpointPlan } = require('../providers/llm_clients');
        
        // Create a modified query that emphasizes progress checking
        const enhancedQuery = `Check my progress on learning ${extractedTopic}. What have I accomplished and what's next?`;
        
        // Get available tools description
        const availableToolsStringified = getToolDescriptionsForPlanner(toolRegistry);
        
        // Prepare history summary
        const historyText = summarizeChatHistory(history, 500);
        
        // Prepare user state summary
        let userStateSummary = "";
        if (userState) {
          userStateSummary = `User: ${userState.user_first_name || "Unknown"}
Locale: ${userState.preferred_locale || "Unknown"}
Timezone: ${userState.timezone || "Unknown"}`;
        }
        
        // Use the advanced skill learning plan generator for progress checkpoints
        const { generateAdvancedSkillLearningPlan } = require('../providers/llm_clients');
        
        const planResult = await generateAdvancedSkillLearningPlan(
          enhancedQuery,
          historyText,
          personaCustomization,
          userStateSummary,
          availableToolsStringified,
          userId
        );
        
        if (planResult.error || !planResult.plan) {
          logger.warn(`${logPrefix} Error generating progress checkpoint plan: ${planResult.error || "No plan generated"}`);
          return { 
            isProgressCheckpoint: true, 
            learningTopic: extractedTopic, 
            progressStage: null, 
            plan: null, 
            error: planResult.error || "No plan was generated" 
          };
        }
        
        // Try to extract progress stage from the plan
        let progressStage = null;
        try {
          if (planResult.plan.skill_details && planResult.plan.skill_details.difficulty_level) {
            progressStage = planResult.plan.skill_details.difficulty_level;
          }
        } catch (extractError) {
          logger.warn(`${logPrefix} Error extracting progress stage:`, extractError);
        }
        
        logger.info(`${logPrefix} Successfully generated progress checkpoint plan for: "${extractedTopic}"`);
        return {
          isProgressCheckpoint: true,
          learningTopic: extractedTopic,
          progressStage,
          plan: planResult.plan
        };
      }
    }
    
    // If we reach here, this is not a progress checkpoint query
    return { 
      isProgressCheckpoint: false, 
      learningTopic: null, 
      progressStage: null, 
      plan: null 
    };
  } catch (error: any) {
    logger.error(`${logPrefix} Error detecting progress checkpoint query:`, error);
    return { 
      isProgressCheckpoint: false, 
      learningTopic: null, 
      progressStage: null, 
      plan: null, 
      error: error.message 
    };
  }
}

/**
 * Detects if the query is about initiating a focus mode session
 * @param userId User ID
 * @param userQuery User query
 * @param history Conversation history
 * @param toolRegistry Tool registry
 * @param userState User state
 * @param personaCustomization Persona customization information
 * @returns Whether the query is about focus mode and the corresponding plan
 */
export async function detectFocusModeQuery(
  userId: string,
  userQuery: string,
  history: ChatMessage[],
  toolRegistry: { [key: string]: BaseTool },
  userState: UserState | null,
  personaCustomization: string | null
): Promise<{
  isFocusModeQuery: boolean;
  focusActivity: string | null;
  duration: string | null;
  plan: any | null;
  error?: string | null;
}> {
  const logPrefix = `[FocusModeDetector User:${userId.substring(0, 8)}]`;
  
  try {
    // Check if the query is about starting a focus mode session
    const focusModeRegex = /(?:focus|concentrate|concentration|deep work|pomodoro|timer|no distractions|distraction-free|flow state)\s+(?:on|for|while|during|mode|session|time)?(?:\s+(?:on|for|while|during|mode|session|time))?(?:\s+(?:doing|working on|writing|coding|studying|reading|learning|practicing))?(?:\s+([a-z0-9\s]+?))?(?:\s+(?:for|over|during)\s+(?:(\d+)\s+(?:min(?:ute)?s?|hours?|hr|h|m|seconds?|sec|s)))?(?:\s+(?:starting|beginning|commencing|now|please|session|mode))?(?:\.|$|\?)/i;
    
    const match = userQuery.match(focusModeRegex);
    
    if (!match) {
      logger.debug(`${logPrefix} Query does not appear to be about focus mode: "${userQuery.substring(0, 50)}..."`);
      return { isFocusModeQuery: false, focusActivity: null, duration: null, plan: null };
    }
    
    // Extract focus activity and duration from the match
    const focusActivity = match[1]?.trim() || null;
    const durationValue = match[2] ? parseInt(match[2], 10) : null;
    const durationUnit = match[3]?.toLowerCase() || null;
    
    // Normalize duration to minutes
    let durationMinutes: number | null = null;
    if (durationValue !== null) {
      if (durationUnit?.startsWith('hour') || durationUnit === 'hr' || durationUnit === 'h') {
        durationMinutes = durationValue * 60;
      } else if (durationUnit?.startsWith('min') || durationUnit === 'm') {
        durationMinutes = durationValue;
      } else if (durationUnit?.startsWith('sec') || durationUnit === 's') {
        durationMinutes = Math.max(1, Math.round(durationValue / 60)); // Minimum 1 minute
      }
    }
    
    // Default duration if none specified
    const duration = durationMinutes !== null ? `${durationMinutes} minutes` : "25 minutes"; // Default to pomodoro length
    
    // Infer activity if not explicitly mentioned
    let activity = focusActivity;
    if (!activity) {
      // Try to infer from recent messages
      const recentMessages = history.slice(-5);
      for (const msg of recentMessages) {
        if (msg.role === 'user' && msg.content) {
          const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          const activityMatch = contentStr.match(/(?:work|working|doing|coding|writing|studying|reading|learning)\s+(?:on|about)?\s+([a-z0-9\s]+)(?:\.|$|\?)/i);
          if (activityMatch && activityMatch[1]) {
            activity = activityMatch[1].trim();
            break;
          }
        }
      }
      
      // If still no activity found, use a generic term
      if (!activity) {
        activity = "work";
      }
    }
    
    logger.info(`${logPrefix} Detected focus mode query for activity: "${activity}" with duration: ${duration}`);
    
    // Get available tools description
    const availableToolsStringified = getToolDescriptionsForPlanner(toolRegistry);
    
    // Prepare history summary
    const historyText = summarizeChatHistory(history, 500);
    
    // Prepare user state summary
    let userStateSummary = "";
    if (userState) {
      userStateSummary = `User: ${userState.user_first_name || "Unknown"}
Locale: ${userState.preferred_locale || "Unknown"}
Timezone: ${userState.timezone || "Unknown"}`;
    }
    
    // Create an enhanced query for generating the focus mode plan
    const enhancedQuery = `Help me focus on ${activity} for ${duration}. I need a distraction-free environment to concentrate deeply.`;
    
    // Generate the focus mode plan
    const { generateFocusModePlan } = require('../providers/llm_clients');
    const planResult = await generateFocusModePlan(
      enhancedQuery,
      historyText,
      personaCustomization,
      userStateSummary,
      availableToolsStringified,
      userId
    );
    
    if (planResult.error) {
      logger.warn(`${logPrefix} Error generating focus mode plan: ${planResult.error}`);
      return { 
        isFocusModeQuery: true, 
        focusActivity: activity, 
        duration: duration, 
        plan: null, 
        error: planResult.error 
      };
    }
    
    if (!planResult.plan) {
      logger.warn(`${logPrefix} No focus mode plan generated`);
      return { 
        isFocusModeQuery: true, 
        focusActivity: activity, 
        duration: duration, 
        plan: null, 
        error: "No plan was generated" 
      };
    }
    
    logger.info(`${logPrefix} Successfully generated focus mode plan for: "${activity}"`);
    return { 
      isFocusModeQuery: true, 
      focusActivity: activity, 
      duration: duration, 
      plan: planResult.plan 
    };
  } catch (error: any) {
    logger.error(`${logPrefix} Error detecting focus mode query:`, error);
    return { 
      isFocusModeQuery: false, 
      focusActivity: null, 
      duration: null, 
      plan: null, 
      error: error.message 
    };
  }
}

/**
 * Enhanced orchestration run that utilizes XML-structured planning with NLU disambiguation
 * This method wraps the main orchestration logic with additional capabilities
 */
export async function runEnhancedOrchestration(
  userId: string,
  userInput: string | ChatMessageContentPart[],
  history: ChatMessage[],
  memoryFramework: CompanionCoreMemory,
  orchestrator: Orchestrator,
  apiContext?: Record<string, any>,
  initialAttachments?: MessageAttachment[]
): Promise<any> {
  const logPrefix = `[EnhancedOrchestration:${userId.slice(0, 6)}]`;
  let enhancedUserInput = userInput;
  let enhancedApiContext = apiContext ? { ...apiContext } : {};
  
  try {
    // Apply NLU disambiguation if input is text and feature is enabled
    if (typeof userInput === 'string' && featureFlags.useNluDisambiguation) {
      try {
        logger.info(`${logPrefix} Applying NLU disambiguation to user query`);
        
        // Run NLU disambiguation directly
        const disambiguationResult = await runNluDisambiguation(
          userId,
          userInput,
          history,
          null, // We'll handle user state retrieval in the function
          memoryFramework
        );
        
        // Only update if disambiguation was successful and produced a different result
        if (disambiguationResult.nluAnalysis) {
          const resolvedQuery = disambiguationResult.nluAnalysis.disambiguated_query || disambiguationResult.nluAnalysis.true_intent;
          
          if (resolvedQuery !== userInput) {
            logger.info(`${logPrefix} Query disambiguated from "${userInput}" to "${resolvedQuery}"`);
            
            // Replace the user input with the disambiguated version
            enhancedUserInput = resolvedQuery;
          } else {
            logger.info(`${logPrefix} Query was not changed, but NLU analysis provides additional context`);
          }
          
          // Add NLU analysis to API context for downstream use
          enhancedApiContext.nluAnalysis = disambiguationResult.nluAnalysis;
          
          // Add recommended tools to API context for optimization
          if (disambiguationResult.recommendedTools && disambiguationResult.recommendedTools.length > 0) {
            enhancedApiContext.recommendedTools = disambiguationResult.recommendedTools;
            
            const topTool = disambiguationResult.recommendedTools[0];
            logger.info(`${logPrefix} Top recommended tool: ${topTool.tool_name} (confidence: ${topTool.confidence})`);
          }
          
          // Add language detection for multilingual support
          if (disambiguationResult.languageDetected) {
            enhancedApiContext.languageDetected = disambiguationResult.languageDetected;
            
            if (disambiguationResult.languageDetected !== 'en') {
              logger.info(`${logPrefix} Non-English language detected: ${disambiguationResult.languageDetected}`);
            }
          }
          
          // Check for multi-intent query if the feature is enabled
          if (typeof enhancedUserInput === 'string' && featureFlags.useXmlStructuredPlanning) {
            try {
              // Create a simple tool registry - in a full implementation, 
              // we would need to add a method to Orchestrator to expose this safely
              const toolRegistry = {}; 
              
              // Get persona customization if available
              const personaCustomization = enhancedApiContext.personaCustomization || null;
              
              // Get user state - temporarily set to null until proper implementation
              const userState = null;
              
              // NEW: Check for learning continuity query
              const learningContinuityResult = await detectLearningContinuityQuery(
                userId,
                enhancedUserInput.toString(),
                history,
                memoryFramework,
                toolRegistry,
                userState,
                personaCustomization
              );
              
              if (learningContinuityResult.isLearningContinuityQuery && learningContinuityResult.plan) {
                logger.info(`${logPrefix} Detected learning continuity query for topic: "${learningContinuityResult.previousTopic}"`);
                
                // Add the learning continuity plan to API context
                enhancedApiContext.learningContinuityPlan = learningContinuityResult.plan;
                enhancedApiContext.isLearningContinuityQuery = true;
                enhancedApiContext.learningTopic = learningContinuityResult.previousTopic;
                enhancedApiContext.learningNextStep = learningContinuityResult.nextStep;
                
                // Generate progression plan for the specific topic
                try {
                  const { generateLearningProgressionPlan } = require('../providers/llm_clients');
                  
                  // Extract previous interactions related to this topic
                  const topicRelatedMemory = await memoryFramework.search_memory(
                    learningContinuityResult.previousTopic || "",
                    userId,
                    { limit: 10, offset: 0 }
                  );
                  
                  let previousInteractions = "";
                  if (topicRelatedMemory && topicRelatedMemory.results.length > 0) {
                    previousInteractions = topicRelatedMemory.results
                      .map(m => m.content)
                      .join("\n");
                  }
                  
                  // Generate the progression plan
                  const progressionPlanResult = await generateLearningProgressionPlan(
                    learningContinuityResult.previousTopic || "",
                    previousInteractions,
                    summarizeChatHistory(history, 500),
                    personaCustomization,
                    userState ? JSON.stringify(userState) : null,
                    getToolDescriptionsForPlanner(toolRegistry),
                    userId
                  );
                  
                  if (progressionPlanResult.plan) {
                    enhancedApiContext.learningProgressionPlan = progressionPlanResult.plan;
                    logger.info(`${logPrefix} Added learning progression plan to API context`);
                    
                    // Create reminders for future learning milestones if available
                    if (progressionPlanResult.plan.continuity_hooks && 
                        progressionPlanResult.plan.continuity_hooks.suggested_milestone_reminder) {
                      const reminder = progressionPlanResult.plan.continuity_hooks.suggested_milestone_reminder;
                      
                      enhancedApiContext.suggestedReminderContent = reminder.content;
                      enhancedApiContext.suggestedReminderTiming = reminder.timing;
                      
                      logger.info(`${logPrefix} Added suggested learning milestone reminder to API context`);
                    }
                  }
                } catch (progressionError) {
                  logger.error(`${logPrefix} Error generating learning progression plan:`, progressionError);
                }
              }
              
              // NEW: Check for progress checkpoint query (only if not a learning continuity query)
              if (!learningContinuityResult.isLearningContinuityQuery) {
                const progressCheckpointResult = await detectProgressCheckpointQuery(
                  userId,
                  enhancedUserInput.toString(),
                  history,
                  memoryFramework,
                  toolRegistry,
                  userState,
                  personaCustomization
                );
                
                if (progressCheckpointResult.isProgressCheckpoint && progressCheckpointResult.plan) {
                  logger.info(`${logPrefix} Detected progress checkpoint query for topic: "${progressCheckpointResult.learningTopic}"`);
                  
                  // Add the progress checkpoint plan to API context
                  enhancedApiContext.progressCheckpointPlan = progressCheckpointResult.plan;
                  enhancedApiContext.isProgressCheckpoint = true;
                  enhancedApiContext.checkpointLearningTopic = progressCheckpointResult.learningTopic;
                  enhancedApiContext.progressStage = progressCheckpointResult.progressStage;
                  
                  logger.info(`${logPrefix} Added progress checkpoint plan to API context`);
                }
              }
              
              // Check for specialized skill learning query (only if no learning continuity or progress checkpoint detected)
              if (!learningContinuityResult.isLearningContinuityQuery && 
                  !(enhancedApiContext.isProgressCheckpoint === true)) {
                
                const skillLearningResult = await detectSkillLearningQuery(
                  userId,
                  enhancedUserInput.toString(),
                  history,
                  toolRegistry,
                  userState,
                  personaCustomization
                );
                
                if (skillLearningResult.isSkillLearningQuery && skillLearningResult.plan) {
                  logger.info(`${logPrefix} Detected skill learning query, adding specialized plan`);
                  
                  // Add the skill learning plan to the API context
                  enhancedApiContext.skillLearningPlan = skillLearningResult.plan;
                  enhancedApiContext.isSkillLearningQuery = true;
                  
                  // Parse XML to extract key details
                  try {
                    const { parseSkillLearningPlanFromXml } = require('../utils/xml-processor');
                    const parsedPlan = parseSkillLearningPlanFromXml(skillLearningResult.plan);
                    if (parsedPlan) {
                      enhancedApiContext.parsedSkillLearningPlan = parsedPlan;
                    }
                  } catch (parseError) {
                    logger.warn(`${logPrefix} Error parsing skill learning plan XML:`, parseError);
                  }
                  
                  // Add enhanced reasoning for skill learning as well
                  try {
                    const { generateEnhancedReasoning } = require('../providers/llm_clients');
                    
                    // Prepare data for enhanced reasoning
                    const chatHistorySummary = summarizeChatHistory(history, 500);
                    
                    // Extract tool information from the skill learning plan
                    let parallelToolsInfo = "";
                    try {
                      const { parseSkillLearningPlanFromXml } = require('../utils/xml-processor');
                      const parsedPlan = parseSkillLearningPlanFromXml(skillLearningResult.plan);
                      
                      if (parsedPlan && parsedPlan.tool_orchestration && parsedPlan.tool_orchestration.parallel_groups) {
                        parsedPlan.tool_orchestration.parallel_groups.forEach((group: any, index: number) => {
                          parallelToolsInfo += `Group ${index + 1}: Skill Learning\n`;
                          if (group.tools) {
                            group.tools.forEach((tool: any) => {
                              parallelToolsInfo += `Tool: ${tool.tool_name || 'Unknown'}\n`;
                              parallelToolsInfo += `Purpose: ${tool.purpose || 'Skill learning assistance'}\n\n`;
                            });
                          }
                        });
                      }
                    } catch (parseError) {
                      logger.warn(`${logPrefix} Error parsing skill learning plan for reasoning:`, parseError);
                    }
                    
                    // Generate the enhanced reasoning
                    const enhancedReasoningResult = await generateEnhancedReasoning(
                      enhancedUserInput.toString(),
                      chatHistorySummary,
                      personaCustomization,
                      userState ? JSON.stringify(userState) : null,
                      "Skill learning plan created",
                      parallelToolsInfo || "Multiple learning resources will be used in this learning plan",
                      enhancedApiContext.languageDetected || 'en',
                      userId
                    );
                    
                    if (enhancedReasoningResult.reasoning) {
                      enhancedApiContext.enhancedReasoning = enhancedReasoningResult.reasoning;
                      logger.info(`${logPrefix} Added enhanced reasoning to skill learning context`);
                    }
                  } catch (reasoningError) {
                    logger.error(`${logPrefix} Error generating enhanced reasoning for skill learning:`, reasoningError);
                  }
                }
              }
              
              // Detect if this is a multi-intent query (if none of the specialized query types matched)
              if (!learningContinuityResult.isLearningContinuityQuery &&
                  !(enhancedApiContext.isProgressCheckpoint === true) &&
                  !(enhancedApiContext.isSkillLearningQuery === true)) {
                
                const multiIntentResult = await detectMultiIntentQuery(
                  userId,
                  enhancedUserInput.toString(),
                  history,
                  toolRegistry,
                  personaCustomization
                );
                
                if (multiIntentResult.isMultiIntent) {
                  logger.info(`${logPrefix} Detected multi-intent query, generating CoT plan`);
                  
                  // Generate a Chain-of-Thought plan for this multi-intent query
                  const cotPlanResult = await generateCoTExecutionPlan(
                    userId,
                    enhancedUserInput.toString(),
                    history,
                    toolRegistry,
                    userState,
                    personaCustomization,
                    disambiguationResult.nluAnalysis
                  );
                  
                  if (cotPlanResult.plan) {
                    // Add the CoT plan to the API context
                    enhancedApiContext.cotPlan = cotPlanResult.plan;
                    enhancedApiContext.isMultiIntentQuery = true;
                    
                    logger.info(`${logPrefix} Added Chain-of-Thought plan to API context`);
                    
                    // Generate enhanced reasoning to better explain the LLM's thought process
                    try {
                      const { generateEnhancedReasoning } = require('../providers/llm_clients');
                      
                      // Prepare data for enhanced reasoning
                      const chatHistorySummary = summarizeChatHistory(history, 500);
                      
                      // Prepare tool information for reasoning
                      let parallelToolsInfo = "";
                      if (cotPlanResult.plan.plan?.execution_groups) {
                        cotPlanResult.plan.plan.execution_groups.forEach((group: any, index: number) => {
                          parallelToolsInfo += `Group ${index + 1} (${group.intent_addressed || 'General'}):\n`;
                          group.steps.forEach((step: any) => {
                            if (step.type === 'tool_call') {
                              parallelToolsInfo += `- ${step.tool_name}: ${step.description}\n`;
                            }
                          });
                        });
                      }
                      
                      // Generate the enhanced reasoning
                      const enhancedReasoningResult = await generateEnhancedReasoning(
                        enhancedUserInput.toString(),
                        chatHistorySummary,
                        personaCustomization,
                        userState ? JSON.stringify(userState) : null,
                        "Will be generated after tool execution",
                        parallelToolsInfo,
                        enhancedApiContext.languageDetected || 'en',
                        userId
                      );
                      
                      if (enhancedReasoningResult.reasoning) {
                        enhancedApiContext.enhancedReasoning = enhancedReasoningResult.reasoning;
                        logger.info(`${logPrefix} Added enhanced reasoning to API context`);
                      }
                    } catch (reasoningError) {
                      logger.error(`${logPrefix} Error generating enhanced reasoning:`, reasoningError);
                    }
                    
                    // Generate multi-tool orchestration explanation for UI
                    try {
                      const { generateMultiToolOrchestrationExplanation } = require('../providers/llm_clients');
                      
                      // Prepare tool information for orchestration explanation
                      let toolsUsedInfo = "";
                      let executionPattern = "sequential";
                      
                      if (cotPlanResult.plan.plan?.execution_groups) {
                        const groups = cotPlanResult.plan.plan.execution_groups;
                        
                        // Determine execution pattern
                        if (groups.length > 1) {
                          executionPattern = "parallel_groups";
                        } else if (groups.length === 1 && groups[0].steps.some((step: any) => step.parallel === true)) {
                          executionPattern = "parallel_within_group";
                        }
                        
                        // Format tools used info
                        groups.forEach((group: any, index: number) => {
                          toolsUsedInfo += `Group ${index + 1}: ${group.intent_addressed || 'General'}\n`;
                          group.steps.forEach((step: any) => {
                            if (step.type === 'tool_call') {
                              toolsUsedInfo += `Tool: ${step.tool_name}\n`;
                              toolsUsedInfo += `Purpose: ${step.description}\n`;
                              toolsUsedInfo += `Reason: ${step.reason}\n`;
                              toolsUsedInfo += `Dependencies: ${step.dependencies || 'None'}\n`;
                              toolsUsedInfo += `Parallel: ${step.parallel === true ? 'Yes' : 'No'}\n\n`;
                            }
                          });
                        });
                      }
                      
                      // Generate the orchestration explanation
                      const orchestrationExplanationResult = await generateMultiToolOrchestrationExplanation(
                        enhancedUserInput.toString(),
                        toolsUsedInfo,
                        executionPattern,
                        personaCustomization,
                        enhancedApiContext.languageDetected || 'en',
                        userId
                      );
                      
                      if (orchestrationExplanationResult.explanation) {
                        enhancedApiContext.orchestrationExplanation = orchestrationExplanationResult.explanation;
                        logger.info(`${logPrefix} Added multi-tool orchestration explanation to API context`);
                      }
                    } catch (explanationError) {
                      logger.error(`${logPrefix} Error generating orchestration explanation:`, explanationError);
                    }
                    
                    // Store original query for reference
                    enhancedApiContext.originalUserQuery = typeof userInput === 'string' ? userInput : enhancedUserInput;
                    
                    // Setup callback for UI card reasoning generation after tools are executed
                    enhancedApiContext.generateUICardReasoning = true;
                  } else {
                    logger.warn(`${logPrefix} Failed to generate CoT plan: ${cotPlanResult.error}`);
                  }
                }
              }
              
              // Check for specialized news aggregation query (if no other specialized query types matched)
              if (!learningContinuityResult.isLearningContinuityQuery &&
                  !(enhancedApiContext.isProgressCheckpoint === true) &&
                  !(enhancedApiContext.isSkillLearningQuery === true) &&
                  !(enhancedApiContext.isMultiIntentQuery === true)) {
                
                const newsAggregationResult = await detectNewsAggregationQuery(
                  userId,
                  enhancedUserInput.toString(),
                  history,
                  toolRegistry,
                  userState,
                  personaCustomization
                );
                
                if (newsAggregationResult.isNewsAggregationQuery && newsAggregationResult.plan) {
                  logger.info(`${logPrefix} Detected news aggregation query, adding specialized plan`);
                  
                  // Add the news aggregation plan to the API context
                  enhancedApiContext.newsAggregationPlan = newsAggregationResult.plan;
                  enhancedApiContext.isNewsAggregationQuery = true;
                  
                  // Parse XML to extract key details
                  try {
                    const { parseNewsDeepDivePlanFromXml } = require('../utils/xml-processor');
                    const parsedPlan = parseNewsDeepDivePlanFromXml(newsAggregationResult.plan);
                    if (parsedPlan) {
                      enhancedApiContext.parsedNewsAggregationPlan = parsedPlan;
                    }
                  } catch (parseError) {
                    logger.warn(`${logPrefix} Error parsing news aggregation plan XML:`, parseError);
                  }
                }
              }
              
              // Check for focus mode query (if no other specialized query types matched)
              if (!learningContinuityResult.isLearningContinuityQuery &&
                  !(enhancedApiContext.isProgressCheckpoint === true) &&
                  !(enhancedApiContext.isSkillLearningQuery === true) &&
                  !(enhancedApiContext.isMultiIntentQuery === true) &&
                  !(enhancedApiContext.isNewsAggregationQuery === true)) {
                
                const focusModeResult = await detectFocusModeQuery(
                  userId,
                  enhancedUserInput.toString(),
                  history,
                  toolRegistry,
                  userState,
                  personaCustomization
                );
                
                if (focusModeResult.isFocusModeQuery && focusModeResult.plan) {
                  logger.info(`${logPrefix} Detected focus mode query, adding specialized plan`);
                  
                  // Add the focus mode plan to the API context
                  enhancedApiContext.focusModePlan = focusModeResult.plan;
                  enhancedApiContext.isFocusModeQuery = true;
                  enhancedApiContext.focusActivity = focusModeResult.focusActivity;
                  enhancedApiContext.focusDuration = focusModeResult.duration;
                  
                  // Parse XML to extract key details
                  try {
                    const { parseFocusModePlanFromXml } = require('../utils/xml-processor');
                    const parsedPlan = parseFocusModePlanFromXml(focusModeResult.plan);
                    if (parsedPlan) {
                      enhancedApiContext.parsedFocusModePlan = parsedPlan;
                    }
                  } catch (parseError) {
                    logger.warn(`${logPrefix} Error parsing focus mode plan XML:`, parseError);
                  }
                  
                  // Generate enhanced reasoning for focus mode as well
                  try {
                    const { generateEnhancedReasoning } = require('../providers/llm_clients');
                    
                    // Prepare data for enhanced reasoning
                    const chatHistorySummary = summarizeChatHistory(history, 500);
                    
                    // Extract tool information from the focus mode plan
                    let parallelToolsInfo = "";
                    try {
                      const { parseFocusModePlanFromXml } = require('../utils/xml-processor');
                      const parsedPlan = parseFocusModePlanFromXml(focusModeResult.plan);
                      
                      if (parsedPlan && parsedPlan.tool_orchestration && parsedPlan.tool_orchestration.parallel_group) {
                        const tools = parsedPlan.tool_orchestration.parallel_group.tool || [];
                        (Array.isArray(tools) ? tools : [tools]).forEach((tool: any) => {
                          parallelToolsInfo += `Tool: ${tool.tool_name || 'Unknown'}\n`;
                          parallelToolsInfo += `Purpose: ${tool.purpose || 'Focus enhancement'}\n\n`;
                        });
                      }
                    } catch (parseError) {
                      logger.warn(`${logPrefix} Error parsing focus mode plan for reasoning:`, parseError);
                    }
                    
                    // Generate the enhanced reasoning
                    const enhancedReasoningResult = await generateEnhancedReasoning(
                      enhancedUserInput.toString(),
                      chatHistorySummary,
                      personaCustomization,
                      userState ? JSON.stringify(userState) : null,
                      "Focus mode session created",
                      parallelToolsInfo || "Multiple focus-enhancing resources will be used",
                      enhancedApiContext.languageDetected || 'en',
                      userId
                    );
                    
                    if (enhancedReasoningResult.reasoning) {
                      enhancedApiContext.enhancedReasoning = enhancedReasoningResult.reasoning;
                      logger.info(`${logPrefix} Added enhanced reasoning to focus mode context`);
                    }
                  } catch (reasoningError) {
                    logger.error(`${logPrefix} Error generating enhanced reasoning for focus mode:`, reasoningError);
                  }
                }
              }
              
              // Generate proactive suggestions periodically (only if no other special query type detected)
              if (!learningContinuityResult.isLearningContinuityQuery && 
                  !(enhancedApiContext.isProgressCheckpoint === true) &&
                  !(enhancedApiContext.isSkillLearningQuery === true) &&
                  !(enhancedApiContext.isMultiIntentQuery === true) &&
                  !(enhancedApiContext.isNewsAggregationQuery === true) &&
                  !(enhancedApiContext.isFocusModeQuery === true) &&
                  Math.random() < 0.2) { // 20% chance to generate proactive suggestions
                
                logger.info(`${logPrefix} Generating proactive life improvement suggestions`);
                
                const proactiveSuggestionsResult = await generateProactiveSuggestions(
                  userId,
                  enhancedUserInput.toString(),
                  history,
                  memoryFramework,
                  toolRegistry,
                  userState,
                  personaCustomization
                );
                
                if (proactiveSuggestionsResult.plan) {
                  logger.info(`${logPrefix} Generated proactive suggestions, adding to context`);
                  
                  // Add the proactive suggestions to the API context
                  enhancedApiContext.proactiveSuggestionPlan = proactiveSuggestionsResult.plan;
                  enhancedApiContext.hasProactiveSuggestions = true;
                  
                  // Parse XML to extract key details
                  try {
                    const { parseProactiveSuggestionPlanFromXml } = require('../utils/xml-processor');
                    const parsedPlan = parseProactiveSuggestionPlanFromXml(proactiveSuggestionsResult.plan);
                    if (parsedPlan) {
                      enhancedApiContext.parsedProactiveSuggestions = parsedPlan;
                    }
                  } catch (parseError) {
                    logger.warn(`${logPrefix} Error parsing proactive suggestions XML:`, parseError);
                  }
                }
              }
            } catch (error) {
              logger.error(`${logPrefix} Error during specialized orchestration detection:`, error);
              // Continue with normal orchestration if detection fails
            }
          }
        } else {
          logger.info(`${logPrefix} No disambiguation needed or possible for: "${userInput}"`);
        }
      } catch (error) {
        logger.error(`${logPrefix} Error during NLU disambiguation:`, error);
        // Continue with original input if disambiguation fails
      }
    }
    
    // Run the orchestration with potentially modified input and context
    return await orchestrator.runOrchestration(
      userId,
      enhancedUserInput,
      history,
      enhancedApiContext,
      initialAttachments
    );
  } catch (error) {
    logger.error(`${logPrefix} Enhanced orchestration error:`, error);
    throw error;
  }
} 