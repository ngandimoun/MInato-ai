import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

interface ArchivePaymentLinkRequest {
  minatoPaymentLinkId: string;
}

interface ArchivePaymentLinkResponse {
  success: boolean;
  error?: string;
}

/**
 * POST /api/seller/archive-payment-link
 * 
 * Archives a payment link in Minato (soft delete)
 */
export async function POST(req: NextRequest): Promise<NextResponse<ArchivePaymentLinkResponse>> {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Parse request body
    const body: ArchivePaymentLinkRequest = await req.json();
    
    // Validate required fields
    if (!body.minatoPaymentLinkId) {
      return NextResponse.json({
        success: false,
        error: 'Minato payment link ID is required'
      }, { status: 400 });
    }
    
    // Verify ownership of the payment link
    const { data: paymentLink, error: fetchError } = await supabase
      .from('minato_payment_links')
      .select('id, user_id, name, is_archived')
      .eq('id', body.minatoPaymentLinkId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !paymentLink) {
      logger.error(`[archive-payment-link] Payment link not found or not owned by user: ${fetchError?.message}`);
      return NextResponse.json({
        success: false,
        error: 'Payment link not found or you do not have permission to modify it'
      }, { status: 404 });
    }
    
    // Check if already archived
    if (paymentLink.is_archived) {
      return NextResponse.json({
        success: false,
        error: 'Payment link is already archived'
      }, { status: 400 });
    }
    
    // Archive the payment link (soft delete)
    logger.info(`[archive-payment-link] Archiving payment link ${paymentLink.id} for user ${userId}`);
    
    const { error: updateError } = await supabase
      .from('minato_payment_links')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.minatoPaymentLinkId)
      .eq('user_id', userId);
    
    if (updateError) {
      logger.error(`[archive-payment-link] Error archiving payment link: ${updateError.message}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to archive payment link'
      }, { status: 500 });
    }
    
    logger.info(`[archive-payment-link] Successfully archived payment link: ${paymentLink.name}`);
    
    return NextResponse.json({
      success: true
    });
    
  } catch (error: any) {
    logger.error(`[archive-payment-link] Unexpected error: ${error.message}`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to archive payment link'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 