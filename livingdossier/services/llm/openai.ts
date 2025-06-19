//livingdossier/services/llm/openai.ts

import OpenAI from 'openai';
import { config } from '../../config/config';
import { Insight, InsightType } from '../insights/InsightsEngine';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || config.OPENAI_API_KEY
});

/**
 * OpenAI service for the Living Dossier system
 * Handles interactions with OpenAI APIs for generating insights and explanations
 */
export class OpenAIService {
  private apiKey: string;
  private model: string;
  
  constructor(apiKey?: string, model: string = 'gpt-4') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
  }
  
  /**
   * Generate insights from data using OpenAI
   * @param context Context for insight generation
   * @returns Array of generated insights
   */
  async generateInsights(context: {
    data: any;
    domain: string;
    question: string;
    purpose: string;
    previousInsights: Insight[];
  }): Promise<Insight[]> {
    try {
      // In a real implementation, this would make an API call to OpenAI
      // For now, we'll return mock insights
      
      // Mock insights based on the context
      const insights: Insight[] = [];
      
      // Add a summary insight
      insights.push({
        id: `summary-${Date.now()}`,
        type: InsightType.SUMMARY,
        title: `Summary of ${context.domain} data`,
        description: `This dataset contains information about ${context.domain}. The key patterns show trends in the main metrics.`,
        importance: 90,
        confidence: 0.85,
        metadata: {
          generatedAt: new Date().toISOString(),
          generationMethod: 'llm',
          model: this.model,
          tags: ['summary', context.domain]
        }
      });
      
      // Add a comparison insight if appropriate
      if (context.purpose.includes('compare') || context.question.includes('compare')) {
        insights.push({
          id: `comparison-${Date.now()}`,
          type: InsightType.COMPARISON,
          title: `Comparative analysis in ${context.domain}`,
          description: `When comparing the key metrics, there is a significant difference between the groups. Group A shows higher performance than Group B by approximately 23%.`,
          importance: 85,
          confidence: 0.8,
          metadata: {
            generatedAt: new Date().toISOString(),
            generationMethod: 'llm',
            model: this.model,
            tags: ['comparison', context.domain]
          }
        });
      }
      
      return insights;
    } catch (error) {
      console.error('Error generating insights with OpenAI:', error);
      return [];
    }
  }
  
  /**
   * Generate natural language explanation for an insight
   * @param context Context for explanation generation
   * @returns Detailed explanation
   */
  async generateExplanation(context: {
    insight: Insight;
    data: any;
    detailLevel: string;
    format: string;
    audience: string;
  }): Promise<string> {
    try {
      // In a real implementation, this would make an API call to OpenAI
      // For now, we'll return a mock explanation
      
      const { insight, detailLevel, format, audience } = context;
      
      // Generate different explanations based on the insight type
      switch (insight.type) {
        case InsightType.TREND:
          return this.formatExplanation(
            `# Trend Explanation\n\nThis trend shows a consistent pattern over time. The data indicates a ${insight.description.includes('increasing') ? 'positive' : 'negative'} trajectory with statistical significance (p < 0.05).\n\n${detailLevel === 'expert' ? 'The trend line follows a logarithmic pattern rather than linear, suggesting a natural growth curve that may plateau in future periods.' : ''}`,
            format
          );
          
        case InsightType.CORRELATION:
          return this.formatExplanation(
            `# Correlation Explained\n\nThe correlation between these variables indicates a relationship where changes in one variable are associated with changes in the other. ${detailLevel === 'expert' ? 'The Pearson correlation coefficient shows statistical significance, but remember that correlation does not imply causation. Additional controlled studies would be needed to establish a causal relationship.' : 'This pattern suggests these factors may be related, but more research is needed to determine if one causes the other.'}`,
            format
          );
          
        case InsightType.OUTLIER:
          return this.formatExplanation(
            `# Understanding Outliers\n\nOutliers are data points that differ significantly from other observations. ${audience === 'technical' ? 'These points fall outside 1.5 times the interquartile range (IQR), which is a standard statistical threshold for identifying anomalies.' : 'These unusual values may represent errors in data collection or genuinely unusual cases that deserve special attention.'}\n\nInvestigating these outliers may reveal important insights about exceptional cases or potential data quality issues.`,
            format
          );
          
        default:
          return this.formatExplanation(
            `# Insight Explanation\n\n${insight.description}\n\nThis pattern is important because it helps understand the underlying dynamics of the data and can inform decision-making.`,
            format
          );
      }
    } catch (error) {
      console.error('Error generating explanation with OpenAI:', error);
      return 'Unable to generate explanation due to an error.';
    }
  }
  
  /**
   * Format explanation based on requested format
   * @param explanation The explanation text in markdown
   * @param format Requested format
   * @returns Formatted explanation
   */
  private formatExplanation(explanation: string, format: string): string {
    switch (format) {
      case 'plain':
        // Convert markdown to plain text
        return explanation
          .replace(/# (.*)\n/g, '$1\n\n')
          .replace(/\*\*(.*)\*\*/g, '$1')
          .replace(/\*(.*)\*/g, '$1');
        
      case 'html':
        // Convert markdown to simple HTML
        return explanation
          .replace(/# (.*)\n/g, '<h1>$1</h1>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*)\*/g, '<em>$1</em>');
        
      case 'markdown':
      default:
        return explanation;
    }
  }
}

/**
 * Ask GPT for a response based on a prompt
 * @param prompt The prompt to send to GPT
 * @param model The model to use, defaults to gpt-4-turbo
 * @returns The response from GPT
 */
export async function askGPT(
  prompt: string, 
  model: string = 'gpt-4-turbo'
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4000
    });

    return response.choices[0].message.content || '';
  } catch (error: any) {
    console.error('Error asking GPT:', error);
    throw new Error(`Failed to get response from OpenAI: ${error.message}`);
  }
}

/**
 * Generate structured data from GPT
 * @param prompt The prompt to send to GPT
 * @param model The model to use, defaults to gpt-4-turbo
 * @returns The parsed JSON response from GPT
 */
export async function generateStructuredData<T>(
  prompt: string,
  model: string = 'gpt-4-turbo'
): Promise<T> {
  try {
    const enhancedPrompt = `${prompt}\n\nYour response must be valid JSON without any explanations or markdown formatting.`;
    
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: enhancedPrompt }],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as T;
  } catch (error: any) {
    console.error('Error generating structured data:', error);
    throw new Error(`Failed to get structured data from OpenAI: ${error.message}`);
  }
}