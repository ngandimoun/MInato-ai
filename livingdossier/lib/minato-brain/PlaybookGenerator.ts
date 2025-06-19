//livingdossier/lib/minato-brain/PlaybookGenerator.ts

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { generateStructuredData } from '../../services/llm/openai';
import { config } from '../../config/config';
import { SemanticMatcher, SemanticConcept } from './SemanticMatcher';
import { allConcepts, buildTaskConceptMappings, DynamicSemanticConcept } from './ConceptLibrary';

export type Task = {
  id: string;
  description: string;
  type: string;
  base_score: number;
  triggers: { keyword: string; weight: number }[];
  prompt?: string;
  goal?: string;
  tool_name?: string;
  runtime_environment?: string;
};

export type StrategyComponents = {
  insights: Task[];
  executive_synthesis_tasks: Task[];
  problem_and_market_validation_tasks: Task[];
  market_analysis_tasks: Task[];
  company_analysis_tasks: Task[];
  customer_identification_tasks: Task[];
  go_to_market_tasks: Task[];
  creative_visualization_tasks: Task[];
  education_planning_tasks: Task[];
  renewable_energy_tasks: Task[];
  venture_creation_tasks: Task[];
  wealth_management_tasks: Task[];
  personal_finance_tasks: Task[];
  real_estate_intelligence_tasks: Task[];
  bespoke_travel_tasks: Task[];
  hospitality_intelligence_tasks: Task[];
  sports_intelligence_tasks: Task[];
  primary_source_acquisition_tasks: Task[];
  human_context_tasks: Task[];
  specialized_data_tasks: Task[];
  quantitative_modeling_tasks: Task[];
  planning_tasks: Task[];
  reporting_and_visualization_tasks: Task[];
  meta_tasks?: Task[];
};

export type PlaybookTask = {
  id: string;
  description: string;
  type: string;
  prompt?: string;
  goal?: string;
  tool_name?: string;
  runtime_environment?: string;
  parameters?: Record<string, any>;
};

export type QueryAnalysis = {
  topic: string;
  domain: string;
  location?: string;
  keywords: string[];
  intent: string;
  parameters: Record<string, any>;
  language: string;
  semantic_concepts?: string[];
};

/**
 * Load the strategy components from the YAML file
 * @returns The strategy components
 */
