import yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// Define a local Task interface that matches what's being used in this file
interface Task {
  id: string;
  name?: string;
  description: string;
  tool?: string;
  params?: Record<string, any>;
  domains?: string[];
  base_score?: number;
  triggers?: Array<{ keyword: string; weight: number }>;
  type?: string;
}

// Define a minimal config if it's not available
const config = {
  STRATEGY_COMPONENTS_PATH: path.join(process.cwd(), 'livingdossier/config/strategy_components.yaml'),
  ENHANCED_STRATEGY_COMPONENTS_PATH: path.join(process.cwd(), 'livingdossier/config/enhanced_strategy_components.yaml')
};

export interface StrategyComponent {
  id: string;
  name: string;
  description: string;
  domains: string[];
  tasks: Task[];
  triggers?: Array<{
    keyword: string;
    weight: number;
  }>;
  dependencies?: string[];
  outputFormat?: string[];
  priority?: number;
  base_score?: number;
}

export interface DomainStrategy {
  id: string;
  name: string;
  description: string;
  components: string[]; // References to strategy component IDs
  defaultTasks: string[]; // References to task IDs
  customPrompt?: string;
}

export class StrategyService {
  private static instance: StrategyService;
  private strategyComponents: Record<string, StrategyComponent>;
  private enhancedStrategyComponents: Record<string, StrategyComponent>;
  private domainStrategies: Record<string, DomainStrategy>;

  private constructor() {
    try {
      // Load strategy components
      const strategyComponentsPath = config.STRATEGY_COMPONENTS_PATH;
      const strategyContent = fs.readFileSync(strategyComponentsPath, 'utf8');
      this.strategyComponents = yaml.load(strategyContent) || {};

      // Load enhanced strategy components
      const enhancedStrategyComponentsPath = config.ENHANCED_STRATEGY_COMPONENTS_PATH;
      const enhancedContent = fs.readFileSync(enhancedStrategyComponentsPath, 'utf8');
      this.enhancedStrategyComponents = yaml.load(enhancedContent) || {};
      
      // Load domain strategies
      this.domainStrategies = this.buildDomainStrategies();
    } catch (error) {
      console.error('Error loading strategy components:', error);
      this.strategyComponents = {};
      this.enhancedStrategyComponents = {};
      this.domainStrategies = {};
    }
  }

  public static getInstance(): StrategyService {
    if (!StrategyService.instance) {
      StrategyService.instance = new StrategyService();
    }
    return StrategyService.instance;
  }
  
  private buildDomainStrategies(): Record<string, DomainStrategy> {
    const strategies: Record<string, DomainStrategy> = {};
    
    // Define standard domains
    const standardDomains = [
      {
        id: 'business_intelligence',
        name: 'Business Intelligence',
        description: 'Market analysis, competitive landscape, business planning',
        components: ['market_analysis', 'competitive_intelligence', 'financial_analysis'],
        defaultTasks: ['research_industry_trends', 'analyze_competitors', 'project_financials']
      },
      {
        id: 'financial_analysis',
        name: 'Financial Analysis',
        description: 'Investment analysis, valuation, financial projections',
        components: ['investment_analysis', 'financial_forecasting', 'risk_assessment'],
        defaultTasks: ['analyze_investment_opportunity', 'generate_financial_projections', 'assess_risk_factors']
      },
      {
        id: 'education_planning',
        name: 'Education Planning',
        description: 'Education funding, college planning, career path analysis',
        components: ['education_funding', 'institution_research', 'career_path_analysis'],
        defaultTasks: ['compare_educational_institutions', 'project_education_costs', 'analyze_career_outcomes']
      },
      {
        id: 'renewable_energy',
        name: 'Renewable Energy',
        description: 'Project finance, energy yield analysis, regulatory considerations',
        components: ['energy_project_finance', 'yield_analysis', 'regulatory_research'],
        defaultTasks: ['analyze_energy_project_viability', 'forecast_energy_yields', 'research_regulatory_environment']
      },
      {
        id: 'travel_planning',
        name: 'Travel Planning',
        description: 'Destination analysis, itinerary planning, budget optimization',
        components: ['destination_research', 'itinerary_planning', 'travel_budgeting'],
        defaultTasks: ['research_destinations', 'create_optimized_itinerary', 'generate_travel_budget']
      },
      {
        id: 'real_estate',
        name: 'Real Estate Analysis',
        description: 'Property valuation, market trend analysis, investment potential',
        components: ['property_valuation', 'market_trends', 'investment_analysis'],
        defaultTasks: ['analyze_property_value', 'research_market_trends', 'project_investment_returns']
      }
    ];
    
    // Build the strategies
    standardDomains.forEach(domain => {
      strategies[domain.id] = domain as DomainStrategy;
    });
    
    return strategies;
  }

  public getTasksForDomain(domain: string): Task[] {
    const result: Task[] = [];
    
    // Get domain strategy
    const domainStrategy = this.domainStrategies[domain];
    
    if (!domainStrategy) {
      // Return generic tasks if no specific domain strategy exists
      return this.getGenericTasks();
    }
    
    // Get components for this domain
    for (const componentId of domainStrategy.components) {
      // Check enhanced components first, then fall back to regular components
      const component = 
        this.enhancedStrategyComponents[componentId] || 
        this.strategyComponents[componentId];
        
      if (component && component.tasks) {
        result.push(...component.tasks);
      }
    }
    
    return result;
  }
  
