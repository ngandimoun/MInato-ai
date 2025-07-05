/**
 * Python Sandbox Engine using PyScript
 * Executes Python code in the browser without server dependencies
 */

import { logger } from '@/memory-framework/config';
import { randomUUID } from 'crypto';

export interface PythonSandboxResult {
  success: boolean;
  executionId: string;
  output: any;
  error?: string;
  executionTime: number;
  charts?: any[];
  insights?: string[];
}

export class PythonSandboxEngine {
  private sandboxUrl: string;

  constructor() {
    // Use a Python sandbox service (like Pyodide or custom sandbox)
    this.sandboxUrl = process.env.PYTHON_SANDBOX_URL || 'internal';
  }

  /**
   * Execute Python code for data analysis
   */
  async executeDataAnalysis(data: any[], analysisType: string = 'comprehensive'): Promise<PythonSandboxResult> {
    const executionId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonSandbox] Starting analysis: ${executionId}`);

      // Generate dynamic Python code based on data
      const pythonCode = this.generateAnalysisCode(data, analysisType);
      
      // Execute in sandbox
      const result = await this.executePythonCode(pythonCode, data);

      return {
        success: true,
        executionId,
        output: result,
        executionTime: Date.now() - startTime,
        charts: result.charts || [],
        insights: result.insights || []
      };

    } catch (error: any) {
      logger.error(`[PythonSandbox] Analysis failed: ${error.message}`);
      return {
        success: false,
        executionId,
        output: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate Python code dynamically based on data structure
   */
  private generateAnalysisCode(data: any[], analysisType: string): string {
    const dataJson = JSON.stringify(data);
    
    return `
import json
import pandas as pd
import numpy as np
from datetime import datetime
import statistics

# Load data
data = json.loads('${dataJson.replace(/'/g, "\\'")}')
df = pd.DataFrame(data)

results = {
    "analysis_type": "${analysisType}",
    "data_summary": {
        "rows": len(df),
        "columns": len(df.columns) if len(df) > 0 else 0,
        "column_types": {}
    },
    "insights": [],
    "charts": [],
    "statistics": {}
}

if len(df) > 0:
    # Analyze column types and data
    for col in df.columns:
        dtype = str(df[col].dtype)
        results["data_summary"]["column_types"][col] = dtype
        
        if df[col].dtype in ['int64', 'float64']:
            # Numeric analysis
            series = df[col].dropna()
            if len(series) > 0:
                results["statistics"][col] = {
                    "mean": float(series.mean()),
                    "median": float(series.median()),
                    "std": float(series.std()) if len(series) > 1 else 0,
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "count": int(len(series))
                }
                
                # Generate insights
                if series.std() > series.mean() * 0.5:
                    results["insights"].append(f"{col}: High variability detected (std: {series.std():.2f})")
                
                if series.min() < 0 and series.max() > 0:
                    results["insights"].append(f"{col}: Contains both positive and negative values")
                
                # Chart data
                results["charts"].append({
                    "type": "histogram",
                    "title": f"Distribution of {col}",
                    "data": {
                        "values": series.tolist(),
                        "bins": min(20, len(series.unique()))
                    }
                })
        
        elif df[col].dtype == 'object':
            # Text/categorical analysis
            value_counts = df[col].value_counts()
            results["statistics"][col] = {
                "unique_values": int(df[col].nunique()),
                "most_common": value_counts.head(5).to_dict(),
                "null_count": int(df[col].isnull().sum())
            }
            
            if df[col].nunique() < 20:  # Categorical data
                results["charts"].append({
                    "type": "bar",
                    "title": f"Frequency of {col}",
                    "data": {
                        "categories": value_counts.index.tolist(),
                        "values": value_counts.values.tolist()
                    }
                })

    # Correlation analysis for numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr()
        results["statistics"]["correlations"] = {
            "matrix": corr_matrix.to_dict(),
            "strong_correlations": []
        }
        
        # Find strong correlations
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_val = corr_matrix.iloc[i, j]
                if abs(corr_val) > 0.7:
                    results["statistics"]["correlations"]["strong_correlations"].append({
                        "var1": corr_matrix.columns[i],
                        "var2": corr_matrix.columns[j],
                        "correlation": float(corr_val)
                    })
                    results["insights"].append(f"Strong correlation between {corr_matrix.columns[i]} and {corr_matrix.columns[j]}: {corr_val:.2f}")

    # Time series analysis if date column exists
    date_cols = []
    for col in df.columns:
        try:
            pd.to_datetime(df[col])
            date_cols.append(col)
        except:
            pass
    
    if date_cols and len(numeric_cols) > 0:
        date_col = date_cols[0]
        df[date_col] = pd.to_datetime(df[date_col])
        df_sorted = df.sort_values(date_col)
        
        results["insights"].append(f"Time series data detected with date range: {df[date_col].min()} to {df[date_col].max()}")
        
        # Time series chart
        for num_col in numeric_cols[:3]:  # Limit to 3 numeric columns
            results["charts"].append({
                "type": "line",
                "title": f"{num_col} over time",
                "data": {
                    "x": df_sorted[date_col].dt.strftime('%Y-%m-%d').tolist(),
                    "y": df_sorted[num_col].tolist(),
                    "name": num_col
                }
            })

