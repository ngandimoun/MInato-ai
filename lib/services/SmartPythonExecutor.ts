/**
 * Smart Python Executor
 * Intelligently routes Python execution to the best available sandbox
 * based on requirements, availability, and performance
 */

import { logger } from '@/memory-framework/config';
import { PythonSandboxEngine } from './PythonSandboxEngine';
import { DockerPythonSandbox } from './DockerPythonSandbox';
import { getCloudPythonExecutor, CloudExecutionOptions } from './CloudPythonExecutor';

export interface ExecutionRequirements {
  // Performance requirements
  maxExecutionTime?: number; // seconds
  maxMemoryUsage?: number; // MB
  cpuIntensive?: boolean;
  
  // Security requirements
  networkAccess?: boolean;
  fileSystemAccess?: boolean;
  securityLevel?: 'low' | 'medium' | 'high';
  
  // Feature requirements
  packages?: string[]; // Required Python packages
  dataSize?: number; // Size of input data in MB
  outputFormat?: 'text' | 'html' | 'json' | 'charts';
  
  // Execution preferences
  preferredEngine?: 'browser' | 'docker' | 'cloud';
  fallbackAllowed?: boolean;
  
  // User context
  userId?: string;
  concurrent?: boolean; // Multiple users executing simultaneously
}

export interface SmartExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  engine: string;
  charts?: any[];
  insights?: string[];
  metadata?: {
    engineSelection: string;
    fallbackUsed: boolean;
    performanceScore: number;
  };
}

export class SmartPythonExecutor {
  private browserEngine: PythonSandboxEngine;
  private dockerEngine: DockerPythonSandbox;
  private cloudEngine: ReturnType<typeof getCloudPythonExecutor>;
  
  // Performance tracking
  private performanceStats = new Map<string, {
    avgExecutionTime: number;
    successRate: number;
    totalExecutions: number;
  }>();

  constructor() {
    this.browserEngine = new PythonSandboxEngine();
    this.dockerEngine = new DockerPythonSandbox();
    this.cloudEngine = getCloudPythonExecutor();
  }

  /**
   * Execute Python code with intelligent engine selection
   */
  async executeCode(
    code: string,
    data: any[] = [],
    requirements: ExecutionRequirements = {}
  ): Promise<SmartExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.info(`[SmartExecutor] Starting execution: ${executionId}`);
      
      // Select best engine based on requirements
      const engineChoice = await this.selectBestEngine(requirements);
      logger.info(`[SmartExecutor] Selected engine: ${engineChoice.engine} (${engineChoice.reason})`);
      
      let result: SmartExecutionResult;
      let fallbackUsed = false;

      try {
        // Execute with selected engine
        result = await this.executeWithEngine(engineChoice.engine, code, data, requirements);
      } catch (error: any) {
        logger.warn(`[SmartExecutor] Primary engine failed: ${error.message}`);
        
        if (requirements.fallbackAllowed !== false) {
          // Try fallback engines
          const fallbackEngines = this.getFallbackEngines(engineChoice.engine);
          
          for (const fallbackEngine of fallbackEngines) {
            try {
              logger.info(`[SmartExecutor] Trying fallback engine: ${fallbackEngine}`);
              result = await this.executeWithEngine(fallbackEngine, code, data, requirements);
              fallbackUsed = true;
              break;
            } catch (fallbackError: any) {
              logger.warn(`[SmartExecutor] Fallback engine ${fallbackEngine} failed: ${fallbackError.message}`);
            }
          }
        }

        if (!result!) {
          throw error;
        }
      }

      // Add metadata
      result.metadata = {
        engineSelection: engineChoice.reason,
        fallbackUsed,
        performanceScore: this.calculatePerformanceScore(result.engine, result.executionTime)
      };

      // Update performance stats
      this.updatePerformanceStats(result.engine, result.executionTime, result.success);

