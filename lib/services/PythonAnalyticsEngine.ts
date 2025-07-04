/**
 * Minato AI Python Analytics Engine
 * Executes advanced statistical analysis, machine learning, and data science operations
 * via Python subprocess integration for complex data analytics
 */

import { spawn, exec } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@/memory-framework/config';
import { randomUUID } from 'crypto';

// Analytics request interfaces
export interface PythonAnalyticsRequest {
  analysisType: 'correlation' | 'regression' | 'clustering' | 'timeseries' | 'statistical' | 'ml_prediction' | 'anomaly_detection';
  data: any[];
  parameters?: Record<string, any>;
  outputFormat?: 'json' | 'csv' | 'chart_data' | 'report';
  pythonScript?: string; // Custom Python script
}

export interface AnalyticsResult {
  success: boolean;
  analysisId: string;
  results: any;
  charts?: any[];
  insights?: string[];
  recommendations?: string[];
  statistics?: Record<string, number>;
  error?: string;
  executionTime?: number;
}

export interface StatisticalAnalysis {
  descriptiveStats: {
    mean: number;
    median: number;
    mode: number[];
    std: number;
    variance: number;
    skewness: number;
    kurtosis: number;
    min: number;
    max: number;
    quartiles: [number, number, number];
  };
  distributions: {
    normal_test: { statistic: number; pvalue: number; is_normal: boolean };
    outliers: { method: string; outlier_indices: number[]; outlier_values: number[] };
  };
  correlations?: {
    pearson: number[][];
    spearman: number[][];
    variables: string[];
  };
}

export interface RegressionAnalysis {
  model_type: 'linear' | 'polynomial' | 'logistic';
  coefficients: number[];
  intercept: number;
  r_squared: number;
  adjusted_r_squared: number;
  f_statistic: number;
  p_values: number[];
  residuals: number[];
  predictions: number[];
  feature_importance?: number[];
  model_summary: string;
}

export interface ClusteringAnalysis {
  method: 'kmeans' | 'hierarchical' | 'dbscan';
  n_clusters: number;
  cluster_labels: number[];
  cluster_centers?: number[][];
  silhouette_score: number;
  inertia?: number;
  cluster_summary: Array<{
    cluster_id: number;
    size: number;
    centroid: number[];
    characteristics: string[];
  }>;
}

export interface TimeSeriesAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
  forecasts: Array<{
    date: string;
    predicted_value: number;
    confidence_interval: [number, number];
  }>;
  decomposition: {
    trend: number[];
    seasonal: number[];
    residual: number[];
  };
  anomalies: Array<{
    date: string;
    value: number;
    anomaly_score: number;
  }>;
}

export class PythonAnalyticsEngine {
  private readonly pythonEnv: string;
  private readonly scriptsDir: string;
  private readonly dataDir: string;
  private readonly outputDir: string;

  constructor() {
    this.pythonEnv = process.env.PYTHON_PATH || 'python3';
    this.scriptsDir = join(process.cwd(), 'python_analytics');
    this.dataDir = join(this.scriptsDir, 'data');
    this.outputDir = join(this.scriptsDir, 'output');
    
    this.ensureDirectories();
    this.createPythonScripts();
  }

