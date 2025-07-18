// FILE: app/api/stripe-webhooks/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Initialize Stripe with the secret key
const stripeSecretKey = appConfig.toolApiKeys?.stripe;
const stripeWebhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  logger.error('[subscription-webhooks] STRIPE_SECRET_KEY is not configured.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  typescript: true,
}) : null;

// Helper function to check idempotency
async function checkEventIdempotency(eventId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: eventId });
    
    if (error) {
      // If error is due to unique constraint violation, event was already processed
      if (error.code === '23505') { // Unique violation
        logger.info(`[subscription-webhooks] Event ${eventId} already processed, skipping`);
        return false;
      }
      logger.error(`[subscription-webhooks] Error checking idempotency for event ${eventId}:`, error);
      return false;
    }
    
    return true; // Event is new and can be processed
  } catch (error) {
    logger.error(`[subscription-webhooks] Idempotency check failed for event ${eventId}:`, error);
    return false;
  }
}

// Helper function to send in-app notification
async function sendNotification(userId: string, title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', relatedLink?: string) {
  const supabase = await createServerSupabaseClient();
  
  try {
    await supabase
      .from('minato_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        related_link: relatedLink
      });
    logger.info(`[subscription-webhooks] Notification sent to user ${userId}: ${title}`);
  } catch (error) {
    logger.error(`[subscription-webhooks] Failed to send notification to user ${userId}:`, error);
  }
}

// Helper function to get user ID from Stripe customer ID
async function getUserFromStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();
    
    if (error || !data) {
      logger.warn(`[subscription-webhooks] Could not find user for Stripe customer ${stripeCustomerId}`);
      return null;
    }
    
    return data.id;
  } catch (error) {
    logger.error(`[subscription-webhooks] Error finding user for Stripe customer ${stripeCustomerId}:`, error);
    return null;
  }
}

// Helper function to update user subscription status
async function updateUserSubscription(
  userId: string, 
  planType: 'FREE_TRIAL' | 'PRO' | 'EXPIRED',
  subscriptionEndDate?: string | null,
  stripeCustomerId?: string | null
) {
  const supabase = await createServerSupabaseClient();
  
  try {
    const updateData: any = {
      plan_type: planType,
      updated_at: new Date().toISOString()
    };

    if (subscriptionEndDate !== undefined) {
      updateData.subscription_end_date = subscriptionEndDate;
    }

    if (stripeCustomerId !== undefined) {
      updateData.stripe_customer_id = stripeCustomerId;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      logger.error(`[subscription-webhooks] Failed to update user subscription:`, error);
      return false;
    }

    logger.info(`[subscription-webhooks] Updated user ${userId} subscription to ${planType}`);
    return true;
  } catch (error) {
    logger.error(`[subscription-webhooks] Error updating user subscription:`, error);
    return false;
  }
}

