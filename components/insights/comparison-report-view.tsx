"use client";

import React from "react";
import { 
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Calendar,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

interface ComparisonAnalysis {
  comparison_summary: {
    title: string;
    overview: string;
    reports_analyzed: string[];
    comparison_date: string;
    key_differences: string[];
  };
  detailed_comparison?: {
    metrics_comparison?: Array<{
      metric_name: string;
      report_values: Array<{
        report_title: string;
        value: string;
        trend: 'up' | 'down' | 'stable';
      }>;
      variance: string;
      insight: string;
    }>;
    performance_gaps?: Array<{
      area: string;
      gap_description: string;
      impact: 'high' | 'medium' | 'low';
      recommendation: string;
    }>;
  };
  strategic_insights?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations?: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
    timeline?: string;
    expected_impact?: string;
  }>;
}

interface ComparisonReportViewProps {
  comparisonData: ComparisonAnalysis;
}

export function ComparisonReportView({ comparisonData }: ComparisonReportViewProps) {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitCompare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{comparisonData.comparison_summary.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {comparisonData.comparison_summary.comparison_date}
              </CardDescription>
            </div>
          </div>
          
          <p className="text-muted-foreground leading-relaxed">
            {comparisonData.comparison_summary.overview}
          </p>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {comparisonData.comparison_summary.reports_analyzed.map((report, idx) => (
              <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary">
                {report}
              </Badge>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Key Differences */}
      {comparisonData.comparison_summary.key_differences?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Key Differences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparisonData.comparison_summary.key_differences.map((diff, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-1 bg-primary/10 rounded-full mt-0.5">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <span className="text-sm">{diff}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Comparison */}
      {comparisonData.detailed_comparison?.metrics_comparison?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Metrics Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparisonData.detailed_comparison.metrics_comparison.map((metric, idx) => (
                <div key={idx} className="space-y-3">
                  <h4 className="font-medium">{metric.metric_name}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metric.report_values.map((reportValue, reportIdx) => (
                      <div key={reportIdx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium text-sm">{reportValue.report_title}</span>
                          <p className="text-lg font-semibold">{reportValue.value}</p>
                        </div>
                        {getTrendIcon(reportValue.trend)}
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-primary">
                      Variance: {metric.variance}
                    </div>
                    <p className="text-sm text-muted-foreground">{metric.insight}</p>
                  </div>
                  
                  {idx < comparisonData.detailed_comparison!.metrics_comparison!.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Gaps */}
      {comparisonData.detailed_comparison?.performance_gaps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Performance Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comparisonData.detailed_comparison.performance_gaps.map((gap, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h4 className="font-medium">{gap.area}</h4>
                    <Badge className={`${getImpactColor(gap.impact)} border`}>
                      {gap.impact} impact
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {gap.gap_description}
                  </p>
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Recommendation:</p>
                    <p className="text-sm text-blue-700">{gap.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Insights - SWOT Analysis */}
      {comparisonData.strategic_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Strategic Analysis
            </CardTitle>
            <CardDescription>
              Strengths, Weaknesses, Opportunities, and Threats identified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="space-y-3">
                <h4 className="font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Strengths
                </h4>
                <div className="space-y-2">
                  {comparisonData.strategic_insights.strengths?.map((strength, idx) => (
                    <div key={idx} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                      {strength}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunities */}
              <div className="space-y-3">
                <h4 className="font-medium text-blue-700 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Opportunities
                </h4>
                <div className="space-y-2">
                  {comparisonData.strategic_insights.opportunities?.map((opportunity, idx) => (
                    <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      {opportunity}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="space-y-3">
                <h4 className="font-medium text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Weaknesses
                </h4>
                <div className="space-y-2">
                  {comparisonData.strategic_insights.weaknesses?.map((weakness, idx) => (
                    <div key={idx} className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                      {weakness}
                    </div>
                  ))}
                </div>
              </div>

              {/* Threats */}
              <div className="space-y-3">
                <h4 className="font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Threats
                </h4>
                <div className="space-y-2">
                  {comparisonData.strategic_insights.threats?.map((threat, idx) => (
                    <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                      {threat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {comparisonData.recommendations?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Action Recommendations
            </CardTitle>
            <CardDescription>
              Prioritized recommendations based on the comparison analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comparisonData.recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className={`w-1 h-full ${getPriorityColor(rec.priority)} rounded-full min-h-[60px]`} />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium">{rec.action}</h4>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                          {rec.priority} priority
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {rec.timeline && (
                          <div>
                            <span className="font-medium">Timeline: </span>
                            <span className="text-muted-foreground">{rec.timeline}</span>
                          </div>
                        )}
                        {rec.expected_impact && (
                          <div>
                            <span className="font-medium">Expected Impact: </span>
                            <span className="text-muted-foreground">{rec.expected_impact}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 