  private getGenericTasks(): Task[] {
    // Return a set of generic tasks that work for any domain
    return [
      {
        id: 'research_topic',
        name: 'Research Topic',
        description: 'Gather general information about the topic',
        tool: 'web_search',
        params: { depth: 'comprehensive' }
      },
      {
        id: 'analyze_data',
        name: 'Analyze Data',
        description: 'Perform statistical analysis on relevant data',
        tool: 'data_analysis',
        params: { type: 'exploratory' }
      },
      {
        id: 'create_visualization',
        name: 'Create Data Visualization',
        description: 'Generate visualizations to represent findings',
        tool: 'visualization',
        params: { type: 'auto' }
      },
      {
        id: 'summarize_findings',
        name: 'Summarize Findings',
        description: 'Create an executive summary of key insights',
        tool: 'text_generation',
        params: { style: 'professional' }
      }
    ];
  }
  
  public getDomainTasks(domain: string): Record<string, Task[]> {
    const domainTasks: Record<string, Task[]> = {};
    
    // Map specific domains to their tasks
    const domains = [
      'insights',
      'executive_synthesis_tasks',
      'market_analysis_tasks',
      'company_analysis_tasks',
      'customer_identification_tasks',
      'go_to_market_tasks',
      'creative_visualization_tasks',
      'education_planning_tasks',
      'renewable_energy_tasks',
      'venture_creation_tasks',
      'wealth_management_tasks',
      'personal_finance_tasks',
      'real_estate_intelligence_tasks',
      'bespoke_travel_tasks',
      'hospitality_intelligence_tasks',
      'sports_intelligence_tasks',
      'primary_source_acquisition_tasks',
      'human_context_tasks',
      'specialized_data_tasks',
      'quantitative_modeling_tasks',
      'planning_tasks',
      'reporting_and_visualization_tasks'
    ];
    
    // Get tasks from base and enhanced strategy components
    domains.forEach(taskDomain => {
      const baseTasks = this.strategyComponents?.[taskDomain]?.tasks || [];
      const enhancedTasks = this.enhancedStrategyComponents?.[taskDomain]?.tasks || [];
      
      // Filter tasks by domain relevance
      const relevantTasks = [...baseTasks, ...enhancedTasks].filter(task => 
        !task.domains || task.domains.includes(domain) || domain === 'all'
      );
      
      if (relevantTasks.length > 0) {
        domainTasks[taskDomain] = relevantTasks;
      }
    });
    
    return domainTasks;
  }
  
  public async generateTasksForQuery(query: string, domain: string): Promise<Task[]> {
    const domainTasks = this.getDomainTasks(domain);
    const allTasks: Task[] = [];
    
    // Collect all tasks
    Object.values(domainTasks).forEach(tasks => {
      allTasks.push(...tasks);
    });
    
    // Score and sort tasks based on relevance to query
    const scoredTasks = allTasks.map(task => {
      const score = this.scoreTaskForQuery(task, query);
      return { task, score };
    });
    
    // Sort by score descending
    scoredTasks.sort((a, b) => b.score - a.score);
    
    // Return top tasks (maximum 10)
    return scoredTasks.slice(0, 10).map(item => item.task);
  }
  
  /**
   * Detects the most appropriate domain for a given query
   * @param query The user's query
   * @returns The detected domain ID
   */
  public detectDomainFromQuery(query: string): string {
    // Map of domains and their associated keywords
    const domainKeywords: Record<string, string[]> = {
      'business_intelligence': [
        'market', 'competitor', 'industry', 'business plan', 'swot', 'opportunity', 'business model'
      ],
      'financial_analysis': [
        'investment', 'stock', 'financial', 'valuation', 'portfolio', 'return', 'risk', 'profit', 'cost'
      ],
      'education_planning': [
        'school', 'college', 'university', 'education', 'degree', 'course', 'tuition', 'scholarship', 'career'
      ],
      'renewable_energy': [
        'renewable', 'solar', 'wind', 'energy', 'green', 'sustainable', 'carbon', 'electricity', 'power'
      ],
      'travel_planning': [
        'travel', 'vacation', 'trip', 'destination', 'hotel', 'flight', 'itinerary', 'tourism'
      ],
      'real_estate': [
        'property', 'real estate', 'housing', 'apartment', 'mortgage', 'rental', 'home', 'investment property',
        'commercial property', 'residential'
      ]
    };
    
    // Score each domain based on keyword matches
    const scores: Record<string, number> = {};
    const lowerCaseQuery = query.toLowerCase();
    
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      scores[domain] = 0;
      keywords.forEach(keyword => {
        if (lowerCaseQuery.includes(keyword.toLowerCase())) {
          scores[domain] += 1;
        }
      });
    });
    
    // Find domain with highest score
    let bestDomain = 'business_intelligence'; // Default domain
    let highestScore = 0;
    
    Object.entries(scores).forEach(([domain, score]) => {
      if (score > highestScore) {
        highestScore = score;
        bestDomain = domain;
      }
    });
    
    return bestDomain;
  }
  
  private scoreTaskForQuery(task: Task, query: string): number {
    let score = task.base_score || 1;
    
    // Check triggers
    if (task.triggers) {
      task.triggers.forEach(trigger => {
        if (query.toLowerCase().includes(trigger.keyword.toLowerCase())) {
          score += trigger.weight || 1;
        }
      });
    }
    
    return score;
  }
  
  /**
   * Get all available domains with their descriptions
   */
  public getAllDomains(): Array<{id: string, name: string, description: string}> {
    return Object.values(this.domainStrategies).map(domain => ({
      id: domain.id,
      name: domain.name,
      description: domain.description
    }));
  }
} 