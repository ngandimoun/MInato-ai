import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { STRIPE_CONFIG } from '@/lib/constants';

// Initialize Stripe with the secret key
const stripeSecretKey = appConfig.toolApiKeys?.stripe;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

if (!stripeSecretKey) {
  logger.error('[stripe-webhooks] STRIPE_SECRET_KEY is not configured.');
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
        logger.info(`[stripe-webhooks] Event ${eventId} already processed, skipping`);
        return false;
      }
      logger.error(`[stripe-webhooks] Error checking idempotency for event ${eventId}:`, error);
      return false;
    }
    
    return true; // Event is new and can be processed
  } catch (error) {
    logger.error(`[stripe-webhooks] Idempotency check failed for event ${eventId}:`, error);
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
    logger.info(`[stripe-webhooks] Notification sent to user ${userId}: ${title}`);
  } catch (error) {
    logger.error(`[stripe-webhooks] Failed to send notification to user ${userId}:`, error);
  }
}

// Helper function to get user ID from Stripe account ID
async function getUserFromStripeAccount(stripeAccountId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  
  try {
    // Try user_profiles first, then fall back to other tables if needed
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('stripe_account_id', stripeAccountId)
      .single();
    
    if (error || !data) {
      // Try auth.users if accessible or other approaches
      logger.warn(`[stripe-webhooks] Could not find user for Stripe account ${stripeAccountId}`);
      return null;
    }
    
    return data.id;
  } catch (error) {
    logger.error(`[stripe-webhooks] Error finding user for Stripe account ${stripeAccountId}:`, error);
    return null;
  }
}