export function loadStrategyComponents(): StrategyComponents {
  try {
    // Load both strategy component files and merge them
    try {
      const enhancedFilePath = path.resolve(__dirname, '../../config/enhanced_strategy_components.yaml');
      const originalFilePath = path.resolve(__dirname, '../../config/strategy_components.yaml');
      
      // Load both files
      const enhancedContent = fs.readFileSync(enhancedFilePath, 'utf8');
      const originalContent = fs.readFileSync(originalFilePath, 'utf8');
      
      // Parse both YAML files
      const enhancedComponents = yaml.load(enhancedContent) as StrategyComponents;
      const originalComponents = yaml.load(originalContent) as StrategyComponents;
      
      console.log('Successfully loaded both strategy component files');
      
      // Merge the components, with enhanced components taking precedence for duplicates
      const mergedComponents: StrategyComponents = {
        insights: [...(originalComponents.insights || []), ...(enhancedComponents.insights || [])],
        executive_synthesis_tasks: [...(originalComponents.executive_synthesis_tasks || []), ...(enhancedComponents.executive_synthesis_tasks || [])],
        problem_and_market_validation_tasks: [...(originalComponents.problem_and_market_validation_tasks || []), ...(enhancedComponents.problem_and_market_validation_tasks || [])],
        market_analysis_tasks: [...(originalComponents.market_analysis_tasks || []), ...(enhancedComponents.market_analysis_tasks || [])],
        company_analysis_tasks: [...(originalComponents.company_analysis_tasks || []), ...(enhancedComponents.company_analysis_tasks || [])],
        customer_identification_tasks: [...(originalComponents.customer_identification_tasks || []), ...(enhancedComponents.customer_identification_tasks || [])],
        go_to_market_tasks: [...(originalComponents.go_to_market_tasks || []), ...(enhancedComponents.go_to_market_tasks || [])],
        creative_visualization_tasks: [...(originalComponents.creative_visualization_tasks || []), ...(enhancedComponents.creative_visualization_tasks || [])],
        education_planning_tasks: [...(originalComponents.education_planning_tasks || []), ...(enhancedComponents.education_planning_tasks || [])],
        renewable_energy_tasks: [...(originalComponents.renewable_energy_tasks || []), ...(enhancedComponents.renewable_energy_tasks || [])],
        venture_creation_tasks: [...(originalComponents.venture_creation_tasks || []), ...(enhancedComponents.venture_creation_tasks || [])],
        wealth_management_tasks: [...(originalComponents.wealth_management_tasks || []), ...(enhancedComponents.wealth_management_tasks || [])],
        personal_finance_tasks: [...(originalComponents.personal_finance_tasks || []), ...(enhancedComponents.personal_finance_tasks || [])],
        real_estate_intelligence_tasks: [...(originalComponents.real_estate_intelligence_tasks || []), ...(enhancedComponents.real_estate_intelligence_tasks || [])],
        bespoke_travel_tasks: [...(originalComponents.bespoke_travel_tasks || []), ...(enhancedComponents.bespoke_travel_tasks || [])],
        hospitality_intelligence_tasks: [...(originalComponents.hospitality_intelligence_tasks || []), ...(enhancedComponents.hospitality_intelligence_tasks || [])],
        sports_intelligence_tasks: [...(originalComponents.sports_intelligence_tasks || []), ...(enhancedComponents.sports_intelligence_tasks || [])],
        primary_source_acquisition_tasks: [...(originalComponents.primary_source_acquisition_tasks || []), ...(enhancedComponents.primary_source_acquisition_tasks || [])],
        human_context_tasks: [...(originalComponents.human_context_tasks || []), ...(enhancedComponents.human_context_tasks || [])],
        specialized_data_tasks: [...(originalComponents.specialized_data_tasks || []), ...(enhancedComponents.specialized_data_tasks || [])],
        quantitative_modeling_tasks: [...(originalComponents.quantitative_modeling_tasks || []), ...(enhancedComponents.quantitative_modeling_tasks || [])],
        planning_tasks: [...(originalComponents.planning_tasks || []), ...(enhancedComponents.planning_tasks || [])],
        reporting_and_visualization_tasks: [...(originalComponents.reporting_and_visualization_tasks || []), ...(enhancedComponents.reporting_and_visualization_tasks || [])],
        meta_tasks: [...(originalComponents.meta_tasks || []), ...(enhancedComponents.meta_tasks || [])],
      };
      
      return mergedComponents;
    } catch (error) {
      // If there's an error loading or merging, fall back to the original
      console.warn('Error loading or merging strategy components:', error);
      const originalFilePath = path.resolve(__dirname, '../../config/strategy_components.yaml');
      const yamlContent = fs.readFileSync(originalFilePath, 'utf8');
      return yaml.load(yamlContent) as StrategyComponents;
    }
  } catch (error: any) {
    console.error('Error loading strategy components:', error);
    throw new Error(`Failed to load strategy components: ${error.message}`);
  }
}

/**
 * Analyze a user query to extract key details
 * @param query The user's query
 * @returns A structured analysis of the query
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  const prompt = `
Analyze this query: "${query}"

First, identify the language of the query. Then extract the key details into a JSON object.

Be comprehensive in your analysis, looking for implicit and explicit information. Consider the domain context, user intent, and any specific parameters mentioned.

Return a JSON object with the following structure:
{
  "topic": "The main topic or subject of the query",
  "domain": "The domain or industry the query relates to (e.g., business, finance, travel, education)",
  "location": "Any location mentioned in the query, or null if none",
  "keywords": ["List", "of", "important", "keywords", "including", "synonyms", "and", "related", "terms"],
  "intent": "A detailed description of what the user wants to achieve",
  "parameters": {
    "Add any specific parameters mentioned in the query as key-value pairs"
  },
  "language": "The ISO 639-1 language code of the query (e.g., 'en', 'fr', 'es')",
  "semantic_concepts": ["business_intelligence", "market_analysis"] // List any semantic concepts that apply
}

For semantic_concepts, choose from: business_idea, market_analysis, competitor_analysis, business_model, marketing_strategy, investment_strategy, personal_finance, real_estate_investment, education_planning, renewable_energy, energy_yield, travel_planning, hospitality_management, sports_analytics, player_valuation, interactive_visualization.

Be precise and extract only what is explicitly mentioned or strongly implied in the query.
`;

  return await generateStructuredData<QueryAnalysis>(prompt);
}

/**
 * Score a task based on how well it matches the query analysis
 * @param task The task to score
 * @param analysis The query analysis
 * @returns The score for the task
 */
