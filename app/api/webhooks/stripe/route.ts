import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

const stripe = new Stripe(appConfig.toolApiKeys?.stripe!, {
  typescript: true,
  appInfo: {
    name: 'Minato AI Companion',
    version: '2.0.0',
  },
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`[stripe-webhook] Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if this is a subscription payment
        if (paymentIntent.metadata?.subscription_type === 'pro_upgrade') {
          const userId = paymentIntent.metadata.minato_user_id;
          const priceId = paymentIntent.metadata.price_id;
          const customerId = paymentIntent.customer as string;
          const billingInterval = paymentIntent.metadata.billing_interval;

          // Create subscription
          const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
              minato_user_id: userId,
              subscription_type: 'pro_upgrade',
              billing_interval: billingInterval || 'month'
            }
          });

          // Update user profile
          await supabase
            .from('user_profiles')
            .update({
              plan_type: 'PRO',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          logger.info(`[stripe-webhook] Created subscription ${subscription.id} for user ${userId}`);
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        // Handle recurring subscription payments
        logger.info(`[stripe-webhook] Invoice payment succeeded: ${invoice.id}`);
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.minato_user_id;
        
        if (userId) {
          // Update user profile to reflect subscription cancellation
          await supabase
            .from('user_profiles')
            .update({
              plan_type: 'EXPIRED',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          logger.info(`[stripe-webhook] Subscription cancelled for user ${userId}`);
        }
        break;

      default:
        logger.info(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error(`[stripe-webhook] Error processing webhook: ${error.message}`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
} 