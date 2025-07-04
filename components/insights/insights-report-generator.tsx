"use client";

import React, { useState } from "react";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  PieChart,
  ArrowRight,
  Download,
  Share2,
  Filter,
  Calendar,
  MapPin,
  Zap,
  Lightbulb,
  Activity,
  Package,
  CreditCard,
  Receipt,
  Image as ImageIcon,
  Sparkles,
  Brain,
  Eye,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InteractiveChartRenderer, ChartDashboard } from './interactive-chart-renderer';

interface BatchAnalysisResult {
  analysisId: string;
  insights: {
    executive_summary: string;
    key_findings: string[];
    financial_insights?: {
      summary: {
        total_expenses: number;
        total_revenue: number;
        net_amount: number;
        transaction_count: number;
        date_range: string;
      };
      transactions: Array<{
        type: 'expense' | 'revenue';
        amount: number;
        vendor: string;
        date: string;
        category: string;
        description: string;
      }>;
      insights: {
        top_expenses: string[];
        frequent_vendors: string[];
        spending_patterns: string;
        recommendations: string[];
      };
    };
    correlations: {
      summary: string;
      temporal_patterns: Array<{
        pattern: string;
        documents: string[];
        significance: string;
      }>;
      content_relationships: Array<{
        theme: string;
        documents: string[];
        connection: string;
      }>;
      financial_connections: Array<{
        type: string;
        documents: string[];
        impact: string;
      }>;
      business_insights: string[];
    };
    recommendations: Array<{
      category: string;
      action: string;
      impact: string;
      difficulty: 'Low' | 'Medium' | 'High';
      timeline: string;
      priority: 'High' | 'Medium' | 'Low';
    }>;
    document_count: number;
    visualizations?: any[];
    python_analytics?: any;
  };
}

interface ReportGeneratorProps {
  analysisResult: BatchAnalysisResult;
  onExport?: (format: 'pdf' | 'excel' | 'json') => void;
  onShare?: () => void;
}

const priorityColors = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
};

const difficultyIcons = {
  Low: <CheckCircle className="h-4 w-4 text-green-500" />,
  Medium: <Clock className="h-4 w-4 text-yellow-500" />,
  High: <AlertTriangle className="h-4 w-4 text-red-500" />
};