function scoreTask(task: Task, analysis: QueryAnalysis): number {
  let score = task.base_score;
  
  // Check for semantic concept matches (highest priority)
  if (analysis.semantic_concepts && analysis.semantic_concepts.length > 0) {
    // Extract all keywords from the task triggers
    const taskKeywords = task.triggers.map(t => t.keyword.toLowerCase());
    
    // Check if any semantic concepts match the task keywords
    for (const concept of analysis.semantic_concepts) {
      const conceptLower = concept.toLowerCase();
      if (taskKeywords.some(k => k.includes(conceptLower) || conceptLower.includes(k))) {
        // Give a significant boost for semantic concept matches
        score += 100;
        break;
      }
    }
  }
  
  // Check for language-specific matches
  const userLanguage = analysis.language || 'en';
  
  // Check for keyword matches
  for (const trigger of task.triggers) {
    if (trigger.keyword === 'all') {
      score += trigger.weight;
      continue;
    }
    
    // Check if the keyword is in the query analysis
    const keywordLower = trigger.keyword.toLowerCase();
    
    // Check for direct keyword matches in the user's language
    if (
      analysis.keywords.some(k => k.toLowerCase().includes(keywordLower) || keywordLower.includes(k.toLowerCase())) ||
      analysis.topic.toLowerCase().includes(keywordLower) ||
      analysis.domain.toLowerCase().includes(keywordLower) ||
      analysis.intent.toLowerCase().includes(keywordLower)
    ) {
      // Higher weight for matches in the user's language
      score += trigger.weight * 1.5;
      continue;
    }
    
    // Check for fuzzy matches or partial matches
    if (
      analysis.keywords.some(k => fuzzyMatch(k.toLowerCase(), keywordLower)) ||
      fuzzyMatch(analysis.topic.toLowerCase(), keywordLower) ||
      fuzzyMatch(analysis.domain.toLowerCase(), keywordLower) ||
      fuzzyMatch(analysis.intent.toLowerCase(), keywordLower)
    ) {
      // Lower weight for fuzzy matches
      score += trigger.weight * 0.7;
    }
  }
  
  return score;
}

/**
 * Simple fuzzy matching function
 * @param text The text to search in
 * @param pattern The pattern to search for
 * @returns True if there's a fuzzy match
 */
function fuzzyMatch(text: string, pattern: string): boolean {
  // If either string is empty, no match
  if (!text || !pattern) return false;
  
  // If the pattern is longer than the text, no match
  if (pattern.length > text.length) return false;
  
  // If the strings are the same, exact match
  if (text === pattern) return true;
  
  // Check if at least 70% of the characters in the pattern appear in the text in order
  let textIndex = 0;
  let patternIndex = 0;
  let matches = 0;
  
  while (textIndex < text.length && patternIndex < pattern.length) {
    if (text[textIndex] === pattern[patternIndex]) {
      matches++;
      patternIndex++;
    }
    textIndex++;
  }
  
  return matches / pattern.length >= 0.7;
}

/**
 * Generate a playbook of tasks based on a query analysis
 * @param analysis The query analysis
 * @param maxTasks The maximum number of tasks to include in the playbook
 * @returns A list of tasks to execute
 */
