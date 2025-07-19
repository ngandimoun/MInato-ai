import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Initialize Stripe with the secret key
const stripeSecretKey = appConfig.toolApiKeys?.stripe;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

if (!stripeSecretKey) {
  logger.error('[stripe-webhooks-debug] STRIPE_SECRET_KEY is not configured.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  typescript: true,
}) : null;

/**
 * Debug endpoint for Stripe webhooks
 * This endpoint logs detailed information about incoming webhook events
 * without actually processing them, to help diagnose issues
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return new NextResponse('Stripe is not configured', { status: 500 });
  }

  try {
    // Get the raw request body as text
    const payload = await req.text();
    
    // Log the raw payload for debugging
    logger.info('[stripe-webhooks-debug] Raw payload received');
    
    // Get the Stripe signature header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('[stripe-webhooks-debug] Missing Stripe signature header');
      return new NextResponse('Missing Stripe signature header', { status: 400 });
    }

    // Log all headers for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    logger.info('[stripe-webhooks-debug] Request headers:', headers);

    let event: Stripe.Event;

    // Try to verify the webhook signature
    try {
      if (!stripeWebhookSecret) {
        logger.warn('[stripe-webhooks-debug] STRIPE_WEBHOOK_SIGNING_SECRET is not configured, skipping signature verification');
        // If webhook secret is not configured, parse the event without verification
        event = JSON.parse(payload) as Stripe.Event;
      } else {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
        logger.info('[stripe-webhooks-debug] Signature verification successful');
      }
    } catch (err: any) {
      logger.error(`[stripe-webhooks-debug] Webhook signature verification failed: ${err.message}`);
      return new NextResponse(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // Log event details
    logger.info(`[stripe-webhooks-debug] Event ID: ${event.id}`);
    logger.info(`[stripe-webhooks-debug] Event Type: ${event.type}`);
    logger.info(`[stripe-webhooks-debug] Event Created: ${new Date(event.created * 1000).toISOString()}`);
    
    // Log specific event data based on event type
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      logger.info(`[stripe-webhooks-debug] Checkout Session ID: ${session.id}`);
      logger.info(`[stripe-webhooks-debug] Payment Status: ${session.payment_status}`);
      logger.info(`[stripe-webhooks-debug] Customer: ${session.customer}`);
      logger.info(`[stripe-webhooks-debug] Client Reference ID: ${session.client_reference_id}`);
      logger.info(`[stripe-webhooks-debug] Metadata:`, session.metadata);
      logger.info(`[stripe-webhooks-debug] Amount Total: ${session.amount_total}`);
      logger.info(`[stripe-webhooks-debug] Currency: ${session.currency}`);
    }
    
    // Check if the event is already in the database
    const supabase = await createServerSupabaseClient();
    const { data: existingEvent } = await supabase
      .from('processed_stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single();
    
    if (existingEvent) {
      logger.info(`[stripe-webhooks-debug] Event ${event.id} already exists in database`);
    } else {
      logger.info(`[stripe-webhooks-debug] Event ${event.id} is new`);
      
      // Insert event into database for tracking
      try {
        await supabase
          .from('processed_stripe_events')
          .insert({ event_id: event.id });
        logger.info(`[stripe-webhooks-debug] Event ${event.id} inserted into database`);
      } catch (error: any) {
        logger.error(`[stripe-webhooks-debug] Failed to insert event into database: ${error.message}`);
      }
    }

    // Return a 200 response to acknowledge receipt of the event
    return new NextResponse(JSON.stringify({ 
      received: true,
      message: 'Debug information logged',
      eventId: event.id,
      eventType: event.type
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    logger.error(`[stripe-webhooks-debug] Webhook processing error: ${err.message}`);
    return new NextResponse(`Webhook error: ${err.message}`, { status: 500 });
  }
} 