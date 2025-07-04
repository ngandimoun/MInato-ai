"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Calendar,
  Eye,
  Download,
  Share2,
  Plus,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Users,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/memory-framework/config";
import { ComparisonReportView } from "./comparison-report-view";

interface ReportDetailProps {
  reportId: string;
  onBack?: () => void;
  onAddData?: (reportId: string) => void;
}

interface ReportData {
  id: string;
  title: string;
  report_type: string;
  summary?: string;
  status: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  version: number;
  report_data: any;
  html_content?: string;
  is_scheduled: boolean;
}

export function ReportDetail({ reportId, onBack, onAddData }: ReportDetailProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingData, setAddingData] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/insights/reports/${reportId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.report) {
        setReport(data.report);
        // Increment view count
        await incrementViewCount();
        logger.info(`[ReportDetail] Loaded report: ${reportId}`);
      } else {
        throw new Error(data.error || 'Failed to fetch report');
      }

    } catch (error: any) {
      logger.error('[ReportDetail] Error fetching report:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await fetch(`/api/insights/reports/${reportId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Silent fail for view count
      logger.warn('[ReportDetail] Failed to increment view count');
    }
  };

  const handleAddData = async () => {
    if (!onAddData) return;
    
    setAddingData(true);
    try {
      onAddData(reportId);
    } finally {
      setAddingData(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      generating: { color: 'bg-blue-100 text-blue-800', label: 'Generating' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      archived: { color: 'bg-orange-100 text-orange-800', label: 'Archived' },
      published: { color: 'bg-purple-100 text-purple-800', label: 'Published' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge variant="secondary" className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const renderReportContent = () => {
    if (!report?.report_data) return null;

    const data = report.report_data;

    // Handle comparison reports
    if (report.report_type === 'comparison_analysis' && data.comparison_analysis) {
      return <ComparisonReportView comparisonData={data.comparison_analysis} />;
    }

    // Handle other report types
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading report...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !report) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading report: {error || 'Report not found'}
          {onBack && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="ml-2"
            >
              Back to Reports
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
          
          <div className="flex items-center gap-4 mb-4">
            {getStatusBadge(report.status)}
            <Badge variant="outline" className="text-xs">
              v{report.version}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-3 w-3" />
              {report.view_count + 1} views
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            </div>
          </div>

          {report.summary && (
            <p className="text-muted-foreground">{report.summary}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onAddData && report.status === 'completed' && (
            <Button
              onClick={handleAddData}
              disabled={addingData}
              className="flex items-center gap-2"
            >
              {addingData ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add to this Report
            </Button>
          )}
          
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Report Content */}
      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {renderReportContent()}
        </TabsContent>

        <TabsContent value="metadata" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Report ID:</span>
                      <span className="font-mono">{report.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="capitalize">{report.report_type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <span>{report.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled:</span>
                      <span>{report.is_scheduled ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Timestamps</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated:</span>
                      <span>{new Date(report.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 