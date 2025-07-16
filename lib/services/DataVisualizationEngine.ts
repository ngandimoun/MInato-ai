/**
 * Minato AI Data Visualization Engine
 * Automatically generates interactive charts and visualizations from analysis data
 * Supports Chart.js, Plotly.js, and Recharts with intelligent chart type selection
 */

import { logger } from '@/memory-framework/config';

// Chart configuration interfaces
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar' | 'polarArea' | 'heatmap' | 'sankey' | 'treemap';
  library: 'chartjs' | 'plotly' | 'recharts';
  data: any;
  options: any;
  title: string;
  description?: string;
  insights?: string[];
}

export interface VisualizationRequest {
  data: any[];
  analysisType: 'financial' | 'temporal' | 'categorical' | 'correlation' | 'distribution' | 'trend';
  title: string;
  description?: string;
  preferredLibrary?: 'chartjs' | 'plotly' | 'recharts';
  colorScheme?: 'default' | 'financial' | 'categorical' | 'heatmap';
  interactive?: boolean;
  timeSeriesType?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  dataCompleteness?: 'complete' | 'fill-zeros' | 'interpolate' | 'skip-missing' | 'highlight-missing';
  dataRange?: string;
  dataQualityLevel?: 'none' | 'basic' | 'detailed' | 'advanced';
}

export interface FinancialChartData {
  revenues: Array<{ date: string; amount: number; category?: string }>;
  expenses: Array<{ date: string; amount: number; category?: string; vendor?: string }>;
  netIncome: Array<{ date: string; amount: number }>;
  categories: Array<{ name: string; total: number; percentage: number }>;
  trends: Array<{ period: string; value: number; change: number }>;
}

export interface CorrelationVisualization {
  correlationMatrix: number[][];
  labels: string[];
  strongCorrelations: Array<{
    var1: string;
    var2: string;
    correlation: number;
    strength: 'weak' | 'moderate' | 'strong';
  }>;
}

// Time period definition for data completeness
interface TimePeriod {
  label: string;
  value: string;
  isEstimated?: boolean;
}

export class DataVisualizationEngine {
  private readonly colorSchemes = {
    default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    financial: ['#059669', '#DC2626', '#2563EB', '#7C3AED', '#DB2777', '#EA580C'],
    categorical: ['#6366F1', '#06B6D4', '#84CC16', '#EAB308', '#F97316', '#EF4444'],
    heatmap: ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#92400E', '#451A03'],
    corporate: ['#1E40AF', '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
    accessible: ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777'],
    trend: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'],
    comparison: ['#2563EB', '#DC2626', '#059669', '#F59E0B', '#8B5CF6', '#EC4899'],
    correlation: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    distribution: ['#6366F1', '#06B6D4', '#84CC16', '#EAB308', '#F97316', '#EF4444'],
    seasonal: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'],
    performance: ['#059669', '#10B981', '#3B82F6', '#F59E0B', '#DC2626', '#EF4444']
  };

  // Analysis-specific visualization strategies
  private readonly analysisStrategies = {
    trend: {
      chartTypes: ['line', 'area', 'bar'],
      visualElements: ['trendlines', 'confidence-intervals', 'moving-averages'],
      colorStrategy: 'gradient',
      annotations: ['peak-valley', 'trend-direction', 'rate-of-change']
    },
    comparison: {
      chartTypes: ['bar', 'column', 'radar'],
      visualElements: ['reference-lines', 'percentage-differences', 'ranking-indicators'],
      colorStrategy: 'categorical',
      annotations: ['winners-losers', 'significant-differences', 'outliers']
    },
    correlation: {
      chartTypes: ['scatter', 'heatmap', 'bubble'],
      visualElements: ['correlation-coefficients', 'regression-lines', 'confidence-ellipses'],
      colorStrategy: 'intensity',
      annotations: ['strong-correlations', 'outliers', 'clusters']
    },
    composition: {
      chartTypes: ['pie', 'donut', 'treemap', 'stacked-bar'],
      visualElements: ['percentage-labels', 'hierarchical-grouping', 'proportional-sizing'],
      colorStrategy: 'categorical',
      annotations: ['dominant-categories', 'small-segments', 'hierarchical-relationships']
    },
    distribution: {
      chartTypes: ['histogram', 'box-plot', 'violin-plot', 'density-plot'],
      visualElements: ['statistical-measures', 'quartiles', 'outlier-detection'],
      colorStrategy: 'intensity',
      annotations: ['mean-median', 'skewness', 'outliers', 'normal-distribution']
    },
    ranking: {
      chartTypes: ['horizontal-bar', 'lollipop', 'slope-chart'],
      visualElements: ['rank-indicators', 'value-labels', 'change-arrows'],
      colorStrategy: 'performance',
      annotations: ['top-performers', 'bottom-performers', 'rank-changes']
    }
  };

  /**
   * Apply analysis-specific optimizations to chart configuration
   */
  private applyAnalysisSpecificOptimizations(
    chartConfig: ChartConfig,
    analysisType: string,
    data: any[],
    insights?: string[]
  ): ChartConfig {
    const strategy = this.analysisStrategies[analysisType as keyof typeof this.analysisStrategies];
    if (!strategy) return chartConfig;

    // Apply color strategy
    const colorScheme = this.getOptimalColorScheme(analysisType, data);
    
    // Enhance chart options based on analysis type
    const enhancedOptions = this.enhanceChartOptions(chartConfig.options, strategy, data, insights);
    
    // Add analysis-specific annotations
    const annotatedOptions = this.addAnalysisAnnotations(enhancedOptions, strategy, data);
    
    return {
      ...chartConfig,
      options: annotatedOptions,
      insights: this.generateAnalysisInsights(analysisType, data, insights)
    };
  }

  /**
   * Get optimal color scheme for analysis type
   */
  private getOptimalColorScheme(analysisType: string, data: any[]): string[] {
    const strategy = this.analysisStrategies[analysisType as keyof typeof this.analysisStrategies];
    
    if (strategy?.colorStrategy === 'gradient') {
      return this.colorSchemes.trend;
    } else if (strategy?.colorStrategy === 'categorical') {
      return this.colorSchemes.comparison;
    } else if (strategy?.colorStrategy === 'intensity') {
      return this.colorSchemes.correlation;
    } else if (strategy?.colorStrategy === 'performance') {
      return this.colorSchemes.performance;
    }
    
    return this.colorSchemes.default;
  }

  /**
   * Enhance chart options based on analysis strategy
   */
  private enhanceChartOptions(
    options: any,
    strategy: any,
    data: any[],
    insights?: string[]
  ): any {
    const enhanced = { ...options };
    
    // Add visual elements based on strategy
    if (strategy.visualElements.includes('trendlines')) {
      enhanced.plugins = enhanced.plugins || {};
      enhanced.plugins.annotation = {
        annotations: {
          trendline: {
            type: 'line',
            scaleID: 'x',
            borderColor: 'rgba(59, 130, 246, 0.8)',
            borderWidth: 2,
            label: {
              content: 'Trend',
              enabled: true
            }
          }
        }
      };
    }
    
    if (strategy.visualElements.includes('confidence-intervals')) {
      enhanced.elements = enhanced.elements || {};
      enhanced.elements.line = {
        ...enhanced.elements.line,
        fill: 'origin',
        backgroundColor: 'rgba(59, 130, 246, 0.1)'
      };
    }
    
    if (strategy.visualElements.includes('percentage-labels')) {
      enhanced.plugins = enhanced.plugins || {};
      enhanced.plugins.datalabels = {
        display: true,
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          return `${((value / total) * 100).toFixed(1)}%`;
        }
      };
    }
    
    if (strategy.visualElements.includes('statistical-measures')) {
      const mean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
      enhanced.plugins = enhanced.plugins || {};
      enhanced.plugins.annotation = enhanced.plugins.annotation || {};
      enhanced.plugins.annotation.annotations = {
        ...enhanced.plugins.annotation.annotations,
        meanLine: {
          type: 'line',
          yMin: mean,
          yMax: mean,
          borderColor: 'rgba(239, 68, 68, 0.8)',
          borderWidth: 2,
          label: {
            content: `Mean: ${mean.toFixed(2)}`,
            enabled: true
          }
        }
      };
    }
    
    return enhanced;
  }