export async function generatePlaybook(analysis: QueryAnalysis, maxTasks: number = config.MAX_TOOLS_PER_QUERY): Promise<PlaybookTask[]> {
  try {
    const components = loadStrategyComponents();
    const allTasks: Task[] = [
      ...(components.insights || []),
      ...(components.executive_synthesis_tasks || []),
      ...(components.problem_and_market_validation_tasks || []),
      ...(components.market_analysis_tasks || []),
      ...(components.company_analysis_tasks || []),
      ...(components.customer_identification_tasks || []),
      ...(components.go_to_market_tasks || []),
      ...(components.creative_visualization_tasks || []),
      ...(components.education_planning_tasks || []),
      ...(components.renewable_energy_tasks || []),
      ...(components.venture_creation_tasks || []),
      ...(components.wealth_management_tasks || []),
      ...(components.personal_finance_tasks || []),
      ...(components.real_estate_intelligence_tasks || []),
      ...(components.bespoke_travel_tasks || []),
      ...(components.hospitality_intelligence_tasks || []),
      ...(components.sports_intelligence_tasks || []),
      ...(components.primary_source_acquisition_tasks || []),
      ...(components.human_context_tasks || []),
      ...(components.specialized_data_tasks || []),
      ...(components.quantitative_modeling_tasks || []),
      ...(components.planning_tasks || []),
      ...(components.reporting_and_visualization_tasks || []),
      ...(components.meta_tasks || []),
    ];
    
    // Create semantic matcher with pre-defined concepts
    const taskConceptMappings = buildTaskConceptMappings(allTasks, allConcepts);
    const semanticMatcher = new SemanticMatcher(convertToSemanticConcepts(allConcepts), taskConceptMappings);
    
    // Score each task based on the query analysis using semantic matching
    const scoringPromises = allTasks.map(async task => {
      const semanticResult = await semanticMatcher.scoreTaskSemantically(task, analysis);
      return {
        task,
        score: semanticResult.score,
        confidence: semanticResult.confidence,
        matchedConcepts: semanticResult.matchedConcepts
      };
    });
    
    const scoredTasks = await Promise.all(scoringPromises);
    
    // Sort tasks by score (descending)
    scoredTasks.sort((a, b) => b.score - a.score);
    
    // Check if we have any high-confidence matches
    const highConfidenceTasks = scoredTasks.filter(task => task.confidence > 0.7);
    
    let selectedTasks: PlaybookTask[];
    
    if (highConfidenceTasks.length > 0) {
      // If we have high-confidence matches, use those
      selectedTasks = highConfidenceTasks.slice(0, maxTasks).map(({ task }) => ({
        id: task.id,
        description: task.description,
        type: task.type,
        prompt: task.prompt,
        goal: task.goal,
        tool_name: task.tool_name,
        runtime_environment: task.runtime_environment,
        parameters: {}
      }));
    } else {
      // If no high-confidence matches, check for meta_tasks that might handle this case
      const metaTasks = scoredTasks.filter(task => 
        components.meta_tasks?.some(metaTask => metaTask.id === task.task.id)
      );
      
      if (metaTasks.length > 0) {
        // Use the highest-scoring meta task
        selectedTasks = metaTasks.slice(0, 1).map(({ task }) => ({
          id: task.id,
          description: task.description,
          type: task.type,
          prompt: task.prompt,
          goal: task.goal,
          tool_name: task.tool_name,
          runtime_environment: task.runtime_environment,
          parameters: {}
        }));
        
        // Add some general tasks to complement the meta task
        const generalTasks = scoredTasks
          .filter(task => !metaTasks.some(m => m.task.id === task.task.id))
          .slice(0, maxTasks - 1)
          .map(({ task }) => ({
            id: task.id,
            description: task.description,
            type: task.type,
            prompt: task.prompt,
            goal: task.goal,
            tool_name: task.tool_name,
            runtime_environment: task.runtime_environment,
            parameters: {}
          }));
        
        selectedTasks = [...selectedTasks, ...generalTasks];
      } else {
        // Fall back to the highest-scoring tasks
        selectedTasks = scoredTasks.slice(0, maxTasks).map(({ task }) => ({
          id: task.id,
          description: task.description,
          type: task.type,
          prompt: task.prompt,
          goal: task.goal,
          tool_name: task.tool_name,
          runtime_environment: task.runtime_environment,
          parameters: {}
        }));
      }
    }
    
    // If we still don't have any tasks, add a default task as a fallback
    if (selectedTasks.length === 0) {
      selectedTasks = [{
        id: 'default_analysis',
        description: `Default analysis for ${analysis.topic}`,
        type: 'llm',
        prompt: `Provide a comprehensive analysis of "${analysis.topic}" in the domain of "${analysis.domain}". Include key concepts, current trends, challenges, opportunities, and recommendations.`,
        parameters: {}
      }];
    }
    
    return selectedTasks;
  } catch (error: any) {
    console.error('Error generating playbook:', error);
    throw new Error(`Failed to generate playbook: ${error.message}`);
  }
}

