"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Calendar,
  Check,
  ChevronRight,
  BarChart3,
  Users,
  Eye,
  AlertCircle,
  Loader2,
  GitCompare,
  Plus,
  Sparkles,
  TrendingUp,
  Download,
  Share,
  Star,
  Clock,
  Filter,
  Search,
  Grid3X3,
  List,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/memory-framework/config";

interface ReportItem {
  id: string;
  title: string;
  report_type: string;
  summary?: string;
  status: 'draft' | 'generating' | 'completed' | 'failed' | 'archived' | 'published';
  created_at: string;
  updated_at: string;
  view_count: number;
  version: number;
}

interface ReportsListProps {
  onReportClick?: (reportId: string) => void;
  onCompareReports?: (reportIds: string[]) => void;
  onAddToReport?: (reportId: string) => void;
  refreshTrigger?: number;
}

export function ReportsList({ 
  onReportClick, 
  onCompareReports, 
  onAddToReport,
  refreshTrigger = 0 
}: ReportsListProps) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/insights/reports', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
        logger.info(`[ReportsList] Loaded ${data.reports.length} reports`);
      } else {
        throw new Error(data.error || 'Failed to fetch reports');
      }

    } catch (error: any) {
      logger.error('[ReportsList] Error fetching reports:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [refreshTrigger]);

  const handleSelectReport = (reportId: string, checked: boolean) => {
    const newSelected = new Set(selectedReports);
    if (checked) {
      newSelected.add(reportId);
    } else {
      newSelected.delete(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleCompareSelected = async () => {
    if (selectedReports.size < 2) {
      setError('Please select at least 2 reports to compare');
      return;
    }

    if (selectedReports.size > 5) {
      setError('Maximum 5 reports can be compared at once');
      return;
    }

    setComparing(true);
    try {
      const reportIds = Array.from(selectedReports);
      
      const response = await fetch('/api/insights/compare-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_ids: reportIds,
          comparison_focus: 'comprehensive'
        }),
      });

      if (!response.ok) {
        throw new Error(`Comparison failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSelectedReports(new Set());
        await fetchReports();
        
        if (onReportClick && data.comparison_report?.id) {
          onReportClick(data.comparison_report.id);
        }
        
        if (onCompareReports) {
          onCompareReports(reportIds);
        }
      } else {
        throw new Error(data.error || 'Comparison failed');
      }

    } catch (error: any) {
      logger.error('[ReportsList] Comparison error:', error.message);
      setError(error.message);
    } finally {
      setComparing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Draft', icon: <FileText className="h-3 w-3" /> },
      generating: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Generating', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Ready', icon: <Check className="h-3 w-3" /> },
      failed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Failed', icon: <AlertCircle className="h-3 w-3" /> },
      archived: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', label: 'Archived', icon: <Clock className="h-3 w-3" /> },
      published: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', label: 'Published', icon: <Star className="h-3 w-3" /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge variant="secondary" className={`${config.color} border-0 gap-1 text-xs`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getReportTypeIcon = (reportType: string) => {
    if (reportType.includes('comparison')) {
      return <GitCompare className="h-5 w-5 text-blue-600" />;
    }
    if (reportType.includes('financial')) {
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    }
    if (reportType.includes('analysis')) {
      return <BarChart3 className="h-5 w-5 text-purple-600" />;
    }
    return <FileText className="h-5 w-5 text-gray-600" />;
  };

  const getReportTypeColor = (reportType: string) => {
    if (reportType.includes('comparison')) return 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30';
    if (reportType.includes('financial')) return 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30';
    if (reportType.includes('analysis')) return 'from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30';
    return 'from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/30';
  };

  // Filter reports based on search and status
  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchQuery || 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.summary && report.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative mb-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse"></div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Loading Your Reports</h3>
        <p className="text-muted-foreground">Fetching your insights...</p>
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
              onClick={fetchReports}
              className="w-fit gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="p-4 bg-muted/50 rounded-full mx-auto w-fit mb-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold mb-2">No Reports Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Upload some documents or add data to generate your first business insights report
        </p>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Your First Report
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Reports</h2>
            <p className="text-muted-foreground">
              {filteredReports.length} of {reports.length} reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="gap-2"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchReports}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports by title, type, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="all">All Status</option>
              <option value="completed">Ready</option>
              <option value="generating">Generating</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Bar */}
      {selectedReports.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {selectedReports.size} report{selectedReports.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReports(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  onClick={handleCompareSelected}
                  disabled={selectedReports.size < 2 || comparing}
                  size="sm"
                  className="gap-2"
                >
                  {comparing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitCompare className="h-4 w-4" />
                  )}
                  Compare Reports
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Card 
              key={report.id}
              className={`cursor-pointer hover:shadow-lg transition-all duration-200 bg-gradient-to-br ${getReportTypeColor(report.report_type)} border-l-4 ${
                report.report_type.includes('comparison') ? 'border-l-blue-500' :
                report.report_type.includes('financial') ? 'border-l-green-500' :
                report.report_type.includes('analysis') ? 'border-l-purple-500' : 'border-l-gray-500'
              }`}
              onClick={() => onReportClick?.(report.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getReportTypeIcon(report.report_type)}
                    <Checkbox
                      checked={selectedReports.has(report.id)}
                      onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {getStatusBadge(report.status)}
                </div>
                <CardTitle className="text-lg line-clamp-2">{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {report.summary}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {report.view_count}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Badge variant="outline" className="text-xs">
                      v{report.version}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {report.report_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <Card 
              key={report.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200"
              onClick={() => onReportClick?.(report.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedReports.has(report.id)}
                    onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-shrink-0">
                    {getReportTypeIcon(report.report_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{report.title}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    {report.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.summary}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 text-right space-y-1">
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {report.view_count}
                      </div>
                      <span>v{report.version}</span>
                    </div>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredReports.length === 0 && reports.length > 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matching reports</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search terms or filters
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 