  /**
   * Add analysis-specific annotations
   */
  private addAnalysisAnnotations(
    options: any,
    strategy: any,
    data: any[]
  ): any {
    const annotated = { ...options };
    
    if (strategy.annotations.includes('peak-valley')) {
      const peaks = this.findPeaksAndValleys(data);
      annotated.plugins = annotated.plugins || {};
      annotated.plugins.annotation = annotated.plugins.annotation || {};
      annotated.plugins.annotation.annotations = {
        ...annotated.plugins.annotation.annotations,
        ...this.createPeakValleyAnnotations(peaks)
      };
    }
    
    if (strategy.annotations.includes('outliers')) {
      const outliers = this.detectOutliers(data);
      annotated.plugins = annotated.plugins || {};
      annotated.plugins.annotation = annotated.plugins.annotation || {};
      annotated.plugins.annotation.annotations = {
        ...annotated.plugins.annotation.annotations,
        ...this.createOutlierAnnotations(outliers)
      };
    }
    
    return annotated;
  }

  /**
   * Generate analysis-specific insights
   */
  private generateAnalysisInsights(
    analysisType: string,
    data: any[],
    existingInsights?: string[]
  ): string[] {
    const insights = [...(existingInsights || [])];
    
    switch (analysisType) {
      case 'trend':
        const trendDirection = this.calculateTrendDirection(data);
        insights.push(`Overall trend: ${trendDirection}`);
        
        const growthRate = this.calculateGrowthRate(data);
        if (growthRate !== null) {
          insights.push(`Average growth rate: ${growthRate.toFixed(2)}%`);
        }
        break;
        
      case 'comparison':
        const topPerformer = this.findTopPerformer(data);
        const bottomPerformer = this.findBottomPerformer(data);
        insights.push(`Top performer: ${topPerformer.period} (${topPerformer.value})`);
        insights.push(`Bottom performer: ${bottomPerformer.period} (${bottomPerformer.value})`);
        break;
        
      case 'correlation':
        const correlationStrength = this.calculateCorrelationStrength(data);
        if (correlationStrength !== null) {
          insights.push(`Correlation strength: ${correlationStrength.toFixed(3)}`);
        }
        break;
        
      case 'distribution':
        const mean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
        const median = this.calculateMedian(data);
        insights.push(`Mean: ${mean.toFixed(2)}, Median: ${median.toFixed(2)}`);
        
        const skewness = this.calculateSkewness(data);
        if (skewness > 0.5) {
          insights.push('Distribution is right-skewed');
        } else if (skewness < -0.5) {
          insights.push('Distribution is left-skewed');
        } else {
          insights.push('Distribution is approximately symmetric');
        }
        break;
    }
    
    return insights;
  }

  /**
   * Statistical helper methods
   */
  private calculateTrendDirection(data: any[]): string {
    if (data.length < 2) return 'insufficient data';
    
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  private calculateGrowthRate(data: any[]): number | null {
    if (data.length < 2) return null;
    
    let totalGrowth = 0;
    let validPeriods = 0;
    
    for (let i = 1; i < data.length; i++) {
      const prevValue = data[i - 1].value;
      const currentValue = data[i].value;
      
      if (prevValue > 0) {
        totalGrowth += ((currentValue - prevValue) / prevValue) * 100;
        validPeriods++;
      }
    }
    
    return validPeriods > 0 ? totalGrowth / validPeriods : null;
  }

  private findTopPerformer(data: any[]): any {
    return data.reduce((max, current) => 
      current.value > max.value ? current : max
    );
  }

  private findBottomPerformer(data: any[]): any {
    return data.reduce((min, current) => 
      current.value < min.value ? current : min
    );
  }

  private calculateCorrelationStrength(data: any[]): number | null {
    // Simplified correlation calculation for demonstration
    // In practice, this would need two variables
    if (data.length < 3) return null;
    
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance) / mean; // Coefficient of variation as proxy
  }

  private calculateMedian(data: any[]): number {
    const sorted = data.map(d => d.value).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculateMedianFromArray(values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculateSkewness(data: any[]): number {
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const skewness = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0) / values.length;
    
    return skewness;
  }

  private findPeaksAndValleys(data: any[]): any[] {
    const peaks = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1].value;
      const current = data[i].value;
      const next = data[i + 1].value;
      
      if (current > prev && current > next) {
        peaks.push({ ...data[i], type: 'peak' });
      } else if (current < prev && current < next) {
        peaks.push({ ...data[i], type: 'valley' });
      }
    }
    