/**
 * Fill in the parameters for a task based on the query analysis
 * @param task The task with placeholders in its prompt or goal
 * @param analysis The query analysis
 * @returns The task with filled-in parameters
 */
export function fillTaskParameters(task: PlaybookTask, analysis: QueryAnalysis): PlaybookTask {
  const filledTask = { 
    ...task,
    parameters: task.parameters || {} // Initialize parameters if not present
  };
  
  const parameters: Record<string, any> = {
    ...analysis.parameters,
    topic: analysis.topic,
    user_domain: analysis.domain,
    location: analysis.location || ''
  };
  
  // Fill in the prompt or goal
  if (filledTask.prompt) {
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`;
      if (filledTask.prompt.includes(placeholder)) {
        filledTask.prompt = filledTask.prompt.replace(new RegExp(placeholder, 'g'), String(value));
        filledTask.parameters[key] = value;
      }
    }
  }
  
  if (filledTask.goal) {
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`;
      if (filledTask.goal.includes(placeholder)) {
        filledTask.goal = filledTask.goal.replace(new RegExp(placeholder, 'g'), String(value));
        filledTask.parameters[key] = value;
      }
    }
  }
  
  // Map the tool_name to the actual tool in the registry if needed
  if (filledTask.tool_name && config.toolMapping) {
    const mapping = config.toolMapping as Record<string, string>;
    if (mapping[filledTask.tool_name]) {
      filledTask.tool_name = mapping[filledTask.tool_name];
    }
  }
  
  return filledTask;
}

/**
 * Convert DynamicSemanticConcept to SemanticConcept for compatibility with SemanticMatcher
 * @param dynamicConcepts Array of DynamicSemanticConcept objects
 * @returns Array of SemanticConcept objects
 */
function convertToSemanticConcepts(dynamicConcepts: DynamicSemanticConcept[]): SemanticConcept[] {
  return dynamicConcepts.map(concept => {
    // Extract English terms or use empty array as fallback
    const keywords = concept.terms['en'] || [];
    
    // Create a SemanticConcept from DynamicSemanticConcept
    return {
      id: concept.id,
      name: concept.name,
      keywords: keywords,
      synonyms: concept.terms,
      related_concepts: concept.relatedConcepts
    };
  });
}

/**
 * Generate a playbook for a dynamic task
 * @param taskQuery The task query to generate a playbook for
 * @param concepts The concepts to use for semantic matching
 * @returns The generated playbook tasks
 */
export async function generateDynamicTask(taskQuery: string, concepts: DynamicSemanticConcept[]): Promise<PlaybookTask[]> {
  try {
    // Extract task concepts and build mappings
    const taskConceptMappings = buildTaskConceptMappings([{id: 'dynamic_task', description: taskQuery, type: 'dynamic', base_score: 1, triggers: []}], concepts);
    
    // Convert DynamicSemanticConcept to SemanticConcept for compatibility
    const semanticConcepts = convertToSemanticConcepts(concepts);
    
    // Create a semantic matcher with the concepts
    const semanticMatcher = new SemanticMatcher(semanticConcepts, taskConceptMappings);
    
    // Generate the playbook
    const analysis: QueryAnalysis = await analyzeQuery(taskQuery);
    const playbook = await generatePlaybook(analysis);
    
    return playbook;
  } catch (error) {
    console.error(`Failed to generate dynamic task: ${error}`);
    throw error;
  }
}

// The "Master Assembler"
