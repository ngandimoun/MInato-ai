import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getInsightsService } from '@/lib/services/InsightsService';
import { logger } from '@/memory-framework/config';
import { generateResponseWithIntent } from '@/lib/providers/llm_clients';

const COMPARE_REPORTS_PROMPT = `You are Minato's advanced report comparison engine. Analyze multiple reports and generate a comprehensive comparative analysis.

REPORTS TO COMPARE:
{reports}

COMPARISON FOCUS: {comparisonFocus}

Generate a detailed comparison analysis in JSON format with the following structure:
{
  "comparison_summary": {
    "title": "Professional title for the comparison",
    "overview": "Executive summary of the comparison",
    "reports_analyzed": ["Report 1 title", "Report 2 title"],
    "comparison_date": "YYYY-MM-DD",
    "key_differences": ["Key difference 1", "Key difference 2"]
  },
  "detailed_comparison": {
    "metrics_comparison": [
      {
        "metric_name": "Metric name",
        "report_values": [
          {"report_title": "Report 1", "value": "value", "trend": "up|down|stable"},
          {"report_title": "Report 2", "value": "value", "trend": "up|down|stable"}
        ],
        "variance": "Percentage or description of variance",
        "insight": "Key insight about this metric comparison"
      }
    ],
    "performance_gaps": [
      {
        "area": "Performance area",
        "gap_description": "Description of the gap",
        "impact": "high|medium|low",
        "recommendation": "Specific recommendation to address"
      }
    ]
  },
  "strategic_insights": {
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "opportunities": ["Opportunity 1", "Opportunity 2"],
    "threats": ["Threat 1", "Threat 2"]
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Specific actionable recommendation",
      "rationale": "Why this action is recommended",
      "timeline": "Suggested implementation timeline",
      "expected_impact": "Expected outcome"
    }
  ]
}

Focus on meaningful differences, identify trends, highlight gaps, and provide actionable insights for decision-making.`;

export async function POST(request: NextRequest) {
  const logPrefix = '[API:CompareReports]';
  const cookieStore = cookies();
  
  try {
    const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error(`${logPrefix} Authentication failed:`, authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { report_ids, comparison_focus = 'comprehensive' } = body;

    if (!report_ids || !Array.isArray(report_ids) || report_ids.length < 2) {
      return NextResponse.json(
        { error: 'At least two report IDs are required for comparison' }, 
        { status: 400 }
      );
    }

    if (report_ids.length > 5) {
      return NextResponse.json(
        { error: 'Maximum of 5 reports can be compared at once' }, 
        { status: 400 }
      );
    }

    const insightsService = getInsightsService();

    // Fetch all reports
    const reports = await Promise.all(
      report_ids.map(id => insightsService.getReport(id))
    );

    // Check if all reports exist and belong to the user
    const validReports = reports.filter(report => 
      report !== null && report.user_id === user.id
    );

    if (validReports.length !== report_ids.length) {
      return NextResponse.json(
        { error: 'One or more reports not found or access denied' }, 
        { status: 404 }
      );
    }

    // Prepare reports data for comparison
    const reportsData = validReports.map(report => ({
      title: report!.title,
      report_type: report!.report_type,
      summary: report!.summary,
      report_data: report!.report_data,
      created_at: report!.created_at,
      status: report!.status
    }));

    logger.info(`${logPrefix} Comparing ${validReports.length} reports for user: ${user.id.substring(0, 8)}`);

    // Generate comparison analysis using AI
    const prompt = COMPARE_REPORTS_PROMPT
      .replace('{reports}', JSON.stringify(reportsData, null, 2))
      .replace('{comparisonFocus}', comparison_focus);

    const comparisonResult = await generateResponseWithIntent(
      prompt,
      'Generate detailed comparative analysis',
      [],
      'gpt-4o-mini',
      4000,
      user.id
    );

    if ('error' in comparisonResult) {
      logger.error(`${logPrefix} AI comparison failed:`, comparisonResult.error);
      return NextResponse.json(
        { error: 'Failed to generate comparison analysis' }, 
        { status: 500 }
      );
    }

    // Parse the JSON response
    let comparisonData;
    try {
      // Extract JSON from the response
      const jsonMatch = comparisonResult.responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        comparisonData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      logger.error(`${logPrefix} Failed to parse AI response:`, parseError);
      // Fallback to text response
      comparisonData = {
        comparison_summary: {
          title: `Comparison: ${validReports.map(r => r!.title).join(' vs ')}`,
          overview: comparisonResult.responseText.substring(0, 500),
          reports_analyzed: validReports.map(r => r!.title),
          comparison_date: new Date().toISOString().split('T')[0],
          key_differences: ['Analysis generated successfully']
        },
        detailed_comparison: { metrics_comparison: [], performance_gaps: [] },
        strategic_insights: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        recommendations: []
      };
    }

    // Create a comparison report
    const comparisonReport = {
      user_id: user.id,
      title: comparisonData.comparison_summary?.title || `Comparison: ${validReports.map(r => r!.title).join(' vs ')}`,
      report_type: 'comparison_analysis',
      description: `Comparative analysis of ${validReports.length} reports`,
      report_data: {
        comparison_analysis: comparisonData,
        source_reports: validReports.map(r => ({ id: r!.id, title: r!.title })),
        comparison_focus,
        generated_at: new Date().toISOString()
      },
      summary: comparisonData.comparison_summary?.overview || 'Comparative analysis generated',
      status: 'completed' as const,
      is_scheduled: false,
      schedule_config: {},
      version: 1,
      view_count: 0
    };

    // Save the comparison report
    const savedReport = await insightsService.createReport(comparisonReport);

    if (!savedReport) {
      logger.error(`${logPrefix} Failed to save comparison report`);
      return NextResponse.json(
        { error: 'Failed to save comparison report' }, 
        { status: 500 }
      );
    }

    logger.info(`${logPrefix} Comparison report created successfully: ${savedReport.id}`);

    return NextResponse.json({
      success: true,
      comparison_report: savedReport,
      analysis: comparisonData
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Exception:`, error.message);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 