    return peaks;
  }

  private detectOutliers(data: any[]): any[] {
    const values = data.map(d => d.value);
    const q1 = this.calculateQuartile(values, 0.25);
    const q3 = this.calculateQuartile(values, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(d => d.value < lowerBound || d.value > upperBound);
  }

  private calculateQuartile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = percentile * (sorted.length - 1);
    
    if (Math.floor(index) === index) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  private createPeakValleyAnnotations(peaks: any[]): any {
    const annotations: any = {};
    
    peaks.forEach((peak, index) => {
      annotations[`peak_${index}`] = {
        type: 'point',
        xValue: peak.period,
        yValue: peak.value,
        backgroundColor: peak.type === 'peak' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
        borderColor: peak.type === 'peak' ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        radius: 6,
        label: {
          content: peak.type === 'peak' ? '▲' : '▼',
          enabled: true
        }
      };
    });
    
    return annotations;
  }

  private createOutlierAnnotations(outliers: any[]): any {
    const annotations: any = {};
    
    outliers.forEach((outlier, index) => {
      annotations[`outlier_${index}`] = {
        type: 'point',
        xValue: outlier.period,
        yValue: outlier.value,
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 2,
        radius: 8,
        label: {
          content: '!',
          enabled: true
        }
      };
    });
    
    return annotations;
  }

  /**
   * Apply data quality indicators to chart configuration
   */
  private applyDataQualityIndicators(
    chartConfig: ChartConfig,
    data: any[],
    qualityLevel: 'none' | 'basic' | 'detailed' | 'advanced' = 'none'
  ): ChartConfig {
    if (qualityLevel === 'none') return chartConfig;

    const enhancedConfig = { ...chartConfig };
    const actualData = data.filter(d => !d.isEstimated);
    const estimatedData = data.filter(d => d.isEstimated);
    
    // Calculate confidence metrics
    const overallConfidence = this.calculateOverallConfidence(data);
    const dataCompleteness = actualData.length / data.length;
    
    // Apply quality indicators based on level
    switch (qualityLevel) {
      case 'basic':
        enhancedConfig.options = this.addBasicQualityIndicators(enhancedConfig.options, estimatedData, overallConfidence);
        break;
      case 'detailed':
        enhancedConfig.options = this.addDetailedQualityIndicators(enhancedConfig.options, data, overallConfidence, dataCompleteness);
        break;
      case 'advanced':
        enhancedConfig.options = this.addAdvancedQualityIndicators(enhancedConfig.options, data, overallConfidence, dataCompleteness);
        break;
    }
    
    // Add quality insights
    enhancedConfig.insights = [
      ...(enhancedConfig.insights || []),
      ...this.generateQualityInsights(data, overallConfidence, dataCompleteness)
    ];
    
    return enhancedConfig;
  }

  /**
   * Calculate overall confidence score for dataset
   */
  private calculateOverallConfidence(data: any[]): number {
    if (data.length === 0) return 0;
    
    const totalConfidence = data.reduce((sum, d) => sum + (d.confidence || 1), 0);
    return totalConfidence / data.length;
  }

  /**
   * Add basic quality indicators (simple visual differentiation)
   */
  private addBasicQualityIndicators(options: any, estimatedData: any[], confidence: number): any {
    const enhanced = { ...options };
    
    // Add estimated data point styling
    if (estimatedData.length > 0) {
      enhanced.plugins = enhanced.plugins || {};
      enhanced.plugins.legend = enhanced.plugins.legend || {};
      enhanced.plugins.legend.labels = enhanced.plugins.legend.labels || {};
      
      // Add legend for estimated vs actual data
      enhanced.plugins.legend.labels.generateLabels = (chart: any) => {
        const original = chart.defaults.plugins.legend.labels.generateLabels(chart);
        return [
          ...original,
          {
            text: 'Estimated Data',
            fillStyle: 'rgba(245, 158, 11, 0.3)',
            strokeStyle: 'rgba(245, 158, 11, 0.8)',
            lineWidth: 2,
            lineDash: [5, 5]
          }
        ];
      };
    }
    
    // Add confidence indicator in title
    enhanced.plugins = enhanced.plugins || {};
    enhanced.plugins.title = enhanced.plugins.title || {};
    enhanced.plugins.title.text = [
      enhanced.plugins.title.text || 'Data Visualization',
      `Confidence: ${(confidence * 100).toFixed(0)}%`
    ];
    
    return enhanced;
  }

  /**
   * Add detailed quality indicators (comprehensive metrics)
   */
  private addDetailedQualityIndicators(options: any, data: any[], confidence: number, completeness: number): any {
    const enhanced = { ...options };
    
    // Add quality metrics panel
    enhanced.plugins = enhanced.plugins || {};
    enhanced.plugins.annotation = enhanced.plugins.annotation || {};
    enhanced.plugins.annotation.annotations = enhanced.plugins.annotation.annotations || {};
    
    // Add quality metrics box
    enhanced.plugins.annotation.annotations.qualityMetrics = {
      type: 'box',
      xMin: 0,
      xMax: 0.3,
      yMin: 0.7,
      yMax: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      label: {
        content: [
          'Data Quality Metrics',
          `Confidence: ${(confidence * 100).toFixed(1)}%`,
          `Completeness: ${(completeness * 100).toFixed(1)}%`,
          `Estimated Points: ${data.filter(d => d.isEstimated).length}`,
          `Actual Points: ${data.filter(d => !d.isEstimated).length}`
        ],
        enabled: true,
        position: 'center'
      }
    };
    
    // Add visual differentiation for data points
    enhanced.elements = enhanced.elements || {};
    enhanced.elements.point = enhanced.elements.point || {};
    enhanced.elements.point.pointStyle = (context: any) => {
      const dataPoint = data[context.dataIndex];
      return dataPoint?.isEstimated ? 'triangle' : 'circle';
    };
    
    return enhanced;
  }

  /**
   * Add advanced quality indicators (full statistical analysis)
   */
  private addAdvancedQualityIndicators(options: any, data: any[], confidence: number, completeness: number): any {
    const enhanced = { ...options };
    
    // Calculate statistical measures
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const errorMargin = 1.96 * stdDev / Math.sqrt(values.length); // 95% confidence interval
    
    // Add confidence intervals
    enhanced.plugins = enhanced.plugins || {};
    enhanced.plugins.annotation = enhanced.plugins.annotation || {};
    enhanced.plugins.annotation.annotations = enhanced.plugins.annotation.annotations || {};
    
    // Add confidence bands
    data.forEach((dataPoint, index) => {
      if (dataPoint.isEstimated) {
        const errorBand = dataPoint.confidence * errorMargin;
        
        enhanced.plugins.annotation.annotations[`errorBar_${index}`] = {
          type: 'line',
          xMin: dataPoint.period,
          xMax: dataPoint.period,
          yMin: dataPoint.value - errorBand,
          yMax: dataPoint.value + errorBand,
          borderColor: 'rgba(239, 68, 68, 0.6)',
          borderWidth: 2,
          label: {
            content: `±${errorBand.toFixed(2)}`,
            enabled: true,
            position: 'end'
          }
        };
      }
    });
    
    // Add advanced quality metrics panel
    enhanced.plugins.annotation.annotations.advancedQualityMetrics = {
      type: 'box',
      xMin: 0,
      xMax: 0.4,
      yMin: 0.6,
      yMax: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(0, 0, 0, 0.2)',
      borderWidth: 1,
      label: {
        content: [
          'Advanced Quality Analysis',
          `Overall Confidence: ${(confidence * 100).toFixed(1)}%`,
          `Data Completeness: ${(completeness * 100).toFixed(1)}%`,
          `Standard Deviation: ${stdDev.toFixed(2)}`,
          `95% Confidence Interval: ±${errorMargin.toFixed(2)}`,
          `Estimated Points: ${data.filter(d => d.isEstimated).length}/${data.length}`,
          `Quality Score: ${this.calculateQualityScore(confidence, completeness)}`
        ],
        enabled: true,
        position: 'center',
        font: {
          size: 10
        }
      }
    };
    
    return enhanced;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(confidence: number, completeness: number): string {
    const score = (confidence * 0.6 + completeness * 0.4) * 100;
    
    if (score >= 90) return 'Excellent (A)';
    if (score >= 80) return 'Good (B)';
    if (score >= 70) return 'Fair (C)';
    if (score >= 60) return 'Poor (D)';
    return 'Very Poor (F)';
  }

  /**
   * Generate quality-related insights
   */
  private generateQualityInsights(data: any[], confidence: number, completeness: number): string[] {
    const insights = [];
    
    if (completeness < 0.8) {
      insights.push(`${((1 - completeness) * 100).toFixed(1)}% of data points are estimated`);
    }
    
    if (confidence < 0.7) {
      insights.push('Data confidence is below recommended threshold');
    }
    
    const estimatedPoints = data.filter(d => d.isEstimated).length;
    if (estimatedPoints > 0) {
      insights.push(`${estimatedPoints} data points were interpolated or estimated`);
    }
    
    const lowConfidencePoints = data.filter(d => (d.confidence || 1) < 0.5).length;
    if (lowConfidencePoints > 0) {
      insights.push(`${lowConfidencePoints} data points have low confidence scores`);
    }
    
    if (completeness >= 0.9 && confidence >= 0.8) {
      insights.push('High-quality dataset with excellent completeness and confidence');
    }
    
    return insights;
  }

  /**
   * Apply advanced data processing including seasonal adjustments and automatic correction
   */
  private applyAdvancedDataProcessing(
    data: any[],
    analysisType: string,
    timeSeriesType?: string
  ): any[] {
    let processedData = [...data];
    
    // Apply seasonal adjustments for time series data
    if (['temporal', 'trend', 'financial'].includes(analysisType) && timeSeriesType) {
      processedData = this.applySeasonalAdjustments(processedData, timeSeriesType);
    }
    
    // Apply automatic data correction
    processedData = this.applyAutomaticDataCorrection(processedData);
    
    // Apply advanced interpolation for missing values
    processedData = this.applyAdvancedInterpolation(processedData);
    
    // Apply statistical smoothing for noisy data
    processedData = this.applyStatisticalSmoothing(processedData);
    
    return processedData;
  }

  /**
   * Apply seasonal adjustments to time series data
   */
  private applySeasonalAdjustments(data: any[], timeSeriesType: string): any[] {
    if (timeSeriesType !== 'monthly' || data.length < 12) {
      return data; // Need at least 12 months for seasonal adjustment
    }
    
    const monthlyData = data.filter(d => d.period && d.period.includes(' '));
    if (monthlyData.length < 12) return data;
    
    // Calculate seasonal factors
    const seasonalFactors = this.calculateSeasonalFactors(monthlyData);
    
    // Apply seasonal adjustments
    return data.map(dataPoint => {
      if (dataPoint.period && dataPoint.period.includes(' ')) {
        const month = dataPoint.period.split(' ')[0];
        const seasonalFactor = seasonalFactors[month] || 1;
        
        return {
          ...dataPoint,
          seasonallyAdjustedValue: dataPoint.value / seasonalFactor,
          seasonalFactor,
          originalValue: dataPoint.value,
          metadata: {
            ...dataPoint.metadata,
            seasonallyAdjusted: true,
            seasonalFactor
          }
        };
      }
      return dataPoint;
    });
  }

  /**
   * Calculate seasonal factors for monthly data
   */
  private calculateSeasonalFactors(monthlyData: any[]): Record<string, number> {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const seasonalFactors: Record<string, number> = {};
    
    // Group data by month
    const monthlyGroups: Record<string, number[]> = {};
    monthlyData.forEach(d => {
      const month = d.period.split(' ')[0];
      if (!monthlyGroups[month]) monthlyGroups[month] = [];
      monthlyGroups[month].push(d.value);
    });
    
    // Calculate overall average
    const overallAverage = monthlyData.reduce((sum, d) => sum + d.value, 0) / monthlyData.length;
    
    // Calculate seasonal factors
    months.forEach(month => {
      if (monthlyGroups[month] && monthlyGroups[month].length > 0) {
        const monthlyAverage = monthlyGroups[month].reduce((sum, val) => sum + val, 0) / monthlyGroups[month].length;
        seasonalFactors[month] = monthlyAverage / overallAverage;
      } else {
        seasonalFactors[month] = 1; // No seasonal adjustment if no data
      }
    });
    
    return seasonalFactors;
  }

  /**
   * Apply automatic data correction for inconsistencies
   */
  private applyAutomaticDataCorrection(data: any[]): any[] {
    if (data.length < 3) return data;
    
    return data.map((dataPoint, index) => {
      const correctedPoint = { ...dataPoint };
      
      // Detect and correct obvious outliers
      if (this.isOutlier(dataPoint, data)) {
        const correctedValue = this.correctOutlierValue(dataPoint, data, index);
        correctedPoint.value = correctedValue;
        correctedPoint.originalValue = dataPoint.value;
        correctedPoint.isCorrected = true;
        correctedPoint.metadata = {
          ...correctedPoint.metadata,
          correctionApplied: true,
          correctionType: 'outlier-correction',
          originalValue: dataPoint.value
        };
      }
      
      // Detect and correct negative values where they shouldn't exist
      if (this.shouldBePositive(dataPoint) && dataPoint.value < 0) {
        correctedPoint.value = Math.abs(dataPoint.value);
        correctedPoint.originalValue = dataPoint.value;
        correctedPoint.isCorrected = true;
        correctedPoint.metadata = {
          ...correctedPoint.metadata,
          correctionApplied: true,
          correctionType: 'negative-value-correction',
          originalValue: dataPoint.value
        };
      }
      
      // Detect and correct impossible percentage values
      if (this.isPercentageData(dataPoint) && (dataPoint.value > 100 || dataPoint.value < 0)) {
        correctedPoint.value = Math.min(100, Math.max(0, dataPoint.value));
        correctedPoint.originalValue = dataPoint.value;
        correctedPoint.isCorrected = true;
        correctedPoint.metadata = {
          ...correctedPoint.metadata,
          correctionApplied: true,
          correctionType: 'percentage-bounds-correction',
          originalValue: dataPoint.value
        };
      }
      
      return correctedPoint;
    });
  }

  /**
   * Apply advanced interpolation for missing values
   */
  private applyAdvancedInterpolation(data: any[]): any[] {
    if (data.length < 3) return data;
    
    return data.map((dataPoint, index) => {
      if (dataPoint.isEstimated || dataPoint.value === null || dataPoint.value === undefined) {
        const interpolatedValue = this.advancedInterpolation(data, index);
        
        return {
          ...dataPoint,
          value: interpolatedValue,
          isEstimated: true,
          interpolationMethod: 'advanced',
          confidence: this.calculateInterpolationConfidence(data, index),
          metadata: {
            ...dataPoint.metadata,
            interpolated: true,
            interpolationMethod: 'advanced-spline',
            originalValue: dataPoint.value
          }
        };
      }
      return dataPoint;
    });
  }

  /**
   * Apply statistical smoothing for noisy data
   */
  private applyStatisticalSmoothing(data: any[]): any[] {
    if (data.length < 5) return data;
    
    // Apply moving average smoothing
    const windowSize = Math.min(3, Math.floor(data.length / 4));
    
    return data.map((dataPoint, index) => {
      const smoothedValue = this.calculateMovingAverage(data, index, windowSize);
      
      // Only apply smoothing if the difference is significant
      const difference = Math.abs(dataPoint.value - smoothedValue);
      const threshold = this.calculateNoiseThreshold(data);
      
      if (difference > threshold) {
        return {
          ...dataPoint,
          smoothedValue,
          originalValue: dataPoint.value,
          isSmoothed: true,
          metadata: {
            ...dataPoint.metadata,
            smoothed: true,
            smoothingMethod: 'moving-average',
            windowSize,
            originalValue: dataPoint.value
          }
        };
      }
      
      return dataPoint;
    });
  }

  /**
   * Helper methods for advanced data processing
   */
  private isOutlier(dataPoint: any, data: any[]): boolean {
    const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
    const q1 = this.calculateQuartile(values, 0.25);
    const q3 = this.calculateQuartile(values, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 2 * iqr; // More conservative than 1.5 * IQR
    const upperBound = q3 + 2 * iqr;
    
    return dataPoint.value < lowerBound || dataPoint.value > upperBound;
  }

  private correctOutlierValue(dataPoint: any, data: any[], index: number): number {
    // Use median of surrounding values
    const surroundingValues = [];
    
    for (let i = Math.max(0, index - 2); i <= Math.min(data.length - 1, index + 2); i++) {
      if (i !== index && data[i].value !== null && data[i].value !== undefined) {
        surroundingValues.push(data[i].value);
      }
    }
    
    if (surroundingValues.length > 0) {
      return this.calculateMedianFromArray(surroundingValues);
    }
    
    // Fallback to dataset median
    const allValues = data.map(d => d.value).filter(v => v !== null && v !== undefined);
    return this.calculateMedianFromArray(allValues);
  }

  private shouldBePositive(dataPoint: any): boolean {
    // Heuristic: if the period suggests it's a count, percentage, or amount, it should be positive
    const period = dataPoint.period?.toLowerCase() || '';
    const positiveIndicators = ['count', 'amount', 'revenue', 'sales', 'profit', 'quantity', 'percentage', '%'];
    
    return positiveIndicators.some(indicator => period.includes(indicator));
  }

  private isPercentageData(dataPoint: any): boolean {
    const period = dataPoint.period?.toLowerCase() || '';
    return period.includes('%') || period.includes('percent') || period.includes('rate');
  }

  private advancedInterpolation(data: any[], index: number): number {
    // Cubic spline interpolation for smooth curves
    const validData = data.filter(d => d.value !== null && d.value !== undefined && !d.isEstimated);
    
    if (validData.length < 2) {
      return this.interpolateValue(data, data[index].period);
    }
    
    // Simple cubic interpolation between surrounding points
    const beforeIndex = this.findNearestValidIndex(data, index, -1);
    const afterIndex = this.findNearestValidIndex(data, index, 1);
    
    if (beforeIndex !== -1 && afterIndex !== -1) {
      const before = data[beforeIndex];
      const after = data[afterIndex];
      const ratio = (index - beforeIndex) / (afterIndex - beforeIndex);
      
      // Cubic interpolation
      return before.value + (after.value - before.value) * (3 * ratio * ratio - 2 * ratio * ratio * ratio);
    }
    
    // Fallback to linear interpolation
    return this.interpolateValue(data, data[index].period);
  }

  private findNearestValidIndex(data: any[], startIndex: number, direction: number): number {
    for (let i = startIndex + direction; i >= 0 && i < data.length; i += direction) {
      if (data[i].value !== null && data[i].value !== undefined && !data[i].isEstimated) {
        return i;
      }
    }
    return -1;
  }

  private calculateInterpolationConfidence(data: any[], index: number): number {
    const nearbyValidPoints = this.countNearbyValidPoints(data, index, 3);
    const totalNearbyPoints = Math.min(6, data.length - 1);
    
    return Math.max(0.3, nearbyValidPoints / totalNearbyPoints);
  }

  private countNearbyValidPoints(data: any[], index: number, radius: number): number {
    let count = 0;
    
    for (let i = Math.max(0, index - radius); i <= Math.min(data.length - 1, index + radius); i++) {
      if (i !== index && data[i].value !== null && data[i].value !== undefined && !data[i].isEstimated) {
        count++;
      }
    }
    
    return count;
  }

  private calculateMovingAverage(data: any[], index: number, windowSize: number): number {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(data.length - 1, index + Math.floor(windowSize / 2));
    
    let sum = 0;
    let count = 0;
    
    for (let i = start; i <= end; i++) {
      if (data[i].value !== null && data[i].value !== undefined) {
        sum += data[i].value;
        count++;
      }
    }
    
    return count > 0 ? sum / count : data[index].value;
  }

  private calculateNoiseThreshold(data: any[]): number {
    const values = data.map(d => d.value).filter(v => v !== null && v !== undefined);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev * 0.5; // Threshold for noise detection
  }

  /**
   * Generate comprehensive visualizations from financial analysis data
   */
  async generateFinancialCharts(financialData: FinancialChartData): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];

    try {
      // 1. Revenue vs Expenses Over Time (Line Chart)
      if (financialData.revenues.length > 0 || financialData.expenses.length > 0) {
        charts.push(this.createRevenueExpenseChart(financialData));
      }

      // 2. Expense Categories Breakdown (Pie Chart)
      if (financialData.categories.length > 0) {
        charts.push(this.createCategoryBreakdownChart(financialData.categories));
      }

      // 3. Monthly Trends (Bar Chart)
      if (financialData.trends.length > 0) {
        // Ensure complete time series for trends
        const completeTrends = this.ensureTimeSeriesCompleteness(
          financialData.trends.map(t => ({ period: t.period, value: t.value })),
          'monthly',
          'interpolate'
        ).map(t => ({ 
          period: t.period, 
          value: t.value, 
          change: t.isEstimated ? 0 : (financialData.trends.find(orig => orig.period === t.period)?.change || 0)
        }));
        
        charts.push(this.createTrendChart(completeTrends));
      }

      // 4. Cash Flow Analysis (Waterfall Chart using Plotly)
      if (financialData.netIncome.length > 0) {
        charts.push(this.createCashFlowChart(financialData.netIncome));
      }

      logger.info(`[DataVisualizationEngine] Generated ${charts.length} financial charts`);
      return charts;

    } catch (error: any) {
      logger.error('[DataVisualizationEngine] Error generating financial charts:', error.message);
      return [];
    }
  }

  /**
   * Generate correlation visualizations
   */
  async generateCorrelationVisualizations(correlationData: CorrelationVisualization): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];

    try {
      // 1. Correlation Heatmap (Plotly)
      charts.push(this.createCorrelationHeatmap(correlationData));

      // 2. Strong Correlations Network (Plotly Network)
      if (correlationData.strongCorrelations.length > 0) {
        charts.push(this.createCorrelationNetwork(correlationData.strongCorrelations));
      }

      logger.info(`[DataVisualizationEngine] Generated ${charts.length} correlation charts`);
      return charts;

    } catch (error: any) {
      logger.error('[DataVisualizationEngine] Error generating correlation charts:', error.message);
      return [];
    }
  }

  /**
   * Ensure data completeness for time series data
   * This is critical for accurate visualization of trends over time
   */
  ensureTimeSeriesCompleteness(
    data: { period: string; value: number; [key: string]: any }[],
    timeSeriesType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' = 'monthly',
    completenessStrategy: 'complete' | 'fill-zeros' | 'interpolate' | 'skip-missing' | 'highlight-missing' = 'complete',
    dataRange?: string
  ): { period: string; value: number; [key: string]: any; isEstimated?: boolean }[] {
    try {
      if (!data || data.length === 0) return [];
      
      // Sort data by period
      const sortedData = [...data].sort((a, b) => {
        // Handle different period formats
        const periodA = a.period;
        const periodB = b.period;
        
        // Try to parse as dates first
        const dateA = new Date(periodA);
        const dateB = new Date(periodB);
        
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // Handle quarter format (e.g., "Q1 2023")
        if (periodA.startsWith('Q') && periodB.startsWith('Q')) {
          const [qA, yearA] = periodA.split(' ');
          const [qB, yearB] = periodB.split(' ');
          
          if (yearA !== yearB) {
            return parseInt(yearA) - parseInt(yearB);
          }
          
          return parseInt(qA.substring(1)) - parseInt(qB.substring(1));
        }
        
        // Default string comparison
        return periodA.localeCompare(periodB);
      });
      
      // Extract unique periods and determine range
      let allPeriods: TimePeriod[] = [];
      
      // Parse data range if provided
      let startPeriod: string | null = null;
      let endPeriod: string | null = null;
      
      if (dataRange) {
        const rangeParts = dataRange.split(' to ');
        if (rangeParts.length === 2) {
          startPeriod = rangeParts[0].trim();
          endPeriod = rangeParts[1].trim();
        }
      }
      
      // Generate complete list of periods based on time series type
      switch (timeSeriesType) {
        case 'monthly': {
          // Extract year range from data or use specified range
          let minYear = 9999;
          let maxYear = 0;
          let hasYearMonth = false;
          
          // Check if periods are in "MMM YYYY" format
          for (const item of sortedData) {
            const match = item.period.match(/([A-Za-z]+)\s+(\d{4})/);
            if (match) {
              hasYearMonth = true;
              const year = parseInt(match[2]);
              minYear = Math.min(minYear, year);
              maxYear = Math.max(maxYear, year);
            }
          }
          
          // If we couldn't determine year range from data, use current year
          if (minYear === 9999 || maxYear === 0) {
            const currentYear = new Date().getFullYear();
            minYear = currentYear;
            maxYear = currentYear;
          }
          
          // Override with specified range if provided
          if (startPeriod && endPeriod) {
            const startMatch = startPeriod.match(/([A-Za-z]+)\s+(\d{4})/);
            const endMatch = endPeriod.match(/([A-Za-z]+)\s+(\d{4})/);
            
            if (startMatch && endMatch) {
              minYear = parseInt(startMatch[2]);
              maxYear = parseInt(endMatch[2]);
            }
          }
          
          // Generate all months for each year in range
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          for (let year = minYear; year <= maxYear; year++) {
            for (let i = 0; i < 12; i++) {
              const period = hasYearMonth ? `${months[i]} ${year}` : months[i];
              allPeriods.push({ label: period, value: period });
            }
          }
          break;
        }
        
        case 'quarterly': {
          // Extract year range
          let minYear = 9999;
          let maxYear = 0;
          let hasYearQuarter = false;
          
          // Check if periods are in "Q# YYYY" format
          for (const item of sortedData) {
            const match = item.period.match(/Q(\d)\s+(\d{4})/);
            if (match) {
              hasYearQuarter = true;
              const year = parseInt(match[2]);
              minYear = Math.min(minYear, year);
              maxYear = Math.max(maxYear, year);
            }
          }
          
          // If we couldn't determine year range from data, use current year
          if (minYear === 9999 || maxYear === 0) {
            const currentYear = new Date().getFullYear();
            minYear = currentYear;
            maxYear = currentYear;
          }
          
          // Override with specified range if provided
          if (startPeriod && endPeriod) {
            const startMatch = startPeriod.match(/Q(\d)\s+(\d{4})/);
            const endMatch = endPeriod.match(/Q(\d)\s+(\d{4})/);
            
            if (startMatch && endMatch) {
              minYear = parseInt(startMatch[2]);
              maxYear = parseInt(endMatch[2]);
            }
          }
          
          // Generate all quarters for each year in range
          for (let year = minYear; year <= maxYear; year++) {
            for (let quarter = 1; quarter <= 4; quarter++) {
              const period = hasYearQuarter ? `Q${quarter} ${year}` : `Q${quarter}`;
              allPeriods.push({ label: period, value: period });
            }
          }
          break;
        }
        
        case 'yearly': {
          // Extract year range
          const years = sortedData.map(item => {
            if (typeof item.period === 'string') {
              const match = item.period.match(/\d{4}/);
              return match ? parseInt(match[0]) : null;
            } else if (typeof item.period === 'number') {
              return item.period;
            }
            return null;
          }).filter(year => year !== null) as number[];
          
          let minYear = Math.min(...years);
          let maxYear = Math.max(...years);
          
          // If we couldn't determine year range, use current year
          if (!isFinite(minYear) || !isFinite(maxYear)) {
            const currentYear = new Date().getFullYear();
            minYear = currentYear;
            maxYear = currentYear;
          }
          
          // Override with specified range if provided
          if (startPeriod && endPeriod) {
            const startYear = parseInt(startPeriod);
            const endYear = parseInt(endPeriod);
            
            if (!isNaN(startYear) && !isNaN(endYear)) {
              minYear = startYear;
              maxYear = endYear;
            }
          }
          
          // Generate all years in range
          for (let year = minYear; year <= maxYear; year++) {
            allPeriods.push({ label: year.toString(), value: year.toString() });
          }
          break;
        }
        
        default:
          // For other time series types, just use the existing periods
          allPeriods = sortedData.map(item => ({ label: item.period, value: item.period }));
          break;
      }
      
      // Create a map of existing data points
      const dataMap = new Map<string, any>();
      sortedData.forEach(item => {
        dataMap.set(item.period, item);
      });
      
      // Apply completeness strategy
      const completeData = allPeriods.map(period => {
        const existingData = dataMap.get(period.value.toString());
        
        if (existingData) {
          // Data point exists
          return existingData;
        } else {
          // Data point is missing, apply strategy
          switch (completenessStrategy) {
            case 'fill-zeros':
              // Create new data point with zero value
              return {
                ...this.createEmptyDataPoint(sortedData[0], period.value.toString()),
                value: 0
              };
              
            case 'interpolate':
              // Find nearest data points for interpolation
              const interpolatedValue = this.interpolateValue(sortedData, period.value.toString());
              return {
                ...this.createEmptyDataPoint(sortedData[0], period.value.toString()),
                value: interpolatedValue,
                isEstimated: true
              };
              
            case 'highlight-missing':
              // Create null value but mark as missing
              return {
                ...this.createEmptyDataPoint(sortedData[0], period.value.toString()),
                value: null,
                isMissing: true
              };
              
            case 'skip-missing':
              // Return null to be filtered out later
              return null;
              
            case 'complete':
            default:
              // For complete strategy, add a zero value
              return {
                ...this.createEmptyDataPoint(sortedData[0], period.value.toString()),
                value: 0
              };
          }
        }
      }).filter(item => item !== null) as { period: string; value: number; [key: string]: any; isEstimated?: boolean }[];
      
      logger.info(`[DataVisualizationEngine] Time series completion: ${data.length} original points → ${completeData.length} complete points`);
      return completeData;
      
    } catch (error: any) {
      logger.error('[DataVisualizationEngine] Error ensuring time series completeness:', error.message);
      return data;
    }
  }
  
  /**
   * Create an empty data point based on template
   */
  private createEmptyDataPoint(template: any, period: string): any {
    const result: any = { period };
    
    // Copy structure from template but not values
    Object.keys(template).forEach(key => {
      if (key !== 'period' && key !== 'value') {
        result[key] = typeof template[key] === 'object' ? {} : null;
      }
    });
    
    return result;
  }
  
  /**
   * Interpolate missing value based on surrounding data points
   */
  private interpolateValue(data: { period: string; value: number }[], period: string): number {
    try {
      // Simple linear interpolation between nearest points
      // For more complex data, this could be replaced with more sophisticated methods
      
      // Find position where this period should be
      let position = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i].period > period) {
          position = i;
          break;
        }
      }
      
      if (position === -1) {
        position = data.length;
      }
      
      // Get before and after points
      const before = position > 0 ? data[position - 1] : null;
      const after = position < data.length ? data[position] : null;
      
      // If we have both before and after, interpolate
      if (before && after) {
        // Simple linear interpolation - could be improved for dates
        return (before.value + after.value) / 2;
      }
      
      // If we only have one point, use that
      if (before) return before.value;
      if (after) return after.value;
      
      // No reference points
      return 0;
      
    } catch (error) {
      logger.error('[DataVisualizationEngine] Error interpolating value:', error);
      return 0;
    }
  }

  /**
   * Auto-generate charts based on data analysis results
   */
  async generateSmartVisualizations(request: VisualizationRequest): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];

    try {
      const { 
        data, 
        analysisType, 
        title, 
        preferredLibrary = 'chartjs',
        timeSeriesType = 'monthly',
        dataCompleteness = 'complete',
        dataRange,
        colorScheme = 'default',
        dataQualityLevel = 'none'
      } = request;

      // Apply smart data processing based on analysis type
      let processedData = [...data];
      
      // Handle time series data completeness for temporal data
      if (['temporal', 'trend', 'financial'].includes(analysisType) && 
          Array.isArray(data) && 
          data.length > 0 && 
          'period' in data[0]) {
        
        processedData = this.ensureTimeSeriesCompleteness(
          data, 
          timeSeriesType as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom', 
          dataCompleteness as 'complete' | 'fill-zeros' | 'interpolate' | 'skip-missing' | 'highlight-missing',
          dataRange
        );
        
        logger.info(`[DataVisualizationEngine] Processed time series data: ${data.length} original points, ${processedData.length} complete points`);
      }

      // Apply advanced data processing
      processedData = this.applyAdvancedDataProcessing(processedData, analysisType, timeSeriesType);

      // Select color scheme
      const colors = this.colorSchemes[colorScheme as keyof typeof this.colorSchemes] || this.colorSchemes.default;

      switch (analysisType) {
        case 'financial':
          charts.push(...await this.generateFinancialAutoCharts(processedData, title));
          break;
        case 'temporal':
          charts.push(this.createTimeSeriesChart(processedData, title));
          break;
        case 'categorical':
          charts.push(this.createCategoricalChart(processedData, title));
          break;
        case 'distribution':
          charts.push(this.createDistributionChart(processedData, title));
          break;
        case 'trend':
          charts.push(this.createTrendAnalysisChart(processedData, title));
          break;
        default:
          charts.push(this.createGenericChart(processedData, title, preferredLibrary));
      }

      // Apply analysis-specific optimizations to all charts
      const optimizedCharts = charts.map(chart => 
        this.applyAnalysisSpecificOptimizations(chart, analysisType, processedData)
      );

      // Apply data quality indicators if specified
      const qualityEnhancedCharts = optimizedCharts.map(chart => 
        this.applyDataQualityIndicators(chart, processedData, dataQualityLevel as 'none' | 'basic' | 'detailed' | 'advanced')
      );

      return qualityEnhancedCharts;

    } catch (error: any) {
      logger.error('[DataVisualizationEngine] Error in smart visualization generation:', error.message);
      return [];
    }
  }

  /**
   * Create Revenue vs Expenses line chart
   */
  private createRevenueExpenseChart(financialData: FinancialChartData): ChartConfig {
    const dates = [...new Set([
      ...financialData.revenues.map(r => r.date),
      ...financialData.expenses.map(e => e.date)
    ])].sort();

    // Ensure complete date series with no missing months/quarters
    const allDates = this.ensureCompleteDateSeries(dates);
    
    const revenueByDate = this.aggregateByDate(financialData.revenues, allDates);
    const expensesByDate = this.aggregateByDate(financialData.expenses, allDates);

    return {
      type: 'line',
      library: 'chartjs',
      title: 'Revenue vs Expenses Over Time',
      description: 'Track your financial performance trends',
      data: {
        labels: allDates,
        datasets: [
          {
            label: 'Revenue',
            data: revenueByDate,
            borderColor: this.colorSchemes.financial[0],
            backgroundColor: this.colorSchemes.financial[0] + '20',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Expenses',
            data: expensesByDate,
            borderColor: this.colorSchemes.financial[1],
            backgroundColor: this.colorSchemes.financial[1] + '20',
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Financial Performance Trends'
          },
          legend: {
            position: 'top' as const
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        interaction: {
          mode: 'index' as const,
          intersect: false
        }
      },
      insights: [
        'Track revenue and expense trends over time',
        'Identify seasonal patterns in your business',
        'Monitor cash flow health at a glance'
      ]
    };
  }

  /**
   * Ensure complete date series with no missing periods
   */
  private ensureCompleteDateSeries(dates: string[]): string[] {
    if (dates.length <= 1) return dates;
    
    try {
      // Detect date format
      const firstDate = dates[0];
      
      // Check if dates are in MMM YYYY format (e.g., "Jan 2023")
      if (/^[A-Za-z]{3}\s+\d{4}$/.test(firstDate)) {
        return this.ensureCompleteMonthSeries(dates);
      }
      
      // Check if dates are in Q# YYYY format (e.g., "Q1 2023")
      if (/^Q[1-4]\s+\d{4}$/.test(firstDate)) {
        return this.ensureCompleteQuarterSeries(dates);
      }
      
      // For other formats, just return the original dates
      return dates;
      
    } catch (error) {
      logger.error('[DataVisualizationEngine] Error ensuring complete date series:', error);
      return dates;
    }
  }
  
  /**
   * Ensure complete month series with no missing months
   */
  private ensureCompleteMonthSeries(dates: string[]): string[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result: string[] = [];
    
    // Extract years from dates
    const years = new Set<number>();
    for (const date of dates) {
      const parts = date.split(' ');
      if (parts.length === 2) {
        const year = parseInt(parts[1]);
        if (!isNaN(year)) {
          years.add(year);
        }
      }
    }
    
    // Sort years
    const sortedYears = Array.from(years).sort();
    
    // Generate all months for each year
    for (const year of sortedYears) {
      for (const month of months) {
        result.push(`${month} ${year}`);
      }
    }
    
    return result;
  }
  
  /**
   * Ensure complete quarter series with no missing quarters
   */
  private ensureCompleteQuarterSeries(dates: string[]): string[] {
    const result: string[] = [];
    
    // Extract years from dates
    const years = new Set<number>();
    for (const date of dates) {
      const parts = date.split(' ');
      if (parts.length === 2) {
        const year = parseInt(parts[1]);
        if (!isNaN(year)) {
          years.add(year);
        }
      }
    }
    
    // Sort years
    const sortedYears = Array.from(years).sort();
    
    // Generate all quarters for each year
    for (const year of sortedYears) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        result.push(`Q${quarter} ${year}`);
      }
    }
    
    return result;
  }

  /**
   * Create category breakdown pie chart
   */
  private createCategoryBreakdownChart(categories: Array<{ name: string; total: number; percentage: number }>): ChartConfig {
    return {
      type: 'doughnut',
      library: 'chartjs',
      title: 'Expense Categories Breakdown',
      description: 'Where your money is going',
      data: {
        labels: categories.map(c => c.name),
        datasets: [{
          data: categories.map(c => c.total),
          backgroundColor: this.colorSchemes.categorical.slice(0, categories.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Spending by Category'
          },
          legend: {
            position: 'right' as const
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const percentage = categories[context.dataIndex].percentage;
                return `${context.label}: $${context.raw.toLocaleString()} (${percentage.toFixed(1)}%)`;
              }
            }
          }
        }
      },
      insights: [
        'Identify your largest expense categories',
        'Find opportunities for cost optimization',
        'Track spending distribution changes over time'
      ]
    };
  }

  /**
   * Create trend analysis chart
   */
  private createTrendChart(trends: Array<{ period: string; value: number; change: number }>): ChartConfig {
    return {
      type: 'bar',
      library: 'chartjs',
      title: 'Monthly Business Trends',
      description: 'Performance changes over time',
      data: {
        labels: trends.map(t => t.period),
        datasets: [{
          label: 'Performance Value',
          data: trends.map(t => t.value),
          backgroundColor: trends.map(t => 
            t.change > 0 ? this.colorSchemes.financial[0] + '80' : this.colorSchemes.financial[1] + '80'
          ),
          borderColor: trends.map(t => 
            t.change > 0 ? this.colorSchemes.financial[0] : this.colorSchemes.financial[1]
          ),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Business Performance Trends'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      },
      insights: [
        'Monitor month-over-month performance changes',
        'Identify growth or decline patterns',
        'Plan for seasonal business variations'
      ]
    };
  }

  /**
   * Create cash flow waterfall chart using Plotly
   */
  private createCashFlowChart(netIncome: Array<{ date: string; amount: number }>): ChartConfig {
    const values = netIncome.map(ni => ni.amount);
    const dates = netIncome.map(ni => ni.date);

    return {
      type: 'bar',
      library: 'plotly',
      title: 'Cash Flow Analysis',
      description: 'Net income trends over time',
      data: [{
        x: dates,
        y: values,
        type: 'waterfall',
        orientation: 'v',
        measure: values.map(() => 'relative'),
        text: values.map(v => `$${v.toLocaleString()}`),
        textposition: 'outside',
        connector: {
          line: {
            color: 'rgb(63, 63, 63)'
          }
        },
        increasing: { marker: { color: this.colorSchemes.financial[0] } },
        decreasing: { marker: { color: this.colorSchemes.financial[1] } }
      }],
      options: {
        title: 'Cash Flow Waterfall',
        xaxis: { title: 'Time Period' },
        yaxis: { title: 'Amount ($)' },
        showlegend: false
      },
      insights: [
        'Visualize cumulative cash flow changes',
        'Identify periods of cash flow stress',
        'Plan for future cash requirements'
      ]
    };
  }

  /**
   * Create correlation heatmap
   */
  private createCorrelationHeatmap(correlationData: CorrelationVisualization): ChartConfig {
    return {
      type: 'heatmap',
      library: 'plotly',
      title: 'Data Correlation Matrix',
      description: 'Relationships between different metrics',
      data: [{
        z: correlationData.correlationMatrix,
        x: correlationData.labels,
        y: correlationData.labels,
        type: 'heatmap',
        colorscale: 'RdBu',
        zmin: -1,
        zmax: 1,
        text: correlationData.correlationMatrix.map(row => 
          row.map(val => val.toFixed(2))
        ),
        texttemplate: '%{text}',
        textfont: { size: 12 },
        hoverongaps: false
      }],
      options: {
        title: 'Correlation Analysis',
        xaxis: { title: 'Variables' },
        yaxis: { title: 'Variables' },
        annotations: []
      },
      insights: [
        'Discover hidden relationships in your data',
        'Identify factors that influence key metrics',
        'Optimize based on strong correlations'
      ]
    };
  }

  /**
   * Create correlation network visualization
   */
  private createCorrelationNetwork(strongCorrelations: Array<{
    var1: string; var2: string; correlation: number; strength: string;
  }>): ChartConfig {
    const nodes = [...new Set(strongCorrelations.flatMap(c => [c.var1, c.var2]))];
    const edges = strongCorrelations.map(c => ({
      source: nodes.indexOf(c.var1),
      target: nodes.indexOf(c.var2),
      value: Math.abs(c.correlation)
    }));

    return {
      type: 'scatter',
      library: 'plotly',
      title: 'Strong Correlations Network',
      description: 'Visual network of significant relationships',
      data: [{
        x: nodes.map((_, i) => Math.cos(2 * Math.PI * i / nodes.length)),
        y: nodes.map((_, i) => Math.sin(2 * Math.PI * i / nodes.length)),
        mode: 'markers+text',
        type: 'scatter',
        text: nodes,
        textposition: 'middle center',
        marker: {
          size: 20,
          color: this.colorSchemes.default[0]
        }
      }],
      options: {
        title: 'Correlation Network',
        showlegend: false,
        xaxis: { showgrid: false, zeroline: false, showticklabels: false },
        yaxis: { showgrid: false, zeroline: false, showticklabels: false }
      },
      insights: [
        'Visualize connected data relationships',
        'Understand data dependency networks',
        'Identify key influence factors'
      ]
    };
  }

  /**
   * Generate automatic financial charts from raw data
   */
  private async generateFinancialAutoCharts(data: any[], title: string): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];

    // Try to detect financial data patterns
    const hasAmounts = data.some(item => 
      typeof item.amount === 'number' || typeof item.value === 'number'
    );
    const hasDates = data.some(item => 
      item.date || item.timestamp || item.created_at
    );
    const hasCategories = data.some(item => 
      item.category || item.type || item.vendor
    );

    if (hasAmounts && hasDates) {
      // Time series financial chart
      charts.push(this.createTimeSeriesChart(data, `${title} - Time Series`));
    }

    if (hasAmounts && hasCategories) {
      // Category breakdown chart
      charts.push(this.createCategoricalChart(data, `${title} - By Category`));
    }

    return charts;
  }

  /**
   * Create time series chart
   */
  private createTimeSeriesChart(data: any[], title: string): ChartConfig {
    const timeField = this.detectTimeField(data);
    const valueField = this.detectValueField(data);

    const chartData = data.map(item => ({
      x: item[timeField],
      y: item[valueField]
    })).sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    return {
      type: 'line',
      library: 'chartjs',
      title,
      data: {
        datasets: [{
          label: 'Value',
          data: chartData,
          borderColor: this.colorSchemes.default[0],
          backgroundColor: this.colorSchemes.default[0] + '20',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'time', time: { unit: 'day' } },
          y: { beginAtZero: true }
        }
      }
    };
  }

  /**
   * Create categorical chart
   */
  private createCategoricalChart(data: any[], title: string): ChartConfig {
    const categoryField = this.detectCategoryField(data);
    const valueField = this.detectValueField(data);

    const aggregated = this.aggregateByCategory(data, categoryField, valueField);

    return {
      type: 'pie',
      library: 'chartjs',
      title,
      data: {
        labels: Object.keys(aggregated),
        datasets: [{
          data: Object.values(aggregated),
          backgroundColor: this.colorSchemes.categorical
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' as const }
        }
      }
    };
  }

  /**
   * Create distribution chart
   */
  private createDistributionChart(data: any[], title: string): ChartConfig {
    const valueField = this.detectValueField(data);
    const values = data.map(item => item[valueField]).filter(v => typeof v === 'number');
    
    const histogram = this.createHistogram(values, 10);

    return {
      type: 'bar',
      library: 'chartjs',
      title,
      data: {
        labels: histogram.bins,
        datasets: [{
          label: 'Frequency',
          data: histogram.counts,
          backgroundColor: this.colorSchemes.default[0] + '80'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    };
  }

  /**
   * Create trend analysis chart
   */
  private createTrendAnalysisChart(data: any[], title: string): ChartConfig {
    const timeField = this.detectTimeField(data);
    const valueField = this.detectValueField(data);

    // Calculate moving average
    const sortedData = data.sort((a, b) => 
      new Date(a[timeField]).getTime() - new Date(b[timeField]).getTime()
    );

    const movingAverage = this.calculateMovingAverage(
      sortedData.map(item => item[valueField]), 7
    );

    return {
      type: 'line',
      library: 'chartjs',
      title,
      data: {
        labels: sortedData.map(item => item[timeField]),
        datasets: [
          {
            label: 'Actual',
            data: sortedData.map(item => item[valueField]),
            borderColor: this.colorSchemes.default[0],
            backgroundColor: 'transparent'
          },
          {
            label: 'Trend (7-day avg)',
            data: movingAverage,
            borderColor: this.colorSchemes.default[1],
            backgroundColor: 'transparent',
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    };
  }

  /**
   * Create generic chart with auto-detection
   */
  private createGenericChart(data: any[], title: string, library: 'chartjs' | 'plotly' | 'recharts'): ChartConfig {
    // Simple bar chart as fallback
    const keys = Object.keys(data[0] || {});
    const labelField = keys[0];
    const valueField = keys.find(k => typeof data[0][k] === 'number') || keys[1];

    return {
      type: 'bar',
      library,
      title,
      data: {
        labels: data.map(item => item[labelField]),
        datasets: [{
          label: 'Value',
          data: data.map(item => item[valueField]),
          backgroundColor: this.colorSchemes.default[0] + '80'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    };
  }

  // Utility methods
  private aggregateByDate(items: Array<{ date: string; amount: number }>, dates: string[]): number[] {
    return dates.map(date => {
      const dayItems = items.filter(item => item.date === date);
      return dayItems.reduce((sum, item) => sum + item.amount, 0);
    });
  }

  private aggregateByCategory(data: any[], categoryField: string, valueField: string): Record<string, number> {
    return data.reduce((acc, item) => {
      const category = item[categoryField];
      const value = item[valueField] || 0;
      acc[category] = (acc[category] || 0) + value;
      return acc;
    }, {});
  }

  private detectTimeField(data: any[]): string {
    const timeFields = ['date', 'timestamp', 'created_at', 'time', 'datetime'];
    return timeFields.find(field => data[0] && data[0][field]) || 'date';
  }

  private detectValueField(data: any[]): string {
    const valueFields = ['amount', 'value', 'total', 'count', 'price', 'cost'];
    return valueFields.find(field => 
      data[0] && typeof data[0][field] === 'number'
    ) || Object.keys(data[0] || {}).find(key => 
      typeof data[0][key] === 'number'
    ) || 'value';
  }

  private detectCategoryField(data: any[]): string {
    const categoryFields = ['category', 'type', 'vendor', 'name', 'label'];
    return categoryFields.find(field => data[0] && data[0][field]) || 'category';
  }

  private createHistogram(values: number[], bins: number): { bins: string[]; counts: number[] } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    const counts = new Array(bins).fill(0);
    const binLabels: string[] = [];

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
      
      values.forEach(value => {
        if (value >= binStart && (value < binEnd || i === bins - 1)) {
          counts[i]++;
        }
      });
    }

    return { bins: binLabels, counts };
  }

  private calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(values.length, i + Math.ceil(window / 2));
      const slice = values.slice(start, end);
      const average = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      result.push(average);
    }
    return result;
  }
}

// Singleton instance
let visualizationEngine: DataVisualizationEngine | null = null;

export function getDataVisualizationEngine(): DataVisualizationEngine {
  if (!visualizationEngine) {
    visualizationEngine = new DataVisualizationEngine();
  }
  return visualizationEngine;
}