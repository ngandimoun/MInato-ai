import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

interface UpdatePaymentLinkStatusRequest {
  stripePaymentLinkId: string;
  active: boolean;
}

interface UpdatePaymentLinkStatusResponse {
  success: boolean;
  error?: string;
}

/**
 * POST /api/stripe/update-payment-link-status
 * 
 * Updates the active status of a Stripe payment link
 */
export async function POST(req: NextRequest): Promise<NextResponse<UpdatePaymentLinkStatusResponse>> {
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
    const body: UpdatePaymentLinkStatusRequest = await req.json();
    
    // Validate required fields
    if (!body.stripePaymentLinkId) {
      return NextResponse.json({
        success: false,
        error: 'Stripe payment link ID is required'
      }, { status: 400 });
    }
    
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'Active status must be a boolean'
      }, { status: 400 });
    }
    
    // Verify ownership of the payment link
    const { data: paymentLink, error: fetchError } = await supabase
      .from('minato_payment_links')
      .select('id, user_id, stripe_account_id')
      .eq('stripe_payment_link_id', body.stripePaymentLinkId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !paymentLink) {
      logger.error(`[update-payment-link-status] Payment link not found or not owned by user: ${fetchError?.message}`);
      return NextResponse.json({
        success: false,
        error: 'Payment link not found or you do not have permission to modify it'
      }, { status: 404 });
    }
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[update-payment-link-status] Stripe secret key not configured');
      return NextResponse.json({
        success: false,
        error: 'Stripe integration not configured'
      }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      typescript: true,
      appInfo: {
        name: 'Minato AI Companion',
        version: '2.0.0',
      },
    });
    
    // Update the payment link status on Stripe
    logger.info(`[update-payment-link-status] Updating payment link ${body.stripePaymentLinkId} to active: ${body.active}`);
    
    await stripe.paymentLinks.update(body.stripePaymentLinkId, {
      active: body.active
    });
    
    // Update the status in Minato database
    const { error: updateError } = await supabase
      .from('minato_payment_links')
      .update({
        is_active_on_stripe: body.active,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_link_id', body.stripePaymentLinkId)
      .eq('user_id', userId);
    
    if (updateError) {
      logger.error(`[update-payment-link-status] Error updating database: ${updateError.message}`);
      // Don't fail the request as Stripe was already updated
    }
    
    logger.info(`[update-payment-link-status] Successfully updated payment link status`);
    
    return NextResponse.json({
      success: true
    });
    
  } catch (error: any) {
    logger.error(`[update-payment-link-status] Unexpected error: ${error.message}`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update payment link status'
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