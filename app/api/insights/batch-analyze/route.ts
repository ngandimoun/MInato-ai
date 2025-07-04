import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { logger } from '@/memory-framework/config';
import { getInsightsService } from '@/lib/services/InsightsService';
import { getDataVisualizationEngine, FinancialChartData } from '@/lib/services/DataVisualizationEngine';
import { PythonAnalyticsEngine } from '@/lib/services/PythonAnalyticsEngine';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('[BatchAnalyze] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds, batchTitle, batchDescription, analysisType } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Document IDs required' }, { status: 400 });
    }

    logger.info(`[BatchAnalyze] Processing batch analysis for ${documentIds.length} documents`);

    const insightsService = getInsightsService();

    // Get all documents with their extracted content
    const documents = await Promise.all(
      documentIds.map(id => insightsService.getDocument(id))
    );

    const validDocuments = documents.filter(doc => doc !== null);

    if (validDocuments.length === 0) {
      return NextResponse.json({ error: 'No valid documents found' }, { status: 404 });
    }

    // Separate documents by type for specialized processing
    const imageDocuments = validDocuments.filter(doc => doc.content_type === 'image');
    const textDocuments = validDocuments.filter(doc => doc.content_type === 'document');
    const receipts = validDocuments.filter(doc => 
      doc.categories?.includes('receipt') || 
      doc.original_filename.toLowerCase().includes('receipt')
    );
    const invoices = validDocuments.filter(doc => 
      doc.categories?.includes('invoice') || 
      doc.original_filename.toLowerCase().includes('invoice')
    );

    logger.info(`[BatchAnalyze] Document breakdown: ${textDocuments.length} text, ${imageDocuments.length} images, ${receipts.length} receipts, ${invoices.length} invoices`);

    // Prepare comprehensive context for AI analysis
    const analysisContext = {
      batchTitle: batchTitle || 'Business Data Analysis',
      batchDescription: batchDescription || '',
      totalDocuments: validDocuments.length,
      documentTypes: {
        text: textDocuments.length,
        images: imageDocuments.length,
        receipts: receipts.length,
        invoices: invoices.length
      },
      documents: validDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.original_filename,
        type: doc.content_type,
        categories: doc.categories || [],
        extractedText: doc.extracted_text || '',
        fileSize: doc.file_size,
        uploadDate: doc.created_at
      }))
    };

    // Generate comprehensive batch analysis
    const batchAnalysis = await generateBatchInsights(analysisContext);

    // Extract financial data if receipts/invoices are present
    let financialAnalysis = null;
    if (receipts.length > 0 || invoices.length > 0) {
      financialAnalysis = await extractFinancialData(receipts, invoices);
    }

    // Find correlations across different document types
    const correlations = await findDocumentCorrelations(validDocuments);

    // Generate actionable business recommendations
    const recommendations = await generateBusinessRecommendations({
      batchAnalysis,
      financialAnalysis,
      correlations,
      context: analysisContext
    });

    // Generate interactive data visualizations
    const visualizationEngine = getDataVisualizationEngine();
    let charts: any[] = [];
    
    try {
      // Generate financial charts if financial data exists
      if (financialAnalysis) {
        const financialChartData: FinancialChartData = {
          revenues: financialAnalysis.transactions?.filter((t: any) => t.type === 'revenue') || [],
          expenses: financialAnalysis.transactions?.filter((t: any) => t.type === 'expense') || [],
          netIncome: financialAnalysis.monthly_trends || [],
          categories: financialAnalysis.by_category ? 
            Object.entries(financialAnalysis.by_category).map(([name, data]: [string, any]) => ({
              name,
              total: data.sum || 0,
              percentage: data.percentage || 0
            })) : [],
          trends: financialAnalysis.trends || []
        };
        
        const financialCharts = await visualizationEngine.generateFinancialCharts(financialChartData);
        charts.push(...financialCharts);
      }

      // Generate correlation visualizations
      if (correlations && correlations.correlation_matrix) {
        const correlationViz = {
          correlationMatrix: correlations.correlation_matrix.values || [],
          labels: correlations.correlation_matrix.columns || [],
          strongCorrelations: correlations.strong_correlations || []
        };
        
        const correlationCharts = await visualizationEngine.generateCorrelationVisualizations(correlationViz);
        charts.push(...correlationCharts);
      }

    } catch (vizError: any) {
      logger.warn('[BatchAnalyze] Visualization generation failed:', vizError.message);
    }

    // Execute advanced Python analytics if available
    let pythonAnalytics: any = null;
    try {
      const pythonEngine = new PythonAnalyticsEngine();
      
      // Prepare analytics data
      const analyticsData = validDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.content_type,
        categories: doc.categories || [],
        file_size: doc.file_size || 0,
        created_at: doc.created_at
      }));

      // Execute comprehensive analytics
      if (receipts.length > 0 || invoices.length > 0) {
        const financialData = [...receipts, ...invoices].map((doc: any) => ({
          amount: doc.amount || 0,
          date: doc.transaction_date || doc.created_at,
          category: doc.categories?.[0] || 'uncategorized',
          vendor: doc.vendor || 'unknown',
          type: doc.transaction_type || 'expense'
        }));

        pythonAnalytics = await pythonEngine.executeFinancialAnalytics(financialData);
      } else {
        pythonAnalytics = await pythonEngine.executeStatisticalAnalysis(
          analyticsData, 
          ['file_size', 'created_at']
        );
      }
      
    } catch (pythonError: any) {
      logger.warn('[BatchAnalyze] Python analytics failed:', pythonError.message);
    }

    // Save the batch analysis result with visualizations
    const analysisResult = await insightsService.createAnalysisResult({
      user_id: user.id,
      analysis_type: 'comprehensive_batch',
      analysis_name: batchTitle || `Batch Analysis - ${validDocuments.length} Files`,
      status: 'completed',
      insights: {
        batch_analysis: batchAnalysis,
        financial_analysis: financialAnalysis,
        correlations: correlations,
        document_breakdown: analysisContext.documentTypes,
        processed_documents: documentIds,
        python_analytics: pythonAnalytics
      },
      summary: batchAnalysis.executive_summary,
      recommendations: recommendations,
      key_metrics: batchAnalysis.key_metrics || {},
      confidence_score: 0.9,
      completed_at: new Date().toISOString()
    });

    logger.info(`[BatchAnalyze] Batch analysis completed: ${analysisResult?.id}`);

    return NextResponse.json({
      success: true,
      analysisId: analysisResult?.id,
      insights: {
        executive_summary: batchAnalysis.executive_summary,
        key_findings: batchAnalysis.key_findings,
        financial_insights: financialAnalysis?.summary,
        correlations: correlations.summary,
        recommendations: recommendations,
        document_count: validDocuments.length,
        visualizations: charts,
        python_analytics: pythonAnalytics
      }
    });

  } catch (error: any) {
    logger.error('[BatchAnalyze] Error:', error);
    return NextResponse.json({ 
      error: 'Batch analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

async function generateBatchInsights(context: any) {
  const prompt = `You are an expert business analyst. Analyze this batch of business documents and provide comprehensive insights.

Context:
- Batch Title: ${context.batchTitle}
- Description: ${context.batchDescription}
- Total Documents: ${context.totalDocuments}
- Document Types: ${JSON.stringify(context.documentTypes)}

Documents Analysis:
${context.documents.map((doc: any, index: number) => `
Document ${index + 1}:
- Title: ${doc.title}
- Type: ${doc.type}
- Categories: ${doc.categories.join(', ')}
- Content: ${doc.extractedText.slice(0, 1000)}...
`).join('\n')}

Please provide a comprehensive business analysis in JSON format with these sections:
{
  "executive_summary": "3-4 sentence overview of the key findings",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "business_insights": {
    "strengths": ["strength 1", "strength 2"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "concerns": ["concern 1", "concern 2"],
    "trends": ["trend 1", "trend 2"]
  },
  "key_metrics": {
    "metric_name": "value"
  },
  "data_quality": {
    "completeness": "high/medium/low",
    "consistency": "high/medium/low",
    "notes": "observations about data quality"
  }
}

Focus on:
1. Overall business health and performance
2. Financial patterns and trends
3. Operational efficiency insights
4. Strategic recommendations
5. Risk assessment
6. Growth opportunities`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.2
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch {
    return {
      executive_summary: response.choices[0]?.message?.content || '',
      key_findings: [],
      business_insights: {},
      key_metrics: {},
      data_quality: {}
    };
  }
}

async function extractFinancialData(receipts: any[], invoices: any[]) {
  const financialDocuments = [...receipts, ...invoices];
  
  const prompt = `Extract and analyze financial data from these business documents:

${financialDocuments.map((doc, index) => `
Document ${index + 1} (${doc.categories?.includes('receipt') ? 'Receipt' : 'Invoice'}):
Title: ${doc.title}
Content: ${doc.extracted_text?.slice(0, 800) || 'No text extracted'}
`).join('\n')}

Extract and calculate:
1. Individual transaction amounts
2. Total expenses (from receipts)
3. Total revenue (from invoices)
4. Common vendors/clients
5. Expense categories
6. Date ranges
7. Payment methods
8. Tax amounts if visible

Return JSON format:
{
  "summary": {
    "total_expenses": 0,
    "total_revenue": 0,
    "net_amount": 0,
    "transaction_count": 0,
    "date_range": "start - end"
  },
  "transactions": [
    {
      "type": "expense/revenue",
      "amount": 0,
      "vendor": "name",
      "date": "date",
      "category": "category",
      "description": "description"
    }
  ],
  "insights": {
    "top_expenses": ["category1", "category2"],
    "frequent_vendors": ["vendor1", "vendor2"],
    "spending_patterns": "analysis",
    "recommendations": ["rec1", "rec2"]
  }
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.1
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch {
    return {
      summary: { total_expenses: 0, total_revenue: 0, net_amount: 0 },
      transactions: [],
      insights: {}
    };
  }
}

async function findDocumentCorrelations(documents: any[]) {
  const prompt = `Analyze these business documents to find correlations, patterns, and connections:

${documents.map((doc, index) => `
Document ${index + 1}:
- Title: ${doc.title}
- Type: ${doc.content_type}
- Categories: ${doc.categories?.join(', ') || 'None'}
- Key Content: ${doc.extracted_text?.slice(0, 500) || 'No content'}
- Upload Date: ${doc.created_at}
`).join('\n')}

Find and analyze:
1. Temporal patterns (timing correlations)
2. Content relationships (similar topics/themes)
3. Financial connections (related expenses/revenues)
4. Business process flows (sequential documents)
5. Vendor/client relationships
6. Category clustering

Return JSON:
{
  "summary": "Overview of key correlations found",
  "temporal_patterns": [
    {
      "pattern": "description",
      "documents": ["doc1", "doc2"],
      "significance": "why this matters"
    }
  ],
  "content_relationships": [
    {
      "theme": "common theme",
      "documents": ["doc1", "doc2"],
      "connection": "how they relate"
    }
  ],
  "financial_connections": [
    {
      "type": "connection type",
      "documents": ["doc1", "doc2"],
      "impact": "business impact"
    }
  ],
  "business_insights": [
    "insight 1",
    "insight 2"
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1200,
    temperature: 0.3
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch {
    return {
      summary: 'Unable to analyze correlations',
      temporal_patterns: [],
      content_relationships: [],
      financial_connections: [],
      business_insights: []
    };
  }
}

async function generateBusinessRecommendations(analysisData: any) {
  const prompt = `Based on this comprehensive business analysis, generate actionable recommendations:

Batch Analysis: ${JSON.stringify(analysisData.batchAnalysis).slice(0, 1000)}
Financial Analysis: ${JSON.stringify(analysisData.financialAnalysis).slice(0, 800)}
Correlations: ${JSON.stringify(analysisData.correlations).slice(0, 800)}

Generate practical, actionable recommendations categorized by:

1. IMMEDIATE ACTIONS (next 30 days)
2. SHORT-TERM GOALS (1-3 months)  
3. LONG-TERM STRATEGY (3-12 months)
4. COST OPTIMIZATION
5. REVENUE OPPORTUNITIES
6. RISK MITIGATION

For each recommendation, include:
- Specific action to take
- Expected business impact
- Implementation difficulty (Low/Medium/High)
- Estimated timeline

Return as JSON array:
[
  {
    "category": "IMMEDIATE ACTIONS",
    "action": "specific action",
    "impact": "expected outcome",
    "difficulty": "Low/Medium/High",
    "timeline": "timeframe",
    "priority": "High/Medium/Low"
  }
]`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.4
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || '[]');
  } catch {
    return [
      {
        category: "GENERAL",
        action: "Review uploaded documents for data quality and completeness",
        impact: "Better business insights and decision making",
        difficulty: "Low",
        timeline: "1 week",
        priority: "Medium"
      }
    ];
  }
} 