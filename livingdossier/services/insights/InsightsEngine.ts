import { OpenAIService } from '../../services/llm/openai';
import { AnthropicService } from '../../services/llm/anthropic';

/**
 * Types of insights that can be generated
 */
export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  CORRELATION = 'correlation',
  OUTLIER = 'outlier',
  PATTERN = 'pattern',
  FORECAST = 'forecast',
  COMPARISON = 'comparison',
  SUMMARY = 'summary'
}

/**
 * Interface for insight objects
 */
export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  importance: number; // 0-100 score
  confidence: number; // 0-1 score
  relatedData?: {
    fields: string[];
    timeRange?: {
      start: string | number;
      end: string | number;
    };
    entities?: string[];
  };
  visualizationSuggestion?: {
    type: string;
    config?: any;
  };
  metadata?: {
    generatedAt: string;
    model?: string;
    generationMethod: 'statistical' | 'ml' | 'llm' | 'rule-based';
    tags?: string[];
  };
}

/**
 * AI-powered Insights Engine for the Living Dossier system
 * Automatically identifies patterns, anomalies, and generates explanations
 */
export class InsightsEngine {
  private openAIService: OpenAIService;
  private anthropicService: AnthropicService;
  
  constructor(
    openAIService?: OpenAIService,
    anthropicService?: AnthropicService
  ) {
    this.openAIService = openAIService || new OpenAIService();
    this.anthropicService = anthropicService || new AnthropicService();
  }
  
  /**
   * Generate insights from a dataset
   * @param data The dataset to analyze
   * @param context Additional context about the data
   * @returns Array of insights
   */
  async generateInsights(
    data: any,
    context: {
      domain?: string;
      question?: string;
      purpose?: string;
      previousInsights?: Insight[];
      maxInsights?: number;
    } = {}
  ): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // Apply different insight generation methods
    const statisticalInsights = await this.generateStatisticalInsights(data);
    const mlInsights = await this.generateMachineLearningInsights(data);
    const llmInsights = await this.generateLLMInsights(data, context);
    
    // Combine all insights
    insights.push(...statisticalInsights, ...mlInsights, ...llmInsights);
    
    // Sort by importance
    insights.sort((a, b) => b.importance - a.importance);
    