const categoryColors = {
  'IMMEDIATE ACTIONS': 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
  'SHORT-TERM GOALS': 'border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
  'LONG-TERM STRATEGY': 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
  'COST OPTIMIZATION': 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
  'REVENUE OPPORTUNITIES': 'border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20',
  'RISK MITIGATION': 'border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20'
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function InsightsReportGenerator({ analysisResult, onExport, onShare }: ReportGeneratorProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { insights } = analysisResult;
  const financialData = insights.financial_insights;
  const correlations = insights.correlations;
  const recommendations = insights.recommendations;

  const getHealthScore = (): number => {
    let score = 70; // Base score
    
    if (financialData) {
      // Positive cash flow increases score
      if (financialData.summary.net_amount > 0) score += 20;
      else if (financialData.summary.net_amount < 0) score -= 10;
      
      // Revenue vs expenses ratio
      const ratio = financialData.summary.total_revenue / (financialData.summary.total_expenses || 1);
      if (ratio > 1.2) score += 10;
      else if (ratio < 0.8) score -= 10;
    }
    
    // High priority recommendations reduce score
    const highPriorityCount = recommendations.filter(r => r.priority === 'High').length;
    score -= highPriorityCount * 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const healthScore = getHealthScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-xl">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            Business Intelligence Report
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analysis of {insights.document_count} business documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onExport?.('pdf')} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => onExport?.('excel')} className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={onShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share Report
          </Button>
        </div>
      </div>

      {/* Health Score & Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Business Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${healthScore}, 100`}
                    className="text-primary opacity-75"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{healthScore}</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold">{healthScore}%</p>
                <p className="text-xs text-muted-foreground">
                  {healthScore >= 80 ? 'Excellent' : 
                   healthScore >= 60 ? 'Good' : 
                   healthScore >= 40 ? 'Fair' : 'Needs Attention'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {financialData && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialData.summary.total_revenue)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {financialData.transactions.filter(t => t.type === 'revenue').length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(financialData.summary.total_expenses)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {financialData.transactions.filter(t => t.type === 'expense').length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className={`h-5 w-5 ${financialData.summary.net_amount >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={`text-2xl font-bold ${financialData.summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financialData.summary.net_amount)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {financialData.summary.date_range}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="visualizations">Charts</TabsTrigger>
          <TabsTrigger value="correlations">Patterns</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{insights.executive_summary}</p>
            </CardContent>
          </Card>

          {/* Key Findings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Key Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.key_findings.map((finding, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>
                    <p className="text-sm">{finding}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Recommendations Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Priority Actions
              </CardTitle>
              <CardDescription>
                Most important recommendations that need immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations
                  .filter(r => r.priority === 'High')
                  .slice(0, 3)
                  .map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-lg bg-red-50/50 dark:bg-red-950/20">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{rec.action}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{rec.impact}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {rec.timeline}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rec.difficulty} effort
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setActiveTab('recommendations')}
                >
                  View All Recommendations
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {financialData ? (
            <>
              {/* Financial Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Cash Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Revenue</span>
                        <span className="text-sm font-medium text-green-600">
                          +{formatCurrency(financialData.summary.total_revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Expenses</span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatCurrency(financialData.summary.total_expenses)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="font-medium">Net Flow</span>
                        <span className={`font-bold ${financialData.summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {financialData.summary.net_amount >= 0 ? '+' : ''}{formatCurrency(financialData.summary.net_amount)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Top Expense Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {financialData.insights.top_expenses.slice(0, 4).map((category, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm">{category}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Frequent Vendors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {financialData.insights.frequent_vendors.slice(0, 4).map((vendor, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{vendor}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Spending Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Spending Patterns & Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed mb-4">{financialData.insights.spending_patterns}</p>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Financial Recommendations:</h4>
                    <ul className="space-y-1">
                      {financialData.insights.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financialData.transactions.slice(0, 8).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {transaction.type === 'revenue' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <Receipt className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <h4 className="font-medium text-sm">{transaction.vendor}</h4>
                            <p className="text-xs text-muted-foreground">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">{transaction.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'revenue' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {transaction.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center p-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Financial Data</h3>
                <p className="text-sm text-muted-foreground">
                  Upload receipts, invoices, or financial documents to see financial analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="visualizations" className="space-y-6">
          {/* Interactive Data Visualizations */}
          {insights.visualizations && insights.visualizations.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Interactive Data Visualizations
                  </CardTitle>
                  <CardDescription>
                    AI-generated charts and visualizations based on your data analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartDashboard 
                    charts={insights.visualizations}
                    title=""
                    layout="grid"
                    columns={2}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Data Visualizations
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <PieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Visualizations Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Charts and visualizations will appear here once sufficient data patterns are detected
                </p>
                <Button variant="outline" onClick={() => setActiveTab('correlations')}>
                  View Pattern Analysis
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Python Analytics Results */}
          {insights.python_analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Advanced Analytics
                </CardTitle>
                <CardDescription>
                  Statistical analysis and machine learning insights powered by Python
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.python_analytics.insights && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Key Statistical Insights:</h4>
                      <ul className="space-y-1">
                        {insights.python_analytics.insights.map((insight: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <Sparkles className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insights.python_analytics.recommendations && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Data Science Recommendations:</h4>
                      <ul className="space-y-1">
                        {insights.python_analytics.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <ArrowRight className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.python_analytics.results && (
                    <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Statistical Summary:</h4>
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(insights.python_analytics.results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          {/* Correlations Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Pattern Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{correlations.summary}</p>
            </CardContent>
          </Card>

          {/* Temporal Patterns */}
          {correlations.temporal_patterns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timing Patterns
                </CardTitle>
                <CardDescription>
                  Time-based correlations and recurring patterns in your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {correlations.temporal_patterns.map((pattern, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">{pattern.pattern}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{pattern.significance}</p>
                      <div className="flex flex-wrap gap-1">
                        {pattern.documents.map((doc, docIndex) => (
                          <Badge key={docIndex} variant="secondary" className="text-xs">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Relationships */}
          {correlations.content_relationships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Content Relationships
                </CardTitle>
                <CardDescription>
                  Thematic connections and content similarities across documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {correlations.content_relationships.map((relationship, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">{relationship.theme}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{relationship.connection}</p>
                      <div className="flex flex-wrap gap-1">
                        {relationship.documents.map((doc, docIndex) => (
                          <Badge key={docIndex} variant="secondary" className="text-xs">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Connections */}
          {correlations.financial_connections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Connections
                </CardTitle>
                <CardDescription>
                  Financial relationships and monetary impacts across documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {correlations.financial_connections.map((connection, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">{connection.type}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{connection.impact}</p>
                      <div className="flex flex-wrap gap-1">
                        {connection.documents.map((doc, docIndex) => (
                          <Badge key={docIndex} variant="secondary" className="text-xs">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Key Business Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {correlations.business_insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Recommendations by Category */}
          {Object.entries(
            recommendations.reduce((groups, rec) => {
              const category = rec.category;
              if (!groups[category]) groups[category] = [];
              groups[category].push(rec);
              return groups;
            }, {} as Record<string, typeof recommendations>)
          ).map(([category, recs]) => (
            <Card key={category} className={categoryColors[category as keyof typeof categoryColors] || ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {category}
                </CardTitle>
                <CardDescription>
                  {recs.length} recommendation{recs.length !== 1 ? 's' : ''} in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recs.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-background/50">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-sm flex-1">{rec.action}</h4>
                        <div className="flex items-center gap-2 ml-4">
                          {difficultyIcons[rec.difficulty]}
                          <Badge className={priorityColors[rec.priority]}>
                            {rec.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rec.impact}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rec.timeline}
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {rec.difficulty} effort
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Analysis Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Analysis Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-bold text-2xl">{insights.document_count}</h4>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-bold text-2xl">{correlations.temporal_patterns.length}</h4>
                  <p className="text-sm text-muted-foreground">Time Patterns</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-bold text-2xl">{correlations.content_relationships.length}</h4>
                  <p className="text-sm text-muted-foreground">Content Links</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-bold text-2xl">{recommendations.length}</h4>
                  <p className="text-sm text-muted-foreground">Recommendations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
              <CardDescription>
                Download your analysis in different formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => onExport?.('pdf')} className="gap-2 h-auto p-4 flex-col">
                  <FileText className="h-8 w-8" />
                  <span className="font-medium">PDF Report</span>
                  <span className="text-xs text-muted-foreground">Formatted business report</span>
                </Button>
                <Button variant="outline" onClick={() => onExport?.('excel')} className="gap-2 h-auto p-4 flex-col">
                  <BarChart3 className="h-8 w-8" />
                  <span className="font-medium">Excel Workbook</span>
                  <span className="text-xs text-muted-foreground">Data and charts</span>
                </Button>
                <Button variant="outline" onClick={() => onExport?.('json')} className="gap-2 h-auto p-4 flex-col">
                  <FileText className="h-8 w-8" />
                  <span className="font-medium">JSON Data</span>
                  <span className="text-xs text-muted-foreground">Raw analysis data</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 