// Main event handler function
async function handleStripeEvent(event: Stripe.Event) {
  const supabase = await createServerSupabaseClient();
  
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      logger.info(`[stripe-webhooks] Processing checkout.session.completed: ${checkoutSession.id}`);
      
      // Check payment status
      if (checkoutSession.payment_status === 'paid') {
        
        // ✅ NOUVEAU: Gestion des abonnements Pro et achats de crédits
        const subscriptionType = checkoutSession.metadata?.subscription_type;
        const minatoUserId = checkoutSession.client_reference_id || checkoutSession.metadata?.minato_user_id;
        
        if (subscriptionType === 'pro_upgrade' && minatoUserId) {
          logger.info(`[stripe-webhooks] Processing Pro subscription upgrade for user ${minatoUserId}`);
          
          // Check for existing subscription to prevent duplicates
          const { data: existingSubscription } = await supabase
            .from('stripe_subscriptions')
            .select('id')
            .eq('user_id', minatoUserId)
            .eq('status', 'active')
            .single();
          
          if (existingSubscription) {
            logger.info(`[stripe-webhooks] User ${minatoUserId} already has an active subscription, skipping`);
            return;
          }

          // Get user's email for creating Stripe customer
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('id', minatoUserId)
            .single();
          
          if (userError || !userData) {
            logger.error(`[stripe-webhooks] Error fetching user data: ${userError?.message}`);
            return;
          }

          // Create or get Stripe customer
          let stripeCustomerId = null;
          
          // Check if user already has a Stripe customer ID
          const { data: existingCustomer } = await supabase
            .from('user_profiles')
            .select('stripe_customer_id')
            .eq('id', minatoUserId)
            .single();
          
          if (existingCustomer?.stripe_customer_id) {
            stripeCustomerId = existingCustomer.stripe_customer_id;
            logger.info(`[stripe-webhooks] Using existing Stripe customer: ${stripeCustomerId}`);
          } else {
            // Create new Stripe customer
            const customer = await stripe!.customers.create({
              email: userData.email,
              metadata: {
                minato_user_id: minatoUserId
              }
            });
            
            stripeCustomerId = customer.id;
            
            // Update user profile with Stripe customer ID
            await supabase
              .from('user_profiles')
              .update({ stripe_customer_id: stripeCustomerId })
              .eq('id', minatoUserId);
            
            logger.info(`[stripe-webhooks] Created new Stripe customer: ${stripeCustomerId}`);
          }

          // Create a subscription for this customer
          const product = await stripe!.products.create({
            name: 'Minato Pro Subscription',
            description: 'Unlock the full Minato experience with unlimited AI chat, creation tools, and premium features',
            metadata: {
              name: 'minato_pro_subscription',
              created_via: 'minato_webhook'
            }
          });

          const price = await stripe!.prices.create({
            product: product.id,
            unit_amount: STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS,
            currency: STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY,
            recurring: {
              interval: STRIPE_CONFIG.MINATO_PRO_PRICE_INTERVAL as 'month'
            },
            metadata: {
              minato_product_type: 'pro_subscription'
            }
          });

          // Create the subscription
          const subscription = await stripe!.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: price.id }],
            metadata: {
              minato_user_id: minatoUserId
            }
          });

          logger.info(`[stripe-webhooks] Created subscription ${subscription.id} for user ${minatoUserId}`);

          // Store subscription in database
          await supabase
            .from('stripe_subscriptions')
            .insert({
              user_id: minatoUserId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: stripeCustomerId,
              status: 'active',
              created_at: new Date().toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            });

          // Update user profile to PRO
          const subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
          
          await supabase
            .from('user_profiles')
            .update({
              plan_type: 'PRO',
              subscription_end_date: subscriptionEndDate,
              updated_at: new Date().toISOString()
            })
            .eq('id', minatoUserId);
          
          logger.info(`[stripe-webhooks] Successfully upgraded user ${minatoUserId} to PRO until ${subscriptionEndDate}`);
          return;
        }
        
        // ✅ NOUVEAU: Gestion des achats de crédits à usage unique
        if (subscriptionType === 'credits_purchase' && minatoUserId) {
          logger.info(`[stripe-webhooks] Processing credits purchase for user ${minatoUserId}`);
          
          const creditType = checkoutSession.metadata?.credit_type;
          const credits = parseInt(checkoutSession.metadata?.credits || '0');
          const packId = checkoutSession.metadata?.pack_id;
          
          if (!creditType || !credits || !packId) {
            logger.error(`[stripe-webhooks] Missing credit purchase metadata for user ${minatoUserId}`);
            return;
          }
          
          // Check for existing purchase to prevent duplicates
          const { data: existingPurchase } = await supabase
            .from('credit_purchases')
            .select('id')
            .eq('stripe_checkout_session_id', checkoutSession.id)
            .single();
          
          if (existingPurchase) {
            logger.info(`[stripe-webhooks] Credits purchase already processed for session ${checkoutSession.id}, skipping`);
            return;
          }
          
          // Get user's current credits
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('one_time_credits, subscription_end_date')
            .eq('id', minatoUserId)
            .single();
          
          if (userError || !userData) {
            logger.error(`[stripe-webhooks] Error fetching user data for credits purchase: ${userError?.message}`);
            return;
          }
          
          // Add credits to user's account
          const currentCredits = userData.one_time_credits || {
            leads: 0,
            recordings: 0,
            images: 0,
            videos: 0
          };
          
          const updatedCredits = {
            ...currentCredits,
            [creditType]: (currentCredits[creditType] || 0) + credits
          };
          
          // Update user's credits
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              one_time_credits: updatedCredits
            })
            .eq('id', minatoUserId);
          
          if (updateError) {
            logger.error(`[stripe-webhooks] Failed to update user credits: ${updateError.message}`);
            return;
          }
          
          // Record the purchase
          const { error: purchaseError } = await supabase
            .from('credit_purchases')
            .insert({
              user_id: minatoUserId,
              stripe_checkout_session_id: checkoutSession.id,
              credit_type: creditType,
              pack_id: packId,
              credits_purchased: credits,
              amount_paid: parseInt(checkoutSession.metadata?.amount || '0'),
              purchase_date: new Date().toISOString(),
              valid_until: userData.subscription_end_date,
              status: 'completed'
            });
          
          if (purchaseError) {
            logger.error(`[stripe-webhooks] Failed to record credit purchase: ${purchaseError.message}`);
            return;
          }
          
          logger.info(`[stripe-webhooks] Successfully processed credits purchase: ${credits} ${creditType} credits for user ${minatoUserId}`);
          return;
        }
        
        // ✅ EXISTANT: Gestion des ventes de vendeurs (code existant)
        // Check for session-specific idempotency to prevent duplicate sales
        const { data: existingSale } = await supabase
          .from('minato_sales')
          .select('id')
          .eq('stripe_checkout_session_id', checkoutSession.id)
          .single();
        
        if (existingSale) {
          logger.info(`[stripe-webhooks] Sale already exists for session ${checkoutSession.id}, skipping`);
          return;
        }
        
        // Extract metadata for seller sales
        const minatoProductId = checkoutSession.metadata?.minato_product_id;
        const minatoPaymentLinkId = checkoutSession.metadata?.minato_internal_link_id;
        
        if (!minatoUserId || !minatoPaymentLinkId) {
          logger.error(`[stripe-webhooks] Missing essential metadata in session ${checkoutSession.id}`);
          return;
        }
        
        // Extract sale details
        const amountTotalCents = checkoutSession.amount_total || 0;
        const currency = checkoutSession.currency || 'usd';
        const customerEmail = checkoutSession.customer_details?.email;
        const shippingDetails = (checkoutSession as any).shipping_details?.address || null;
        const stripePaymentIntentId = typeof checkoutSession.payment_intent === 'string' ? checkoutSession.payment_intent : null;
        
        // Calculate Minato fees (1%)
        const minatoFeePercent = 0.01;
        const minatoFeeCents = Math.round(amountTotalCents * minatoFeePercent);
        let netAmountForSellerCents = amountTotalCents - minatoFeeCents;
        
        // Get line items to determine quantity sold
        const lineItems = await stripe!.checkout.sessions.listLineItems(checkoutSession.id);
        const quantitySold = lineItems.data[0]?.quantity || 1;
        
        // Optional: Fetch Payment Intent for actual Stripe fees
        let stripeProcessingFeeCents = 0;
        let stripeChargeId = null;
        if (stripePaymentIntentId) {
          try {
            const paymentIntent = await stripe!.paymentIntents.retrieve(stripePaymentIntentId, {
              expand: ['latest_charge.balance_transaction']
            });
            const charge = paymentIntent.latest_charge as Stripe.Charge;
            stripeChargeId = charge?.id || null;
            stripeProcessingFeeCents = (charge?.balance_transaction as Stripe.BalanceTransaction)?.fee || 0;
            netAmountForSellerCents -= stripeProcessingFeeCents;
          } catch (error) {
            logger.warn(`[stripe-webhooks] Could not fetch Payment Intent details: ${error}`);
          }
        }
        
        // Insert sale record
        const { error: salesError } = await supabase
          .from('minato_sales')
          .insert({
            minato_payment_link_id: minatoPaymentLinkId,
            user_id: minatoUserId,
            stripe_checkout_session_id: checkoutSession.id,
            stripe_payment_intent_id: stripePaymentIntentId,
            stripe_charge_id: stripeChargeId,
            amount_total_cents: amountTotalCents,
            currency,
            minato_fee_cents: minatoFeeCents,
            stripe_processing_fee_cents: stripeProcessingFeeCents,
            net_amount_for_seller_cents: netAmountForSellerCents,
            customer_email: customerEmail,
            shipping_address: shippingDetails,
            quantity_sold: quantitySold
          });
        
        if (salesError) {
          logger.error(`[stripe-webhooks] Failed to insert sale record:`, salesError);
          return;
        }
        
        // Decrement inventory if applicable
        if (minatoProductId) {
          const { data: product, error: productError } = await supabase
            .from('minato_products')
            .select('inventory_quantity, name')
            .eq('id', minatoProductId)
            .single();
          
          if (!productError && product && product.inventory_quantity !== null) {
            const newQuantity = product.inventory_quantity - quantitySold;
            
            // Update inventory
            await supabase
              .from('minato_products')
              .update({ inventory_quantity: newQuantity })
              .eq('id', minatoProductId);
            
            // If sold out, deactivate payment link
            if (newQuantity <= 0) {
              // Get the stripe payment link ID
              const { data: paymentLink } = await supabase
                .from('minato_payment_links')
                .select('stripe_payment_link_id')
                .eq('id', minatoPaymentLinkId)
                .single();
              
              if (paymentLink?.stripe_payment_link_id) {
                try {
                  await stripe!.paymentLinks.update(paymentLink.stripe_payment_link_id, { active: false });
                  
                  // Update Minato database
                  await supabase
                    .from('minato_payment_links')
                    .update({ is_active_on_stripe: false })
                    .eq('id', minatoPaymentLinkId);
                  
                  // Notify seller
                  await sendNotification(
                    minatoUserId,
                    'Product Sold Out!',
                    `Your product '${product.name}' is now sold out! The payment link has been automatically deactivated.`,
                    'warning',
                    '/dashboard'
                  );
                } catch (error) {
                  logger.error(`[stripe-webhooks] Failed to deactivate payment link:`, error);
                }
              }
            }
          }
        }
        
        // Send success notification to seller
        const amount = (amountTotalCents / 100).toFixed(2);
        await sendNotification(
          minatoUserId,
          'New Sale! 🎉',
          `Congratulations! You just made a sale for ${amount} ${currency.toUpperCase()}. Check your dashboard for details.`,
          'success',
          '/dashboard'
        );
        
        logger.info(`[stripe-webhooks] Successfully processed sale for session ${checkoutSession.id}`);
      } else {
        logger.info(`[stripe-webhooks] Session ${checkoutSession.id} payment status: ${checkoutSession.payment_status}`);
      }
      break;
      
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionUserId = subscription.metadata?.minato_user_id;
      
      if (subscriptionUserId) {
        logger.info(`[stripe-webhooks] Processing subscription ${event.type} for user ${subscriptionUserId}`);
        
        if (event.type === 'customer.subscription.deleted') {
          // Downgrade user to EXPIRED
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              plan_type: 'EXPIRED',
              subscription_end_date: new Date().toISOString()
            })
            .eq('id', subscriptionUserId);
          
          if (updateError) {
            logger.error(`[stripe-webhooks] Failed to update user subscription status: ${updateError.message}`);
          } else {
            logger.info(`[stripe-webhooks] Successfully updated user ${subscriptionUserId} to EXPIRED`);
          }
        }
      }
      break;
      
    case 'account.updated':
      const account = event.data.object as Stripe.Account;
      const minatoUserId = account.metadata?.minato_user_id;
      
      if (minatoUserId) {
        try {
          // Fetch full account details to determine verification status
          const fullAccount = await stripe!.accounts.retrieve(account.id);
          
          // Determine if account is fully verified and capable
          const isFullyVerifiedAndCapable = 
            fullAccount.details_submitted &&
            fullAccount.charges_enabled &&
            fullAccount.payouts_enabled &&
            (!fullAccount.requirements?.currently_due || fullAccount.requirements.currently_due?.length === 0) &&
            (!fullAccount.requirements?.past_due || fullAccount.requirements.past_due?.length === 0);
          
          // Update user's Stripe onboarding status
          const { error } = await supabase
            .from('user_profiles')
            .update({ stripe_onboarding_complete: isFullyVerifiedAndCapable })
            .eq('id', minatoUserId);
          
          if (error) {
            logger.error(`[stripe-webhooks] Failed to update user onboarding status:`, error);
          }
          
          // If account has issues, notify the user
          if (!isFullyVerifiedAndCapable && (
            (fullAccount.requirements?.currently_due?.length || 0) > 0 || 
            (fullAccount.requirements?.past_due?.length || 0) > 0
          )) {
            await sendNotification(
              minatoUserId,
              'Action Required: Stripe Account',
              'Stripe requires updated information for your seller account to ensure continued service. Please visit your Seller Account Settings to complete the necessary steps.',
              'warning',
              '/dashboard'
            );
          }
          
          logger.info(`[stripe-webhooks] Updated account verification status for user ${minatoUserId}: ${isFullyVerifiedAndCapable}`);
        } catch (error) {
          logger.error(`[stripe-webhooks] Error processing account.updated:`, error);
        }
      }
      break;
      
    case 'payment_link.updated':
      const paymentLink = event.data.object as Stripe.PaymentLink;
      const minatoPaymentLinkIdFromMeta = paymentLink.metadata?.minato_internal_link_id;
      const minatoUserIdFromMeta = paymentLink.metadata?.minato_user_id;
      
      if (minatoPaymentLinkIdFromMeta) {
        // Sync active status
        await supabase
          .from('minato_payment_links')
          .update({ is_active_on_stripe: paymentLink.active })
          .eq('id', minatoPaymentLinkIdFromMeta);
        
        // If deactivated due to sales limit, notify seller
        if (!paymentLink.active && minatoUserIdFromMeta) {
          // Check if it was deactivated due to sales limit
          if (paymentLink.restrictions?.completed_sessions?.limit) {
            await sendNotification(
              minatoUserIdFromMeta,
              'Payment Link Auto-Deactivated',
              'Your payment link has been automatically deactivated because it reached the sales limit you set.',
              'info',
              '/dashboard'
            );
          }
        }
        
        logger.info(`[stripe-webhooks] Synced payment link status: ${paymentLink.id}, active: ${paymentLink.active}`);
      }
      break;
      
    case 'invoice.paid':
      const paidInvoice = event.data.object as Stripe.Invoice;
      const stripeCheckoutSessionId = (paidInvoice as any).checkout_session as string;
      
      if (stripeCheckoutSessionId) {
        // Update sale record with invoice details
        await supabase
          .from('minato_sales')
          .update({
            sale_status: 'invoiced',
            stripe_invoice_id: paidInvoice.id,
            invoice_pdf_url: paidInvoice.invoice_pdf
          })
          .eq('stripe_checkout_session_id', stripeCheckoutSessionId);
        
        logger.info(`[stripe-webhooks] Updated sale with invoice details: ${paidInvoice.id}`);
      }
      break;
      
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      const failedSessionId = (failedInvoice as any).checkout_session as string;
      
      if (failedSessionId) {
        // Update sale status
        const { data: sale } = await supabase
          .from('minato_sales')
          .select('user_id')
          .eq('stripe_checkout_session_id', failedSessionId)
          .single();
        
        if (sale) {
          await supabase
            .from('minato_sales')
            .update({ sale_status: 'invoice_failed' })
            .eq('stripe_checkout_session_id', failedSessionId);
          
          // Notify seller
          await sendNotification(
            sale.user_id,
            'Invoice Payment Failed',
            'There was an issue with an invoice payment. Please check your Stripe Dashboard for details.',
            'error',
            '/dashboard'
          );
        }
        
        logger.info(`[stripe-webhooks] Updated sale status for failed invoice: ${failedInvoice.id}`);
      }
      break;
      
    case 'charge.dispute.created':
      const dispute = event.data.object as Stripe.Dispute;
      const connectedAccountId = event.account;
      
      if (connectedAccountId) {
        const userId = await getUserFromStripeAccount(connectedAccountId);
        
        if (userId) {
          // Update sale status if we can find it
          await supabase
            .from('minato_sales')
            .update({ sale_status: 'disputed' })
            .eq('stripe_charge_id', dispute.charge as string);
          
          // Notify seller
          const amount = (dispute.amount / 100).toFixed(2);
          await sendNotification(
            userId,
            'Action Required: Charge Dispute',
            `A customer has disputed a charge of ${amount} ${dispute.currency.toUpperCase()}. Please log in to your Stripe Express Dashboard immediately to review and respond to this dispute.`,
            'error'
          );
          
          logger.info(`[stripe-webhooks] Processed dispute for charge: ${dispute.charge}`);
        }
      }
      break;
      
    case 'application_fee.created':
      const appFee = event.data.object as Stripe.ApplicationFee;
      logger.info(`[stripe-webhooks] Application fee created: ${appFee.id}, amount: ${appFee.amount}`);
      // This can be used for internal revenue tracking if needed
      break;
      
    default:
      logger.debug(`[stripe-webhooks] Unhandled event type: ${event.type}`);
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
      logger.warn('[stripe-webhooks] Missing Stripe signature header');
      return new NextResponse('Missing Stripe signature header', { status: 400 });
    }

    let event: Stripe.Event;

    // Verify the webhook signature
    try {
      if (!stripeWebhookSecret) {
        logger.warn('[stripe-webhooks] STRIPE_WEBHOOK_SIGNING_SECRET is not configured, skipping signature verification');
        // If webhook secret is not configured, parse the event without verification
        event = JSON.parse(payload) as Stripe.Event;
      } else {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
      }
    } catch (err: any) {
      logger.error(`[stripe-webhooks] Webhook signature verification failed: ${err.message}`);
      return new NextResponse(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // Check idempotency to prevent duplicate processing
    const canProcess = await checkEventIdempotency(event.id);
    if (!canProcess) {
      return new NextResponse('Event already processed', { status: 200 });
    }

    logger.info(`[stripe-webhooks] Processing event: ${event.id}, type: ${event.type}`);

    // Process the event asynchronously but acknowledge receipt immediately
    try {
      await handleStripeEvent(event);
      logger.info(`[stripe-webhooks] Successfully processed event: ${event.id}`);
    } catch (processingError: any) {
      logger.error(`[stripe-webhooks] Error processing event ${event.id}:`, processingError);
      // Still return 200 to acknowledge receipt, but log the error for investigation
    }

    // Return a 200 response to acknowledge receipt of the event
    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    logger.error(`[stripe-webhooks] Webhook processing error: ${err.message}`);
    return new NextResponse(`Webhook error: ${err.message}`, { status: 500 });
  }
} 