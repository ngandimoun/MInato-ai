//livingdossier/services/llm/anthropic.ts

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/config';
import { Insight, InsightType } from '../insights/InsightsEngine';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

/**
 * Ask Claude for a response based on a prompt
 * @param prompt The prompt to send to Claude
 * @param model The model to use, defaults to claude-3-sonnet-20240229
 * @returns The response from Claude
 */
export async function askClaude(
  prompt: string,
  model: string = 'claude-3-sonnet-20240229'
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000
    });

    return response.content[0].text;
  } catch (error: any) {
    console.error('Error asking Claude:', error);
    throw new Error(`Failed to get response from Anthropic: ${error.message}`);
  }
}

/**
 * Generate structured data from Claude
 * @param prompt The prompt to send to Claude
 * @param model The model to use, defaults to claude-3-sonnet-20240229
 * @returns The parsed JSON response from Claude
 */
export async function generateStructuredDataClaude<T>(
  prompt: string,
  model: string = 'claude-3-sonnet-20240229'
): Promise<T> {
  try {
    const enhancedPrompt = `${prompt}\n\nYour response must be valid JSON without any explanations or markdown formatting. Return only the JSON object.`;
    
    const response = await anthropic.messages.create({
      model,
      messages: [{ role: 'user', content: enhancedPrompt }],
      max_tokens: 4000
    });

    const content = response.content[0].text.trim();
    // Extract JSON if wrapped in code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
    const jsonString = jsonMatch[1].trim();
    
    return JSON.parse(jsonString) as T;
  } catch (error: any) {
    console.error('Error generating structured data from Claude:', error);
    throw new Error(`Failed to get structured data from Anthropic: ${error.message}`);
  }
}

/**
 * Anthropic service for the Living Dossier system
 * Handles interactions with Anthropic Claude APIs for generating insights and explanations
 */
export class AnthropicService {
  private apiKey: string;
  private model: string;
  
  constructor(apiKey?: string, model: string = 'claude-3-opus') {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = model;
  }
  
  /**
   * Generate insights from data using Anthropic Claude
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
      // In a real implementation, this would make an API call to Anthropic
      // For now, we'll return mock insights
      
      // Mock insights based on the context
      const insights: Insight[] = [];
      
      // Add a summary insight
      insights.push({
        id: `summary-claude-${Date.now()}`,
        type: InsightType.SUMMARY,
        title: `Comprehensive analysis of ${context.domain} data`,
        description: `This dataset reveals several key patterns in ${context.domain}. The primary metrics show significant variations across different segments.`,
        importance: 95,
        confidence: 0.9,
        metadata: {
          generatedAt: new Date().toISOString(),
          generationMethod: 'llm',
          model: this.model,
          tags: ['summary', 'comprehensive', context.domain]
        }
      });
      
      // Add a pattern insight
      insights.push({
        id: `pattern-claude-${Date.now()}`,
        type: InsightType.PATTERN,
        title: `Recurring pattern in ${context.domain} data`,
        description: `There appears to be a cyclical pattern in the key metrics that repeats approximately every 7 data points. This suggests a weekly cycle that may be tied to business operations or customer behavior.`,
        importance: 85,
        confidence: 0.82,
        metadata: {
          generatedAt: new Date().toISOString(),
          generationMethod: 'llm',
          model: this.model,
          tags: ['pattern', 'cyclical', context.domain]
        }
      });
      
      return insights;
    } catch (error) {
      console.error('Error generating insights with Anthropic:', error);
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
      // In a real implementation, this would make an API call to Anthropic
      // For now, we'll return a mock explanation
      
      const { insight, detailLevel, format, audience } = context;
      
      // Generate different explanations based on the insight type
      switch (insight.type) {
        case InsightType.TREND:
          return this.formatExplanation(
            `# Understanding the Trend\n\nThis trend represents a systematic change in the data over time. ${audience === 'executive' ? 'The business implications of this trend are significant and may require strategic adjustments.' : 'The statistical analysis shows this trend is unlikely to be due to random fluctuations.'}\n\n${detailLevel === 'expert' ? 'When we decompose this trend using time series analysis, we can identify both the seasonal component and the underlying growth trajectory. The seasonally adjusted growth rate is approximately 3.2% per period.' : ''}`,
            format
          );
          
        case InsightType.PATTERN:
          return this.formatExplanation(
            `# Pattern Analysis\n\nThe identified pattern represents a recurring structure in the data that provides valuable insights. ${audience === 'technical' ? 'This pattern was detected using advanced pattern recognition algorithms with a confidence level of 82%.' : 'This recurring pattern suggests there are predictable cycles that can be leveraged for planning and forecasting.'}\n\n${detailLevel === 'expert' ? 'The pattern follows a quasi-periodic structure with some variations in amplitude. Fourier analysis reveals dominant frequencies at approximately 1/7, 1/30, and 1/365, suggesting daily, monthly, and annual cycles.' : ''}`,
            format
          );
          
        case InsightType.ANOMALY:
          return this.formatExplanation(
            `# Anomaly Detection Insights\n\nAnomalies represent unexpected deviations from normal patterns in the data. ${audience === 'executive' ? 'These anomalies may indicate critical events that require immediate attention or represent opportunities for process improvement.' : 'Statistical analysis confirms these points fall outside the expected range with high confidence.'}\n\n${detailLevel === 'expert' ? 'These anomalies were detected using a combination of statistical methods including Z-score analysis, isolation forests, and DBSCAN clustering. The probability of these events occurring by chance is less than 0.1%.' : ''}`,
            format
          );
          
        default:
          return this.formatExplanation(
            `# Detailed Insight Analysis\n\n${insight.description}\n\n${detailLevel === 'expert' ? 'This insight was generated through comprehensive analysis of the underlying data structures and patterns. The statistical significance of this finding suggests it represents a genuine phenomenon rather than random variation.' : 'This finding helps us understand important aspects of the data that might not be immediately obvious from casual observation.'}`,
            format
          );
      }
    } catch (error) {
      console.error('Error generating explanation with Anthropic:', error);
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