/**
 * Insights Chat API Route
 * Handles interactive chat-based analysis queries
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";
import { getInsightsService } from "@/lib/services/InsightsService";
import { getInsightsOrchestrator } from "@/lib/services/insights-orchestrator";

export async function POST(req: NextRequest) {
  const logPrefix = "[API Insights Chat]";
  const cookieStore = cookies();

  try {
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Chat request from user: ${userId.substring(0, 8)}...`);

    const body = await req.json();
    const { query, chat_history, context } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const insightsService = getInsightsService();
    const orchestrator = getInsightsOrchestrator();

    // Get user's available data for context
    const [documents, transactions, analyses] = await Promise.all([
      insightsService.getUserDocuments({
        user_id: userId,
        status: ['completed'],
        limit: 20
      }),
      insightsService.getUserTransactions({
        user_id: userId,
        limit: 100
      }),
      insightsService.getUserAnalysisResults({
        user_id: userId,
        status: ['completed'],
        limit: 10
      })
    ]);

    // Handle insights chat
    const response = await orchestrator.handleInsightsChat(
      query,
      {
        documents,
        transactions,
        previousAnalyses: analyses
      },
      chat_history || [],
      context
    );

    logger.info(`${logPrefix} Chat response generated for user: ${userId.substring(0, 8)}`);

    // Count images separately
    const images = documents.filter(doc => doc.content_type === 'image');
    const regularDocuments = documents.filter(doc => doc.content_type !== 'image');

    return NextResponse.json({
      success: true,
      response,
      context: {
        documents_available: regularDocuments.length,
        images_available: images.length,
        transactions_available: transactions.length,
        analyses_available: analyses.length
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error during chat:`, error.message);
    return NextResponse.json({ 
      error: `Chat failed: ${error.message}` 
    }, { status: 500 });
  }
} 