      logger.info(`[SmartExecutor] Execution completed: ${executionId} in ${result.executionTime}ms`);
      return result;

    } catch (error: any) {
      logger.error(`[SmartExecutor] Execution failed: ${error.message}`);
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        engine: 'none',
        metadata: {
          engineSelection: 'failed',
          fallbackUsed: false,
          performanceScore: 0
        }
      };
    }
  }

  /**
   * Select the best engine based on requirements
   */
  private async selectBestEngine(requirements: ExecutionRequirements): Promise<{
    engine: string;
    reason: string;
  }> {
    // Check preferred engine first
    if (requirements.preferredEngine) {
      const available = await this.isEngineAvailable(requirements.preferredEngine);
      if (available) {
        return {
          engine: requirements.preferredEngine,
          reason: 'user preference'
        };
      }
    }

    // High security requirements -> Browser sandbox
    if (requirements.securityLevel === 'high' || 
        (!requirements.networkAccess && !requirements.fileSystemAccess)) {
      return {
        engine: 'browser',
        reason: 'high security requirements'
      };
    }

    // Large data or CPU intensive -> Docker
    if (requirements.cpuIntensive || 
        (requirements.dataSize && requirements.dataSize > 10) ||
        (requirements.maxMemoryUsage && requirements.maxMemoryUsage > 100)) {
      const dockerAvailable = await this.isEngineAvailable('docker');
      if (dockerAvailable) {
        return {
          engine: 'docker',
          reason: 'high performance requirements'
        };
      }
    }

    // Special packages or long execution -> Cloud
    if (requirements.packages && requirements.packages.length > 0 ||
        (requirements.maxExecutionTime && requirements.maxExecutionTime > 30)) {
      const cloudAvailable = await this.isEngineAvailable('cloud');
      if (cloudAvailable) {
        return {
          engine: 'cloud',
          reason: 'special package or long execution requirements'
        };
      }
    }

    // Multiple concurrent users -> Browser (scales best)
    if (requirements.concurrent) {
      return {
        engine: 'browser',
        reason: 'concurrent execution optimization'
      };
    }

    // Default: Browser (most reliable and secure)
    return {
      engine: 'browser',
      reason: 'default choice for reliability'
    };
  }

  /**
   * Execute with specific engine
   */
  private async executeWithEngine(
    engine: string,
    code: string,
    data: any[],
    requirements: ExecutionRequirements
  ): Promise<SmartExecutionResult> {
    const startTime = Date.now();

    switch (engine) {
      case 'browser':
        const browserResult = await this.browserEngine.executeDataAnalysis(data, 'comprehensive');
        return {
          success: browserResult.success,
          output: browserResult.output,
          error: browserResult.error,
          executionTime: Date.now() - startTime,
          engine: 'browser',
          charts: browserResult.charts,
          insights: browserResult.insights
        };

      case 'docker':
        const dockerResult = await this.dockerEngine.executeCode(code, data);
        return {
          success: dockerResult.success,
          output: dockerResult.output,
          error: dockerResult.error,
          executionTime: Date.now() - startTime,
          engine: 'docker',
          charts: dockerResult.charts,
          insights: dockerResult.insights
        };

      case 'cloud':
        const cloudOptions: CloudExecutionOptions = {
          service: 'judge0',
          timeout: requirements.maxExecutionTime ? requirements.maxExecutionTime * 1000 : 30000
        };
        const cloudResult = await this.cloudEngine.executeCode(code, data, cloudOptions);
        return {
          success: cloudResult.success,
          output: cloudResult.output,
          error: cloudResult.error,
          executionTime: cloudResult.executionTime,
          engine: 'cloud',
          charts: cloudResult.charts,
          insights: cloudResult.insights
        };

      default:
        throw new Error(`Unknown engine: ${engine}`);
    }
  }

  /**
   * Check if engine is available
   */
  private async isEngineAvailable(engine: string): Promise<boolean> {
    try {
      switch (engine) {
        case 'browser':
          return true; // Always available
        
        case 'docker':
          return await this.dockerEngine.checkDockerAvailability();
        
        case 'cloud':
          const availableServices = await this.cloudEngine.getAvailableServices();
          return availableServices.length > 0;
        
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get fallback engines for a primary engine
   */
  private getFallbackEngines(primaryEngine: string): string[] {
    switch (primaryEngine) {
      case 'docker':
        return ['cloud', 'browser'];
      case 'cloud':
        return ['docker', 'browser'];
      case 'browser':
        return ['docker', 'cloud'];
      default:
        return ['browser', 'docker', 'cloud'];
    }
  }

  /**
   * Calculate performance score for an engine
   */
  private calculatePerformanceScore(engine: string, executionTime: number): number {
    const stats = this.performanceStats.get(engine);
    if (!stats) return 50; // Default score

    // Score based on success rate (0-50) and speed (0-50)
    const successScore = stats.successRate * 50;
    const speedScore = Math.max(0, 50 - (executionTime / 1000) * 10); // Penalty for slow execution
    
    return Math.round(successScore + speedScore);
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(engine: string, executionTime: number, success: boolean): void {
    const stats = this.performanceStats.get(engine) || {
      avgExecutionTime: 0,
      successRate: 0,
      totalExecutions: 0
    };

    stats.totalExecutions++;
    stats.avgExecutionTime = (stats.avgExecutionTime * (stats.totalExecutions - 1) + executionTime) / stats.totalExecutions;
    stats.successRate = (stats.successRate * (stats.totalExecutions - 1) + (success ? 1 : 0)) / stats.totalExecutions;

    this.performanceStats.set(engine, stats);
  }

  /**
   * Get performance statistics for all engines
   */
  getPerformanceStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [engine, data] of this.performanceStats.entries()) {
      stats[engine] = {
        ...data,
        performanceScore: this.calculatePerformanceScore(engine, data.avgExecutionTime)
      };
    }

    return stats;
  }

  /**
   * Benchmark all available engines
   */
  async benchmarkEngines(): Promise<Record<string, any>> {
    const testCode = `
import pandas as pd
import numpy as np

# Simple computation test
data = np.random.randn(1000, 5)
df = pd.DataFrame(data, columns=['A', 'B', 'C', 'D', 'E'])
result = df.describe()
print("Benchmark completed successfully")
print(f"Mean of column A: {df['A'].mean():.4f}")
`;

    const engines = ['browser', 'docker', 'cloud'];
    const results: Record<string, any> = {};

    for (const engine of engines) {
      try {
        const available = await this.isEngineAvailable(engine);
        if (!available) {
          results[engine] = { available: false };
          continue;
        }

        const startTime = Date.now();
        const result = await this.executeWithEngine(engine, testCode, [], {});
        const endTime = Date.now();

        results[engine] = {
          available: true,
          success: result.success,
          executionTime: endTime - startTime,
          output: result.output?.substring(0, 100) + '...',
          error: result.error
        };

      } catch (error: any) {
        results[engine] = {
          available: true,
          success: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Get recommended engine for specific use cases
   */
  getRecommendations(): Record<string, string> {
    return {
      'Quick Analysis': 'browser - Fast startup, secure execution',
      'Large Dataset': 'docker - High memory and CPU resources',
      'Special Libraries': 'cloud - Access to extensive package ecosystem',
      'Production Use': 'docker - Reliable, isolated execution environment',
      'Educational': 'browser - Interactive, safe learning environment',
      'Concurrent Users': 'browser - Scales to unlimited users',
      'Long Running': 'cloud - No local resource constraints',
      'High Security': 'browser - Complete isolation in user browser'
    };
  }
}

// Singleton instance
let smartExecutor: SmartPythonExecutor | null = null;

export function getSmartPythonExecutor(): SmartPythonExecutor {
  if (!smartExecutor) {
    smartExecutor = new SmartPythonExecutor();
  }
  return smartExecutor;
} 