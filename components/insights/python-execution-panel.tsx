'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, BarChart3, Settings, Zap, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExecutionResult {
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

interface BenchmarkResult {
  available: boolean;
  success?: boolean;
  executionTime?: number;
  output?: string;
  error?: string;
}

export function PythonExecutionPanel() {
  const [code, setCode] = useState(`# Example: Analyze sample data
import pandas as pd
import numpy as np

# Create sample data
data = np.random.randn(100, 3)
df = pd.DataFrame(data, columns=['A', 'B', 'C'])

# Basic analysis
print("Dataset shape:", df.shape)
print("\\nSummary statistics:")
print(df.describe())

# Find correlations
correlations = df.corr()
print("\\nCorrelations:")
print(correlations)

# Generate insights
mean_a = df['A'].mean()
if mean_a > 0:
    print(f"\\nInsight: Column A has positive mean ({mean_a:.3f})")
else:
    print(f"\\nInsight: Column A has negative mean ({mean_a:.3f})")
`);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, BenchmarkResult>>({});
  const [performanceStats, setPerformanceStats] = useState<any>({});
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});
  const [preferredEngine, setPreferredEngine] = useState<string>('auto');

  // Load performance stats on mount
  useEffect(() => {
    loadPerformanceStats();
  }, []);

  const loadPerformanceStats = async () => {
    try {
      const response = await fetch('/api/insights/python-execution');
      if (response.ok) {
        const data = await response.json();
        setPerformanceStats(data.performanceStats || {});
        setRecommendations(data.recommendations || {});
      }
    } catch (error) {
      console.error('Failed to load performance stats:', error);
    }
  };

  const executeCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter Python code to execute');
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const response = await fetch('/api/insights/python-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          data: [], // Could be populated from uploaded data
          requirements: {
            preferredEngine: preferredEngine === 'auto' ? undefined : preferredEngine,
            securityLevel: 'high',
            fallbackAllowed: true,
            concurrent: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      const executionResult = await response.json();
      setResult(executionResult);

      if (executionResult.success) {
        toast.success(`Code executed successfully using ${executionResult.engine} engine`);
      } else {
        toast.error(`Execution failed: ${executionResult.error}`);
      }

      // Refresh performance stats
      await loadPerformanceStats();

    } catch (error: any) {
      toast.error(`Execution error: ${error.message}`);
      setResult({
        success: false,
        output: '',
        error: error.message,
        executionTime: 0,
        engine: 'none'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const runBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResults({});

    try {
      const response = await fetch('/api/insights/python-benchmark', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Benchmark failed: ${response.statusText}`);
      }

      const data = await response.json();
      setBenchmarkResults(data.benchmarkResults || {});
      setPerformanceStats(data.performanceStats || {});
      setRecommendations(data.recommendations || {});

      toast.success('Benchmark completed successfully');

    } catch (error: any) {
      toast.error(`Benchmark error: ${error.message}`);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const getEngineIcon = (engine: string) => {
    switch (engine) {
      case 'browser':
        return '🌐';
      case 'docker':
        return '🐳';
      case 'cloud':
        return '☁️';
      default:
        return '⚙️';
    }
  };

  const getEngineColor = (engine: string) => {
    switch (engine) {
      case 'browser':
        return 'bg-blue-100 text-blue-800';
      case 'docker':
        return 'bg-purple-100 text-purple-800';
      case 'cloud':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Python Sandbox Execution
          </CardTitle>
          <CardDescription>
            Execute Python code using intelligent engine selection across browser, Docker, and cloud sandboxes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="execute" className="space-y-4">
            <TabsList>
              <TabsTrigger value="execute">Execute Code</TabsTrigger>
              <TabsTrigger value="benchmark">Benchmark Engines</TabsTrigger>
              <TabsTrigger value="stats">Performance Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="execute" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Preferred Engine:</label>
                    <Select value={preferredEngine} onValueChange={setPreferredEngine}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">🤖 Auto (Smart Selection)</SelectItem>
                        <SelectItem value="browser">🌐 Browser (Pyodide)</SelectItem>
                        <SelectItem value="docker">🐳 Docker Container</SelectItem>
                        <SelectItem value="cloud">☁️ Cloud (Judge0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={executeCode} 
                    disabled={isExecuting}
                    className="min-w-[120px]"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Execute
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium">Python Code:</label>
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter your Python code here..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                {result && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          )}
                          Execution Result
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getEngineColor(result.engine)}>
                            {getEngineIcon(result.engine)} {result.engine}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {result.executionTime}ms
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.error ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-4">
                          {result.output && (
                            <div>
                              <h4 className="font-medium mb-2">Output:</h4>
                              <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-60">
                                {result.output}
                              </pre>
                            </div>
                          )}

                          {result.insights && result.insights.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Insights:</h4>
                              <ul className="space-y-1">
                                {result.insights.map((insight, index) => (
                                  <li key={index} className="text-sm text-gray-600">
                                    • {insight}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.metadata && (
                            <div className="text-xs text-gray-500 border-t pt-2">
                              <p>Engine selection: {result.metadata.engineSelection}</p>
                              <p>Performance score: {result.metadata.performanceScore}/100</p>
                              {result.metadata.fallbackUsed && (
                                <p className="text-orange-600">⚠️ Fallback engine was used</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="benchmark" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Engine Benchmark</h3>
                  <p className="text-sm text-gray-600">Test all available Python execution engines</p>
                </div>
                <Button 
                  onClick={runBenchmark} 
                  disabled={isBenchmarking}
                  variant="outline"
                >
                  {isBenchmarking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Run Benchmark
                    </>
                  )}
                </Button>
              </div>

              {Object.keys(benchmarkResults).length > 0 && (
                <div className="grid gap-4">
                  {Object.entries(benchmarkResults).map(([engine, result]) => (
                    <Card key={engine}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getEngineIcon(engine)}</span>
                            <div>
                              <h4 className="font-medium capitalize">{engine} Engine</h4>
                              <p className="text-sm text-gray-600">
                                {result.available ? 'Available' : 'Not Available'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {result.available && result.success ? (
                              <div className="space-y-1">
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Success
                                </Badge>
                                <p className="text-xs text-gray-600">
                                  {result.executionTime}ms
                                </p>
                              </div>
                            ) : result.available ? (
                              <Badge variant="destructive">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Failed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Unavailable</Badge>
                            )}
                          </div>
                        </div>
                        {result.error && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertDescription className="text-xs">
                              {result.error}
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-4">Performance Statistics</h3>
                
                {Object.keys(performanceStats).length > 0 ? (
                  <div className="grid gap-4">
                    {Object.entries(performanceStats).map(([engine, stats]: [string, any]) => (
                      <Card key={engine}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getEngineIcon(engine)}</span>
                              <h4 className="font-medium capitalize">{engine}</h4>
                            </div>
                            <Badge className={getEngineColor(engine)}>
                              Score: {stats.performanceScore || 0}/100
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Executions</p>
                              <p className="font-medium">{stats.totalExecutions || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Success Rate</p>
                              <p className="font-medium">
                                {((stats.successRate || 0) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Avg Time</p>
                              <p className="font-medium">
                                {(stats.avgExecutionTime || 0).toFixed(0)}ms
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">No performance data available yet.</p>
                      <p className="text-sm text-gray-500">Execute some code to see statistics.</p>
                    </CardContent>
                  </Card>
                )}

                {Object.keys(recommendations).length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(recommendations).map(([useCase, recommendation]) => (
                          <div key={useCase} className="border-l-4 border-blue-200 pl-4">
                            <h5 className="font-medium text-sm">{useCase}</h5>
                            <p className="text-sm text-gray-600">{recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 