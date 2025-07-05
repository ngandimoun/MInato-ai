/**
 * Cloud-based Python Execution Service
 * Uses external APIs like Judge0, Replit, etc. for secure Python execution
 */

import { logger } from '@/memory-framework/config';
import { randomUUID } from 'crypto';

export interface CloudExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  service: string;
  charts?: any[];
  insights?: string[];
}

export interface CloudExecutionOptions {
  service?: 'judge0' | 'replit' | 'sphere';
  timeout?: number;
  language?: string;
}

export class CloudPythonExecutor {
  private readonly judge0Url: string;
  private readonly replitUrl: string;
  private readonly timeout: number;

  constructor() {
    this.judge0Url = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
    this.replitUrl = process.env.REPLIT_API_URL || 'https://api.replit.com';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Execute Python code using cloud services
   */
  async executeCode(
    code: string, 
    data: any[] = [], 
    options: CloudExecutionOptions = {}
  ): Promise<CloudExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();
    const service = options.service || 'judge0';

    try {
      logger.info(`[CloudExecutor] Starting execution: ${executionId} via ${service}`);

      let result: CloudExecutionResult;

      switch (service) {
        case 'judge0':
          result = await this.executeWithJudge0(code, data, executionId);
          break;
        case 'replit':
          result = await this.executeWithReplit(code, data, executionId);
          break;
        case 'sphere':
          result = await this.executeWithSphere(code, data, executionId);
          break;
        default:
          throw new Error(`Unsupported service: ${service}`);
      }

      result.executionTime = Date.now() - startTime;
      result.service = service;

      return result;

    } catch (error: any) {
      logger.error(`[CloudExecutor] Execution failed: ${error.message}`);
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        service
      };
    }
  }

  /**
   * Execute using Judge0 API
   */
  private async executeWithJudge0(code: string, data: any[], executionId: string): Promise<CloudExecutionResult> {
    const pythonCode = this.generateAnalysisCode(code, data);
    
    // Submit code for execution
    const submitResponse = await fetch(`${this.judge0Url}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || '',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        source_code: pythonCode,
        language_id: 71, // Python 3
        stdin: '',
        expected_output: '',
        cpu_time_limit: 10,
        memory_limit: 512000
      })
    });

    if (!submitResponse.ok) {
      throw new Error(`Judge0 submission failed: ${submitResponse.statusText}`);
    }

    const submission = await submitResponse.json();
    const token = submission.token;

    // Poll for results
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const resultResponse = await fetch(`${this.judge0Url}/submissions/${token}`, {
        headers: {
          'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || '',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      });

      if (!resultResponse.ok) {
        throw new Error(`Judge0 result fetch failed: ${resultResponse.statusText}`);
      }

      const result = await resultResponse.json();
      
      if (result.status.id <= 2) {
        // Still processing (In Queue = 1, Processing = 2)
        attempts++;
        continue;
      }

      // Execution completed
      const output = result.stdout || '';
      const error = result.stderr || result.compile_output || '';

      // Parse results from output
      const parsedResult = this.parseAnalysisResults(output);

      return {
        success: result.status.id === 3, // Accepted
        output: parsedResult.output || output,
        error: result.status.id !== 3 ? error : undefined,
        charts: parsedResult.charts || [],
        insights: parsedResult.insights || [],
        executionTime: 0, // Will be set by caller
        service: 'judge0'
      };
    }

    throw new Error('Judge0 execution timeout');
  }

  /**
   * Execute using Replit API (mock implementation)
   */
  private async executeWithReplit(code: string, data: any[], executionId: string): Promise<CloudExecutionResult> {
    // Note: This is a mock implementation as Replit API access requires special setup
    logger.warn('[CloudExecutor] Replit execution is not fully implemented - using fallback');
    
    return {
      success: false,
      output: '',
      error: 'Replit API not configured. Please set REPLIT_API_KEY environment variable.',
      executionTime: 0,
      service: 'replit'
    };
  }

  /**
   * Execute using Sphere Engine API (mock implementation)
   */
  private async executeWithSphere(code: string, data: any[], executionId: string): Promise<CloudExecutionResult> {
    // Note: This is a mock implementation
    logger.warn('[CloudExecutor] Sphere Engine execution is not fully implemented - using fallback');
    
    return {
      success: false,
      output: '',
      error: 'Sphere Engine API not configured. Please set SPHERE_API_KEY environment variable.',
      executionTime: 0,
      service: 'sphere'
    };
  }

  /**
   * Generate Python analysis code with data injection
   */
  private generateAnalysisCode(userCode: string, data: any[]): string {
    const dataJson = JSON.stringify(data);
    
    return `
import json
import pandas as pd
import numpy as np
import sys
from io import StringIO

# Global results object
results = {
    "output": "",
    "charts": [],
    "insights": [],
    "success": False,
    "error": None
}

try:
    # Load input data
    input_data = ${dataJson}
    
    # Create DataFrame if data exists
    if input_data:
        df = pd.DataFrame(input_data)
        print(f"Loaded dataset with {len(df)} rows and {len(df.columns)} columns")
    else:
        df = pd.DataFrame()
        print("No input data provided")
    
    # Capture stdout
    old_stdout = sys.stdout
    sys.stdout = captured_output = StringIO()
    
    # Execute user code
    ${userCode}
    
    # Restore stdout and capture output
    sys.stdout = old_stdout
    user_output = captured_output.getvalue()
    
    results["output"] = user_output
    results["success"] = True
    
    # Basic analysis if DataFrame exists
    if not df.empty:
        results["insights"].append(f"Dataset contains {len(df)} rows and {len(df.columns)} columns")
        
        # Numeric analysis
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            results["insights"].append(f"Found {len(numeric_cols)} numeric columns")
            
            for col in numeric_cols[:3]:
                series = df[col].dropna()
                if len(series) > 0:
                    results["charts"].append({
                        "type": "statistics",
                        "title": f"Statistics for {col}",
                        "data": {
                            "mean": float(series.mean()),
                            "median": float(series.median()),
                            "std": float(series.std()) if len(series) > 1 else 0,
                            "min": float(series.min()),
                            "max": float(series.max())
                        }
                    })
        
        # Categorical analysis
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            results["insights"].append(f"Found {len(categorical_cols)} categorical columns")

except Exception as e:
    results["error"] = str(e)
    results["output"] = f"Error: {str(e)}"

# Output results
print("__RESULTS_START__")
print(json.dumps(results))
print("__RESULTS_END__")
`;
  }

  /**
   * Parse analysis results from output
   */
  private parseAnalysisResults(output: string): {
    output: string;
    charts: any[];
    insights: string[];
  } {
    try {
      const resultsMatch = output.match(/__RESULTS_START__\s*\n(.*)\n__RESULTS_END__/s);
      if (resultsMatch) {
        const results = JSON.parse(resultsMatch[1]);
        return {
          output: results.output || '',
          charts: results.charts || [],
          insights: results.insights || []
        };
      }
    } catch (error) {
      logger.warn('[CloudExecutor] Failed to parse analysis results');
    }

    return {
      output: output,
      charts: [],
      insights: []
    };
  }

  /**
   * Check if cloud service is available
   */
  async checkServiceAvailability(service: string): Promise<boolean> {
    try {
      switch (service) {
        case 'judge0':
          const response = await fetch(`${this.judge0Url}/languages`, {
            headers: {
              'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || '',
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            }
          });
          return response.ok;
        
        case 'replit':
          return !!process.env.REPLIT_API_KEY;
        
        case 'sphere':
          return !!process.env.SPHERE_API_KEY;
        
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available services
   */
  async getAvailableServices(): Promise<string[]> {
    const services = ['judge0', 'replit', 'sphere'];
    const available = [];

    for (const service of services) {
      if (await this.checkServiceAvailability(service)) {
        available.push(service);
      }
    }

    return available;
  }
}

// Singleton instance
let cloudExecutor: CloudPythonExecutor | null = null;

export function getCloudPythonExecutor(): CloudPythonExecutor {
  if (!cloudExecutor) {
    cloudExecutor = new CloudPythonExecutor();
  }
  return cloudExecutor;
} 