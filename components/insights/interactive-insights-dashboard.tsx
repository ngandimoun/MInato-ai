"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart,
  Activity,
  Zap,
  Brain,
  Search,
  RefreshCw,
  Download,
  Maximize2,
  Eye,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'currency' | 'percentage' | 'number' | 'text';
  description?: string;
  target?: number;
  category: 'financial' | 'operational' | 'strategic' | 'risk';
}

interface DrillDownData {
  level: number;
  title: string;
  data: any[];
  filters: Record<string, any>;
  parentId?: string;
}

interface InsightAlert {
  id: string;
  type: 'opportunity' | 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  action?: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface DashboardProps {
  analysisResults?: any[];
  realTimeUpdates?: boolean;
  allowDrillDown?: boolean;
  customMetrics?: DashboardMetric[];
  onMetricClick?: (metric: DashboardMetric) => void;
  onExportDashboard?: () => void;
}

export function InteractiveInsightsDashboard({
  analysisResults = [],
  realTimeUpdates = false,
  allowDrillDown = true,
  customMetrics = [],
  onMetricClick,
  onExportDashboard
}: DashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [drillDownStack, setDrillDownStack] = useState<DrillDownData[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({
    timeRange: '30d',
    category: 'all',
    minimumConfidence: 0.7
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<InsightAlert[]>([]);

  // Calculate dashboard metrics from analysis results
  const dashboardMetrics = useMemo(() => {
    const baseMetrics: DashboardMetric[] = [
      {
        id: 'total_documents',
        title: 'Documents Analyzed',
        value: analysisResults.length,
        change: 12,
        changeType: 'increase',
        format: 'number',
        category: 'operational',
        description: 'Total number of documents processed in the current period'
      },
      {
        id: 'avg_confidence',
        title: 'Average Confidence',
        value: analysisResults.length > 0 
          ? (analysisResults.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / analysisResults.length * 100)
          : 0,
        format: 'percentage',
        category: 'operational',
        target: 90,
        description: 'Average confidence score across all analyses'
      },
      {
        id: 'processing_efficiency',
        title: 'Processing Efficiency',
        value: 94.2,
        change: 3.1,
        changeType: 'increase',
        format: 'percentage',
        category: 'operational',
        target: 95,
        description: 'System efficiency in processing documents'
      },
      {
        id: 'cost_savings',
        title: 'Identified Savings',
        value: '$127,450',
        change: 18.7,
        changeType: 'increase',
        format: 'text',
        category: 'financial',
        description: 'Potential cost savings identified through analysis'
      }
    ];

    return [...baseMetrics, ...customMetrics];
  }, [analysisResults, customMetrics]);

  // Generate smart insights and alerts
  useEffect(() => {
    const generateInsights = () => {
      const newInsights: InsightAlert[] = [];

      // Check for efficiency opportunities
      const lowConfidenceCount = analysisResults.filter(r => (r.confidence_score || 0) < 0.8).length;
      if (lowConfidenceCount > 0) {
        newInsights.push({
          id: 'low_confidence',
          type: 'warning',
          title: 'Low Confidence Detections',
          description: `${lowConfidenceCount} documents have confidence scores below 80%`,
          action: 'Review and improve data quality',
          impact: 'medium',
          timestamp: new Date().toISOString()
        });
      }

      // Check for processing trends
      const avgProcessingTime = analysisResults.reduce((sum, r) => sum + (r.processing_time || 0), 0) / analysisResults.length;
      if (avgProcessingTime > 30000) { // 30 seconds
        newInsights.push({
          id: 'slow_processing',
          type: 'opportunity',
          title: 'Processing Optimization Available',
          description: 'Average processing time could be improved',
          action: 'Consider upgrading processing pipeline',
          impact: 'low',
          timestamp: new Date().toISOString()
        });
      }

      // Check for data patterns
      const recentAnalyses = analysisResults.filter(r => 
        new Date(r.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      );
      
      if (recentAnalyses.length > analysisResults.length * 0.5) {
        newInsights.push({
          id: 'high_activity',
          type: 'info',
          title: 'High Analysis Activity',
          description: 'Document processing volume has increased significantly',
          impact: 'low',
          timestamp: new Date().toISOString()
        });
      }

      setInsights(newInsights);
    };

    if (analysisResults.length > 0) {
      generateInsights();
    }
  }, [analysisResults]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleDrillDown = (metric: DashboardMetric, data: any[]) => {
    if (!allowDrillDown) return;

    const newLevel: DrillDownData = {
      level: drillDownStack.length + 1,
      title: `${metric.title} - Detailed View`,
      data,
      filters: { ...filters },
      parentId: metric.id
    };

    setDrillDownStack([...drillDownStack, newLevel]);
  };

  const handleDrillUp = () => {
    setDrillDownStack(drillDownStack.slice(0, -1));
  };

  const getMetricIcon = (metric: DashboardMetric) => {
    switch (metric.category) {
      case 'financial': return <TrendingUp className="h-4 w-4" />;
      case 'operational': return <Activity className="h-4 w-4" />;
      case 'strategic': return <Target className="h-4 w-4" />;
      case 'risk': return <AlertTriangle className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase': return <ArrowUpRight className="h-3 w-3 text-green-500" />;
      case 'decrease': return <ArrowDownRight className="h-3 w-3 text-red-500" />;
      default: return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const formatMetricValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      default:
        return value.toString();
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-950/20';
      case 'warning': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20';
      case 'opportunity': return 'bg-green-50 border-green-200 dark:bg-green-950/20';
      default: return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'opportunity': return <Lightbulb className="h-4 w-4 text-green-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredMetrics = dashboardMetrics.filter(metric => {
    if (filters.category !== 'all' && metric.category !== filters.category) return false;
    if (searchQuery && !metric.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-xl">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            Interactive Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights and interactive data exploration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={onExportDashboard}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          {realTimeUpdates && (
            <Badge variant="secondary" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Updates
            </Badge>
          )}
        </div>
      </div>

      {/* Breadcrumb for drill-down navigation */}
      {drillDownStack.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDrillDownStack([])}>
            Overview
          </Button>
          {drillDownStack.map((level, index) => (
            <React.Fragment key={level.title}>
              <span className="text-muted-foreground">/</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDrillDownStack(drillDownStack.slice(0, index + 1))}
              >
                {level.title}
              </Button>
            </React.Fragment>
          ))}
          <Button variant="outline" size="sm" onClick={handleDrillUp}>
            Back
          </Button>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dashboard Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Metrics</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeRange">Time Range</Label>
              <Select value={filters.timeRange} onValueChange={(value) => setFilters({...filters, timeRange: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Min Confidence: {Math.round(filters.minimumConfidence * 100)}%</Label>
              <Slider
                id="confidence"
                min={0}
                max={1}
                step={0.1}
                value={[filters.minimumConfidence]}
                onValueChange={(value) => setFilters({...filters, minimumConfidence: value[0]})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights Alerts */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Smart Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <Alert key={insight.id} className={getInsightColor(insight.type)}>
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    {insight.action && (
                      <Button variant="outline" size="sm" className="mt-2">
                        {insight.action}
                      </Button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {insight.impact} impact
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredMetrics.map((metric) => (
          <Card 
            key={metric.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${allowDrillDown ? 'hover:border-primary' : ''}`}
            onClick={() => {
              onMetricClick?.(metric);
              if (allowDrillDown) {
                handleDrillDown(metric, analysisResults);
              }
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getMetricIcon(metric)}
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                </div>
                {allowDrillDown && <Maximize2 className="h-3 w-3 text-muted-foreground" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {formatMetricValue(metric.value, metric.format)}
                  </span>
                  {metric.change && (
                    <div className="flex items-center gap-1">
                      {getChangeIcon(metric.changeType)}
                      <span className={`text-xs ${
                        metric.changeType === 'increase' ? 'text-green-600' : 
                        metric.changeType === 'decrease' ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  )}
                </div>
                
                {metric.target && typeof metric.value === 'number' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress to target</span>
                      <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                    </div>
                    <Progress value={(metric.value / metric.target) * 100} className="h-1" />
                  </div>
                )}
                
                {metric.description && (
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="correlations">Patterns</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {drillDownStack.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{drillDownStack[drillDownStack.length - 1].title}</CardTitle>
                <CardDescription>
                  Detailed analysis of selected metric
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Drill-down View</h3>
                  <p className="text-sm text-muted-foreground">
                    Detailed analytics would be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Dashboard Overview
                </CardTitle>
                <CardDescription>
                  High-level metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Analytics Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    Main dashboard content and visualizations would be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Trend Visualizations</h3>
                <p className="text-sm text-muted-foreground">
                  Time-series charts and trend analysis would be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Pattern Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Correlation Patterns</h3>
                <p className="text-sm text-muted-foreground">
                  Smart correlation analysis and pattern detection would be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Predictive Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Future Predictions</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered predictions and forecasting would be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}