import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { STRIPE_CONFIG } from '@/lib/constants';

/**
 * POST /api/payments/create-checkout-session
 * 
 * Crée une session de paiement Stripe pour l'upgrade vers Pro
 */
export async function POST(req: NextRequest) {
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
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[create-checkout-session] Stripe secret key not configured');
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

    // Get user's current plan to prevent duplicate upgrades
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('plan_type, email')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      logger.error(`[create-checkout-session] Error fetching user data: ${userError?.message}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user data'
      }, { status: 500 });
    }

    // Check if user is already PRO
    if (userData.plan_type === 'PRO') {
      return NextResponse.json({
        success: false,
        error: 'User already has Pro subscription'
      }, { status: 400 });
    }

    // Create or get Stripe customer
    let customerId = null;
    
    // Check if user already has a Stripe customer ID
    const { data: existingCustomer } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      // ✅ NOUVEAU: Vérifier si le customer existe dans Stripe
      try {
        // Try to retrieve the customer from Stripe
        await stripe.customers.retrieve(existingCustomer.stripe_customer_id);
        customerId = existingCustomer.stripe_customer_id;
        logger.info(`[create-checkout-session] Existing Stripe customer ${customerId} is valid`);
      } catch (error: any) {
        // Customer doesn't exist in Stripe, clear it and create a new one
        logger.warn(`[create-checkout-session] Stripe customer ${existingCustomer.stripe_customer_id} not found, creating new customer`);
        
        // Clear the invalid customer ID from database
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: null })
          .eq('id', userId);
      }
    }
    
    if (!customerId) {
      // Create new Stripe customer
      logger.info(`[create-checkout-session] Creating new Stripe customer for user ${userId}`);
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          minato_user_id: userId
        }
      });
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
      
      logger.info(`[create-checkout-session] Created new Stripe customer ${customerId} for user ${userId}`);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: userId, // ✅ CRUCIAL: Pass userId for webhook processing
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY,
            product_data: {
              name: 'Minato AI Pro Subscription',
              description: 'Unlimited access to all Minato AI features',
              images: ['https://minato.ai/logo.png'], // Replace with actual logo URL
            },
            unit_amount: STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS,
            recurring: {
              interval: STRIPE_CONFIG.MINATO_PRO_PRICE_INTERVAL
            }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/subscription?cancelled=true`,
      metadata: {
        subscription_type: 'pro_upgrade', // ✅ CRUCIAL: For webhook processing
        minato_user_id: userId
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    logger.info(`[create-checkout-session] Created checkout session ${session.id} for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      checkoutUrl: session.url
    });
    
  } catch (error: any) {
    logger.error('[create-checkout-session] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 });
  }
} 