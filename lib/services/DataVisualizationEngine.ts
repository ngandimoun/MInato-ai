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

export class DataVisualizationEngine {
  private readonly colorSchemes = {
    default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
    financial: ['#059669', '#DC2626', '#2563EB', '#7C3AED', '#DB2777', '#EA580C'],
    categorical: ['#6366F1', '#06B6D4', '#84CC16', '#EAB308', '#F97316', '#EF4444'],
    heatmap: ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#92400E', '#451A03']
  };

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
        charts.push(this.createTrendChart(financialData.trends));
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
   * Auto-generate charts based on data analysis results
   */
  async generateSmartVisualizations(request: VisualizationRequest): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];

    try {
      const { data, analysisType, title, preferredLibrary = 'chartjs' } = request;

      switch (analysisType) {
        case 'financial':
          charts.push(...await this.generateFinancialAutoCharts(data, title));
          break;
        case 'temporal':
          charts.push(this.createTimeSeriesChart(data, title));
          break;
        case 'categorical':
          charts.push(this.createCategoricalChart(data, title));
          break;
        case 'distribution':
          charts.push(this.createDistributionChart(data, title));
          break;
        case 'trend':
          charts.push(this.createTrendAnalysisChart(data, title));
          break;
        default:
          charts.push(this.createGenericChart(data, title, preferredLibrary));
      }

      return charts;

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

    const revenueByDate = this.aggregateByDate(financialData.revenues, dates);
    const expensesByDate = this.aggregateByDate(financialData.expenses, dates);

    return {
      type: 'line',
      library: 'chartjs',
      title: 'Revenue vs Expenses Over Time',
      description: 'Track your financial performance trends',
      data: {
        labels: dates,
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