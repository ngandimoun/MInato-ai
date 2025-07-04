"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  DollarSign, 
  Brain,
  FileBarChart,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Plus,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Camera,
  Image
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { logger } from "@/memory-framework/config";

interface DashboardSummary {
  documents: { total: number; pending: number; completed: number };
  transactions: { total: number; revenue: number; expenses: number };
  analyses: { total: number; completed: number };
  reports: { total: number; published: number };
}

interface RecentItem {
  id: string;
  title?: string;
  analysis_name?: string;
  description?: string;
  file_type?: string;
  content_type?: string;
  status?: string;
  amount?: number;
  currency?: string;
  transaction_type?: string;
  created_at: string;
  transaction_date?: string;
}

interface DashboardData {
  summary: DashboardSummary;
  recent_data: {
    documents: RecentItem[];
    analyses: RecentItem[];
    transactions: RecentItem[];
  };
}

export function InsightsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/insights/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      setData(result);

    } catch (error: any) {
      logger.error('[InsightsDashboard] Error:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16">
        <div className="relative mb-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse"></div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Loading Your Insights</h3>
        <p className="text-muted-foreground">Analyzing your data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDashboardData}
              className="w-fit"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <div className="p-4 bg-muted/50 rounded-full mx-auto w-fit mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
        <p className="text-muted-foreground mb-4">Upload some documents to get started with insights</p>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Upload Your First Document
        </Button>
      </div>
    );
  }

  const { summary, recent_data } = data;
  const netRevenue = summary.transactions.revenue - summary.transactions.expenses;
  const hasTransactions = summary.transactions.total > 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Your Business Insights</h2>
        <p className="text-muted-foreground">Here's what's happening with your data</p>
      </div>

      {/* Key Metrics - Enhanced Visual Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Documents Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {summary.documents.total}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="text-xs">
                {summary.documents.completed} analyzed
              </Badge>
              {summary.documents.pending > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.documents.pending} pending
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Revenue</CardTitle>
              </div>
              {hasTransactions && (
                <div className="flex items-center gap-1">
                  {netRevenue >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-1 ${
              netRevenue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {hasTransactions ? formatCurrency(netRevenue, 'USD') : '$0'}
            </div>
            <div className="text-sm text-muted-foreground">
              {hasTransactions 
                ? `${summary.transactions.total} transactions`
                : 'No transactions yet'
              }
            </div>
          </CardContent>
        </Card>

        {/* Analyses Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">AI Analyses</CardTitle>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {summary.analyses.total}
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.analyses.completed} completed
            </div>
          </CardContent>
        </Card>

        {/* Reports Card */}
        <Card className="relative overflow-hidden border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50/50 to-background dark:from-orange-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <FileBarChart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Reports</CardTitle>
              </div>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {summary.reports.total}
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.reports.published} published
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Recent Documents</CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recent_data.documents.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-muted/50 rounded-full mx-auto w-fit mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No documents uploaded yet</p>
                <Button variant="outline" size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Upload First File
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_data.documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-lg ${
                        doc.content_type === 'image' 
                          ? 'bg-purple-100 dark:bg-purple-900/30' 
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {doc.content_type === 'image' ? (
                          <Image className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={doc.status === 'completed' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {doc.status || 'processing'}
                        </Badge>
                        {doc.content_type === 'image' && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Camera className="h-3 w-3" />
                            Image
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {recent_data.documents.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    View All Documents
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Recent Analyses</CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recent_data.analyses.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-muted/50 rounded-full mx-auto w-fit mb-3">
                  <Brain className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No analyses yet</p>
                <p className="text-xs text-muted-foreground">Upload documents to start analyzing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_data.analyses.slice(0, 3).map((analysis) => (
                  <div key={analysis.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{analysis.analysis_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={analysis.status === 'completed' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {analysis.status || 'processing'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {recent_data.analyses.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    View All Analyses
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recent_data.transactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-muted/50 rounded-full mx-auto w-fit mb-3">
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No transactions yet</p>
                <p className="text-xs text-muted-foreground">Financial data will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_data.transactions.slice(0, 3).map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-lg ${
                        transaction.transaction_type === 'income' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <DollarSign className={`h-4 w-4 ${
                          transaction.transaction_type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{transaction.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.transaction_date || transaction.created_at).toLocaleDateString()}
                        </span>
                        <span className={`text-sm font-semibold ${
                          transaction.transaction_type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {transaction.transaction_type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount || 0, transaction.currency || 'USD')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {recent_data.transactions.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    View All Transactions
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 