# Generate summary insights
if len(results["insights"]) == 0:
    results["insights"] = [
        f"Dataset contains {len(df)} rows and {len(df.columns)} columns",
        f"Data types: {list(results['data_summary']['column_types'].values())}",
        "Basic statistical analysis completed"
    ]

print(json.dumps(results))
`;
  }

  /**
   * Execute Python code in sandbox environment
   */
  private async executePythonCode(code: string, data: any[]): Promise<any> {
    if (this.sandboxUrl === 'internal') {
      // Use internal JavaScript fallback for now
      return this.javascriptFallback(data);
    }

    // TODO: Implement actual sandbox execution
    // Options:
    // 1. Pyodide (browser-based Python)
    // 2. Docker container
    // 3. External service like Replit, CodePen, etc.
    // 4. WebAssembly Python

    const response = await fetch(this.sandboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        data,
        timeout: 30000
      })
    });

    if (!response.ok) {
      throw new Error(`Sandbox execution failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * JavaScript fallback when Python sandbox is not available
   */
  private javascriptFallback(data: any[]): any {
    const results: {
      analysis_type: string;
      data_summary: {
        rows: number;
        columns: number;
        column_types: Record<string, string>;
      };
      insights: string[];
      charts: any[];
      statistics: Record<string, any>;
    } = {
      analysis_type: 'javascript_fallback',
      data_summary: {
        rows: data.length,
        columns: data.length > 0 ? Object.keys(data[0]).length : 0,
        column_types: {}
      },
      insights: [],
      charts: [],
      statistics: {}
    };

    if (data.length === 0) {
      results.insights.push('No data provided for analysis');
      return results;
    }

    const columns = Object.keys(data[0]);
    
    columns.forEach(col => {
      const values = data.map(row => row[col]).filter(val => val != null);
      const numericValues = values.filter(val => !isNaN(Number(val))).map(Number);
      
      if (numericValues.length > 0) {
        // Numeric analysis
        results.data_summary.column_types[col] = 'numeric';
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / numericValues.length;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        results.statistics[col] = {
          mean: Number(mean.toFixed(2)),
          median: Number(median.toFixed(2)),
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          count: numericValues.length
        };

        // Generate chart data
        results.charts.push({
          type: 'bar',
          title: `${col} Statistics`,
          data: {
            categories: ['Min', 'Mean', 'Median', 'Max'],
            values: [
              Math.min(...numericValues),
              mean,
              median,
              Math.max(...numericValues)
            ]
          }
        });

        if (Math.max(...numericValues) > mean * 2) {
          results.insights.push(`${col}: Contains outliers (max value significantly higher than average)`);
        }
      } else {
        // Categorical analysis
        results.data_summary.column_types[col] = 'categorical';
        const uniqueValues = [...new Set(values)];
        const valueCounts: Record<string, number> = {};
        values.forEach(val => {
          const key = String(val);
          valueCounts[key] = (valueCounts[key] || 0) + 1;
        });

        results.statistics[col] = {
          unique_values: uniqueValues.length,
          most_common: Object.entries(valueCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {}),
          null_count: data.length - values.length
        };

        if (uniqueValues.length < 10) {
          results.charts.push({
            type: 'pie',
            title: `Distribution of ${col}`,
            data: Object.entries(valueCounts).map(([name, value]) => ({ name, value }))
          });
        }
      }
    });

    // Generate insights
    results.insights.push(`Analyzed ${data.length} records with ${columns.length} attributes`);
    
    const numericCols = Object.keys(results.statistics).filter(col => 
      results.statistics[col].mean !== undefined
    );
    
    if (numericCols.length > 0) {
      results.insights.push(`Found ${numericCols.length} numeric columns for statistical analysis`);
    }

    const categoricalCols = Object.keys(results.statistics).filter(col => 
      results.statistics[col].unique_values !== undefined
    );
    
    if (categoricalCols.length > 0) {
      results.insights.push(`Found ${categoricalCols.length} categorical columns for frequency analysis`);
    }

    return results;
  }
}

// Singleton instance
let pythonSandboxEngine: PythonSandboxEngine | null = null;

export function getPythonSandboxEngine(): PythonSandboxEngine {
  if (!pythonSandboxEngine) {
    pythonSandboxEngine = new PythonSandboxEngine();
  }
  return pythonSandboxEngine;
} 