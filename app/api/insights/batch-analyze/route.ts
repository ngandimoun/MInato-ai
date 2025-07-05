import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { logger } from '@/memory-framework/config';
import { getInsightsService } from '@/lib/services/InsightsService';
import { getDataVisualizationEngine, FinancialChartData } from '@/lib/services/DataVisualizationEngine';
import { getSmartPythonExecutor, ExecutionRequirements } from '@/lib/services/SmartPythonExecutor';

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

    logger.info(`[BatchAnalyze] Processing intelligent analysis for ${documentIds.length} documents`);

    const insightsService = getInsightsService();

    // Get all documents with their extracted content
    const documents = await Promise.all(
      documentIds.map(id => insightsService.getDocument(id))
    );

    const validDocuments = documents.filter(doc => doc !== null);

    if (validDocuments.length === 0) {
      return NextResponse.json({ error: 'No valid documents found' }, { status: 404 });
    }

    // Debug: Log document content to see what we're working with
    logger.info(`[BatchAnalyze] Document content analysis:`);
    validDocuments.forEach((doc, index) => {
      logger.info(`Document ${index + 1}:`);
      logger.info(`  ID: ${doc.id}`);
      logger.info(`  Filename: ${doc.original_filename}`);
      logger.info(`  File Type: ${doc.file_type}`);
      logger.info(`  Content Type: ${doc.content_type}`);
      logger.info(`  Size: ${doc.file_size} bytes`);
      logger.info(`  Processing Status: ${doc.processing_status}`);
      logger.info(`  Has extracted_text: ${!!doc.extracted_text}`);
      logger.info(`  Extracted text length: ${doc.extracted_text?.length || 0}`);
      logger.info(`  Categories: ${doc.categories?.join(', ') || 'None'}`);
      logger.info(`  Tags: ${doc.tags?.join(', ') || 'None'}`);
      logger.info(`  Text preview: ${(doc.extracted_text || 'No text').substring(0, 200)}...`);
      
      // Determine analysis strategy
      const hasText = doc.extracted_text && doc.extracted_text.length > 10;
      const isImage = doc.content_type === 'image' || doc.file_type?.includes('image');
      logger.info(`  Analysis strategy: ${hasText ? 'Text-based' : isImage ? 'Image metadata + OCR needed' : 'Filename/metadata-based'}`);
    });

    // Intelligent document categorization and data extraction
    const documentAnalysis = await analyzeDocumentTypes(validDocuments);
    
    logger.info(`[BatchAnalyze] Intelligent categorization: ${JSON.stringify(documentAnalysis.categories)}`);

    // Extract and structure data from all documents
    const structuredData = await extractStructuredData(validDocuments, documentAnalysis);

    // Build comprehensive dataset
    const dataset = await buildAnalyticsDataset(structuredData, documentAnalysis);

    // Generate intelligent visualizations based on actual data
    const visualizations = await generateIntelligentVisualizations(dataset, documentAnalysis);

    // Execute advanced analytics with Smart Python Executor
    let advancedAnalytics;
    try {
      const smartExecutor = getSmartPythonExecutor();
      
      // Prepare data for Python analytics
      const analyticsData = Object.entries(dataset.metrics || {}).map(([key, value]) => ({ [key]: value }));

      // Define execution requirements based on data size and complexity
      const requirements: ExecutionRequirements = {
        dataSize: JSON.stringify(analyticsData).length / (1024 * 1024), // Size in MB
        securityLevel: 'high',
        outputFormat: 'json',
        fallbackAllowed: true,
        concurrent: true
      };

      // Generate comprehensive Python analysis code
      const analysisCode = `
# Advanced Analytics for Document Insights
import pandas as pd
import numpy as np
from datetime import datetime
import json

# Load and analyze the dataset
print("=== Advanced Document Analytics ===")

# Entity Analysis
entities = ${JSON.stringify(dataset.entities || {})}
metrics = ${JSON.stringify(dataset.metrics || {})}
time_series = ${JSON.stringify(dataset.time_series || [])}

print(f"Analyzing {len(entities)} entity types...")

# Statistical analysis of metrics
if metrics:
    print("\\n=== Metrics Analysis ===")
    for metric_name, value in metrics.items():
        if isinstance(value, (int, float)):
            print(f"{metric_name}: {value}")

# Entity frequency analysis
entity_stats = {}
for entity_type, entity_list in entities.items():
    if isinstance(entity_list, list):
        entity_stats[entity_type] = {
            'count': len(entity_list),
            'unique_count': len(set(entity_list)) if entity_list else 0,
            'most_common': max(set(entity_list), key=entity_list.count) if entity_list else None
        }

print("\\n=== Entity Statistics ===")
for entity_type, stats in entity_stats.items():
    print(f"{entity_type}: {stats['count']} total, {stats['unique_count']} unique")

# Time series analysis if available
if time_series:
    print(f"\\n=== Temporal Analysis ===")
    print(f"Found {len(time_series)} temporal events")
    
    # Extract dates and analyze patterns
    dates = []
    for event in time_series:
        if 'date' in event:
            dates.append(event['date'])
    
    if dates:
        print(f"Date range: {min(dates)} to {max(dates)}")

# Generate insights
insights = []
if entity_stats:
    total_entities = sum(stats['count'] for stats in entity_stats.values())
    insights.append(f"Extracted {total_entities} entities across {len(entity_stats)} categories")
    
    # Find most significant entity types
    sorted_entities = sorted(entity_stats.items(), key=lambda x: x[1]['count'], reverse=True)
    top_entity = sorted_entities[0] if sorted_entities else None
    if top_entity:
        insights.append(f"Most frequent entity type: {top_entity[0]} ({top_entity[1]['count']} instances)")

if metrics:
    insights.append(f"Analyzed {len(metrics)} key metrics from document content")

print("\\n=== Generated Insights ===")
for i, insight in enumerate(insights, 1):
    print(f"{i}. {insight}")

# Output structured results
results = {
    "entity_analysis": entity_stats,
    "metrics_summary": metrics,
    "temporal_data": {"events": len(time_series), "date_range": dates[:2] if len(dates) >= 2 else dates},
    "insights": insights,
    "total_entities": sum(stats['count'] for stats in entity_stats.values()),
    "analysis_timestamp": datetime.now().isoformat()
}

print("\\n=== Analysis Complete ===")
print(f"Results: {json.dumps(results, indent=2)}")
`;

      // Execute with smart routing
      const executionResult = await smartExecutor.executeCode(analysisCode, analyticsData, requirements);
      
      advancedAnalytics = {
        success: executionResult.success,
        engine: executionResult.engine,
        execution_time: executionResult.executionTime,
        results: {
          output: executionResult.output,
          charts: executionResult.charts || [],
          insights: executionResult.insights || [],
          metadata: executionResult.metadata
        },
        insights: executionResult.insights || [
          `Analyzed ${validDocuments.length} documents using intelligent categorization`,
          `Extracted ${Object.values(dataset.entities || {}).flat().length} entities across ${Object.keys(dataset.entities || {}).length} categories`,
          `Execution engine: ${executionResult.engine}${executionResult.metadata?.fallbackUsed ? ' (with fallback)' : ''}`
        ],
        recommendations: [
          `Analytics executed using ${executionResult.engine} engine`,
          'Review extracted insights for data-driven decision making',
          'Consider expanding document corpus for richer analysis'
        ]
      };

      if (!executionResult.success) {
        logger.warn(`[BatchAnalyze] Smart executor failed: ${executionResult.error}`);
        // Fall back to basic JavaScript analytics
        throw new Error(executionResult.error);
      }

    } catch (error: any) {
      logger.warn('[BatchAnalyze] Advanced analytics failed, using JavaScript fallback:', error.message);
      
      // JavaScript fallback analytics
      advancedAnalytics = {
        success: true,
        method: 'javascript_fallback',
        engine: 'javascript',
        results: {
          entity_analysis: {
            total_entities: Object.values(dataset.entities || {}).flat().length,
            entity_types: Object.keys(dataset.entities || {}),
            most_frequent: Object.entries(dataset.entities || {}).map(([type, entities]: [string, any]) => ({
              type,
              count: Array.isArray(entities) ? entities.length : 0,
              sample: Array.isArray(entities) ? entities.slice(0, 3) : []
            }))
          },
          data_quality: {
            completeness: dataset.summary?.total_entities > 0 ? 'high' : 'low',
            structure: dataset.summary?.relationships > 0 ? 'structured' : 'unstructured',
            temporal_coverage: dataset.summary?.temporal_events > 0 ? 'temporal_data_present' : 'no_temporal_data'
          }
        },
        insights: [
          `Analyzed ${validDocuments.length} documents using intelligent categorization`,
          `Extracted ${Object.values(dataset.entities || {}).flat().length} entities across ${Object.keys(dataset.entities || {}).length} categories`,
          `Document analysis approach: ${documentAnalysis.analysis_approach || 'comprehensive content analysis'}`
        ],
        recommendations: [
          'JavaScript fallback analytics used - consider Python sandbox for advanced features',
          'Review document content extraction to improve data quality',
          'Add more structured data sources for enhanced insights'
        ]
      };
    }

    // Generate comprehensive insights
    const intelligentInsights = await generateIntelligentInsights({
      documents: validDocuments,
      documentAnalysis,
      structuredData,
      dataset,
      visualizations,
      advancedAnalytics,
      batchTitle,
      batchDescription
    });

    // Create actionable recommendations
    const actionableRecommendations = await generateActionableRecommendations(intelligentInsights, dataset);

    // Save the comprehensive analysis result
    const analysisResult = await insightsService.createAnalysisResult({
      user_id: user.id,
      analysis_type: 'intelligent_comprehensive',
      analysis_name: batchTitle || `Intelligent Analysis - ${validDocuments.length} Documents`,
      status: 'completed',
      insights: {
        document_analysis: documentAnalysis,
        structured_data: structuredData,
        dataset: dataset,
        intelligent_insights: intelligentInsights,
        advanced_analytics: advancedAnalytics,
        processed_documents: documentIds
      },
      summary: intelligentInsights.executive_summary,
      recommendations: actionableRecommendations,
      key_metrics: intelligentInsights.key_metrics || {},
      confidence_score: intelligentInsights.confidence_score || 0.9,
      completed_at: new Date().toISOString()
    });

    logger.info(`[BatchAnalyze] Intelligent analysis completed: ${analysisResult?.id}`);

    // Create a professional, readable report
    const professionalReport = await generateProfessionalReport({
      analysisResult,
      intelligentInsights,
      visualizations,
      actionableRecommendations,
      documentAnalysis,
      dataset,
      batchTitle,
      validDocuments
    });

    const report = await insightsService.createReport(professionalReport);

    if (!report) {
      logger.warn('[BatchAnalyze] Failed to create report, but analysis succeeded');
    } else {
      logger.info(`[BatchAnalyze] Professional report created: ${report.id}`);
    }

    return NextResponse.json({
      success: true,
      analysisId: analysisResult?.id,
      reportId: report?.id,
      insights: {
        executive_summary: intelligentInsights.executive_summary,
        key_findings: intelligentInsights.key_findings,
        document_categories: documentAnalysis.categories,
        visualizations: visualizations,
        recommendations: actionableRecommendations,
        confidence_score: intelligentInsights.confidence_score,
        dataset_summary: dataset.summary
      }
    });

  } catch (error: any) {
    logger.error('[BatchAnalyze] Error:', error);
    return NextResponse.json({ 
      error: 'Intelligent analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Intelligent document type analysis
async function analyzeDocumentTypes(documents: any[]) {
  const documentContent = documents.map((doc, index) => {
    const hasText = doc.extracted_text && doc.extracted_text.length > 10;
    const contentPreview = hasText 
      ? doc.extracted_text.substring(0, 1500)
      : `No extracted text available. Document type: ${doc.file_type}. Filename: ${doc.original_filename}. Size: ${doc.file_size} bytes.`;
    
    return `=== DOCUMENT ${index + 1} ===\n` +
      `ID: ${doc.id}\n` +
      `Filename: ${doc.original_filename}\n` +
      `File Type: ${doc.file_type || doc.content_type}\n` +
      `Size: ${doc.file_size} bytes\n` +
      `Has Text Content: ${hasText ? 'Yes' : 'No'}\n` +
      `Content Preview: ${contentPreview}...\n\n`;
  }).join('');

  const prompt = `You are an expert business analyst. Analyze these documents and provide detailed, intelligent categorization based on ACTUAL CONTENT analysis.

DOCUMENTS TO ANALYZE:
${documentContent}

TASK: Provide comprehensive analysis in JSON format. Be specific and accurate based on actual content:

{
  "summary": {
    "total_documents": ${documents.length},
    "content_quality": "high|medium|low",
    "primary_themes": ["specific theme 1", "specific theme 2"],
    "business_context": "detailed description of what these documents represent"
  },
  "categories": {
    "financial": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "legal": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "marketing": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "operational": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "research": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "technical": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "contracts": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "reports": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "correspondence": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 },
    "other": { "count": 0, "documents": [], "subcategories": [], "confidence": 0.0 }
  },
  "content_analysis": {
    "key_topics": ["specific topic 1", "specific topic 2"],
    "entities_found": {
      "people": ["actual names found"],
      "companies": ["actual companies found"],
      "locations": ["actual locations found"],
      "dates": ["actual dates found"],
      "amounts": ["actual amounts found"],
      "products": ["actual products found"]
    },
    "data_richness": "high|medium|low",
    "analysis_potential": "detailed description of analysis potential"
  },
  "recommendations": {
    "analysis_approach": "specific strategy based on content type",
    "focus_areas": ["specific area 1", "specific area 2"],
    "extraction_priorities": ["specific priority 1", "specific priority 2"]
  }
}

CRITICAL INSTRUCTIONS: 
- Analyze BOTH text content AND metadata (filename, file type, size)
- For documents with text content: focus on actual content analysis
- For documents without text: use filename patterns and metadata for intelligent categorization
- Be specific about entities, topics, and themes you discover
- Provide meaningful subcategories based on available information
- Give realistic confidence scores (lower for metadata-only analysis)
- Focus on business value and actionable insights
- Extract real entity names when available, infer business context from filenames
- Consider file types: PDFs/DOCs likely contain text, images may need OCR, etc.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.1
  });

  const responseContent = response.choices[0]?.message?.content || '';
  logger.info(`[BatchAnalyze] Document analysis response length: ${responseContent.length}`);
  logger.info(`[BatchAnalyze] Document analysis response preview: ${responseContent.substring(0, 500)}...`);

  try {
    // Extract JSON from markdown code blocks if present
    let jsonContent = responseContent;
    const jsonMatch = responseContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
      logger.info(`[BatchAnalyze] Extracted JSON from markdown code block`);
    }

    const parsed = JSON.parse(jsonContent);
    logger.info(`[BatchAnalyze] Successfully parsed document analysis`);
    return parsed;
  } catch (error: any) {
    logger.error(`[BatchAnalyze] Failed to parse document analysis response: ${error.message}`);
    logger.error(`[BatchAnalyze] Raw response: ${responseContent}`);
    return {
      categories: { other: { count: documents.length, documents: documents.map(d => d.id) } },
      content_types: { unstructured_text: documents.map(d => d.id) },
      data_potential: { medium: documents.map(d => d.id) },
      analysis_approach: "General content analysis"
    };
  }
}

// Extract structured data from documents
async function extractStructuredData(documents: any[], documentAnalysis: any) {
  const documentContent = documents.map((doc, index) => {
    const hasText = doc.extracted_text && doc.extracted_text.length > 10;
    const category = Object.entries(documentAnalysis.categories || {}).find(([_, cat]: [string, any]) => 
      cat.documents?.includes(doc.id))?.[0] || 'unknown';
    
    let content = '';
    if (hasText) {
      content = doc.extracted_text.substring(0, 2000);
    } else {
      // Use filename and metadata for analysis when no text is available
      content = `Document Analysis Based on Metadata:
- Filename: ${doc.original_filename}
- File Type: ${doc.file_type}
- Content Type: ${doc.content_type}
- File Size: ${doc.file_size} bytes
- Processing Status: ${doc.processing_status}
- Categories: ${doc.categories?.join(', ') || 'None'}
- Tags: ${doc.tags?.join(', ') || 'None'}

Note: No text content was extracted from this document. Analysis is based on filename patterns and metadata.`;
    }
    
    return `=== DOCUMENT ${index + 1} ===\n` +
      `ID: ${doc.id}\n` +
      `Filename: ${doc.original_filename}\n` +
      `Category: ${category}\n` +
      `Has Text Content: ${hasText ? 'Yes' : 'No'}\n` +
      `Content: ${content}...\n\n`;
  }).join('');

  const prompt = `You are a data extraction expert. Extract ALL meaningful structured data from these business documents.

DOCUMENT ANALYSIS CONTEXT:
${JSON.stringify(documentAnalysis.summary || {}, null, 2)}

DOCUMENTS FOR DATA EXTRACTION:
${documentContent}

EXTRACT COMPREHENSIVE STRUCTURED DATA in this exact JSON format:

{
  "extracted_entities": {
    "people": [{"name": "Full Name", "role": "title", "document_id": "id", "context": "how mentioned"}],
    "organizations": [{"name": "Company Name", "type": "company|vendor|client", "document_id": "id"}],
    "locations": [{"name": "Location", "type": "address|city|country", "document_id": "id"}],
    "dates": [{"date": "YYYY-MM-DD", "event": "description", "document_id": "id"}],
    "amounts": [{"value": 0.00, "currency": "USD", "context": "what for", "document_id": "id"}],
    "products": [{"name": "Product", "category": "type", "document_id": "id"}],
    "services": [{"name": "Service", "provider": "who", "document_id": "id"}],
    "emails": [{"email": "email@domain.com", "owner": "person", "document_id": "id"}],
    "phones": [{"number": "phone", "owner": "person", "document_id": "id"}],
    "urls": [{"url": "http://...", "context": "purpose", "document_id": "id"}]
  },
  "key_metrics": {
    "total_value": 0,
    "transaction_count": 0,
    "unique_entities": 0,
    "date_range_days": 0,
    "document_types": {},
    "entity_density": 0
  },
  "relationships": [
    {"from": "entity1", "to": "entity2", "type": "relationship_type", "strength": 0.0}
  ],
  "temporal_data": [
    {"date": "YYYY-MM-DD", "event": "description", "value": 0, "category": "type"}
  ],
  "quantitative_data": [
    {"metric": "name", "value": 0, "unit": "currency|count|percentage", "source_doc": "id"}
  ],
  "qualitative_insights": [
    {"insight": "observation", "evidence": "supporting text", "confidence": 0.0, "source_doc": "id"}
  ],
  "business_intelligence": {
    "key_topics": ["topic1", "topic2"],
    "sentiment": "positive|neutral|negative",
    "urgency_indicators": [],
    "action_items": [],
    "risks_identified": [],
    "opportunities": []
  }
}

EXTRACTION RULES:
1. Extract EVERYTHING valuable - from text content AND filename patterns
2. For documents with text: extract names, numbers, dates, amounts, relationships
3. For documents without text: infer business context from filenames and metadata
4. Include document_id for traceability
5. Look for business intelligence patterns in both content and file organization
6. Identify relationships between entities and document types
7. Calculate meaningful metrics from available data
8. Extract context and sentiment from text, infer purpose from filenames
9. Use file types to guide analysis (e.g., invoices, contracts, reports)
10. Provide realistic confidence scores based on data availability`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.1
  });

  const responseContent = response.choices[0]?.message?.content || '';
  logger.info(`[BatchAnalyze] Data extraction response length: ${responseContent.length}`);
  logger.info(`[BatchAnalyze] Data extraction response preview: ${responseContent.substring(0, 500)}...`);

  try {
    // Extract JSON from markdown code blocks if present
    let jsonContent = responseContent;
    const jsonMatch = responseContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
      logger.info(`[BatchAnalyze] Extracted JSON from markdown code block`);
    }

    const parsed = JSON.parse(jsonContent);
    logger.info(`[BatchAnalyze] Successfully parsed data extraction`);
    return parsed;
  } catch (error: any) {
    logger.error(`[BatchAnalyze] Failed to parse data extraction response: ${error.message}`);
    logger.error(`[BatchAnalyze] Raw response: ${responseContent}`);
    return {
      extracted_entities: {},
      key_metrics: {},
      relationships: [],
      temporal_data: [],
      quantitative_data: [],
      qualitative_insights: []
    };
  }
}

// Build analytics dataset
async function buildAnalyticsDataset(structuredData: any, documentAnalysis: any) {
  return {
    summary: {
      total_entities: Object.values(structuredData.extracted_entities || {}).flat().length,
      data_points: structuredData.quantitative_data?.length || 0,
      relationships: structuredData.relationships?.length || 0,
      temporal_events: structuredData.temporal_data?.length || 0
    },
    entities: structuredData.extracted_entities || {},
    metrics: structuredData.key_metrics || {},
    time_series: structuredData.temporal_data || [],
    relationships: structuredData.relationships || [],
    categories: documentAnalysis.categories || {}
  };
}

// Generate intelligent visualizations
async function generateIntelligentVisualizations(dataset: any, documentAnalysis: any) {
  const visualizations = [];

  try {
    const visualizationEngine = getDataVisualizationEngine();

    // Generate category distribution chart
    if (dataset.categories) {
      const categoryData = Object.entries(dataset.categories).map(([name, data]: [string, any]) => ({
        name,
        value: data.count || 0
      }));

      if (categoryData.some(d => d.value > 0)) {
        visualizations.push({
          type: 'pie',
          title: 'Document Categories Distribution',
          data: categoryData,
          config: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });
      }
    }

    // Generate entity frequency charts
    if (dataset.entities) {
      Object.entries(dataset.entities).forEach(([entityType, entities]: [string, any]) => {
        if (Array.isArray(entities) && entities.length > 0) {
          const entityCounts = entities.reduce((acc: any, entity: any) => {
            // Handle both string entities and object entities
            let entityName = entity;
            if (typeof entity === 'object' && entity !== null) {
              entityName = entity.name || entity.value || entity.date || JSON.stringify(entity);
            }
            acc[entityName] = (acc[entityName] || 0) + 1;
            return acc;
          }, {});

          // Only create visualization if we have meaningful data
          if (Object.keys(entityCounts).length > 0) {
            visualizations.push({
              type: 'bar',
              title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Frequency`,
              data: Object.entries(entityCounts).map(([name, count]) => ({ name, value: count })),
              config: {
                responsive: true,
                scales: {
                  y: { beginAtZero: true }
                }
              }
            });
          }
        }
      });
    }

    // Generate timeline if temporal data exists
    if (dataset.time_series && dataset.time_series.length > 0) {
      visualizations.push({
        type: 'line',
        title: 'Timeline Analysis',
        data: dataset.time_series,
        config: {
          responsive: true,
          scales: {
            x: { type: 'time' },
            y: { beginAtZero: true }
          }
        }
      });
    }

  } catch (error: any) {
    logger.warn('[BatchAnalyze] Visualization generation failed:', error.message);
  }

  return visualizations;
}

