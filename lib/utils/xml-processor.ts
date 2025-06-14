import { logger } from "@/memory-framework/config";
import { 
  XmlPlan, XmlPlanStep, XmlVerification, XmlVerificationIssue, 
  XmlVerificationSuggestion, XmlQueryClassification, XmlParallelExecutionPlan,
  XmlNluAnalysis, XmlNluConfidence, XmlResolutionSource, XmlEntity,
  XmlEntitySource, XmlSentimentPrimary, XmlSentimentSecondary,
  XmlSentimentIntensity, XmlImplicitNeed, XmlConversationReference,
  XmlParallelExecutionGroup, XmlSequentialDependency, XmlReference,
  XmlToolRanking
} from "../types";

/**
 * A simple XML parser class for the parseFocusModePlanFromXml function
 */
class XMLParser {
  parse(xml: string): any {
    // Simple implementation to extract the focus_mode_plan content
    const result: any = {};
    
    // Extract focus_mode_plan content
    const focusModeMatch = xml.match(/<focus_mode_plan>([\s\S]*?)<\/focus_mode_plan>/);
    if (focusModeMatch) {
      result.focus_mode_plan = this.parseContent(focusModeMatch[1]);
    }
    
    return result;
  }
  
  private parseContent(content: string): any {
    const result: any = {};
    
    // Extract basic properties using regex
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) result.title = titleMatch[1].trim();
    
    const descriptionMatch = content.match(/<description>([\s\S]*?)<\/description>/);
    if (descriptionMatch) result.description = descriptionMatch[1].trim();
    
    // Extract other properties as needed
    
    return result;
  }
}

/**
 * Helper function to get all regex matches with capture groups
 * @param text Text to search in
 * @param regex Regular expression with groups
 * @returns Array of matches
 */
function getAllMatches(text: string, regex: RegExp): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  
  // Reset regex to start from the beginning
  regex.lastIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match);
    
    // Prevent infinite loops for zero-length matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }
  
  return matches;
}

/**
 * Mock implementation of getFirstElementByTagName for the DOM-dependent functions
 * @param element Parent element
 * @param tagName Tag name to search for
 * @returns First matching element or null
 */
function getFirstElementByTagName(element: any, tagName: string): any {
  // This is a simplified implementation
  if (!element || !element.getElementsByTagName) {
    return null;
  }
  
  const elements = element.getElementsByTagName(tagName);
  return elements && elements.length > 0 ? elements[0] : null;
}

/**
 * Mock implementation of getTextContent for the DOM-dependent functions
 * @param element Parent element
 * @param tagName Tag name to get content from
 * @returns Text content or empty string
 */
function getTextContent(element: any, tagName: string): string {
  if (!element || !element.getElementsByTagName) {
    return '';
  }
  
  const elements = element.getElementsByTagName(tagName);
  if (!elements || elements.length === 0) {
    return '';
  }
  
  return elements[0].textContent || '';
}

/**
 * Mock implementation of extractArrayOfTextElements for DOM-dependent functions
 * @param element Parent element
 * @param containerTagName Container tag name
 * @param itemTagName Item tag name
 * @returns Array of text content
 */
function extractArrayOfTextElements(element: any, containerTagName: string, itemTagName: string): string[] {
  const result: string[] = [];
  
  if (!element || !element.getElementsByTagName) {
    return result;
  }
  
  const containers = element.getElementsByTagName(containerTagName);
  if (!containers || containers.length === 0) {
    return result;
  }
  
  const container = containers[0];
  const items = container.getElementsByTagName(itemTagName);
  
  for (let i = 0; i < items.length; i++) {
    const text = items[i].textContent;
    if (text) {
      result.push(text);
    }
  }
  
  return result;
}

/**
 * Mock DOMParser for browser compatibility in Node.js environment
 */
class DOMParser {
  parseFromString(xmlString: string, mimeType: string): any {
    // Create a simple document-like object
    const doc: any = {
      documentElement: null,
    };
    
    // Extract the root element name and content
    const rootMatch = xmlString.match(/<([^\s>]+)([^>]*)>([\s\S]*?)<\/\1>/);
    if (rootMatch) {
      const [_, tagName, attributes, content] = rootMatch;
      
      // Create a simple element-like object
      doc.documentElement = this.createElementFromTag(tagName, content);
    }
    
    return doc;
  }
  
  private createElementFromTag(tagName: string, content: string): any {
    const element: any = {
      tagName: tagName,
      textContent: content,
      getElementsByTagName: (name: string) => {
        const elements: any[] = [];
        
        // Match all instances of the tag
        const regex = new RegExp(`<${name}[^>]*>([\s\S]*?)<\/${name}>`, 'g');
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          elements.push(this.createElementFromTag(name, match[1]));
        }
        
        return elements;
      }
    };
    
    return element;
  }
}

/**
 * Enum of XML elements we expect to process
 */
export enum PromptElementType {
  // Top-level plan elements
  PLAN = "plan",
  VERIFICATION = "verification",
  CLASSIFICATION = "classification",
  PARALLEL_EXECUTION_PLAN = "parallel_execution_plan",
  CHAIN_OF_THOUGHT_PLAN = "chain_of_thought_plan",
  
  // Plan sub-elements
  GOAL = "goal",
  REASONING = "reasoning",
  STEPS = "steps",
  STEP = "step",
  IS_PARTIAL = "is_partial",
  CONTINUATION_SUMMARY = "continuation_summary",
  
  // Meta analysis elements for chain of thought
  META_ANALYSIS = "meta_analysis",
  IDENTIFIED_INTENTS = "identified_intents",
  INTENT = "intent",
  USER_PREFERENCES = "user_preferences",
  PREFERENCE = "preference",
  EXECUTION_STRATEGY = "execution_strategy",
  
  // Intent elements
  INTENT_NAME = "name",
  IMPORTANCE = "importance",
  EXPLICIT = "explicit",
  KEY_PHRASES = "key_phrases",
  
  // Preference elements
  PREFERENCE_TYPE = "type",
  PREFERENCE_VALUE = "value",
  PREFERENCE_SOURCE = "source",
  
  // Execution strategy elements
  PARALLELISM_OPPORTUNITY = "parallelism_opportunity",
  SUCCESS_CRITERIA = "success_criteria",
  
  // Execution groups
  EXECUTION_GROUPS = "execution_groups",
  GROUP = "group",
  INTENT_ADDRESSED = "intent_addressed",
  
  // Response synthesis elements
  RESPONSE_SYNTHESIS_STRATEGY = "response_synthesis_strategy",
  ORGANIZATION = "organization",
  SECTION = "section",
  TITLE = "title",
  CONTENT_FROM = "content_from",
  PRESENTATION = "presentation",
  ADAPTIVE_ELEMENTS = "adaptive_elements",
  ELEMENT = "element",
  ELEMENT_TYPE = "type",
  TRIGGER = "trigger",
  CONTENT = "content",
  
  // Step sub-elements
  ID = "id",
  TYPE = "type",
  TOOL_NAME = "tool_name",
  ARGUMENTS = "arguments",
  DESCRIPTION = "description",
  REASON = "reason",
  DEPENDENCIES = "dependencies",
  PARALLEL = "parallel",
  FALLBACK_STRATEGY = "fallback_strategy",
  
  // Verification sub-elements
  PLAN_ID = "plan_id",
  IS_VALID = "is_valid",
  ISSUES = "issues",
  ISSUE = "issue",
  SUGGESTIONS = "suggestions",
  SUGGESTION = "suggestion",
  CORRECTED_PLAN = "corrected_plan",
  
  // Issue sub-elements
  ISSUE_TYPE = "type",
  ISSUE_DESCRIPTION = "description",
  LOCATION = "location",
  SEVERITY = "severity",
  SUGGESTED_FIX = "suggested_fix",
  
  // Suggestion sub-elements
  TARGET = "target",
  IMPROVEMENT = "improvement",
  
  // Classification sub-elements
  CATEGORY = "category",
  CONFIDENCE = "confidence",
  COMPLEXITY = "complexity",
  TIME_SENSITIVITY = "time_sensitivity",
  PARALLEL_OPPORTUNITY = "parallel_opportunity",
  SUGGESTED_APPROACH = "suggested_approach",
  
  // Intent analysis elements
  INTENT_ANALYSIS = "intent_analysis",
  INTENT_COUNT = "count",
  PRIMARY_INTENT = "primary_intent",
  SECONDARY_INTENTS = "secondary_intents",
  
  // Parallel execution plan sub-elements
  SEQUENTIAL_DEPENDENCIES = "sequential_dependencies",
  DEPENDENCY = "dependency",
  GROUP_ID = "group_id",
  DEPENDS_ON = "depends_on",
  EXECUTION_PRIORITY = "execution_priority",
  PRIORITY_GROUP = "priority_group",
  GROUP_IDS = "group_ids",
  
  // For steps within parallel execution
  STEPS_ID = "steps",
  STEP_ID = "step_id",
  
  // NLU Analysis elements
  NLU_ANALYSIS = "nlu_analysis",
  ORIGINAL_QUERY = "original_query",
  DISAMBIGUATED_QUERY = "disambiguated_query",
  ENTITIES = "entities",
  ENTITY = "entity",
  ENTITY_NAME = "name",
  ENTITY_TYPE = "type",
  REFERENCE_TYPE = "reference_type",
  LINKED_TO = "linked_to",
  REFERENCES = "references",
  REFERENCE = "reference",
  EXPRESSION = "expression",
  RESOLVED_TO = "resolved_to",
  IMPLICIT_NEEDS = "implicit_needs",
  NEED = "need",
  TRUE_INTENT = "true_intent",
  POTENTIAL_TOOLS = "potential_tools",
  TOOL = "tool",
  LANGUAGE_DETECTED = "language_detected",
  AMBIGUITY_RESOLUTION = "ambiguity_resolution",
  
  // Tool ranking elements
  TOOL_CONFIDENCE = "confidence",
  TOOL_REASONING = "reasoning",
  
