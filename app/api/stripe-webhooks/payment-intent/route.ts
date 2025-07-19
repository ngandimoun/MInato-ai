import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

/**
 * POST /api/stripe-webhooks/payment-intent
 * 
 * Webhook to handle successful payment intents and activate subscriptions
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      logger.error('[payment-intent-webhook] No signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[payment-intent-webhook] Stripe secret key not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      typescript: true,
      appInfo: {
        name: 'Minato AI Companion',
        version: '2.0.0',
      },
    });
    
    // Verify webhook signature
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      logger.error('[payment-intent-webhook] Webhook secret not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err: any) {
      logger.error('[payment-intent-webhook] Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        logger.info(`[payment-intent-webhook] Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    logger.error('[payment-intent-webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const supabase = await createServerSupabaseClient();
  
  try {
    const userId = paymentIntent.metadata?.minato_user_id;
    const subscriptionType = paymentIntent.metadata?.subscription_type;
    const billingCycle = paymentIntent.metadata?.billing_cycle;
    
    if (!userId || subscriptionType !== 'pro_upgrade') {
      logger.warn('[payment-intent-webhook] Invalid payment intent metadata:', paymentIntent.metadata);
      return;
    }
    
    logger.info(`[payment-intent-webhook] Processing successful payment for user ${userId}`);
    
    // Update user profile to Pro
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        plan_type: 'PRO',
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: billingCycle === 'annual' 
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month
        billing_cycle: billingCycle || 'monthly',
        last_payment_date: new Date().toISOString(),
        payment_intent_id: paymentIntent.id
      })
      .eq('id', userId);
    
    if (updateError) {
      logger.error('[payment-intent-webhook] Error updating user profile:', updateError);
      return;
    }
    
    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: paymentIntent.customer as string,
        stripe_payment_intent_id: paymentIntent.id,
        plan_type: 'PRO',
        status: 'active',
        billing_cycle: billingCycle || 'monthly',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created_at: new Date().toISOString()
      });
    
    if (subscriptionError) {
      logger.error('[payment-intent-webhook] Error creating subscription record:', subscriptionError);
    }
    
    logger.info(`[payment-intent-webhook] Successfully upgraded user ${userId} to Pro`);
    
  } catch (error: any) {
    logger.error('[payment-intent-webhook] Error handling payment success:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const userId = paymentIntent.metadata?.minato_user_id;
    
    if (userId) {
      logger.warn(`[payment-intent-webhook] Payment failed for user ${userId}:`, paymentIntent.last_payment_error);
    }
    
    // You could send an email notification here or update user status
  } catch (error: any) {
    logger.error('[payment-intent-webhook] Error handling payment failure:', error);
  }
} 