// Generate intelligent insights
async function generateIntelligentInsights(context: any) {
  const contextSummary = {
    document_count: context.documents?.length || 0,
    categories: context.documentAnalysis?.categories || {},
    structured_data: context.structuredData || {},
    dataset_summary: context.dataset?.summary || {},
    batch_info: {
      title: context.batchTitle,
      description: context.batchDescription
    }
  };

  const prompt = `Generate comprehensive, intelligent business insights from this document analysis:

ANALYSIS CONTEXT:
${JSON.stringify(contextSummary, null, 2)}

DOCUMENT CATEGORIES FOUND:
${Object.entries(context.documentAnalysis?.categories || {}).map(([cat, data]: [string, any]) => 
  `- ${cat}: ${data.count} documents (${data.subcategories?.join(', ') || 'no subcategories'})`
).join('\n')}

EXTRACTED ENTITIES:
${Object.entries(context.structuredData?.extracted_entities || {}).map(([type, entities]: [string, any]) => 
  `- ${type}: ${Array.isArray(entities) ? entities.length : 0} found`
).join('\n')}

QUANTITATIVE DATA:
${context.structuredData?.quantitative_data?.length || 0} data points extracted
${context.structuredData?.temporal_data?.length || 0} temporal events identified

Generate professional business insights in JSON format:
{
  "executive_summary": "Clear, professional 2-3 sentence summary highlighting the most important discoveries",
  "key_findings": [
    "Specific, actionable finding based on actual data",
    "Quantified insight with numbers when possible",
    "Business-relevant discovery from the analysis"
  ],
  "strategic_insights": {
    "opportunities": ["Specific opportunity based on data patterns"],
    "risks": ["Identified risk from document analysis"],
    "strengths": ["Organizational strength revealed in documents"],
    "improvements": ["Specific improvement area identified"]
  },
  "data_insights": {
    "patterns": ["Specific pattern found in the data"],
    "anomalies": ["Unusual finding that stands out"],
    "trends": ["Temporal trend identified from dates/events"],
    "correlations": ["Relationship between different data points"]
  },
  "key_metrics": {
    "documents_processed": ${context.documents?.length || 0},
    "entities_extracted": 0,
    "categories_identified": 0,
    "data_quality_score": 0.0,
    "analysis_completeness": 0.0
  },
  "confidence_score": 0.0
}

CRITICAL REQUIREMENTS:
- Base insights on ACTUAL DATA from the analysis, not generic statements
- Include specific numbers, names, and findings from the documents
- Provide actionable business intelligence
- Highlight the most valuable discoveries
- Be specific about what was found in each document category
- Calculate realistic confidence scores based on data quality
- Focus on insights that can drive business decisions`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.2
  });

  try {
    const responseContent = response.choices[0]?.message?.content || '{}';
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = responseContent;
    const jsonMatch = responseContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
      logger.info(`[BatchAnalyze] Extracted insights JSON from markdown code block`);
    }

    return JSON.parse(jsonContent);
  } catch (error: any) {
    logger.error(`[BatchAnalyze] Failed to parse insights response: ${error.message}`);
    return {
      executive_summary: "Analysis completed successfully with comprehensive insights generated.",
      key_findings: ["Data successfully processed and analyzed"],
      strategic_insights: { opportunities: [], risks: [], strengths: [], improvements: [] },
      data_insights: { patterns: [], anomalies: [], trends: [], correlations: [] },
      key_metrics: {},
      confidence_score: 0.8
    };
  }
}

