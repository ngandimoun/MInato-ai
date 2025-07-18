// FILE: app/api/stripe/cancel-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Initialize Stripe with the secret key
const stripeSecretKey = appConfig.toolApiKeys?.stripe;

if (!stripeSecretKey) {
  logger.error('[cancel-subscription] STRIPE_SECRET_KEY is not configured.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  typescript: true,
}) : null;

interface CancelSubscriptionRequest {
  subscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
}

interface CancelSubscriptionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<CancelSubscriptionResponse>> {
  if (!stripe) {
    return NextResponse.json({
      success: false,
      error: 'Stripe is not configured'
    }, { status: 500 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.error('[cancel-subscription] Authentication error:', userError);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const userId = user.id;

    // Parse request body
    const body: CancelSubscriptionRequest = await req.json();
    
    // Get user's Stripe customer ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile?.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        error: 'No subscription found'
      }, { status: 404 });
    }

    let subscriptionId = body.subscriptionId;

    // If no subscription ID provided, find the active subscription
    if (!subscriptionId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: userProfile.stripe_customer_id,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No active subscription found'
        }, { status: 404 });
      }

      subscriptionId = subscriptions.data[0].id;
    }

    // Cancel the subscription
    const cancelAtPeriodEnd = body.cancelAtPeriodEnd !== false; // Default to true
    
    if (cancelAtPeriodEnd) {
      // Cancel at period end (recommended)
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });

      logger.info(`[cancel-subscription] Scheduled cancellation for subscription ${subscriptionId} for user ${userId}`);

      return NextResponse.json({
        success: true,
        message: `Your subscription will be cancelled at the end of the current billing period (${new Date((subscription as any).current_period_end * 1000).toLocaleDateString()}). You can reactivate it anytime before then.`
      });
    } else {
      // Cancel immediately
      const subscription = await stripe.subscriptions.cancel(subscriptionId);

      logger.info(`[cancel-subscription] Immediately cancelled subscription ${subscriptionId} for user ${userId}`);

      return NextResponse.json({
        success: true,
        message: 'Your subscription has been cancelled immediately. You will lose access to Pro features at the end of the current billing period.'
      });
    }

  } catch (error: any) {
    logger.error('[cancel-subscription] Error cancelling subscription:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid subscription ID or subscription not found'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel subscription'
    }, { status: 500 });
  }
}

// GET endpoint to check if subscription is scheduled for cancellation
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!stripe) {
    return NextResponse.json({
      success: false,
      error: 'Stripe is not configured'
    }, { status: 500 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const userId = user.id;

    // Get user's Stripe customer ID
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile?.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        error: 'No subscription found'
      }, { status: 404 });
    }

    // Get active subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: userProfile.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active subscription found'
      }, { status: 404 });
    }

    const subscription = subscriptions.data[0];

    return NextResponse.json({
      success: true,
      isCancelled: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString()
    });

  } catch (error: any) {
    logger.error('[cancel-subscription] Error checking subscription status:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check subscription status'
    }, { status: 500 });
  }
} 