  /**
   * Execute advanced statistical analysis on data
   */
  async executeStatisticalAnalysis(data: any[], columns: string[]): Promise<AnalyticsResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonAnalytics] Starting statistical analysis: ${analysisId}`);
      
      // Prepare data for Python
      const dataFile = await this.writeDataFile(data, analysisId);
      
      // Execute Python statistical analysis script
      const pythonResult = await this.executePythonScript('statistical_analysis.py', {
        data_file: dataFile,
        columns: columns.join(','),
        analysis_id: analysisId
      });

      const result = this.parseAnalyticsResult(pythonResult, analysisId, startTime);
      logger.info(`[PythonAnalytics] Statistical analysis completed: ${analysisId}`);
      
      return result;

    } catch (error: any) {
      logger.error(`[PythonAnalytics] Statistical analysis failed: ${error.message}`);
      return {
        success: false,
        analysisId,
        results: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute regression analysis
   */
  async executeRegressionAnalysis(
    data: any[], 
    targetColumn: string, 
    featureColumns: string[],
    modelType: 'linear' | 'polynomial' | 'logistic' = 'linear'
  ): Promise<AnalyticsResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonAnalytics] Starting regression analysis: ${analysisId}`);
      
      const dataFile = await this.writeDataFile(data, analysisId);
      
      const pythonResult = await this.executePythonScript('regression_analysis.py', {
        data_file: dataFile,
        target_column: targetColumn,
        feature_columns: featureColumns.join(','),
        model_type: modelType,
        analysis_id: analysisId
      });

      const result = this.parseAnalyticsResult(pythonResult, analysisId, startTime);
      logger.info(`[PythonAnalytics] Regression analysis completed: ${analysisId}`);
      
      return result;

    } catch (error: any) {
      logger.error(`[PythonAnalytics] Regression analysis failed: ${error.message}`);
      return {
        success: false,
        analysisId,
        results: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute clustering analysis
   */
  async executeClusteringAnalysis(
    data: any[], 
    features: string[],
    method: 'kmeans' | 'hierarchical' | 'dbscan' = 'kmeans',
    nClusters?: number
  ): Promise<AnalyticsResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonAnalytics] Starting clustering analysis: ${analysisId}`);
      
      const dataFile = await this.writeDataFile(data, analysisId);
      
      const pythonResult = await this.executePythonScript('clustering_analysis.py', {
        data_file: dataFile,
        features: features.join(','),
        method: method,
        n_clusters: nClusters?.toString() || 'auto',
        analysis_id: analysisId
      });

      const result = this.parseAnalyticsResult(pythonResult, analysisId, startTime);
      logger.info(`[PythonAnalytics] Clustering analysis completed: ${analysisId}`);
      
      return result;

    } catch (error: any) {
      logger.error(`[PythonAnalytics] Clustering analysis failed: ${error.message}`);
      return {
        success: false,
        analysisId,
        results: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute time series analysis and forecasting
   */
  async executeTimeSeriesAnalysis(
    data: any[], 
    dateColumn: string, 
    valueColumn: string,
    forecastPeriods: number = 30
  ): Promise<AnalyticsResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonAnalytics] Starting time series analysis: ${analysisId}`);
      
      const dataFile = await this.writeDataFile(data, analysisId);
      
      const pythonResult = await this.executePythonScript('timeseries_analysis.py', {
        data_file: dataFile,
        date_column: dateColumn,
        value_column: valueColumn,
        forecast_periods: forecastPeriods.toString(),
        analysis_id: analysisId
      });

      const result = this.parseAnalyticsResult(pythonResult, analysisId, startTime);
      logger.info(`[PythonAnalytics] Time series analysis completed: ${analysisId}`);
      
      return result;

    } catch (error: any) {
      logger.error(`[PythonAnalytics] Time series analysis failed: ${error.message}`);
      return {
        success: false,
        analysisId,
        results: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute anomaly detection
   */
  async executeAnomalyDetection(
    data: any[], 
    features: string[],
    method: 'isolation_forest' | 'one_class_svm' | 'local_outlier_factor' = 'isolation_forest'
  ): Promise<AnalyticsResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonAnalytics] Starting anomaly detection: ${analysisId}`);
      
      const dataFile = await this.writeDataFile(data, analysisId);
      
      const pythonResult = await this.executePythonScript('anomaly_detection.py', {
        data_file: dataFile,
        features: features.join(','),
        method: method,
        analysis_id: analysisId
      });

      const result = this.parseAnalyticsResult(pythonResult, analysisId, startTime);
      logger.info(`[PythonAnalytics] Anomaly detection completed: ${analysisId}`);
      
      return result;

    } catch (error: any) {
      logger.error(`[PythonAnalytics] Anomaly detection failed: ${error.message}`);
      return {
        success: false,
        analysisId,
        results: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute custom Python analytics script
   */
  async executeCustomAnalysis(request: PythonAnalyticsRequest): Promise<AnalyticsResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonAnalytics] Starting custom analysis: ${analysisId}`);
      
      if (!request.pythonScript) {
        throw new Error('Custom Python script is required');
      }

      // Write custom script
      const scriptFile = join(this.scriptsDir, `custom_${analysisId}.py`);
      writeFileSync(scriptFile, request.pythonScript);

      // Prepare data
      const dataFile = await this.writeDataFile(request.data, analysisId);
      
      const pythonResult = await this.executePythonScript(`custom_${analysisId}.py`, {
        data_file: dataFile,
        ...request.parameters,
        analysis_id: analysisId
      });

      const result = this.parseAnalyticsResult(pythonResult, analysisId, startTime);
      logger.info(`[PythonAnalytics] Custom analysis completed: ${analysisId}`);
      
      return result;

    } catch (error: any) {
      logger.error(`[PythonAnalytics] Custom analysis failed: ${error.message}`);
      return {
        success: false,
        analysisId,
        results: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate comprehensive financial analytics
   */
  async executeFinancialAnalytics(financialData: any[]): Promise<AnalyticsResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();

    try {
      logger.info(`[PythonAnalytics] Starting financial analytics: ${analysisId}`);
      
      const dataFile = await this.writeDataFile(financialData, analysisId);
      
      const pythonResult = await this.executePythonScript('financial_analytics.py', {
        data_file: dataFile,
        analysis_id: analysisId
      });

      const result = this.parseAnalyticsResult(pythonResult, analysisId, startTime);
      logger.info(`[PythonAnalytics] Financial analytics completed: ${analysisId}`);
      
      return result;

    } catch (error: any) {
      logger.error(`[PythonAnalytics] Financial analytics failed: ${error.message}`);
      return {
        success: false,
        analysisId,
        results: {},
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  // Private utility methods
  private ensureDirectories(): void {
    [this.scriptsDir, this.dataDir, this.outputDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async writeDataFile(data: any[], analysisId: string): Promise<string> {
    const filename = `data_${analysisId}.json`;
    const filepath = join(this.dataDir, filename);
    writeFileSync(filepath, JSON.stringify(data, null, 2));
    return filepath;
  }

  private async executePythonScript(scriptName: string, params: Record<string, any>): Promise<string> {
    return new Promise((resolve, reject) => {
      const scriptPath = join(this.scriptsDir, scriptName);
      
      // Build command line arguments
      const args = Object.entries(params).flatMap(([key, value]) => [`--${key}`, value.toString()]);
      
      const process = spawn(this.pythonEnv, [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONPATH: this.scriptsDir }
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  private parseAnalyticsResult(pythonOutput: string, analysisId: string, startTime: number): AnalyticsResult {
    try {
      // Try to parse JSON output from Python
      const lines = pythonOutput.trim().split('\n');
      const jsonLine = lines.find(line => line.startsWith('{') || line.startsWith('['));
      
      if (!jsonLine) {
        throw new Error('No JSON output found from Python script');
      }

      const results = JSON.parse(jsonLine);
      
      return {
        success: true,
        analysisId,
        results,
        charts: results.charts || [],
        insights: results.insights || [],
        recommendations: results.recommendations || [],
        statistics: results.statistics || {},
        executionTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        success: false,
        analysisId,
        results: {},
        error: `Failed to parse Python output: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private createPythonScripts(): void {
    // Create statistical analysis script
    const statisticalScript = `#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
from scipy import stats
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_file', required=True)
    parser.add_argument('--columns', required=True)
    parser.add_argument('--analysis_id', required=True)
    args = parser.parse_args()
    
    # Load data
    with open(args.data_file, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    columns = args.columns.split(',')
    
    # Select numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    analysis_cols = [col for col in columns if col in numeric_cols]
    
    if not analysis_cols:
        print(json.dumps({
            "error": "No numeric columns found for analysis",
            "available_columns": list(df.columns),
            "numeric_columns": numeric_cols
        }))
        return
    
    results = {}
    
    # Descriptive statistics
    for col in analysis_cols:
        if col in df.columns:
            series = df[col].dropna()
            if len(series) > 0:
                results[col] = {
                    "mean": float(series.mean()),
                    "median": float(series.median()),
                    "std": float(series.std()),
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "skewness": float(stats.skew(series)),
                    "kurtosis": float(stats.kurtosis(series)),
                    "count": int(series.count())
                }
    
    # Correlation matrix if multiple columns
    if len(analysis_cols) > 1:
        corr_data = df[analysis_cols].corr()
        results["correlation_matrix"] = {
            "values": corr_data.values.tolist(),
            "columns": corr_data.columns.tolist()
        }
    
    # Output results
    output = {
        "analysis_type": "statistical",
        "results": results,
        "insights": [
            f"Analyzed {len(analysis_cols)} numeric variables",
            f"Dataset contains {len(df)} rows",
            "Statistical summary completed successfully"
        ]
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
`;

    // Create financial analytics script
    const financialScript = `#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_file', required=True)
    parser.add_argument('--analysis_id', required=True)
    args = parser.parse_args()
    
    # Load financial data
    with open(args.data_file, 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    
    # Basic financial metrics
    results = {
        "total_transactions": len(df),
        "date_range": {
            "start": df['date'].min() if 'date' in df.columns else None,
            "end": df['date'].max() if 'date' in df.columns else None
        }
    }
    
    # Revenue and expense analysis
    if 'amount' in df.columns:
        results["total_amount"] = float(df['amount'].sum())
        results["average_transaction"] = float(df['amount'].mean())
        results["largest_transaction"] = float(df['amount'].max())
        results["smallest_transaction"] = float(df['amount'].min())
    
    # Category analysis
    if 'category' in df.columns:
        category_summary = df.groupby('category')['amount'].agg(['sum', 'count', 'mean']).to_dict()
        results["by_category"] = category_summary
    
    # Monthly trends
    if 'date' in df.columns and 'amount' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
        monthly = df.groupby(df['date'].dt.to_period('M'))['amount'].sum()
        results["monthly_trends"] = {
            "periods": [str(p) for p in monthly.index],
            "amounts": monthly.values.tolist()
        }
    
    # Output
    output = {
        "analysis_type": "financial",
        "results": results,
        "insights": [
            f"Processed {len(df)} financial transactions",
            f"Total value: ${results.get('total_amount', 0):,.2f}",
            "Financial analysis completed"
        ],
        "recommendations": [
            "Review largest transactions for accuracy",
            "Monitor monthly spending trends",
            "Consider category-based budgeting"
        ]
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
`;

    // Write Python scripts
    const scriptFiles = {
      'statistical_analysis.py': statisticalScript,
      'financial_analytics.py': financialScript
    };

    Object.entries(scriptFiles).forEach(([filename, content]) => {
      const filepath = join(this.scriptsDir, filename);
      if (!existsSync(filepath)) {
        writeFileSync(filepath, content);
      }
    });

    // Create requirements.txt
    const requirements = `pandas>=1.3.0
numpy>=1.21.0
scipy>=1.7.0
scikit-learn>=1.0.0
matplotlib>=3.4.0
seaborn>=0.11.0
plotly>=5.0.0
statsmodels>=0.12.0
`;

    const requirementsPath = join(this.scriptsDir, 'requirements.txt');
    if (!existsSync(requirementsPath)) {
      writeFileSync(requirementsPath, requirements);
    }
  }
}

// Singleton instance
let pythonAnalyticsEngine: PythonAnalyticsEngine | null = null;

export function getPythonAnalyticsEngine(): PythonAnalyticsEngine {
  if (!pythonAnalyticsEngine) {
    pythonAnalyticsEngine = new PythonAnalyticsEngine();
  }
  return pythonAnalyticsEngine;
}