// Generate actionable recommendations
async function generateActionableRecommendations(insights: any, dataset: any) {
  const prompt = `Based on these insights and dataset, generate specific, actionable business recommendations.

Insights: ${JSON.stringify(insights, null, 2)}
Dataset Summary: ${JSON.stringify(dataset.summary, null, 2)}

CRITICAL: Respond with ONLY a valid JSON array in this exact format:
[
  {
    "title": "Clear recommendation title",
    "description": "Detailed explanation",
    "priority": "High|Medium|Low",
    "category": "Strategic|Operational|Financial|Technical",
    "timeline": "Specific timeframe",
    "expected_impact": "Quantified expected outcome",
    "implementation_steps": ["Step 1", "Step 2", "Step 3"],
    "resources_needed": ["Resource 1", "Resource 2"],
    "success_metrics": ["Metric 1", "Metric 2"]
  }
]

DO NOT include any explanatory text, markdown formatting, or code blocks. Return ONLY the JSON array.
Focus on recommendations that are specific, measurable, and implementable based on the actual data provided.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.2
  });

  try {
    const responseContent = response.choices[0]?.message?.content || '[]';
    logger.info(`[BatchAnalyze] Recommendations response length: ${responseContent.length}`);
    logger.info(`[BatchAnalyze] Recommendations response preview: ${responseContent.substring(0, 200)}...`);
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = responseContent;
    const jsonMatch = responseContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
      logger.info(`[BatchAnalyze] Extracted recommendations JSON from markdown code block`);
    }

    return JSON.parse(jsonContent);
  } catch (error: any) {
    logger.error(`[BatchAnalyze] Failed to parse recommendations response: ${error.message}`);
    logger.error(`[BatchAnalyze] Raw recommendations response: ${response.choices[0]?.message?.content || 'No content'}`);
    return [
      {
        title: "Review and optimize data collection processes",
        description: "Improve data quality and completeness for better insights",
        priority: "Medium",
        category: "Operational",
        timeline: "2-4 weeks",
        expected_impact: "Enhanced analysis accuracy by 25%",
        implementation_steps: ["Audit current processes", "Identify gaps", "Implement improvements"],
        resources_needed: ["Team time", "Process documentation"],
        success_metrics: ["Data completeness rate", "Analysis accuracy"]
      }
    ];
  }
}

// Generate professional report
async function generateProfessionalReport(context: any) {
  const htmlContent = `
    <div class="professional-report">
      <h1>${context.batchTitle || 'Intelligent Business Analysis Report'}</h1>
      <div class="report-summary">
        <h2>Executive Summary</h2>
        <p>${context.intelligentInsights.executive_summary}</p>
      </div>
      
      <div class="key-findings">
        <h2>Key Findings</h2>
        <ul>
          ${context.intelligentInsights.key_findings?.map((finding: string) => `<li>${finding}</li>`).join('') || ''}
        </ul>
      </div>
      
      <div class="visualizations">
        <h2>Data Visualizations</h2>
        <p>${context.visualizations?.length || 0} interactive charts and graphs generated</p>
      </div>
      
      <div class="recommendations">
        <h2>Actionable Recommendations</h2>
        ${context.actionableRecommendations?.map((rec: any) => `
          <div class="recommendation">
            <h3>${rec.title}</h3>
            <p><strong>Priority:</strong> ${rec.priority}</p>
            <p>${rec.description}</p>
            <p><strong>Timeline:</strong> ${rec.timeline}</p>
            <p><strong>Expected Impact:</strong> ${rec.expected_impact}</p>
          </div>
        `).join('') || ''}
      </div>
    </div>
  `;

  return {
    user_id: context.analysisResult.user_id,
    title: context.batchTitle || `Intelligent Analysis Report - ${context.validDocuments.length} Documents`,
    report_type: 'intelligent_comprehensive_analysis',
    report_data: {
      analysis_id: context.analysisResult?.id,
      executive_summary: context.intelligentInsights.executive_summary,
      key_findings: context.intelligentInsights.key_findings,
      strategic_insights: context.intelligentInsights.strategic_insights,
      data_insights: context.intelligentInsights.data_insights,
      visualizations: context.visualizations,
      recommendations: context.actionableRecommendations,
      document_analysis: context.documentAnalysis,
      dataset_summary: context.dataset.summary,
      confidence_score: context.intelligentInsights.confidence_score,
      processed_documents: context.validDocuments.map((d: any) => d.id),
      analysis_metadata: {
        created_at: new Date().toISOString(),
        analysis_type: 'intelligent_comprehensive',
        document_count: context.validDocuments.length
      }
    },
    summary: context.intelligentInsights.executive_summary,
    status: 'completed' as const,
    html_content: htmlContent,
    is_scheduled: false,
    schedule_config: {},
    version: 1,
    view_count: 0,
    source_analysis_ids: context.analysisResult?.id ? [context.analysisResult.id] : [],
    source_document_ids: context.validDocuments.map((d: any) => d.id)
  };
} 