  // Skill Learning Plan elements
  SKILL_LEARNING_PLAN = "skill_learning_plan",
  SKILL_DETAILS = "skill_details",
  SKILL_NAME = "skill_name",
  SKILL_CATEGORY = "skill_category",
  DIFFICULTY_LEVEL = "difficulty_level",
  TIME_COMMITMENT = "time_commitment",
  LEARNING_PHASES = "learning_phases",
  PHASE = "phase",
  PHASE_NAME = "name",
  SKILL_TOOL_ORCHESTRATION = "tool_orchestration",
  SKILL_PARALLEL_GROUP = "parallel_group",
  SKILL_TOOL = "tool",
  SKILL_PURPOSE = "purpose",
  OUTCOME = "outcome",
  SKILL_ENGAGEMENT_HOOKS = "engagement_hooks",
  REMINDER_SUGGESTIONS = "reminder_suggestions",
  REMINDER = "reminder",
  REMINDER_TIMING = "timing",
  REMINDER_RECURRENCE = "recurrence",
  FOLLOW_UP_PROMPTS = "follow_up_prompts",
  FOLLOW_UP_PROMPT = "prompt",
  MILESTONE_CELEBRATIONS = "milestone_celebrations",
  MILESTONE = "milestone",
  SKILL_PERSONALIZATION = "personalization",
  MOTIVATIONAL_APPROACH = "motivational_approach",
  MOTIVATIONAL_STYLE = "style",
  MOTIVATIONAL_KEY_PHRASES = "key_phrases",
  LEARNING_STYLE_ADAPTATION = "learning_style_adaptation",
  CONNECTION_TO_INTERESTS = "connection_to_interests",
  
  // News Deep Dive Plan elements
  NEWS_DEEP_DIVE_PLAN = "news_deep_dive_plan",
  TOPIC_ANALYSIS = "topic_analysis",
  CORE_TOPIC = "core_topic",
  SUBTOPICS = "subtopics",
  SUBTOPIC = "subtopic",
  KEY_ENTITIES = "key_entities",
  NEWS_ENTITY = "entity",
  NEWS_ENTITY_NAME = "name",
  NEWS_ENTITY_TYPE = "type",
  NEWS_ENTITY_RELEVANCE = "relevance",
  NEWS_TIMEFRAME = "timeframe",
  INFORMATION_GATHERING = "information_gathering",
  FACT_FINDING_PHASE = "fact_finding_phase",
  OPINION_DISCUSSION_PHASE = "opinion_discussion_phase",
  NEWS_TOOL_ORCHESTRATION = "tool_orchestration",
  NEWS_PARALLEL_GROUP = "parallel_group",
  NEWS_TOOL = "tool",
  NEWS_PURPOSE = "purpose",
  SYNTHESIS_APPROACH = "synthesis_approach",
  NEWS_CATEGORIZATION = "categorization",
  NEWS_CATEGORY = "category",
  NEWS_SOURCES = "sources",
  CONTRASTING_VIEWPOINTS = "contrasting_viewpoints",
  CHRONOLOGICAL_DEVELOPMENT = "chronological_development",
  NEWS_ENGAGEMENT_HOOKS = "engagement_hooks",
  FOLLOW_UP_OPTIONS = "follow_up_options",
  FOLLOW_UP_OPTION = "option",
  MONITORING_SUGGESTIONS = "monitoring_suggestions",
  MONITORING_METHOD = "method",
  RELATED_TOPICS = "related_topics",
  TOPIC_CONNECTION = "connection",
  
  // Proactive Suggestion Plan elements
  PROACTIVE_SUGGESTION_PLAN = "proactive_suggestion_plan",
  CONTEXT_ANALYSIS = "context_analysis",
  CURRENT_PRIORITIES = "current_priorities",
  CURRENT_PRIORITY = "priority",
  PRIORITY_SOURCE = "source",
  PRIORITY_TIMEFRAME = "timeframe",
  ONGOING_INTERESTS = "ongoing_interests",
  ONGOING_INTEREST = "interest",
  INTEREST_TOPIC = "topic",
  ENGAGEMENT_LEVEL = "engagement_level",
  LAST_DISCUSSED = "last_discussed",
  UPCOMING_EVENTS = "upcoming_events",
  UPCOMING_EVENT = "event",
  EVENT_DATE = "date",
  PREPARATION_NEEDED = "preparation_needed",
  RECURRING_PATTERNS = "recurring_patterns",
  RECURRING_PATTERN = "pattern",
  PATTERN_BEHAVIOR = "behavior",
  PATTERN_FREQUENCY = "frequency",
  LAST_OCCURRENCE = "last_occurrence",
  SUGGESTION_OPPORTUNITIES = "suggestion_opportunities",
  SUGGESTION_OPPORTUNITY = "opportunity",
  OPPORTUNITY_TRIGGER = "trigger",
  OPPORTUNITY_RELEVANCE = "relevance",
  TIMING_APPROPRIATENESS = "timing_appropriateness",
  PERSONALIZATION_FACTORS = "personalization_factors",
  PROACTIVE_TOOL_ORCHESTRATION = "tool_orchestration",
  PROACTIVE_PARALLEL_GROUP = "parallel_group",
  PROACTIVE_TOOL = "tool",
  PROACTIVE_PURPOSE = "purpose",
  SUGGESTION_CONTENT = "suggestion_content",
  SUGGESTION_TITLE = "title",
  SUGGESTION_DESCRIPTION = "description",
  SUGGESTION_BENEFIT = "benefit",
  SUGGESTION_TONE = "tone",
  SUGGESTION_FOLLOW_UP = "follow_up",
  PRESENTATION_STRATEGY = "presentation_strategy",
  PRESENTATION_TIMING = "timing",
  PRESENTATION_APPROACH = "approach",
  CONNECTION_TO_CONTEXT = "connection_to_context",
  OPT_OUT = "opt_out",
  
  // Generic
  UNKNOWN = "unknown"
}

/**
 * Extract content from XML tag
 * @param xml XML string
 * @param tagName Name of the tag to extract
 * @returns Content of the tag or null if not found
 */
