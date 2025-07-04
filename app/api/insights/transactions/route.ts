import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getInsightsService } from '@/lib/services/InsightsService';
import { logger } from '@/memory-framework/config';

export async function GET(req: NextRequest) {
  const logPrefix = '[API:InsightsTransactions]';
  const cookieStore = cookies();

  try {
    // Authenticate user
    const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user?.id) {
      logger.error(`${logPrefix} Authentication failed:`, userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get transactions
    const insightsService = getInsightsService();
    const transactions = await insightsService.getUserTransactions({
      user_id: userId,
      limit,
      offset
    });

    logger.info(`${logPrefix} Retrieved ${transactions.length} transactions for user: ${userId.substring(0, 8)}`);

    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      description: transaction.description,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      currency: transaction.currency,
      category: transaction.category,
      transaction_date: transaction.transaction_date,
      is_recurring: transaction.is_recurring,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: transactions.length,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error retrieving transactions:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 