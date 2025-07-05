/**
 * Docker-based Python Sandbox
 * Secure Python code execution using Docker containers
 * Alternative to browser-based Pyodide approach
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { logger } from '@/memory-framework/config';

export interface DockerExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  charts?: any[];
  insights?: string[];
}

export class DockerPythonSandbox {
  private readonly tempDir: string;
  private readonly dockerImage: string;
  private readonly timeout: number;

  constructor(options: {
    tempDir?: string;
    dockerImage?: string;
    timeout?: number;
  } = {}) {
    this.tempDir = options.tempDir || '/tmp/python-sandbox';
    this.dockerImage = options.dockerImage || 'python:3.11-slim';
    this.timeout = options.timeout || 30000; // 30 seconds
  }

  /**
   * Execute Python code in a secure Docker container
   */
  async executeCode(code: string, data: any[] = []): Promise<DockerExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();
    const workspaceDir = join(this.tempDir, executionId);

    try {
      logger.info(`[DockerSandbox] Starting execution: ${executionId}`);

      // Create workspace
      await this.createWorkspace(workspaceDir, code, data);

      // Execute in Docker
      const result = await this.runDockerContainer(workspaceDir, executionId);

      // Parse results
      const parsedResult = await this.parseResults(workspaceDir, result);

      return {
        success: true,
        output: parsedResult.output,
        executionTime: Date.now() - startTime,
        charts: parsedResult.charts,
        insights: parsedResult.insights
      };

    } catch (error: any) {
      logger.error(`[DockerSandbox] Execution failed: ${error.message}`);
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime
      };
    } finally {
      // Cleanup workspace
      await this.cleanup(workspaceDir);
    }
  }

  /**
   * Create isolated workspace with code and data
   */
  private async createWorkspace(workspaceDir: string, code: string, data: any[]): Promise<void> {
    await fs.mkdir(workspaceDir, { recursive: true });

    // Write data file
    const dataFile = join(workspaceDir, 'data.json');
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));

    // Write analysis script
    const analysisScript = this.generateAnalysisScript(code);
    const scriptFile = join(workspaceDir, 'analysis.py');
    await fs.writeFile(scriptFile, analysisScript);

    // Write requirements file
    const requirements = [
      'pandas>=2.0.0',
      'numpy>=1.24.0',
      'matplotlib>=3.7.0',
      'scipy>=1.10.0',
      'seaborn>=0.12.0'
    ].join('\n');
    const reqFile = join(workspaceDir, 'requirements.txt');
    await fs.writeFile(reqFile, requirements);
  }

  /**
   * Generate Python analysis script with user code
   */
  private generateAnalysisScript(userCode: string): string {
    return `#!/usr/bin/env python3
import json
import sys
import traceback
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from io import StringIO
import warnings
warnings.filterwarnings('ignore')

# Global results object
results = {
    "output": "",
    "charts": [],
    "insights": [],
    "success": False,
    "error": None
}

def capture_output():
    """Capture stdout for analysis"""
    old_stdout = sys.stdout
    sys.stdout = captured_output = StringIO()
    return old_stdout, captured_output

def restore_output(old_stdout, captured_output):
    """Restore stdout and get captured text"""
    sys.stdout = old_stdout
    return captured_output.getvalue()

try:
    # Load data
    with open('data.json', 'r') as f:
        input_data = json.load(f)
    
    # Create DataFrame if data exists
    if input_data:
        df = pd.DataFrame(input_data)
        print(f"Loaded dataset with {len(df)} rows and {len(df.columns)} columns")
    else:
        df = pd.DataFrame()
        print("No input data provided")
    
    # Capture output during user code execution
    old_stdout, captured_output = capture_output()
    
    # Execute user code
    exec("""${userCode.replace(/"/g, '\\"').replace(/\n/g, '\\n')}""")
    
    # Restore output
    user_output = restore_output(old_stdout, captured_output)
    results["output"] = user_output
    results["success"] = True
    
    # Automatic analysis if DataFrame exists
    if not df.empty:
        # Basic insights
        results["insights"].append(f"Dataset contains {len(df)} rows and {len(df.columns)} columns")
        
        # Numeric analysis
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            results["insights"].append(f"Found {len(numeric_cols)} numeric columns")
            
            # Generate statistics for each numeric column
            for col in numeric_cols[:3]:  # Limit to first 3 columns
                series = df[col].dropna()
                if len(series) > 0:
                    stats_data = {
                        "type": "statistics",
                        "title": f"Statistics for {col}",
                        "data": {
                            "mean": float(series.mean()),
                            "median": float(series.median()),
                            "std": float(series.std()) if len(series) > 1 else 0,
                            "min": float(series.min()),
                            "max": float(series.max()),
                            "count": int(len(series))
                        }
                    }
                    results["charts"].append(stats_data)
                    
                    # Check for outliers
                    Q1 = series.quantile(0.25)
                    Q3 = series.quantile(0.75)
                    IQR = Q3 - Q1
                    outliers = series[(series < Q1 - 1.5 * IQR) | (series > Q3 + 1.5 * IQR)]
                    if len(outliers) > 0:
                        results["insights"].append(f"{col}: {len(outliers)} outliers detected ({len(outliers)/len(series)*100:.1f}%)")
        
        # Categorical analysis
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            results["insights"].append(f"Found {len(categorical_cols)} categorical columns")
            
            for col in categorical_cols[:2]:  # Limit to first 2 columns
                value_counts = df[col].value_counts().head(5)
                if len(value_counts) > 0:
                    chart_data = {
                        "type": "categorical",
                        "title": f"Top 5 values in {col}",
                        "data": {
                            "categories": value_counts.index.tolist(),
                            "values": value_counts.values.tolist()
                        }
                    }
                    results["charts"].append(chart_data)
        
        # Correlation analysis
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            strong_correlations = []
            
            for i in range(len(corr_matrix.columns)):
                for j in range(i+1, len(corr_matrix.columns)):
                    corr_val = corr_matrix.iloc[i, j]
                    if abs(corr_val) > 0.7:
                        strong_correlations.append({
                            "var1": corr_matrix.columns[i],
                            "var2": corr_matrix.columns[j],
                            "correlation": float(corr_val)
                        })
            
            if strong_correlations:
                results["charts"].append({
                    "type": "correlation",
                    "title": "Strong Correlations",
                    "data": strong_correlations
                })
                
                for corr in strong_correlations:
                    results["insights"].append(f"Strong correlation between {corr['var1']} and {corr['var2']}: {corr['correlation']:.2f}")

except Exception as e:
    results["error"] = str(e)
    results["output"] = f"Error: {str(e)}\\n{traceback.format_exc()}"
    print(f"Execution error: {str(e)}", file=sys.stderr)

# Output results
with open('results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("Analysis complete. Results saved to results.json")
`;
  }

  /**
   * Run Docker container with security restrictions
   */
  private async runDockerContainer(workspaceDir: string, executionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const dockerArgs = [
        'run',
        '--rm',                           // Remove container after execution
        '--read-only',                    // Read-only filesystem
        '--tmpfs', '/tmp:noexec,nosuid,size=100m', // Temporary filesystem
        '--memory=512m',                  // Memory limit
        '--cpus=0.5',                     // CPU limit
        '--network=none',                 // No network access
        '--user=1000:1000',              // Non-root user
        '--workdir=/workspace',           // Working directory
        '-v', `${workspaceDir}:/workspace`, // Mount workspace
        '--name', `python-sandbox-${executionId}`, // Container name
        this.dockerImage,                 // Docker image
        'sh', '-c',                       // Shell command
        'pip install --quiet -r requirements.txt && python analysis.py'
      ];

      logger.info(`[DockerSandbox] Running: docker ${dockerArgs.join(' ')}`);

      const docker = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      docker.stdout?.on('data', (data) => {
        output += data.toString();
      });

      docker.stderr?.on('data', (data) => {
        error += data.toString();
      });

      // Timeout handling
      const timeout = setTimeout(() => {
        docker.kill('SIGKILL');
        reject(new Error(`Execution timeout after ${this.timeout}ms`));
      }, this.timeout);

      docker.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Docker execution failed with code ${code}: ${error}`));
        }
      });

      docker.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Docker spawn error: ${err.message}`));
      });
    });
  }

  /**
   * Parse execution results from workspace
   */
  private async parseResults(workspaceDir: string, output: string): Promise<{
    output: string;
    charts: any[];
    insights: string[];
  }> {
    try {
      const resultsFile = join(workspaceDir, 'results.json');
      const resultsContent = await fs.readFile(resultsFile, 'utf-8');
      const results = JSON.parse(resultsContent);
      
      return {
        output: results.output || output,
        charts: results.charts || [],
        insights: results.insights || []
      };
    } catch (error) {
      // Fallback to basic output if results file doesn't exist
      return {
        output: output,
        charts: [],
        insights: []
      };
    }
  }

  /**
   * Cleanup workspace directory
   */
  private async cleanup(workspaceDir: string): Promise<void> {
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
      logger.info(`[DockerSandbox] Cleaned up workspace: ${workspaceDir}`);
    } catch (error: any) {
      logger.warn(`[DockerSandbox] Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Check if Docker is available
   */
  async checkDockerAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const docker = spawn('docker', ['--version'], { stdio: 'pipe' });
      
      docker.on('close', (code) => {
        resolve(code === 0);
      });
      
      docker.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Pull required Docker image
   */
  async pullDockerImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`[DockerSandbox] Pulling Docker image: ${this.dockerImage}`);
      
      const docker = spawn('docker', ['pull', this.dockerImage], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      docker.on('close', (code) => {
        if (code === 0) {
          logger.info(`[DockerSandbox] Successfully pulled image: ${this.dockerImage}`);
          resolve();
        } else {
          reject(new Error(`Failed to pull Docker image: ${this.dockerImage}`));
        }
      });

      docker.on('error', (err) => {
        reject(new Error(`Docker pull error: ${err.message}`));
      });
    });
  }
}

// Singleton instance
let dockerSandbox: DockerPythonSandbox | null = null;

export function getDockerPythonSandbox(): DockerPythonSandbox {
  if (!dockerSandbox) {
    dockerSandbox = new DockerPythonSandbox();
  }
  return dockerSandbox;
} 