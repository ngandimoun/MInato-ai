// FILE: app/api/stripe/create-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Initialize Stripe with the secret key
const stripeSecretKey = appConfig.toolApiKeys?.stripe;

if (!stripeSecretKey) {
  logger.error('[create-subscription] STRIPE_SECRET_KEY is not configured.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  typescript: true,
}) : null;

// Minato Pro subscription configuration
const MINATO_PRO_PRICE_ID = process.env.STRIPE_MINATO_PRO_PRICE_ID;
const MINATO_PRO_PRODUCT_ID = process.env.STRIPE_MINATO_PRO_PRODUCT_ID;

interface CreateSubscriptionRequest {
  paymentMethodId?: string;
  priceId?: string;
  trialDays?: number;
}

interface CreateSubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<CreateSubscriptionResponse>> {
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
      logger.error('[create-subscription] Authentication error:', userError);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const userId = user.id;
    const userEmail = user.email;

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required for subscription'
      }, { status: 400 });
    }

    // Parse request body
    const body: CreateSubscriptionRequest = await req.json();
    
    // Get user's current subscription status
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('plan_type, stripe_customer_id, trial_end_date')
      .eq('id', userId)
      .single();

    if (profileError) {
      logger.error('[create-subscription] Error fetching user profile:', profileError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user profile'
      }, { status: 500 });
    }

    // Check if user already has an active subscription
    if (userProfile?.plan_type === 'PRO') {
      return NextResponse.json({
        success: false,
        error: 'User already has an active Pro subscription'
      }, { status: 400 });
    }

    let stripeCustomerId = userProfile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      logger.info(`[create-subscription] Creating new Stripe customer for user ${userId}`);
      
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          minato_user_id: userId
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Update user profile with Stripe customer ID
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
      
      if (updateError) {
        logger.error('[create-subscription] Error updating user with Stripe customer ID:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update user profile'
        }, { status: 500 });
      }
    }

    // Determine price ID to use
    const priceId = body.priceId || MINATO_PRO_PRICE_ID;
    if (!priceId) {
      logger.error('[create-subscription] No price ID provided and STRIPE_MINATO_PRO_PRICE_ID not configured');
      return NextResponse.json({
        success: false,
        error: 'Subscription pricing not configured'
      }, { status: 500 });
    }

    // Create subscription parameters
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        minato_user_id: userId
      }
    };

    // Add trial period if user is still in free trial
    if (userProfile?.plan_type === 'FREE_TRIAL' && userProfile?.trial_end_date) {
      const trialEnd = new Date(userProfile.trial_end_date);
      const now = new Date();
      
      if (trialEnd > now) {
        // Calculate remaining trial days
        const remainingTrialDays = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (remainingTrialDays > 0) {
          subscriptionParams.trial_period_days = remainingTrialDays;
          logger.info(`[create-subscription] Adding ${remainingTrialDays} trial days for user ${userId}`);
        }
      }
    }

    // Add custom trial days if specified
    if (body.trialDays && body.trialDays > 0) {
      subscriptionParams.trial_period_days = body.trialDays;
    }

    // Create the subscription
    logger.info(`[create-subscription] Creating subscription for user ${userId}`);
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Get the client secret for payment confirmation
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = (latestInvoice as any)?.payment_intent as Stripe.PaymentIntent;
    const clientSecret = paymentIntent?.client_secret;

    logger.info(`[create-subscription] Successfully created subscription ${subscription.id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: clientSecret || undefined
    });

  } catch (error: any) {
    logger.error('[create-subscription] Error creating subscription:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({
        success: false,
        error: error.message || 'Payment method was declined'
      }, { status: 400 });
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid subscription request'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create subscription'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve subscription details
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
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
      }
    });

  } catch (error: any) {
    logger.error('[create-subscription] Error retrieving subscription:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to retrieve subscription'
    }, { status: 500 });
  }
} 