// Main event handler function
async function handleSubscriptionEvent(event: Stripe.Event) {
  const supabase = await createServerSupabaseClient();
  
  switch (event.type) {
    case 'customer.subscription.created':
      const createdSubscription = event.data.object as Stripe.Subscription;
      logger.info(`[subscription-webhooks] Processing customer.subscription.created: ${createdSubscription.id}`);
      
      const createdCustomerId = createdSubscription.customer as string;
      const createdUserId = await getUserFromStripeCustomer(createdCustomerId);
      
      if (createdUserId) {
        // Calculate subscription end date
        const subscriptionEndDate = new Date((createdSubscription as any).current_period_end * 1000).toISOString();
        
        // Update user to PRO plan
        await updateUserSubscription(
          createdUserId, 
          'PRO', 
          subscriptionEndDate,
          createdCustomerId
        );

        // Send welcome notification
        await sendNotification(
          createdUserId,
          'Welcome to Minato Pro! 🎉',
          'Your Minato Pro subscription has been activated. Enjoy unlimited access to all premium features!',
          'success',
          '/dashboard'
        );

        logger.info(`[subscription-webhooks] Successfully activated Pro subscription for user ${createdUserId}`);
      }
      break;

    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      logger.info(`[subscription-webhooks] Processing customer.subscription.updated: ${updatedSubscription.id}`);
      
      const updatedCustomerId = updatedSubscription.customer as string;
      const updatedUserId = await getUserFromStripeCustomer(updatedCustomerId);
      
      if (updatedUserId) {
        if (updatedSubscription.status === 'active') {
          // Subscription is active
          const subscriptionEndDate = new Date((updatedSubscription as any).current_period_end * 1000).toISOString();
          
          await updateUserSubscription(
            updatedUserId, 
            'PRO', 
            subscriptionEndDate
          );

          await sendNotification(
            updatedUserId,
            'Subscription Updated',
            'Your Minato Pro subscription has been updated successfully.',
            'success',
            '/dashboard'
          );
        } else if (updatedSubscription.status === 'past_due') {
          // Subscription is past due
          await sendNotification(
            updatedUserId,
            'Payment Required',
            'Your Minato Pro subscription payment is past due. Please update your payment method to continue enjoying Pro features.',
            'warning',
            '/billing'
          );
        } else if (updatedSubscription.status === 'unpaid') {
          // Subscription is unpaid
          await sendNotification(
            updatedUserId,
            'Payment Failed',
            'Your Minato Pro subscription payment failed. Please update your payment method to restore Pro access.',
            'error',
            '/billing'
          );
        }

        logger.info(`[subscription-webhooks] Updated subscription status for user ${updatedUserId}: ${updatedSubscription.status}`);
      }
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      logger.info(`[subscription-webhooks] Processing customer.subscription.deleted: ${deletedSubscription.id}`);
      
      const deletedCustomerId = deletedSubscription.customer as string;
      const deletedUserId = await getUserFromStripeCustomer(deletedCustomerId);
      
      if (deletedUserId) {
        // Set user to EXPIRED plan
        await updateUserSubscription(
          deletedUserId, 
          'EXPIRED', 
          null
        );

        // Send cancellation notification
        await sendNotification(
          deletedUserId,
          'Subscription Cancelled',
          'Your Minato Pro subscription has been cancelled. You can still access basic features, but Pro features are no longer available.',
          'info',
          '/upgrade'
        );

        logger.info(`[subscription-webhooks] Cancelled subscription for user ${deletedUserId}`);
      }
      break;

    case 'invoice.payment_succeeded':
      const succeededInvoice = event.data.object as Stripe.Invoice;
      logger.info(`[subscription-webhooks] Processing invoice.payment_succeeded: ${succeededInvoice.id}`);
      
      if ((succeededInvoice as any).subscription) {
        const succeededCustomerId = succeededInvoice.customer as string;
        const succeededUserId = await getUserFromStripeCustomer(succeededCustomerId);
        
        if (succeededUserId) {
          // Get subscription details
          const subscription = await stripe!.subscriptions.retrieve((succeededInvoice as any).subscription as string);
          const subscriptionEndDate = new Date((subscription as any).current_period_end * 1000).toISOString();
          
          // Update subscription end date
          await updateUserSubscription(
            succeededUserId, 
            'PRO', 
            subscriptionEndDate
          );

          // Send payment confirmation
          const amount = (succeededInvoice.amount_paid / 100).toFixed(2);
          await sendNotification(
            succeededUserId,
            'Payment Successful',
            `Your Minato Pro payment of $${amount} has been processed successfully. Your subscription is active until ${new Date((subscription as any).current_period_end * 1000).toLocaleDateString()}.`,
            'success',
            '/dashboard'
          );

          logger.info(`[subscription-webhooks] Payment succeeded for user ${succeededUserId}`);
        }
      }
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      logger.info(`[subscription-webhooks] Processing invoice.payment_failed: ${failedInvoice.id}`);
      
      if ((failedInvoice as any).subscription) {
        const failedCustomerId = failedInvoice.customer as string;
        const failedUserId = await getUserFromStripeCustomer(failedCustomerId);
        
        if (failedUserId) {
          await sendNotification(
            failedUserId,
            'Payment Failed',
            'Your Minato Pro subscription payment failed. Please update your payment method to continue enjoying Pro features.',
            'error',
            '/billing'
          );

          logger.info(`[subscription-webhooks] Payment failed for user ${failedUserId}`);
        }
      }
      break;

    case 'customer.created':
      const createdCustomer = event.data.object as Stripe.Customer;
      logger.info(`[subscription-webhooks] Processing customer.created: ${createdCustomer.id}`);
      
      // If customer has metadata with user ID, update the user profile
      if (createdCustomer.metadata?.minato_user_id) {
        const userId = createdCustomer.metadata.minato_user_id;
        
        await updateUserSubscription(
          userId, 
          'FREE_TRIAL', // Keep as FREE_TRIAL until subscription is created
          null,
          createdCustomer.id
        );

        logger.info(`[subscription-webhooks] Created Stripe customer for user ${userId}`);
      }
      break;

    case 'customer.updated':
      const customerUpdated = event.data.object as Stripe.Customer;
      logger.info(`[subscription-webhooks] Processing customer.updated: ${customerUpdated.id}`);
      
      // Update customer information if needed
      const customerUpdatedUserId = await getUserFromStripeCustomer(customerUpdated.id);
      if (customerUpdatedUserId) {
        // You can add logic here to sync customer data if needed
        logger.info(`[subscription-webhooks] Updated Stripe customer for user ${customerUpdatedUserId}`);
      }
      break;

    case 'customer.deleted':
      const customerDeleted = event.data.object as Stripe.Customer;
      logger.info(`[subscription-webhooks] Processing customer.deleted: ${customerDeleted.id}`);
      
      const customerDeletedUserId = await getUserFromStripeCustomer(customerDeleted.id);
      if (customerDeletedUserId) {
        // Set user to EXPIRED plan when customer is deleted
        await updateUserSubscription(
          customerDeletedUserId, 
          'EXPIRED', 
          null,
          null
        );

        logger.info(`[subscription-webhooks] Deleted Stripe customer for user ${customerDeletedUserId}`);
      }
      break;

    default:
      logger.debug(`[subscription-webhooks] Unhandled event type: ${event.type}`);
  }
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return new NextResponse('Stripe is not configured', { status: 500 });
  }

  try {
    // Get the raw request body as text
    const payload = await req.text();
    
    // Get the Stripe signature header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('[subscription-webhooks] Missing Stripe signature header');
      return new NextResponse('Missing Stripe signature header', { status: 400 });
    }

    let event: Stripe.Event;

    // Verify the webhook signature
    try {
      if (!stripeWebhookSecret) {
        logger.warn('[subscription-webhooks] STRIPE_SUBSCRIPTION_WEBHOOK_SECRET is not configured, skipping signature verification');
        // If webhook secret is not configured, parse the event without verification
        event = JSON.parse(payload) as Stripe.Event;
      } else {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
      }
    } catch (err: any) {
      logger.error(`[subscription-webhooks] Webhook signature verification failed: ${err.message}`);
      return new NextResponse(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // Check idempotency to prevent duplicate processing
    const canProcess = await checkEventIdempotency(event.id);
    if (!canProcess) {
      return new NextResponse('Event already processed', { status: 200 });
    }

    logger.info(`[subscription-webhooks] Processing event: ${event.id}, type: ${event.type}`);

    // Process the event asynchronously but acknowledge receipt immediately
    try {
      await handleSubscriptionEvent(event);
      logger.info(`[subscription-webhooks] Successfully processed event: ${event.id}`);
    } catch (processingError: any) {
      logger.error(`[subscription-webhooks] Error processing event ${event.id}:`, processingError);
      // Still return 200 to acknowledge receipt, but log the error for investigation
    }

    // Return a 200 response to acknowledge receipt of the event
    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    logger.error(`[subscription-webhooks] Webhook processing error: ${err.message}`);
    return new NextResponse(`Webhook error: ${err.message}`, { status: 500 });
  }
} 