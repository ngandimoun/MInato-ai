#!/usr/bin/env tsx

/**
 * Comprehensive Test Suite for Python Sandbox Migration
 * Tests all engines, fallback systems, and performance monitoring
 */

import { getSmartPythonExecutor, ExecutionRequirements } from '../lib/services/SmartPythonExecutor';
import { PythonSandboxEngine } from '../lib/services/PythonSandboxEngine';
import { DockerPythonSandbox } from '../lib/services/DockerPythonSandbox';
import { getCloudPythonExecutor } from '../lib/services/CloudPythonExecutor';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class PythonMigrationTester {
  private results: TestResult[] = [];
  private smartExecutor = getSmartPythonExecutor();

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Python Sandbox Migration Tests...\n');

    // Test individual engines
    await this.testBrowserEngine();
    await this.testDockerEngine();
    await this.testCloudEngine();

    // Test smart executor
    await this.testSmartExecutor();
    await this.testEngineSelection();
    await this.testFallbackSystem();
    await this.testPerformanceMonitoring();

    // Test with real-world scenarios
    await this.testDataAnalysisScenarios();
    await this.testErrorHandling();
    await this.testBenchmarking();

    // Print results
    this.printResults();
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`⏳ Running: ${name}`);

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Passed: ${name} (${duration}ms)`);
      
      const testResult: TestResult = {
        name,
        success: true,
        duration,
        details: result
      };
      
      this.results.push(testResult);
      return testResult;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.log(`❌ Failed: ${name} (${duration}ms) - ${error.message}`);
      
      const testResult: TestResult = {
        name,
        success: false,
        duration,
        error: error.message
      };
      
      this.results.push(testResult);
      return testResult;
    }
  }

  private async testBrowserEngine(): Promise<void> {
    await this.runTest('Browser Engine - Basic Execution', async () => {
      const engine = new PythonSandboxEngine();
      const result = await engine.executeDataAnalysis([
        { name: 'Alice', age: 30, salary: 50000 },
        { name: 'Bob', age: 25, salary: 45000 },
        { name: 'Charlie', age: 35, salary: 60000 }
      ]);

      if (!result.success) {
        throw new Error(`Browser engine failed: ${result.error}`);
      }

      return {
        executionTime: result.executionTime,
        hasOutput: !!result.output,
        hasCharts: result.charts && result.charts.length > 0,
        hasInsights: result.insights && result.insights.length > 0
      };
    });
  }

  private async testDockerEngine(): Promise<void> {
    await this.runTest('Docker Engine - Availability Check', async () => {
      const engine = new DockerPythonSandbox();
      const isAvailable = await engine.checkDockerAvailability();
      
      return { dockerAvailable: isAvailable };
    });

    await this.runTest('Docker Engine - Code Execution', async () => {
      const engine = new DockerPythonSandbox();
      const isAvailable = await engine.checkDockerAvailability();
      
      if (!isAvailable) {
        throw new Error('Docker not available - skipping execution test');
      }

      const result = await engine.executeCode(`
import pandas as pd
import numpy as np

# Simple test
data = [1, 2, 3, 4, 5]
mean = np.mean(data)
print(f"Mean: {mean}")
print("Docker execution successful!")
      `);

      if (!result.success) {
        throw new Error(`Docker execution failed: ${result.error}`);
      }

      return {
        executionTime: result.executionTime,
        output: result.output
      };
    });
  }

  private async testCloudEngine(): Promise<void> {
    await this.runTest('Cloud Engine - Service Availability', async () => {
      const engine = getCloudPythonExecutor();
      const availableServices = await engine.getAvailableServices();
      
      return { 
        availableServices,
        hasJudge0: availableServices.includes('judge0'),
        hasReplit: availableServices.includes('replit')
      };
    });

    await this.runTest('Cloud Engine - Code Execution', async () => {
      const engine = getCloudPythonExecutor();
      const availableServices = await engine.getAvailableServices();
      
      if (availableServices.length === 0) {
        throw new Error('No cloud services available - configure API keys');
      }

      const result = await engine.executeCode(`
print("Cloud execution test")
import json
result = {"status": "success", "message": "Cloud execution working"}
print(json.dumps(result))
      `);

      if (!result.success) {
        throw new Error(`Cloud execution failed: ${result.error}`);
      }

      return {
        service: result.service,
        executionTime: result.executionTime,
        output: result.output
      };
    });
  }

  private async testSmartExecutor(): Promise<void> {
    await this.runTest('Smart Executor - Basic Execution', async () => {
      const result = await this.smartExecutor.executeCode(`
print("Smart Executor Test")
import pandas as pd