    // Limit to requested number if specified
    const maxInsights = context.maxInsights || insights.length;
    return insights.slice(0, maxInsights);
  }
  
  /**
   * Generate natural language explanation for a specific insight
   * @param insight The insight to explain
   * @param data The related data
   * @param options Explanation options
   * @returns Detailed explanation
   */
  async explainInsight(
    insight: Insight,
    data: any,
    options: {
      detailLevel?: 'basic' | 'intermediate' | 'expert';
      format?: 'plain' | 'markdown' | 'html';
      audience?: 'general' | 'technical' | 'executive';
      maxLength?: number;
    } = {}
  ): Promise<string> {
    const detailLevel = options.detailLevel || 'intermediate';
    const format = options.format || 'markdown';
    const audience = options.audience || 'general';
    
    // Prepare context for LLM
    const insightContext = {
      insight,
      data: this.prepareDataForExplanation(data, insight),
      detailLevel,
      format,
      audience
    };
    
    // Generate explanation using Claude (better for detailed explanations)
    try {
      const explanation = await this.anthropicService.generateExplanation(insightContext);
      return explanation;
    } catch (error) {
      // Fallback to OpenAI
      const explanation = await this.openAIService.generateExplanation(insightContext);
      return explanation;
    }
  }
  
  /**
   * Generate statistical insights using basic statistical methods
   * @param data The dataset to analyze
   * @returns Array of statistical insights
   */
  private async generateStatisticalInsights(data: any): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // Skip if data is not an array or is empty
      if (!Array.isArray(data) || data.length === 0) {
        return insights;
      }
      
      // Identify numeric fields
      const firstItem = data[0];
      const numericFields = Object.keys(firstItem).filter(key => 
        typeof firstItem[key] === 'number'
      );
      
      // Calculate basic statistics for numeric fields
      for (const field of numericFields) {
        const values = data.map(item => item[field]).filter(val => val !== null && !isNaN(val));
        
        // Skip if no valid values
        if (values.length === 0) continue;
        
        // Calculate statistics
        const stats = this.calculateStatistics(values);
        
        // Check for outliers
        const outliers = this.findOutliers(values, stats);
        if (outliers.length > 0) {
          insights.push({
            id: `outlier-${field}-${Date.now()}`,
            type: InsightType.OUTLIER,
            title: `Outliers detected in ${field}`,
            description: `Found ${outliers.length} outliers in the ${field} field that deviate significantly from the average.`,
            importance: Math.min(70 + (outliers.length * 2), 95),
            confidence: 0.85,
            relatedData: {
              fields: [field]
            },
            metadata: {
              generatedAt: new Date().toISOString(),
              generationMethod: 'statistical',
              tags: ['outlier', 'anomaly', field]
            }
          });
        }
        
        // Check for trends in time series data
        if (this.isTimeSeries(data)) {
          const timeField = this.findTimeField(data);
          if (timeField) {
            const trend = this.analyzeTrend(data, timeField, field);
            if (trend) {
              insights.push({
                id: `trend-${field}-${Date.now()}`,
                type: InsightType.TREND,
                title: `${trend.direction} trend in ${field}`,
                description: `${field} shows a ${trend.strength} ${trend.direction} trend over time with a change of ${trend.changePercent.toFixed(2)}%.`,
                importance: Math.min(65 + (Math.abs(trend.changePercent)), 90),
                confidence: trend.confidence,
                relatedData: {
                  fields: [timeField, field],
                  timeRange: {
                    start: data[0][timeField],
                    end: data[data.length - 1][timeField]
                  }
                },
                visualizationSuggestion: {
                  type: 'line',
                  config: {
                    xField: timeField,
                    yField: field
                  }
                },
                metadata: {
                  generatedAt: new Date().toISOString(),
                  generationMethod: 'statistical',
                  tags: ['trend', 'time-series', field]
                }
              });
            }
          }
        }
        
        // Check for correlations between numeric fields
        if (numericFields.length > 1) {
          for (let i = 0; i < numericFields.length; i++) {
            for (let j = i + 1; j < numericFields.length; j++) {
              const field1 = numericFields[i];
              const field2 = numericFields[j];
              
              const correlation = this.calculateCorrelation(
                data.map(item => item[field1]),
                data.map(item => item[field2])
              );
              
              // Only include strong correlations
              if (Math.abs(correlation) > 0.7) {
                insights.push({
                  id: `correlation-${field1}-${field2}-${Date.now()}`,
                  type: InsightType.CORRELATION,
                  title: `Strong ${correlation > 0 ? 'positive' : 'negative'} correlation between ${field1} and ${field2}`,
                  description: `There is a ${this.describeCorrelationStrength(correlation)} ${correlation > 0 ? 'positive' : 'negative'} correlation (${correlation.toFixed(2)}) between ${field1} and ${field2}.`,
                  importance: Math.min(60 + (Math.abs(correlation) * 30), 95),
                  confidence: Math.abs(correlation),
                  relatedData: {
                    fields: [field1, field2]
                  },
                  visualizationSuggestion: {
                    type: 'scatter',
                    config: {
                      xField: field1,
                      yField: field2
                    }
                  },
                  metadata: {
                    generatedAt: new Date().toISOString(),
                    generationMethod: 'statistical',
                    tags: ['correlation', field1, field2]
                  }
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating statistical insights:', error);
    }
    
    return insights;
  }
  
  /**
   * Generate insights using machine learning techniques
   * @param data The dataset to analyze
   * @returns Array of ML-based insights
   */
  private async generateMachineLearningInsights(data: any): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // Skip if data is not an array or is empty
      if (!Array.isArray(data) || data.length === 0) {
        return insights;
      }
      
      // Identify patterns using clustering
      const patterns = await this.identifyPatterns(data);
      if (patterns.length > 0) {
        for (const pattern of patterns) {
          insights.push({
            id: `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: InsightType.PATTERN,
            title: pattern.name,
            description: pattern.description,
            importance: pattern.importance,
            confidence: pattern.confidence,
            relatedData: {
              fields: pattern.fields,
              entities: pattern.entities
            },
            visualizationSuggestion: pattern.visualizationSuggestion,
            metadata: {
              generatedAt: new Date().toISOString(),
              generationMethod: 'ml',
              tags: ['pattern', 'cluster', ...pattern.fields]
            }
          });
        }
      }
      
      // Generate forecasts for time series data
      if (this.isTimeSeries(data)) {
        const timeField = this.findTimeField(data);
        if (timeField) {
          const numericFields = Object.keys(data[0]).filter(key => 
            typeof data[0][key] === 'number'
          );
          
          for (const field of numericFields) {
            const forecast = await this.generateForecast(data, timeField, field);
            if (forecast) {
              insights.push({
                id: `forecast-${field}-${Date.now()}`,
                type: InsightType.FORECAST,
                title: `${field} forecast for next period`,
                description: forecast.description,
                importance: 85,
                confidence: forecast.confidence,
                relatedData: {
                  fields: [timeField, field],
                  timeRange: {
                    start: data[data.length - 1][timeField],
                    end: forecast.endDate
                  }
                },
                visualizationSuggestion: {
                  type: 'line',
                  config: {
                    xField: timeField,
                    yField: field,
                    showForecast: true
                  }
                },
                metadata: {
                  generatedAt: new Date().toISOString(),
                  generationMethod: 'ml',
                  tags: ['forecast', 'prediction', field]
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating machine learning insights:', error);
    }
    
    return insights;
  }
  
  /**
   * Generate insights using Large Language Models
   * @param data The dataset to analyze
   * @param context Additional context about the data
   * @returns Array of LLM-based insights
   */
  private async generateLLMInsights(
    data: any,
    context: {
      domain?: string;
      question?: string;
      purpose?: string;
      previousInsights?: Insight[];
    }
  ): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    try {
      // Skip if data is not suitable for LLM processing
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return insights;
      }
      
      // Prepare data sample for LLM
      const dataSample = this.prepareDataSampleForLLM(data);
      
      // Prepare prompt context
      const promptContext = {
        data: dataSample,
        domain: context.domain || 'general',
        question: context.question || '',
        purpose: context.purpose || 'analysis',
        previousInsights: context.previousInsights || []
      };
      
      // Generate insights using OpenAI
      const llmInsights = await this.openAIService.generateInsights(promptContext);
      
      // Process and format the insights
      for (const insight of llmInsights) {
        insights.push({
          ...insight,
          metadata: {
            ...insight.metadata,
            generatedAt: new Date().toISOString(),
            generationMethod: 'llm',
            model: 'gpt-4'
          }
        });
      }
    } catch (error) {
      console.error('Error generating LLM insights:', error);
      
      // Try fallback to Anthropic if OpenAI fails
      try {
        const dataSample = this.prepareDataSampleForLLM(data);
        const promptContext = {
          data: dataSample,
          domain: context.domain || 'general',
          question: context.question || '',
          purpose: context.purpose || 'analysis',
          previousInsights: context.previousInsights || []
        };
        
        const llmInsights = await this.anthropicService.generateInsights(promptContext);
        
        for (const insight of llmInsights) {
          insights.push({
            ...insight,
            metadata: {
              ...insight.metadata,
              generatedAt: new Date().toISOString(),
              generationMethod: 'llm',
              model: 'claude-3-opus'
            }
          });
        }
      } catch (fallbackError) {
        console.error('Error in fallback LLM insights generation:', fallbackError);
      }
    }
    
    return insights;
  }
  
  /**
   * Calculate basic statistics for an array of numbers
   * @param values Array of numeric values
   * @returns Statistical measures
   */
  private calculateStatistics(values: number[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    q1: number;
    q3: number;
    iqr: number;
  } {
    const sortedValues = [...values].sort((a, b) => a - b);
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const mean = sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length;
    
    // Calculate median
    const mid = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
    
    // Calculate standard deviation
    const variance = sortedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sortedValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate quartiles
    const q1Index = Math.floor(sortedValues.length * 0.25);
    const q3Index = Math.floor(sortedValues.length * 0.75);
    const q1 = sortedValues[q1Index];
    const q3 = sortedValues[q3Index];
    const iqr = q3 - q1;
    
    return { min, max, mean, median, stdDev, q1, q3, iqr };
  }
  
  /**
   * Find outliers in a dataset using the IQR method
   * @param values Array of numeric values
   * @param stats Statistical measures
   * @returns Array of outlier values
   */
  private findOutliers(values: number[], stats: ReturnType<typeof this.calculateStatistics>): number[] {
    const { q1, q3, iqr } = stats;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(val => val < lowerBound || val > upperBound);
  }
  
  /**
   * Check if data appears to be a time series
   * @param data The dataset to analyze
   * @returns Boolean indicating if data is a time series
   */
  private isTimeSeries(data: any[]): boolean {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }
    
    // Look for date/time fields
    const firstItem = data[0];
    for (const key of Object.keys(firstItem)) {
      const value = firstItem[key];
      
      // Check if field name suggests time
      if (
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('time') ||
        key.toLowerCase().includes('year') ||
        key.toLowerCase().includes('month') ||
        key.toLowerCase().includes('day')
      ) {
        return true;
      }
      
      // Check if value is a Date object
      if (value instanceof Date) {
        return true;
      }
      
      // Check if string value is a date
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Find the field that represents time in a dataset
   * @param data The dataset to analyze
   * @returns The name of the time field, or undefined if not found
   */
  private findTimeField(data: any[]): string | undefined {
    if (!Array.isArray(data) || data.length === 0) {
      return undefined;
    }
    
    const firstItem = data[0];
    
    // First, check for fields with date/time in the name
    for (const key of Object.keys(firstItem)) {
      if (
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('time') ||
        key.toLowerCase().includes('year') ||
        key.toLowerCase().includes('month') ||
        key.toLowerCase().includes('day')
      ) {
        return key;
      }
    }
    
    // Then, check for Date objects or parseable date strings
    for (const key of Object.keys(firstItem)) {
      const value = firstItem[key];
      
      if (value instanceof Date) {
        return key;
      }
      
      if (typeof value === 'string' && !isNaN(Date.parse(value))) {
        return key;
      }
    }
    
    return undefined;
  }
  
  /**
   * Analyze trend in time series data
   * @param data The dataset to analyze
   * @param timeField The field representing time
   * @param valueField The field to analyze for trends
   * @returns Trend analysis result or undefined if no trend
   */
  private analyzeTrend(
    data: any[],
    timeField: string,
    valueField: string
  ): {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: 'strong' | 'moderate' | 'weak';
    changePercent: number;
    confidence: number;
  } | undefined {
    try {
      // Ensure data is sorted by time
      const sortedData = [...data].sort((a, b) => {
        const timeA = a[timeField] instanceof Date ? a[timeField] : new Date(a[timeField]);
        const timeB = b[timeField] instanceof Date ? b[timeField] : new Date(b[timeField]);
        return timeA.getTime() - timeB.getTime();
      });
      
      // Get first and last values
      const firstValue = parseFloat(sortedData[0][valueField]);
      const lastValue = parseFloat(sortedData[sortedData.length - 1][valueField]);
      
      // Calculate change
      const absoluteChange = lastValue - firstValue;
      const changePercent = (absoluteChange / Math.abs(firstValue)) * 100;
      
      // Determine direction
      let direction: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(changePercent) < 5) {
        direction = 'stable';
      } else if (changePercent > 0) {
        direction = 'increasing';
      } else {
        direction = 'decreasing';
      }
      
      // Determine strength
      let strength: 'strong' | 'moderate' | 'weak';
      if (Math.abs(changePercent) > 50) {
        strength = 'strong';
      } else if (Math.abs(changePercent) > 20) {
        strength = 'moderate';
      } else {
        strength = 'weak';
      }
      
      // Calculate confidence based on consistency
      const values = sortedData.map(item => parseFloat(item[valueField]));
      const consistencyScore = this.calculateTrendConsistency(values);
      
      return {
        direction,
        strength,
        changePercent,
        confidence: consistencyScore
      };
    } catch (error) {
      console.error('Error analyzing trend:', error);
      return undefined;
    }
  }
  
  /**
   * Calculate the consistency of a trend (how linear it is)
   * @param values Array of values
   * @returns Consistency score between 0 and 1
   */
  private calculateTrendConsistency(values: number[]): number {
    // Calculate linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    // Calculate means
    const meanX = indices.reduce((sum, val) => sum + val, 0) / n;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate correlation coefficient
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const x = indices[i];
      const y = values[i];
      numerator += (x - meanX) * (y - meanY);
      denomX += Math.pow(x - meanX, 2);
      denomY += Math.pow(y - meanY, 2);
    }
    
    const r = numerator / (Math.sqrt(denomX) * Math.sqrt(denomY));
    
    // Convert to absolute value and return as confidence
    return Math.abs(r);
  }
  
  /**
   * Calculate Pearson correlation coefficient between two arrays
   * @param x First array of values
   * @param y Second array of values
   * @returns Correlation coefficient between -1 and 1
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    // Ensure arrays are the same length
    const n = Math.min(x.length, y.length);
    
    // Filter out null/undefined/NaN values
    const validPairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (
        x[i] !== null && 
        y[i] !== null && 
        !isNaN(x[i]) && 
        !isNaN(y[i])
      ) {
        validPairs.push([x[i], y[i]]);
      }
    }
    
    // Calculate means
    const meanX = validPairs.reduce((sum, [val, _]) => sum + val, 0) / validPairs.length;
    const meanY = validPairs.reduce((sum, [_, val]) => sum + val, 0) / validPairs.length;
    
    // Calculate correlation coefficient
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (const [valX, valY] of validPairs) {
      numerator += (valX - meanX) * (valY - meanY);
      denomX += Math.pow(valX - meanX, 2);
      denomY += Math.pow(valY - meanY, 2);
    }
    
    // Avoid division by zero
    if (denomX === 0 || denomY === 0) {
      return 0;
    }
    
    return numerator / (Math.sqrt(denomX) * Math.sqrt(denomY));
  }
  
  /**
   * Describe the strength of a correlation coefficient
   * @param correlation Correlation coefficient
   * @returns Description of correlation strength
   */
  private describeCorrelationStrength(correlation: number): string {
    const absCorrelation = Math.abs(correlation);
    
    if (absCorrelation >= 0.9) {
      return 'very strong';
    } else if (absCorrelation >= 0.7) {
      return 'strong';
    } else if (absCorrelation >= 0.5) {
      return 'moderate';
    } else if (absCorrelation >= 0.3) {
      return 'weak';
    } else {
      return 'very weak';
    }
  }
  
  /**
   * Identify patterns in data using clustering techniques
   * @param data The dataset to analyze
   * @returns Array of identified patterns
   */
  private async identifyPatterns(data: any[]): Promise<Array<{
    name: string;
    description: string;
    importance: number;
    confidence: number;
    fields: string[];
    entities?: string[];
    visualizationSuggestion?: {
      type: string;
      config?: any;
    };
  }>> {
    // This is a placeholder for actual ML-based pattern detection
    // In a real implementation, this would use clustering algorithms
    return [];
  }
  
  /**
   * Generate forecast for time series data
   * @param data The dataset to analyze
   * @param timeField The field representing time
   * @param valueField The field to forecast
   * @returns Forecast result or undefined if forecasting fails
   */
  private async generateForecast(
    data: any[],
    timeField: string,
    valueField: string
  ): Promise<{
    description: string;
    confidence: number;
    endDate: string | number;
  } | undefined> {
    // This is a placeholder for actual time series forecasting
    // In a real implementation, this would use ARIMA, Prophet, or similar
    return undefined;
  }
  
  /**
   * Prepare data for explanation by LLM
   * @param data The full dataset
   * @param insight The insight to explain
   * @returns Prepared data sample
   */
  private prepareDataForExplanation(data: any, insight: Insight): any {
    // If data is an array, filter to relevant fields and limit size
    if (Array.isArray(data)) {
      // Get fields related to this insight
      const relevantFields = insight.relatedData?.fields || [];
      
      // If there are specific fields, only include those
      if (relevantFields.length > 0) {
        return data.slice(0, 50).map(item => {
          const filteredItem: Record<string, any> = {};
          relevantFields.forEach(field => {
            if (field in item) {
              filteredItem[field] = item[field];
            }
          });
          return filteredItem;
        });
      }
      
      // Otherwise, return a sample of the data
      return data.slice(0, 20);
    }
    
    return data;
  }
  
  /**
   * Prepare data sample for LLM processing
   * @param data The full dataset
   * @returns Prepared data sample
   */
  private prepareDataSampleForLLM(data: any): any {
    // If data is an array, limit the size
    if (Array.isArray(data)) {
      // For large arrays, take a representative sample
      if (data.length > 20) {
        return [
          ...data.slice(0, 10),
          ...data.slice(Math.floor(data.length / 2) - 2, Math.floor(data.length / 2) + 3),
          ...data.slice(data.length - 10)
        ];
      }
      
      return data;
    }
    
    return data;
  }
} 