export function extractXmlContent(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\\/${tagName}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract all instances of content from XML tags
 * @param xml XML string
 * @param tagName Name of the tag to extract
 * @returns Array of tag contents
 */
export function extractAllXmlContent(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\\/${tagName}>`, 'gs');
  const matches = [...xml.matchAll(regex)];
  return matches.map(match => match[1].trim());
}

/**
 * Extract key-value pairs from an arguments XML element
 * @param argumentsXml - XML content of arguments element
 * @returns Object with arguments as key-value pairs
 */
export function extractArgumentsFromXml(argumentsXml: string): Record<string, any> {
  const args: Record<string, any> = {};
  const pattern = /<([^>]+)>([^<]*)<\/\1>/g;
  let match;
  
  while ((match = pattern.exec(argumentsXml)) !== null) {
    const [_, key, value] = match;
    args[key] = value.trim();
  }
  
  return args;
}

/**
 * Extract steps from a plan XML
 * @param planXml - XML content of plan
 * @returns Array of parsed steps
 */
export function extractStepsFromPlanXml(planXml: string): any[] {
  const stepsXml = extractXmlContent(planXml, PromptElementType.STEPS);
  if (!stepsXml) return [];
  
  const stepXmlArray = extractAllXmlContent(stepsXml, PromptElementType.STEP);
  return stepXmlArray.map(stepXml => {
    const id = extractXmlContent(stepXml, PromptElementType.ID);
    const type = extractXmlContent(stepXml, PromptElementType.TYPE);
    const toolName = extractXmlContent(stepXml, PromptElementType.TOOL_NAME);
    const argumentsXml = extractXmlContent(stepXml, PromptElementType.ARGUMENTS);
    const description = extractXmlContent(stepXml, PromptElementType.DESCRIPTION);
    const reason = extractXmlContent(stepXml, PromptElementType.REASON);
    const dependencies = extractXmlContent(stepXml, PromptElementType.DEPENDENCIES);
    const parallel = extractXmlContent(stepXml, PromptElementType.PARALLEL);
    
    return {
      id: id ? parseInt(id, 10) : null,
      type: type || null,
      toolName: toolName || null,
      arguments: argumentsXml ? extractArgumentsFromXml(argumentsXml) : {},
      description: description || null,
      reason: reason || null,
      dependencies: dependencies ? dependencies.split(',').map(d => d.trim()) : [],
      parallel: parallel ? parallel.toLowerCase() === 'true' : false
    };
  });
}

/**
 * Parse a complete plan from XML
 * @param xmlContent - XML content containing a plan
 * @returns Parsed plan object or null if parsing fails
 */
export function parsePlanFromXml(xmlContent: string): any | null {
  try {
    const planXml = extractXmlContent(xmlContent, PromptElementType.PLAN);
    if (!planXml) return null;
    
    const goal = extractXmlContent(planXml, PromptElementType.GOAL);
    const reasoning = extractXmlContent(planXml, PromptElementType.REASONING);
    const isPartial = extractXmlContent(planXml, PromptElementType.IS_PARTIAL);
    const continuationSummary = extractXmlContent(planXml, PromptElementType.CONTINUATION_SUMMARY);
    const steps = extractStepsFromPlanXml(planXml);
    
    return {
      goal: goal || null,
      reasoning: reasoning || null,
      steps: steps,
      is_partial_plan: isPartial ? isPartial.toLowerCase() === 'true' : false,
      continuation_summary: continuationSummary || null
    };
  } catch (error) {
    logger.error("Error parsing plan from XML:", error);
    return null;
  }
}

/**
 * Parse verification results from XML
 * @param xmlContent - XML content containing verification results
 * @returns Parsed verification object or null if parsing fails
 */
export function parseVerificationFromXml(xmlContent: string): any | null {
  try {
    const verificationXml = extractXmlContent(xmlContent, PromptElementType.VERIFICATION);
    if (!verificationXml) return null;
    
    const planId = extractXmlContent(verificationXml, PromptElementType.PLAN_ID);
    const isValid = extractXmlContent(verificationXml, PromptElementType.IS_VALID);
    
    // Parse issues
    const issuesXml = extractXmlContent(verificationXml, PromptElementType.ISSUES);
    const issues = issuesXml ? extractAllXmlContent(issuesXml, PromptElementType.ISSUE).map(issueXml => {
      return {
        type: extractXmlContent(issueXml, PromptElementType.ISSUE_TYPE),
        description: extractXmlContent(issueXml, PromptElementType.ISSUE_DESCRIPTION),
        location: extractXmlContent(issueXml, PromptElementType.LOCATION),
        severity: extractXmlContent(issueXml, PromptElementType.SEVERITY),
        suggested_fix: extractXmlContent(issueXml, PromptElementType.SUGGESTED_FIX)
      };
    }) : [];
    
    // Parse suggestions
    const suggestionsXml = extractXmlContent(verificationXml, PromptElementType.SUGGESTIONS);
    const suggestions = suggestionsXml ? extractAllXmlContent(suggestionsXml, PromptElementType.SUGGESTION).map(suggestionXml => {
      return {
        target: extractXmlContent(suggestionXml, PromptElementType.TARGET),
        improvement: extractXmlContent(suggestionXml, PromptElementType.IMPROVEMENT),
        reasoning: extractXmlContent(suggestionXml, PromptElementType.REASONING)
      };
    }) : [];
    
    // Parse corrected plan if present
    const correctedPlanXml = extractXmlContent(verificationXml, PromptElementType.CORRECTED_PLAN);
    const correctedPlan = correctedPlanXml ? parsePlanFromXml(correctedPlanXml) : null;
    
    return {
      plan_id: planId,
      is_valid: isValid ? isValid.toLowerCase() === 'true' : false,
      issues,
      suggestions,
      corrected_plan: correctedPlan
    };
  } catch (error) {
    logger.error("Error parsing verification from XML:", error);
    return null;
  }
}

/**
 * Parse a chain of thought plan from XML
 * @param xmlContent - XML content containing a chain of thought plan
 * @returns Parsed chain of thought plan object or null if parsing fails
 */
export function parseChainOfThoughtPlanFromXml(xmlContent: string): any | null {
  try {
    const cotPlanXml = extractXmlContent(xmlContent, PromptElementType.CHAIN_OF_THOUGHT_PLAN);
    if (!cotPlanXml) return null;
    
    // Parse meta analysis
    const metaAnalysisXml = extractXmlContent(cotPlanXml, PromptElementType.META_ANALYSIS);
    let metaAnalysis = null;
    
    if (metaAnalysisXml) {
      // Parse identified intents
      const identifiedIntentsXml = extractXmlContent(metaAnalysisXml, PromptElementType.IDENTIFIED_INTENTS);
      const identifiedIntents = identifiedIntentsXml ? extractAllXmlContent(identifiedIntentsXml, PromptElementType.INTENT).map(intentXml => {
        return {
          name: extractXmlContent(intentXml, PromptElementType.INTENT_NAME) || extractXmlContent(intentXml, 'n'), // Support both name and n
          importance: extractXmlContent(intentXml, PromptElementType.IMPORTANCE),
          explicit: extractXmlContent(intentXml, PromptElementType.EXPLICIT) === 'true',
          key_phrases: extractXmlContent(intentXml, PromptElementType.KEY_PHRASES)
        };
      }) : [];
      
      // Parse user preferences
      const userPreferencesXml = extractXmlContent(metaAnalysisXml, PromptElementType.USER_PREFERENCES);
      const userPreferences = userPreferencesXml ? extractAllXmlContent(userPreferencesXml, PromptElementType.PREFERENCE).map(prefXml => {
        return {
          type: extractXmlContent(prefXml, PromptElementType.PREFERENCE_TYPE),
          value: extractXmlContent(prefXml, PromptElementType.PREFERENCE_VALUE),
          source: extractXmlContent(prefXml, PromptElementType.PREFERENCE_SOURCE)
        };
      }) : [];
      
      // Parse execution strategy
      const executionStrategyXml = extractXmlContent(metaAnalysisXml, PromptElementType.EXECUTION_STRATEGY);
      const executionStrategy = executionStrategyXml ? {
        parallelism_opportunity: extractXmlContent(executionStrategyXml, PromptElementType.PARALLELISM_OPPORTUNITY),
        reasoning: extractXmlContent(executionStrategyXml, PromptElementType.REASONING),
        success_criteria: extractXmlContent(executionStrategyXml, PromptElementType.SUCCESS_CRITERIA)
      } : null;
      
      metaAnalysis = {
        identified_intents: identifiedIntents,
        user_preferences: userPreferences,
        execution_strategy: executionStrategy
      };
    }
    
    // Parse the plan
    const planXml = extractXmlContent(cotPlanXml, PromptElementType.PLAN);
    let plan = null;
    
    if (planXml) {
      const goal = extractXmlContent(planXml, PromptElementType.GOAL);
      const reasoning = extractXmlContent(planXml, PromptElementType.REASONING);
      
      // Parse execution groups
      const executionGroupsXml = extractXmlContent(planXml, PromptElementType.EXECUTION_GROUPS);
      const executionGroups = executionGroupsXml ? extractAllXmlContent(executionGroupsXml, PromptElementType.GROUP).map(groupXml => {
        const id = extractXmlContent(groupXml, PromptElementType.ID);
        const intentAddressed = extractXmlContent(groupXml, PromptElementType.INTENT_ADDRESSED);
        
        // Parse steps within the group
        const stepsXml = extractXmlContent(groupXml, PromptElementType.STEPS_ID);
        const steps = stepsXml ? extractAllXmlContent(stepsXml, PromptElementType.STEP_ID).map(stepXml => {
          return {
            id: extractXmlContent(stepXml, PromptElementType.ID),
            type: extractXmlContent(stepXml, PromptElementType.TYPE),
            tool_name: extractXmlContent(stepXml, PromptElementType.TOOL_NAME),
            arguments: extractArgumentsFromXml(stepXml),
            description: extractXmlContent(stepXml, PromptElementType.DESCRIPTION),
            reason: extractXmlContent(stepXml, PromptElementType.REASON),
            dependencies: extractXmlContent(stepXml, PromptElementType.DEPENDENCIES)?.split(',').map(d => d.trim()) || [],
            fallback_strategy: extractXmlContent(stepXml, PromptElementType.FALLBACK_STRATEGY)
          };
        }) : [];
        
        return {
          id,
          intent_addressed: intentAddressed,
          steps
        };
      }) : [];
      
      // Parse response synthesis strategy
      const responseSynthesisXml = extractXmlContent(planXml, PromptElementType.RESPONSE_SYNTHESIS_STRATEGY);
      let responseSynthesisStrategy = null;
      
      if (responseSynthesisXml) {
        // Parse organization sections
        const organizationXml = extractXmlContent(responseSynthesisXml, PromptElementType.ORGANIZATION);
        const sections = organizationXml ? extractAllXmlContent(organizationXml, PromptElementType.SECTION).map(sectionXml => {
          return {
            title: extractXmlContent(sectionXml, PromptElementType.TITLE),
            content_from: extractXmlContent(sectionXml, PromptElementType.CONTENT_FROM),
            presentation: extractXmlContent(sectionXml, PromptElementType.PRESENTATION)
          };
        }) : [];
        
        // Parse adaptive elements
        const adaptiveElementsXml = extractXmlContent(responseSynthesisXml, PromptElementType.ADAPTIVE_ELEMENTS);
        const elements = adaptiveElementsXml ? extractAllXmlContent(adaptiveElementsXml, PromptElementType.ELEMENT).map(elementXml => {
          return {
            type: extractXmlContent(elementXml, PromptElementType.ELEMENT_TYPE),
            trigger: extractXmlContent(elementXml, PromptElementType.TRIGGER),
            content: extractXmlContent(elementXml, PromptElementType.CONTENT)
          };
        }) : [];
        
        responseSynthesisStrategy = {
          organization: { sections },
          adaptive_elements: elements
        };
      }
      
      plan = {
        goal,
        reasoning,
        execution_groups: executionGroups,
        response_synthesis_strategy: responseSynthesisStrategy
      };
    }
    
    return {
      meta_analysis: metaAnalysis,
      plan
    };
  } catch (error) {
    logger.error("Error parsing chain of thought plan from XML:", error);
    return null;
  }
}

/**
 * Enhanced parser for classification XML to include intent analysis
 */
export function parseClassificationFromXml(xmlContent: string): any | null {
  try {
    const classificationXml = extractXmlContent(xmlContent, PromptElementType.CLASSIFICATION);
    if (!classificationXml) return null;
    
    const category = extractXmlContent(classificationXml, PromptElementType.CATEGORY);
    const confidence = extractXmlContent(classificationXml, PromptElementType.CONFIDENCE);
    const reasoning = extractXmlContent(classificationXml, PromptElementType.REASONING);
    const complexity = extractXmlContent(classificationXml, PromptElementType.COMPLEXITY);
    const timeSensitivity = extractXmlContent(classificationXml, PromptElementType.TIME_SENSITIVITY);
    const parallelOpportunity = extractXmlContent(classificationXml, PromptElementType.PARALLEL_OPPORTUNITY);
    
    // Parse intent analysis if present
    const intentAnalysisXml = extractXmlContent(classificationXml, PromptElementType.INTENT_ANALYSIS);
    let intentAnalysis = null;
    
    if (intentAnalysisXml) {
      intentAnalysis = {
        count: extractXmlContent(intentAnalysisXml, PromptElementType.INTENT_COUNT),
        primary_intent: extractXmlContent(intentAnalysisXml, PromptElementType.PRIMARY_INTENT),
        secondary_intents: extractXmlContent(intentAnalysisXml, PromptElementType.SECONDARY_INTENTS)
      };
    }
    
    // Parse suggested approach
    const suggestedApproachXml = extractXmlContent(classificationXml, PromptElementType.SUGGESTED_APPROACH);
    const suggestedApproach = suggestedApproachXml ? {
      primary_method: extractXmlContent(suggestedApproachXml, "primary_method"),
      fallback_method: extractXmlContent(suggestedApproachXml, "fallback_method"),
      explanation: extractXmlContent(suggestedApproachXml, "explanation")
    } : null;
    
    return {
      category,
      confidence,
      reasoning,
      complexity,
      time_sensitivity: timeSensitivity,
      parallel_opportunity: parallelOpportunity,
      intent_analysis: intentAnalysis,
      suggested_approach: suggestedApproach
    };
  } catch (error) {
    logger.error("Error parsing classification from XML:", error);
    return null;
  }
}

/**
 * Update parseParallelExecutionPlanFromXml to handle intent and priority information
 */
export function parseParallelExecutionPlanFromXml(xmlContent: string): any | null {
  try {
    const planXml = extractXmlContent(xmlContent, PromptElementType.PARALLEL_EXECUTION_PLAN);
    if (!planXml) return null;
    
    // Parse execution groups
    const executionGroupsXml = extractXmlContent(planXml, PromptElementType.EXECUTION_GROUPS);
    const executionGroups = executionGroupsXml ? extractAllXmlContent(executionGroupsXml, PromptElementType.GROUP).map(groupXml => {
      const id = extractXmlContent(groupXml, PromptElementType.ID);
      const intent = extractXmlContent(groupXml, PromptElementType.INTENT_ADDRESSED);
      const reason = extractXmlContent(groupXml, PromptElementType.REASON);
      const stepsXml = extractXmlContent(groupXml, PromptElementType.STEPS_ID);
      
      const stepIds = stepsXml ? extractAllXmlContent(stepsXml, PromptElementType.STEP_ID).map(
        stepId => parseInt(stepId, 10)
      ) : [];
      
      return {
        id: id ? parseInt(id, 10) : null,
        intent,
        steps: stepIds,
        reason: reason || null
      };
    }) : [];
    
    // Parse sequential dependencies
    const dependenciesXml = extractXmlContent(planXml, PromptElementType.SEQUENTIAL_DEPENDENCIES);
    const dependencies = dependenciesXml ? extractAllXmlContent(dependenciesXml, PromptElementType.DEPENDENCY).map(depXml => {
      const groupId = extractXmlContent(depXml, PromptElementType.GROUP_ID);
      const dependsOn = extractXmlContent(depXml, PromptElementType.DEPENDS_ON);
      
      return {
        group_id: groupId ? parseInt(groupId, 10) : null,
        depends_on: dependsOn === 'none' ? null : (dependsOn ? parseInt(dependsOn, 10) : null)
      };
    }) : [];
    
    // Parse execution priority
    const executionPriorityXml = extractXmlContent(planXml, PromptElementType.EXECUTION_PRIORITY);
    const priorityGroups = executionPriorityXml ? extractAllXmlContent(executionPriorityXml, PromptElementType.PRIORITY_GROUP).map(priorityGroupXml => {
      const groupIds = extractXmlContent(priorityGroupXml, PromptElementType.GROUP_IDS);
      const reason = extractXmlContent(priorityGroupXml, PromptElementType.REASON);
      
      return {
        group_ids: groupIds ? groupIds.split(',').map(id => parseInt(id.trim(), 10)) : [],
        reason
      };
    }) : [];
    
    return {
      execution_groups: executionGroups,
      sequential_dependencies: dependencies,
      execution_priority: priorityGroups.length > 0 ? priorityGroups : null
    };
  } catch (error) {
    logger.error("Error parsing parallel execution plan from XML:", error);
    return null;
  }
}

/**
 * Parse NLU analysis XML result into structured object
 */
export function parseNluAnalysisFromXml(xmlString: string): XmlNluAnalysis | null {
  try {
    // Extract main parts of the NLU analysis
    const original_query = extractXmlContent(xmlString, 'original_query') || '';
    const disambiguated_query = extractXmlContent(xmlString, 'disambiguated_query') || '';
    const true_intent = extractXmlContent(xmlString, 'true_intent') || '';
    const confidence = extractXmlContent(xmlString, 'confidence') as XmlNluConfidence || 'medium';
    const language_detected = extractXmlContent(xmlString, 'language_detected') || undefined;
    
    // Extract ambiguity resolution
    const ambiguity_resolution_xml = extractXmlContent(xmlString, 'ambiguity_resolution');
    const ambiguity_resolution = ambiguity_resolution_xml ? {
      original_ambiguity: extractXmlContent(ambiguity_resolution_xml, 'original_ambiguity') || '',
      resolution_source: extractXmlContent(ambiguity_resolution_xml, 'resolution_source') as XmlResolutionSource || 'implicit_context',
      resolution_explanation: extractXmlContent(ambiguity_resolution_xml, 'resolution_explanation') || ''
    } : null;
    
    // Extract entities
    const entities: XmlEntity[] = [];
    const entitiesXml = extractXmlContent(xmlString, 'entities');
    
    if (entitiesXml) {
      const entityTags = extractAllXmlContent(entitiesXml, 'entity');
      
      for (const entityXml of entityTags) {
        const name = extractXmlContent(entityXml, 'name') || '';
        const type = extractXmlContent(entityXml, 'type') || '';
        const reference_type = extractXmlContent(entityXml, 'reference_type') || 'direct';
        const linked_to = extractXmlContent(entityXml, 'linked_to');
        
        entities.push({
          name,
          type: type as any,
          reference_type: reference_type as any,
          linked_to: linked_to || undefined
        });
      }
    }
    
    // Extract references
    const references: XmlReference[] = [];
    const referencesXml = extractXmlContent(xmlString, 'references');
    
    if (referencesXml) {
      const referenceTags = extractAllXmlContent(referencesXml, 'reference');
      
      for (const referenceXml of referenceTags) {
        const expression = extractXmlContent(referenceXml, 'expression') || '';
        const resolved_to = extractXmlContent(referenceXml, 'resolved_to') || '';
        const confidence = extractXmlContent(referenceXml, 'confidence') || 'medium';
        
        references.push({
          expression,
          resolved_to,
          confidence: confidence as 'high' | 'medium' | 'low'
        });
      }
    }
    
    // Extract implicit needs
    const implicit_needs: string[] = [];
    const needsXml = extractXmlContent(xmlString, 'implicit_needs');
    
    if (needsXml) {
      const needTags = extractAllXmlContent(needsXml, 'need');
      implicit_needs.push(...needTags);
    }
    
    // Extract potential tools ranking
    const potential_tools: XmlToolRanking[] = [];
    const toolsXml = extractXmlContent(xmlString, 'potential_tools');
    
    if (toolsXml) {
      const toolTags = extractAllXmlContent(toolsXml, 'tool');
      
      for (const toolXml of toolTags) {
        const tool_name = extractXmlContent(toolXml, 'tool_name') || '';
        const confidence_str = extractXmlContent(toolXml, 'confidence') || '0.5';
        const reasoning = extractXmlContent(toolXml, 'reasoning') || '';
        const arguments_xml = extractXmlContent(toolXml, 'arguments');
        
        // Parse arguments if present
        let tool_arguments = {};
        if (arguments_xml) {
          tool_arguments = extractArgumentsFromXml(arguments_xml);
        }
        
        // Convert confidence to number (between 0 and 1)
        let confidence_num = 0.5;
        try {
          confidence_num = parseFloat(confidence_str);
          // Ensure it's between 0 and 1
          confidence_num = Math.max(0, Math.min(1, confidence_num));
        } catch (e) {
          logger.warn(`Invalid confidence value: ${confidence_str}, defaulting to 0.5`);
        }
        
        potential_tools.push({
          tool_name,
          confidence: confidence_num,
          reasoning,
          arguments: Object.keys(tool_arguments).length > 0 ? tool_arguments : undefined
        });
      }
      
      // Sort tools by confidence (highest first)
      potential_tools.sort((a, b) => b.confidence - a.confidence);
    }
    
    return {
      original_query,
      disambiguated_query,
      entities,
      references,
      implicit_needs,
      true_intent,
      confidence,
      language_detected,
      potential_tools: potential_tools.length > 0 ? potential_tools : undefined,
      ambiguity_resolution
    };
  } catch (error) {
    logger.error(`[parseNluAnalysisFromXml] Error parsing XML: ${error}`);
    return null;
  }
}

/**
 * Parse skill learning plan XML into a structured object
 * @param xmlContent XML content containing the skill learning plan
 * @returns Parsed skill learning plan or null if parsing fails
 */
export function parseSkillLearningPlanFromXml(xmlContent: string): any | null {
  try {
    // Initialize the base structure
    const plan: any = {
      skill_details: {
        skill_name: null,
        skill_category: null,
        difficulty_level: null,
        time_commitment: null
      },
      learning_phases: [] as any[],
      tool_orchestration: {
        parallel_groups: [] as any[]
      },
      engagement_hooks: {
        reminder_suggestions: [] as any[],
        follow_up_prompts: [] as any[],
        milestone_celebrations: [] as any[]
      },
      personalization: {
        motivational_approach: {
          style: null,
          key_phrases: null
        },
        learning_style_adaptation: null,
        connection_to_interests: null
      }
    };
    
    // Extract skill details
    plan.skill_details.skill_name = extractXmlContent(xmlContent, 'skill_name');
    plan.skill_details.skill_category = extractXmlContent(xmlContent, 'skill_category');
    plan.skill_details.difficulty_level = extractXmlContent(xmlContent, 'difficulty_level');
    plan.skill_details.time_commitment = extractXmlContent(xmlContent, 'time_commitment');
    
    // Extract learning phases
    const phaseElements = extractAllXmlContent(xmlContent, 'phase');
    for (const phaseXml of phaseElements) {
      const phase = {
        name: extractXmlContent(phaseXml, 'name') || extractXmlContent(phaseXml, 'n'),
        description: extractXmlContent(phaseXml, 'description'),
        outcome: extractXmlContent(phaseXml, 'outcome')
      };
      plan.learning_phases.push(phase);
    }
    
    // Extract tool orchestration
    const parallelGroupElements = extractAllXmlContent(xmlContent, 'parallel_group');
    for (const groupXml of parallelGroupElements) {
      const group: any = {
        tools: [] as any[]
      };
      
      const toolElements = extractAllXmlContent(groupXml, 'tool');
      for (const toolXml of toolElements) {
        const tool = {
          tool_name: extractXmlContent(toolXml, 'tool_name') || extractXmlContent(toolXml, 'n'),
          arguments: {},
          purpose: extractXmlContent(toolXml, 'purpose')
        };
        
        // Extract tool arguments
        const argsXml = extractXmlContent(toolXml, 'arguments');
        if (argsXml) {
          tool.arguments = extractArgumentsFromXml(argsXml);
        }
        
        group.tools.push(tool);
      }
      
      plan.tool_orchestration.parallel_groups.push(group);
    }
    
    // Extract engagement hooks
    // Reminders
    const reminderElements = extractAllXmlContent(xmlContent, 'reminder');
    for (const reminderXml of reminderElements) {
      const reminder = {
        content: extractXmlContent(reminderXml, 'content'),
        timing: extractXmlContent(reminderXml, 'timing'),
        recurrence: extractXmlContent(reminderXml, 'recurrence')
      };
      plan.engagement_hooks.reminder_suggestions.push(reminder);
    }
    
    // Follow-up prompts
    const promptElements = extractAllXmlContent(xmlContent, 'prompt');
    for (const promptText of promptElements) {
      plan.engagement_hooks.follow_up_prompts.push(promptText);
    }
    
    // Milestone celebrations
    const milestoneElements = extractAllXmlContent(xmlContent, 'milestone');
    for (const milestoneXml of milestoneElements) {
      const milestone = {
        description: extractXmlContent(milestoneXml, 'description'),
        trigger: extractXmlContent(milestoneXml, 'trigger'),
        celebration_message: extractXmlContent(milestoneXml, 'celebration_message')
      };
      plan.engagement_hooks.milestone_celebrations.push(milestone);
    }
    
    // Extract personalization
    const motivationalApproachXml = extractXmlContent(xmlContent, 'motivational_approach');
    if (motivationalApproachXml) {
      plan.personalization.motivational_approach.style = extractXmlContent(motivationalApproachXml, 'style');
      plan.personalization.motivational_approach.key_phrases = extractXmlContent(motivationalApproachXml, 'key_phrases');
    }
    
    plan.personalization.learning_style_adaptation = extractXmlContent(xmlContent, 'learning_style_adaptation');
    plan.personalization.connection_to_interests = extractXmlContent(xmlContent, 'connection_to_interests');
    
    return plan;
  } catch (error) {
    logger.error('[parseSkillLearningPlanFromXml] Error parsing skill learning plan:', error);
    return null;
  }
}

/**
 * Parse news deep dive plan XML into a structured object
 * @param xmlContent XML content containing the news deep dive plan
 * @returns Parsed news deep dive plan or null if parsing fails
 */
export function parseNewsDeepDivePlanFromXml(xmlContent: string): any | null {
  try {
    // Initialize the base structure
    const plan: any = {
      topic_analysis: {
        core_topic: '',
        subtopics: [] as string[],
        key_entities: [] as any[],
        timeframe: ''
      },
      information_gathering: {
        fact_finding_phases: [] as any[]
      },
      tool_orchestration: {
        parallel_groups: [] as any[]
      },
      synthesis_approach: {
        categorization: [] as string[],
        sources: '',
        contrasting_viewpoints: '',
        chronological_development: ''
      },
      engagement_hooks: {
        follow_up_options: [] as string[],
        monitoring_suggestions: [] as string[],
        related_topics: [] as any[]
      }
    };
    
    // Extract topic analysis
    const coreTopic = extractXmlContent(xmlContent, 'core_topic');
    plan.topic_analysis.core_topic = coreTopic || '';
    
    const timeframe = extractXmlContent(xmlContent, 'timeframe');
    plan.topic_analysis.timeframe = timeframe || '';
    
    // Extract subtopics
    const subtopicElements = extractAllXmlContent(xmlContent, 'subtopic');
    for (const subtopic of subtopicElements) {
      plan.topic_analysis.subtopics.push(subtopic);
    }
    
    // Extract key entities
    const entityElements = extractAllXmlContent(xmlContent, 'entity');
    for (const entityXml of entityElements) {
      const entity = {
        name: extractXmlContent(entityXml, 'name') || extractXmlContent(entityXml, 'n'),
        type: extractXmlContent(entityXml, 'type'),
        relevance: extractXmlContent(entityXml, 'relevance')
      };
      plan.topic_analysis.key_entities.push(entity);
    }
    
    // Extract information gathering
    const phaseElements = extractAllXmlContent(xmlContent, 'fact_finding_phase');
    for (const phaseXml of phaseElements) {
      const phase = {
        description: extractXmlContent(phaseXml, 'description'),
        focus_areas: extractXmlContent(phaseXml, 'focus_areas')
      };
      plan.information_gathering.fact_finding_phases.push(phase);
    }
    
    // Extract tool orchestration
    const parallelGroupElements = extractAllXmlContent(xmlContent, 'parallel_group');
    for (const groupXml of parallelGroupElements) {
      const group: any = {
        tools: [] as any[]
      };
      
      const toolElements = extractAllXmlContent(groupXml, 'tool');
      for (const toolXml of toolElements) {
        const tool = {
          tool_name: extractXmlContent(toolXml, 'tool_name') || extractXmlContent(toolXml, 'n'),
          arguments: {},
          purpose: extractXmlContent(toolXml, 'purpose')
        };
        
        // Extract tool arguments
        const argsXml = extractXmlContent(toolXml, 'arguments');
        if (argsXml) {
          tool.arguments = extractArgumentsFromXml(argsXml);
        }
        
        group.tools.push(tool);
      }
      
      plan.tool_orchestration.parallel_groups.push(group);
    }
    
    // Extract synthesis approach
    const sources = extractXmlContent(xmlContent, 'sources');
    plan.synthesis_approach.sources = sources || '';
    
    const contrastingViewpoints = extractXmlContent(xmlContent, 'contrasting_viewpoints');
    plan.synthesis_approach.contrasting_viewpoints = contrastingViewpoints || '';
    
    const chronologicalDevelopment = extractXmlContent(xmlContent, 'chronological_development');
    plan.synthesis_approach.chronological_development = chronologicalDevelopment || '';
    
    // Extract categorization
    const categoryElements = extractAllXmlContent(xmlContent, 'category');
    for (const category of categoryElements) {
      plan.synthesis_approach.categorization.push(category);
    }
    
    // Extract engagement hooks
    // Follow-up options
    const optionElements = extractAllXmlContent(xmlContent, 'option');
    for (const option of optionElements) {
      plan.engagement_hooks.follow_up_options.push(option);
    }
    
    // Monitoring suggestions
    const methodElements = extractAllXmlContent(xmlContent, 'method');
    for (const method of methodElements) {
      plan.engagement_hooks.monitoring_suggestions.push(method);
    }
    
    // Related topics
    const connectionElements = extractAllXmlContent(xmlContent, 'connection');
    for (const connectionXml of connectionElements) {
      const connection = {
        topic: extractXmlContent(connectionXml, 'topic'),
        relationship: extractXmlContent(connectionXml, 'relationship')
      };
      plan.engagement_hooks.related_topics.push(connection);
    }
    
    return plan;
  } catch (error) {
    logger.error('[parseNewsDeepDivePlanFromXml] Error parsing news deep dive plan:', error);
    return null;
  }
}

/**
 * Parse proactive suggestion plan XML into a structured object
 * @param xmlContent XML content containing the proactive suggestion plan
 * @returns Parsed proactive suggestion plan or null if parsing fails
 */
export function parseProactiveSuggestionPlanFromXml(xmlContent: string): any | null {
  try {
    // Initialize the base structure
    const plan: any = {
      context_analysis: {
        current_priorities: [] as any[],
        ongoing_interests: [] as any[],
        upcoming_events: [] as any[],
        recurring_patterns: [] as any[]
      },
      suggestion_opportunities: [] as any[],
      personalization_factors: {
        learning_style: '',
        motivation_drivers: '',
        communication_preferences: ''
      },
      tool_orchestration: {
        parallel_groups: [] as any[]
      },
      suggestion_content: {
        title: '',
        description: '',
        benefit: '',
        tone: '',
        follow_up: ''
      },
      presentation_strategy: {
        timing: '',
        approach: '',
        connection_to_context: '',
        opt_out: ''
      }
    };
    
    // Extract context analysis
    // Current priorities
    const priorityElements = extractAllXmlContent(xmlContent, 'priority');
    for (const priorityXml of priorityElements) {
      const priority = {
        description: extractXmlContent(priorityXml, 'description'),
        source: extractXmlContent(priorityXml, 'source'),
        timeframe: extractXmlContent(priorityXml, 'timeframe')
      };
      plan.context_analysis.current_priorities.push(priority);
    }
    
    // Ongoing interests
    const interestElements = extractAllXmlContent(xmlContent, 'interest');
    for (const interestXml of interestElements) {
      const interest = {
        topic: extractXmlContent(interestXml, 'topic'),
        engagement_level: extractXmlContent(interestXml, 'engagement_level'),
        last_discussed: extractXmlContent(interestXml, 'last_discussed')
      };
      plan.context_analysis.ongoing_interests.push(interest);
    }
    
    // Upcoming events
    const eventElements = extractAllXmlContent(xmlContent, 'event');
    for (const eventXml of eventElements) {
      const event = {
        description: extractXmlContent(eventXml, 'description'),
        date: extractXmlContent(eventXml, 'date'),
        preparation_needed: extractXmlContent(eventXml, 'preparation_needed')
      };
      plan.context_analysis.upcoming_events.push(event);
    }
    
    // Recurring patterns
    const patternElements = extractAllXmlContent(xmlContent, 'pattern');
    for (const patternXml of patternElements) {
      const pattern = {
        behavior: extractXmlContent(patternXml, 'behavior'),
        frequency: extractXmlContent(patternXml, 'frequency'),
        last_occurrence: extractXmlContent(patternXml, 'last_occurrence')
      };
      plan.context_analysis.recurring_patterns.push(pattern);
    }
    
    // Extract suggestion opportunities
    const opportunityElements = extractAllXmlContent(xmlContent, 'opportunity');
    for (const opportunityXml of opportunityElements) {
      const opportunity = {
        description: extractXmlContent(opportunityXml, 'description'),
        trigger: extractXmlContent(opportunityXml, 'trigger'),
        relevance: extractXmlContent(opportunityXml, 'relevance'),
        timing_appropriateness: extractXmlContent(opportunityXml, 'timing_appropriateness')
      };
      plan.suggestion_opportunities.push(opportunity);
    }
    
    // Extract personalization factors
    const personalizationFactorsXml = extractXmlContent(xmlContent, 'personalization_factors');
    if (personalizationFactorsXml) {
      const learningStyle = extractXmlContent(personalizationFactorsXml, 'learning_style');
      plan.personalization_factors.learning_style = learningStyle || '';
      
      const motivationDrivers = extractXmlContent(personalizationFactorsXml, 'motivation_drivers');
      plan.personalization_factors.motivation_drivers = motivationDrivers || '';
      
      const communicationPreferences = extractXmlContent(personalizationFactorsXml, 'communication_preferences');
      plan.personalization_factors.communication_preferences = communicationPreferences || '';
    }
    
    // Extract tool orchestration
    const parallelGroupElements = extractAllXmlContent(xmlContent, 'parallel_group');
    for (const groupXml of parallelGroupElements) {
      const group: any = {
        tools: [] as any[]
      };
      
      const toolElements = extractAllXmlContent(groupXml, 'tool');
      for (const toolXml of toolElements) {
        const tool = {
          tool_name: extractXmlContent(toolXml, 'tool_name') || extractXmlContent(toolXml, 'n'),
          arguments: {},
          purpose: extractXmlContent(toolXml, 'purpose')
        };
        
        // Extract tool arguments
        const argsXml = extractXmlContent(toolXml, 'arguments');
        if (argsXml) {
          tool.arguments = extractArgumentsFromXml(argsXml);
        }
        
        group.tools.push(tool);
      }
      
      plan.tool_orchestration.parallel_groups.push(group);
    }
    
    // Extract suggestion content
    const suggestionContentXml = extractXmlContent(xmlContent, 'suggestion_content');
    if (suggestionContentXml) {
      const title = extractXmlContent(suggestionContentXml, 'title');
      plan.suggestion_content.title = title || '';
      
      const description = extractXmlContent(suggestionContentXml, 'description');
      plan.suggestion_content.description = description || '';
      
      const benefit = extractXmlContent(suggestionContentXml, 'benefit');
      plan.suggestion_content.benefit = benefit || '';
      
      const tone = extractXmlContent(suggestionContentXml, 'tone');
      plan.suggestion_content.tone = tone || '';
      
      const followUp = extractXmlContent(suggestionContentXml, 'follow_up');
      plan.suggestion_content.follow_up = followUp || '';
    }
    
    // Extract presentation strategy
    const presentationStrategyXml = extractXmlContent(xmlContent, 'presentation_strategy');
    if (presentationStrategyXml) {
      const timing = extractXmlContent(presentationStrategyXml, 'timing');
      plan.presentation_strategy.timing = timing || '';
      
      const approach = extractXmlContent(presentationStrategyXml, 'approach');
      plan.presentation_strategy.approach = approach || '';
      
      const connectionToContext = extractXmlContent(presentationStrategyXml, 'connection_to_context');
      plan.presentation_strategy.connection_to_context = connectionToContext || '';
      
      const optOut = extractXmlContent(presentationStrategyXml, 'opt_out');
      plan.presentation_strategy.opt_out = optOut || '';
    }
    
    return plan;
  } catch (error) {
    logger.error('[parseProactiveSuggestionPlanFromXml] Error parsing proactive suggestion plan:', error);
    return null;
  }
}

/**
 * Parse enhanced reasoning explanation from XML content
 * @param xmlContent XML content containing enhanced reasoning
 * @returns Parsed enhanced reasoning or null if parsing fails
 */
export function parseEnhancedReasoningFromXml(xmlContent: string): any | null {
  try {
    // Extract the content between the <enhanced_reasoning> tags
    const enhancedReasoningMatch = xmlContent.match(/<enhanced_reasoning>([\s\S]*?)<\/enhanced_reasoning>/);
    
    if (!enhancedReasoningMatch) {
      logger.warn('[XML Parser] Failed to find <enhanced_reasoning> tags in the response.');
      return null;
    }
    
    const enhancedReasoningXml = enhancedReasoningMatch[0];
    
    // Initialize the base structure for the result
    const result: any = {
      unstated_needs: [] as any[],
      information_synthesis: [] as any[],
      strategic_foresight: [] as any[],
      prioritization_decisions: [] as any[],
      ambiguity_handling: [] as any[],
      final_response_approach: null
    };
    
    // Extract unstated needs
    const unstatedNeedsMatches = getAllMatches(enhancedReasoningXml, /<need>([\s\S]*?)<\/need>/g);
    unstatedNeedsMatches.forEach((match: RegExpExecArray) => {
      const need: any = {};
      const descMatch = match[1].match(/<description>([\s\S]*?)<\/description>/);
      const evidenceMatch = match[1].match(/<evidence>([\s\S]*?)<\/evidence>/);
      const addressingMatch = match[1].match(/<addressing_method>([\s\S]*?)<\/addressing_method>/);
      
      if (descMatch) need.description = descMatch[1].trim();
      if (evidenceMatch) need.evidence = evidenceMatch[1].trim();
      if (addressingMatch) need.addressing_method = addressingMatch[1].trim();
      
      if (Object.keys(need).length > 0) {
        result.unstated_needs.push(need);
      }
    });
    
    // Extract information synthesis
    const synthesisMatches = getAllMatches(enhancedReasoningXml, /<key_insight>([\s\S]*?)<\/key_insight>/g);
    synthesisMatches.forEach((match: RegExpExecArray) => {
      const insight: any = {};
      const descMatch = match[1].match(/<description>([\s\S]*?)<\/description>/);
      const sourceMatch = match[1].match(/<source_combination>([\s\S]*?)<\/source_combination>/);
      const valueMatch = match[1].match(/<value_add>([\s\S]*?)<\/value_add>/);
      
      if (descMatch) insight.description = descMatch[1].trim();
      if (sourceMatch) insight.source_combination = sourceMatch[1].trim();
      if (valueMatch) insight.value_add = valueMatch[1].trim();
      
      if (Object.keys(insight).length > 0) {
        result.information_synthesis.push(insight);
      }
    });
    
    // Extract strategic foresight
    const foresightMatches = getAllMatches(enhancedReasoningXml, /<next_step>([\s\S]*?)<\/next_step>/g);
    foresightMatches.forEach((match: RegExpExecArray) => {
      const step: any = {};
      const descMatch = match[1].match(/<description>([\s\S]*?)<\/description>/);
      const reasoningMatch = match[1].match(/<reasoning>([\s\S]*?)<\/reasoning>/);
      const approachMatch = match[1].match(/<suggestion_approach>([\s\S]*?)<\/suggestion_approach>/);
      
      if (descMatch) step.description = descMatch[1].trim();
      if (reasoningMatch) step.reasoning = reasoningMatch[1].trim();
      if (approachMatch) step.suggestion_approach = approachMatch[1].trim();
      
      if (Object.keys(step).length > 0) {
        result.strategic_foresight.push(step);
      }
    });
    
    // Extract prioritization decisions
    const decisionMatches = getAllMatches(enhancedReasoningXml, /<decision>([\s\S]*?)<\/decision>/g);
    decisionMatches.forEach((match: RegExpExecArray) => {
      const decision: any = {};
      const descMatch = match[1].match(/<description>([\s\S]*?)<\/description>/);
      const reasoningMatch = match[1].match(/<reasoning>([\s\S]*?)<\/reasoning>/);
      const deEmphasizedMatch = match[1].match(/<de_emphasized>([\s\S]*?)<\/de_emphasized>/);
      
      if (descMatch) decision.description = descMatch[1].trim();
      if (reasoningMatch) decision.reasoning = reasoningMatch[1].trim();
      if (deEmphasizedMatch) decision.de_emphasized = deEmphasizedMatch[1].trim();
      
      if (Object.keys(decision).length > 0) {
        result.prioritization_decisions.push(decision);
      }
    });
    
    // Extract ambiguity handling
    const ambiguityMatches = getAllMatches(enhancedReasoningXml, /<resolution>([\s\S]*?)<\/resolution>/g);
    ambiguityMatches.forEach((match: RegExpExecArray) => {
      const resolution: any = {};
      const elementMatch = match[1].match(/<ambiguous_element>([\s\S]*?)<\/ambiguous_element>/);
      const interpretationMatch = match[1].match(/<interpretation>([\s\S]*?)<\/interpretation>/);
      const confidenceMatch = match[1].match(/<confidence>([\s\S]*?)<\/confidence>/);
      const alternativesMatch = match[1].match(/<alternatives_considered>([\s\S]*?)<\/alternatives_considered>/);
      
      if (elementMatch) resolution.ambiguous_element = elementMatch[1].trim();
      if (interpretationMatch) resolution.interpretation = interpretationMatch[1].trim();
      if (confidenceMatch) resolution.confidence = confidenceMatch[1].trim();
      if (alternativesMatch) resolution.alternatives_considered = alternativesMatch[1].trim();
      
      if (Object.keys(resolution).length > 0) {
        result.ambiguity_handling.push(resolution);
      }
    });
    
    // Extract final response approach
    const finalResponseMatch = enhancedReasoningXml.match(/<final_response_approach>([\s\S]*?)<\/final_response_approach>/);
    if (finalResponseMatch) {
      const finalResponse: any = {};
      
      // Extract tone selection
      const toneMatch = finalResponseMatch[1].match(/<tone_selection>([\s\S]*?)<\/tone_selection>/);
      if (toneMatch) {
        const chosenToneMatch = toneMatch[1].match(/<chosen_tone>([\s\S]*?)<\/chosen_tone>/);
        const reasonMatch = toneMatch[1].match(/<reason>([\s\S]*?)<\/reason>/);
        
        if (chosenToneMatch || reasonMatch) {
          finalResponse.tone_selection = {};
          if (chosenToneMatch) finalResponse.tone_selection.chosen_tone = chosenToneMatch[1].trim();
          if (reasonMatch) finalResponse.tone_selection.reason = reasonMatch[1].trim();
        }
      }
      
      // Extract structure rationale
      const structureMatch = finalResponseMatch[1].match(/<structure_rationale>([\s\S]*?)<\/structure_rationale>/);
      if (structureMatch) {
        finalResponse.structure_rationale = structureMatch[1].trim();
      }
      
      // Extract persona integration
      const personaMatch = finalResponseMatch[1].match(/<persona_integration>([\s\S]*?)<\/persona_integration>/);
      if (personaMatch) {
        finalResponse.persona_integration = personaMatch[1].trim();
      }
      
      if (Object.keys(finalResponse).length > 0) {
        result.final_response_approach = finalResponse;
      }
    }
    
    return result;
  } catch (error) {
    logger.error('[XML Parser] Error parsing enhanced reasoning from XML:', error);
    return null;
  }
}

/**
 * Parse multi-tool orchestration explanation from XML content
 * @param xmlContent XML content containing orchestration explanation
 * @returns Parsed orchestration explanation or null if parsing fails
 */
export function parseOrchestrationExplanationFromXml(xmlContent: string): any | null {
  try {
    // Extract the content between the <orchestration_explanation> tags
    const orchestrationMatch = xmlContent.match(/<orchestration_explanation>([\s\S]*?)<\/orchestration_explanation>/);
    
    if (!orchestrationMatch) {
      logger.warn('[XML Parser] Failed to find <orchestration_explanation> tags in the response.');
      return null;
    }
    
    const orchestrationXml = orchestrationMatch[0];
    
    // Initialize the base structure for the result
    const result: any = {
      query_analysis: {
        identified_intents: [] as string[],
        complexity_factors: null
      },
      tool_selection_reasoning: [] as any[],
      parallel_processing_benefits: [] as any[],
      data_synthesis_approach: null,
      user_friendly_explanation: null
    };
    
    // Extract query analysis
    const queryAnalysisMatch = orchestrationXml.match(/<query_analysis>([\s\S]*?)<\/query_analysis>/);
    if (queryAnalysisMatch) {
      // Extract identified intents
      const intentMatches = getAllMatches(queryAnalysisMatch[1], /<intent>([\s\S]*?)<\/intent>/g);
      result.query_analysis.identified_intents = intentMatches.map((match: RegExpExecArray) => match[1].trim());
      
      // Extract complexity factors
      const complexityMatch = queryAnalysisMatch[1].match(/<complexity_factors>([\s\S]*?)<\/complexity_factors>/);
      if (complexityMatch) {
        result.query_analysis.complexity_factors = complexityMatch[1].trim();
      }
    }
    
    // Extract tool selection reasoning
    const toolMatches = getAllMatches(orchestrationXml, /<tool>([\s\S]*?)<\/tool>/g);
    toolMatches.forEach((match: RegExpExecArray) => {
      const tool: any = {};
      const nameMatch = match[1].match(/<name>([\s\S]*?)<\/name>/) || match[1].match(/<n>([\s\S]*?)<\/n>/);
      const reasonMatch = match[1].match(/<selection_reason>([\s\S]*?)<\/selection_reason>/);
      const alternativesMatch = match[1].match(/<alternatives_considered>([\s\S]*?)<\/alternatives_considered>/);
      
      if (nameMatch) tool.name = nameMatch[1].trim();
      if (reasonMatch) tool.selection_reason = reasonMatch[1].trim();
      if (alternativesMatch) tool.alternatives_considered = alternativesMatch[1].trim();
      
      if (Object.keys(tool).length > 0) {
        result.tool_selection_reasoning.push(tool);
      }
    });
    
    // Extract parallel processing benefits
    const benefitMatches = getAllMatches(orchestrationXml, /<benefit>([\s\S]*?)<\/benefit>/g);
    benefitMatches.forEach((match: RegExpExecArray) => {
      const benefit: any = {};
      const descMatch = match[1].match(/<description>([\s\S]*?)<\/description>/);
      const exampleMatch = match[1].match(/<example>([\s\S]*?)<\/example>/);
      
      if (descMatch) benefit.description = descMatch[1].trim();
      if (exampleMatch) benefit.example = exampleMatch[1].trim();
      
      if (Object.keys(benefit).length > 0) {
        result.parallel_processing_benefits.push(benefit);
      }
    });
    
    // Extract data synthesis approach
    const synthesisMatch = orchestrationXml.match(/<data_synthesis_approach>([\s\S]*?)<\/data_synthesis_approach>/);
    if (synthesisMatch) {
      const synthesis: any = {};
      
      const methodMatch = synthesisMatch[1].match(/<method>([\s\S]*?)<\/method>/);
      const connectionsMatch = synthesisMatch[1].match(/<key_connections>([\s\S]*?)<\/key_connections>/);
      const valueMatch = synthesisMatch[1].match(/<added_value>([\s\S]*?)<\/added_value>/);
      
      if (methodMatch) synthesis.method = methodMatch[1].trim();
      if (connectionsMatch) synthesis.key_connections = connectionsMatch[1].trim();
      if (valueMatch) synthesis.added_value = valueMatch[1].trim();
      
      if (Object.keys(synthesis).length > 0) {
        result.data_synthesis_approach = synthesis;
      }
    }
    
    // Extract user-friendly explanation
    const explanationMatch = orchestrationXml.match(/<user_friendly_explanation>([\s\S]*?)<\/user_friendly_explanation>/);
    if (explanationMatch) {
      const explanation: any = {};
      
      const summaryMatch = explanationMatch[1].match(/<summary>([\s\S]*?)<\/summary>/);
      const highlightsMatch = explanationMatch[1].match(/<highlights>([\s\S]*?)<\/highlights>/);
      
      if (summaryMatch) explanation.summary = summaryMatch[1].trim();
      if (highlightsMatch) explanation.highlights = highlightsMatch[1].trim();
      
      if (Object.keys(explanation).length > 0) {
        result.user_friendly_explanation = explanation;
      }
    }
    
    return result;
  } catch (error) {
    logger.error('[XML Parser] Error parsing orchestration explanation from XML:', error);
    return null;
  }
}

/**
 * Parse UI card reasoning from XML content
 * @param xmlContent XML content containing UI card reasoning
 * @returns Parsed UI card reasoning or null if parsing fails
 */
export function parseUICardReasoningFromXml(xmlContent: string): any | null {
  try {
    // Extract the content between the <ui_card_reasoning> tags
    const cardMatch = xmlContent.match(/<ui_card_reasoning>([\s\S]*?)<\/ui_card_reasoning>/);
    
    if (!cardMatch) {
      logger.warn('[XML Parser] Failed to find <ui_card_reasoning> tags in the response.');
      return null;
    }
    
    const cardXml = cardMatch[0];
    
    // Initialize the base structure for the result
    const result: any = {
      tool_card_header: null,
      tool_selection_reason: null,
      insight_highlight: null,
      connection_to_other_tools: null,
      next_steps: null
    };
    
    // Extract header
    const headerMatch = cardXml.match(/<tool_card_header>([\s\S]*?)<\/tool_card_header>/);
    if (headerMatch) {
      result.tool_card_header = headerMatch[1].trim();
    }
    
    // Extract tool selection reason
    const reasonMatch = cardXml.match(/<tool_selection_reason>([\s\S]*?)<\/tool_selection_reason>/);
    if (reasonMatch) {
      result.tool_selection_reason = reasonMatch[1].trim();
    }
    
    // Extract insight highlight
    const insightMatch = cardXml.match(/<insight_highlight>([\s\S]*?)<\/insight_highlight>/);
    if (insightMatch) {
      result.insight_highlight = insightMatch[1].trim();
    }
    
    // Extract connection to other tools
    const connectionMatch = cardXml.match(/<connection_to_other_tools>([\s\S]*?)<\/connection_to_other_tools>/);
    if (connectionMatch) {
      result.connection_to_other_tools = connectionMatch[1].trim();
    }
    
    // Extract next steps
    const nextStepsMatch = cardXml.match(/<next_steps>([\s\S]*?)<\/next_steps>/);
    if (nextStepsMatch) {
      result.next_steps = nextStepsMatch[1].trim();
    }
    
    return result;
  } catch (error) {
    logger.error('[XML Parser] Error parsing UI card reasoning from XML:', error);
    return null;
  }
}

/**
 * Parses a learning progression plan from XML format
 * @param xmlContent XML content containing the learning progression plan
 * @returns Parsed learning progression plan structure or null if parsing failed
 */
export function parseLearningProgressionPlanFromXml(xmlContent: string): any {
  try {
    // Parse the XML content
    const doc = new DOMParser().parseFromString(xmlContent, 'text/xml');
    
    // Extract the root element
    const rootElement = doc.documentElement;
    if (!rootElement || rootElement.tagName !== 'learning_progression_plan') {
      console.error('Invalid XML structure: missing learning_progression_plan root element');
      return null;
    }
    
    // Initialize the result object
    const result: any = {};
    
    // Extract progress assessment
    const progressAssessmentElement = getFirstElementByTagName(rootElement, 'progress_assessment');
    if (progressAssessmentElement) {
      result.progress_assessment = {
        accomplished_milestones: extractMilestones(progressAssessmentElement),
        current_level: getTextContent(progressAssessmentElement, 'current_level'),
        knowledge_gaps: extractKnowledgeGaps(progressAssessmentElement)
      };
    }
    
    // Extract next module
    const nextModuleElement = getFirstElementByTagName(rootElement, 'next_module');
    if (nextModuleElement) {
      result.next_module = {
        title: getTextContent(nextModuleElement, 'title'),
        learning_objectives: extractArrayOfTextElements(nextModuleElement, 'learning_objectives', 'objective'),
        key_concepts: extractKeyConcepts(nextModuleElement),
        estimated_time: getTextContent(nextModuleElement, 'estimated_time')
      };
    }
    
    // Extract resource orchestration
    const resourceOrchestrationElement = getFirstElementByTagName(rootElement, 'resource_orchestration');
    if (resourceOrchestrationElement) {
      result.resource_orchestration = {
        tool_groups: extractToolGroups(resourceOrchestrationElement)
      };
    }
    
    // Extract engagement strategy
    const engagementStrategyElement = getFirstElementByTagName(rootElement, 'engagement_strategy');
    if (engagementStrategyElement) {
      result.engagement_strategy = {
        explanation_approach: getTextContent(engagementStrategyElement, 'explanation_approach'),
        practice_opportunities: extractPracticeOpportunities(engagementStrategyElement),
        real_world_applications: extractArrayOfTextElements(engagementStrategyElement, 'real_world_applications', 'application')
      };
    }
    
    // Extract continuity hooks
    const continuityHooksElement = getFirstElementByTagName(rootElement, 'continuity_hooks');
    if (continuityHooksElement) {
      result.continuity_hooks = {
        next_session_preview: getTextContent(continuityHooksElement, 'next_session_preview'),
        suggested_milestone_reminder: extractMilestoneReminder(continuityHooksElement),
        progress_celebration: extractProgressCelebration(continuityHooksElement)
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing learning progression plan XML:', error);
    return null;
  }
  
  // Helper function to extract milestones
  function extractMilestones(element: Element): any[] {
    const milestonesElement = getFirstElementByTagName(element, 'accomplished_milestones');
    if (!milestonesElement) return [];
    
    const milestones: any[] = [];
    const milestoneElements = milestonesElement.getElementsByTagName('milestone');
    
    for (let i = 0; i < milestoneElements.length; i++) {
      const milestoneElement = milestoneElements[i];
      milestones.push({
        description: getTextContent(milestoneElement, 'description'),
        mastery_level: getTextContent(milestoneElement, 'mastery_level'),
        evidence: getTextContent(milestoneElement, 'evidence')
      });
    }
    
    return milestones;
  }
  
  // Helper function to extract knowledge gaps
  function extractKnowledgeGaps(element: Element): any[] {
    const gapsElement = getFirstElementByTagName(element, 'knowledge_gaps');
    if (!gapsElement) return [];
    
    const gaps: any[] = [];
    const gapElements = gapsElement.getElementsByTagName('gap');
    
    for (let i = 0; i < gapElements.length; i++) {
      const gapElement = gapElements[i];
      gaps.push({
        concept: getTextContent(gapElement, 'concept'),
        importance: getTextContent(gapElement, 'importance'),
        address_in_session: getTextContent(gapElement, 'address_in_session') === 'true'
      });
    }
    
    return gaps;
  }
  
  // Helper function to extract key concepts
  function extractKeyConcepts(element: Element): any[] {
    const conceptsElement = getFirstElementByTagName(element, 'key_concepts');
    if (!conceptsElement) return [];
    
    const concepts: any[] = [];
    const conceptElements = conceptsElement.getElementsByTagName('concept');
    
    for (let i = 0; i < conceptElements.length; i++) {
      const conceptElement = conceptElements[i];
      concepts.push({
        name: getTextContent(conceptElement, 'name'),
        explanation: getTextContent(conceptElement, 'explanation'),
        builds_on: getTextContent(conceptElement, 'builds_on')
      });
    }
    
    return concepts;
  }
  
  // Helper function to extract tool groups
  function extractToolGroups(element: Element): any[] {
    const toolGroups: any[] = [];
    const toolGroupElements = element.getElementsByTagName('tool_group');
    
    for (let i = 0; i < toolGroupElements.length; i++) {
      const groupElement = toolGroupElements[i];
      const tools: any[] = [];
      const toolElements = getFirstElementByTagName(groupElement, 'tools')?.getElementsByTagName('tool') || [];
      
      for (let j = 0; j < toolElements.length; j++) {
        const toolElement = toolElements[j];
        tools.push({
          name: getTextContent(toolElement, 'name'),
          query: getTextContent(toolElement, 'query'),
          integration: getTextContent(toolElement, 'integration')
        });
      }
      
      toolGroups.push({
        purpose: getTextContent(groupElement, 'purpose'),
        tools
      });
    }
    
    return toolGroups;
  }
  
  // Helper function to extract practice opportunities
  function extractPracticeOpportunities(element: Element): any[] {
    const opportunitiesElement = getFirstElementByTagName(element, 'practice_opportunities');
    if (!opportunitiesElement) return [];
    
    const opportunities: any[] = [];
    const activityElements = opportunitiesElement.getElementsByTagName('activity');
    
    for (let i = 0; i < activityElements.length; i++) {
      const activityElement = activityElements[i];
      opportunities.push({
        description: getTextContent(activityElement, 'description'),
        difficulty: getTextContent(activityElement, 'difficulty'),
        instructions: getTextContent(activityElement, 'instructions')
      });
    }
    
    return opportunities;
  }
  
  // Helper function to extract milestone reminder
  function extractMilestoneReminder(element: Element): any {
    const reminderElement = getFirstElementByTagName(element, 'suggested_milestone_reminder');
    if (!reminderElement) return null;
    
    return {
      content: getTextContent(reminderElement, 'content'),
      timing: getTextContent(reminderElement, 'timing')
    };
  }
  
  // Helper function to extract progress celebration
  function extractProgressCelebration(element: Element): any {
    const celebrationElement = getFirstElementByTagName(element, 'progress_celebration');
    if (!celebrationElement) return null;
    
    return {
      trigger: getTextContent(celebrationElement, 'trigger'),
      message: getTextContent(celebrationElement, 'message')
    };
  }
}

/**
 * Parses a proactive learning check-in plan from XML format
 * @param xmlContent XML content containing the proactive check-in plan
 * @returns Parsed proactive check-in plan structure or null if parsing failed
 */
export function parseProactiveCheckinPlanFromXml(xmlContent: string): any {
  try {
    // Parse the XML content
    const doc = new DOMParser().parseFromString(xmlContent, 'text/xml');
    
    // Extract the root element
    const rootElement = doc.documentElement;
    if (!rootElement || rootElement.tagName !== 'proactive_checkin_plan') {
      console.error('Invalid XML structure: missing proactive_checkin_plan root element');
      return null;
    }
    
    // Initialize the result object
    const result: any = {};
    
    // Extract reconnection strategy
    const reconnectionElement = getFirstElementByTagName(rootElement, 'reconnection_strategy');
    if (reconnectionElement) {
      const topicReminderElement = getFirstElementByTagName(reconnectionElement, 'topic_reminder');
      const progressAcknowledgmentElement = getFirstElementByTagName(reconnectionElement, 'progress_acknowledgment');
      const engagementHookElement = getFirstElementByTagName(reconnectionElement, 'engagement_hook');
      
      result.reconnection_strategy = {
        topic_reminder: topicReminderElement ? {
          core_topic: getTextContent(topicReminderElement, 'core_topic'),
          last_focus: getTextContent(topicReminderElement, 'last_focus'),
          elapsed_time_framing: getTextContent(topicReminderElement, 'elapsed_time_framing')
        } : null,
        progress_acknowledgment: progressAcknowledgmentElement ? {
          milestone: getTextContent(progressAcknowledgmentElement, 'milestone'),
          effort_recognition: getTextContent(progressAcknowledgmentElement, 'effort_recognition')
        } : null,
        engagement_hook: engagementHookElement ? {
          question: getTextContent(engagementHookElement, 'question'),
          value_proposition: getTextContent(engagementHookElement, 'value_proposition')
        } : null
      };
    }
    
    // Extract learning status
    const learningStatusElement = getFirstElementByTagName(rootElement, 'learning_status');
    if (learningStatusElement) {
      const presumedPositionElement = getFirstElementByTagName(learningStatusElement, 'presumed_position');
      const nextStepsElement = getFirstElementByTagName(learningStatusElement, 'appropriate_next_steps');
      
      result.learning_status = {
        presumed_position: presumedPositionElement ? {
          completed_elements: getTextContent(presumedPositionElement, 'completed_elements'),
          current_focus: getTextContent(presumedPositionElement, 'current_focus'),
          potential_challenges: getTextContent(presumedPositionElement, 'potential_challenges')
        } : null,
        appropriate_next_steps: nextStepsElement ? {
          immediate_next: getTextContent(nextStepsElement, 'immediate_next'),
          medium_term: getTextContent(nextStepsElement, 'medium_term')
        } : null
      };
    }
    
    // Extract resource suggestions
    const resourceSuggestionsElement = getFirstElementByTagName(rootElement, 'resource_suggestions');
    if (resourceSuggestionsElement) {
      const toolBasedResourcesElement = getFirstElementByTagName(resourceSuggestionsElement, 'tool_based_resources');
      const followUpContentElement = getFirstElementByTagName(resourceSuggestionsElement, 'follow_up_content');
      
      result.resource_suggestions = {
        tool_based_resources: toolBasedResourcesElement ? 
          extractToolGroupsForCheckin(toolBasedResourcesElement) : [],
        follow_up_content: followUpContentElement ? {
          content_type: getTextContent(followUpContentElement, 'content_type'),
          focus: getTextContent(followUpContentElement, 'focus'),
          difficulty: getTextContent(followUpContentElement, 'difficulty')
        } : null
      };
    }
    
    // Extract motivation elements
    const motivationElementsElement = getFirstElementByTagName(rootElement, 'motivation_elements');
    if (motivationElementsElement) {
      const progressVisualizationElement = getFirstElementByTagName(motivationElementsElement, 'progress_visualization');
      const benefitReinforcementElement = getFirstElementByTagName(motivationElementsElement, 'benefit_reinforcement');
      
      result.motivation_elements = {
        progress_visualization: progressVisualizationElement ? {
          completed_percentage: getTextContent(progressVisualizationElement, 'completed_percentage'),
          milestone_proximity: getTextContent(progressVisualizationElement, 'milestone_proximity')
        } : null,
        benefit_reinforcement: benefitReinforcementElement ? {
          immediate_benefit: getTextContent(benefitReinforcementElement, 'immediate_benefit'),
          long_term_benefit: getTextContent(benefitReinforcementElement, 'long_term_benefit'),
          personal_relevance: getTextContent(benefitReinforcementElement, 'personal_relevance')
        } : null
      };
    }
    
    // Extract continuation options
    const continuationOptionsElement = getFirstElementByTagName(rootElement, 'continuation_options');
    if (continuationOptionsElement) {
      result.continuation_options = {
        paths: extractContinuationPaths(continuationOptionsElement),
        default_suggestion: extractDefaultSuggestion(continuationOptionsElement)
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing proactive check-in plan XML:', error);
    return null;
  }
  
  // Helper function to extract continuation paths
  function extractContinuationPaths(element: Element): any[] {
    const pathsElement = getFirstElementByTagName(element, 'paths');
    if (!pathsElement) return [];
    
    const paths: any[] = [];
    const pathElements = pathsElement.getElementsByTagName('path');
    
    for (let i = 0; i < pathElements.length; i++) {
      const pathElement = pathElements[i];
      paths.push({
        trigger: getTextContent(pathElement, 'trigger'),
        response_approach: getTextContent(pathElement, 'response_approach'),
        next_action: getTextContent(pathElement, 'next_action')
      });
    }
    
    return paths;
  }
  
  // Helper function to extract default suggestion
  function extractDefaultSuggestion(element: Element): any {
    const suggestionElement = getFirstElementByTagName(element, 'default_suggestion');
    if (!suggestionElement) return null;
    
    return {
      content: getTextContent(suggestionElement, 'content'),
      rationale: getTextContent(suggestionElement, 'rationale')
    };
  }
  
  // Helper function to extract tool groups for check-in (separate implementation to avoid type errors)
  function extractToolGroupsForCheckin(element: Element): any[] {
    const toolGroups: any[] = [];
    const toolGroupElements = element.getElementsByTagName('tool_group');
    
    for (let i = 0; i < toolGroupElements.length; i++) {
      const groupElement = toolGroupElements[i];
      const tools: any[] = [];
      const toolElements = getFirstElementByTagName(groupElement, 'tools')?.getElementsByTagName('tool') || [];
      
      for (let j = 0; j < toolElements.length; j++) {
        const toolElement = toolElements[j];
        tools.push({
          name: getTextContent(toolElement, 'name'),
          query: getTextContent(toolElement, 'query'),
          value: getTextContent(toolElement, 'value')
        });
      }
      
      toolGroups.push({
        purpose: getTextContent(groupElement, 'purpose'),
        tools
      });
    }
    
    return toolGroups;
  }
}

/**
 * Parse a focus mode plan from XML format
 * @param xmlString XML string containing focus mode plan
 * @returns Parsed focus mode plan data or null if parsing fails
 */
export function parseFocusModePlanFromXml(xmlString: string): any {
  try {
    // Remove any non-XML content before and after the XML
    const xmlPattern = /<focus_mode_plan>[\s\S]*?<\/focus_mode_plan>/;
    const match = xmlString.match(xmlPattern);
    
    if (!match) {
      console.error('No focus_mode_plan XML found in the string');
      return null;
    }
    
    const cleanXml = match[0];
    const parser = new XMLParser();
    const parsed = parser.parse(cleanXml);
    
    if (!parsed.focus_mode_plan) {
      console.error('Could not parse focus_mode_plan from XML');
      return null;
    }
    
    return parsed.focus_mode_plan;
  } catch (error) {
    console.error('Error parsing focus mode plan XML:', error);
    return null;
  }
} 