# Create test data
data = {"A": [1, 2, 3], "B": [4, 5, 6]}
df = pd.DataFrame(data)
print(f"DataFrame shape: {df.shape}")
print("Test completed successfully!")
      `);

      if (!result.success) {
        throw new Error(`Smart executor failed: ${result.error}`);
      }

      return {
        engine: result.engine,
        executionTime: result.executionTime,
        metadata: result.metadata
      };
    });
  }

  private async testEngineSelection(): Promise<void> {
    const engines = ['browser', 'docker', 'cloud'];
    
    for (const engine of engines) {
      await this.runTest(`Engine Selection - ${engine}`, async () => {
        const requirements: ExecutionRequirements = {
          preferredEngine: engine as any,
          fallbackAllowed: false
        };

        const result = await this.smartExecutor.executeCode(
          `print(f"Running on {engine} engine")`,
          [],
          requirements
        );

        return {
          requestedEngine: engine,
          actualEngine: result.engine,
          success: result.success,
          usedFallback: result.metadata?.fallbackUsed || false
        };
      });
    }
  }

  private async testFallbackSystem(): Promise<void> {
    await this.runTest('Fallback System - Docker to Browser', async () => {
      const requirements: ExecutionRequirements = {
        preferredEngine: 'docker',
        fallbackAllowed: true
      };

      const result = await this.smartExecutor.executeCode(
        'print("Testing fallback system")',
        [],
        requirements
      );

      return {
        success: result.success,
        engine: result.engine,
        fallbackUsed: result.metadata?.fallbackUsed || false,
        engineSelection: result.metadata?.engineSelection
      };
    });
  }

  private async testPerformanceMonitoring(): Promise<void> {
    await this.runTest('Performance Monitoring', async () => {
      // Execute a few operations to generate stats
      for (let i = 0; i < 3; i++) {
        await this.smartExecutor.executeCode(`print(f"Performance test {i + 1}")`);
      }

      const stats = this.smartExecutor.getPerformanceStats();
      const recommendations = this.smartExecutor.getRecommendations();

      return {
        hasStats: Object.keys(stats).length > 0,
        engines: Object.keys(stats),
        hasRecommendations: Object.keys(recommendations).length > 0,
        stats
      };
    });
  }

  private async testDataAnalysisScenarios(): Promise<void> {
    const testData = [
      { date: '2024-01-01', sales: 1000, region: 'North', product: 'A' },
      { date: '2024-01-02', sales: 1200, region: 'South', product: 'B' },
      { date: '2024-01-03', sales: 800, region: 'East', product: 'A' },
      { date: '2024-01-04', sales: 1500, region: 'West', product: 'C' },
      { date: '2024-01-05', sales: 900, region: 'North', product: 'B' }
    ];

    await this.runTest('Data Analysis - Sales Analytics', async () => {
      const analysisCode = `
import pandas as pd
import numpy as np

# Analyze sales data
df = pd.DataFrame(data)
print("Sales Analysis Report")
print("=" * 30)

# Basic statistics
total_sales = df['sales'].sum()
avg_sales = df['sales'].mean()
print(f"Total Sales: ${total_sales:,.2f}")
print(f"Average Sales: ${avg_sales:,.2f}")

# Sales by region
region_sales = df.groupby('region')['sales'].sum().sort_values(ascending=False)
print("\\nSales by Region:")
for region, sales in region_sales.items():
    print(f"  {region}: ${sales:,.2f}")

# Product performance
product_sales = df.groupby('product')['sales'].sum().sort_values(ascending=False)
print("\\nProduct Performance:")
for product, sales in product_sales.items():
    print(f"  Product {product}: ${sales:,.2f}")

print("\\nAnalysis completed successfully!")
      `;

      const result = await this.smartExecutor.executeCode(analysisCode, testData);

      if (!result.success) {
        throw new Error(`Data analysis failed: ${result.error}`);
      }

      return {
        engine: result.engine,
        executionTime: result.executionTime,
        outputLength: result.output.length,
        hasInsights: result.insights && result.insights.length > 0
      };
    });
  }

  private async testErrorHandling(): Promise<void> {
    await this.runTest('Error Handling - Syntax Error', async () => {
      const result = await this.smartExecutor.executeCode(`
# Intentional syntax error
print("Starting test"
# Missing closing parenthesis
      `);

      // Should fail gracefully
      if (result.success) {
        throw new Error('Expected syntax error but execution succeeded');
      }

      return {
        errorHandled: !result.success,
        hasErrorMessage: !!result.error,
        engine: result.engine
      };
    });

    await this.runTest('Error Handling - Runtime Error', async () => {
      const result = await this.smartExecutor.executeCode(`
print("Starting test")
# Runtime error - division by zero
result = 1 / 0
print("This should not print")
      `);

      return {
        errorHandled: !result.success,
        hasErrorMessage: !!result.error,
        engine: result.engine
      };
    });
  }

  private async testBenchmarking(): Promise<void> {
    await this.runTest('Benchmarking - All Engines', async () => {
      const benchmark = await this.smartExecutor.benchmarkEngines();

      return {
        engines: Object.keys(benchmark),
        availableEngines: Object.entries(benchmark)
          .filter(([_, result]: [string, any]) => result.available)
          .map(([engine, _]) => engine),
        successfulEngines: Object.entries(benchmark)
          .filter(([_, result]: [string, any]) => result.success)
          .map(([engine, _]) => engine)
      };
    });
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 PYTHON SANDBOX MIGRATION TEST RESULTS');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log(`\n📊 Summary: ${passed}/${total} tests passed (${failed} failed)`);
    console.log(`⏱️  Total execution time: ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   • ${r.name}: ${r.error}`);
        });
    }

    console.log('\n✅ Passed Tests:');
    this.results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`   • ${r.name} (${r.duration}ms)`);
      });

    // Performance summary
    const performanceTests = this.results.filter(r => 
      r.success && r.details && r.details.engine
    );

    if (performanceTests.length > 0) {
      console.log('\n🚀 Engine Performance:');
      const engineStats = performanceTests.reduce((stats, test) => {
        const engine = test.details.engine;
        if (!stats[engine]) {
          stats[engine] = { count: 0, totalTime: 0 };
        }
        stats[engine].count++;
        stats[engine].totalTime += test.duration;
        return stats;
      }, {} as Record<string, { count: number; totalTime: number }>);

      Object.entries(engineStats).forEach(([engine, stats]) => {
        const avgTime = stats.totalTime / stats.count;
        console.log(`   • ${engine}: ${stats.count} executions, avg ${avgTime.toFixed(0)}ms`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Migration is successful.');
    } else {
      console.log('⚠️  Some tests failed. Review the errors above.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PythonMigrationTester();
  tester.runAllTests().catch(console.error);
}

export { PythonMigrationTester }; 