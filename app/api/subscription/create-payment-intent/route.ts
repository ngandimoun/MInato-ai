import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { STRIPE_CONFIG } from '@/lib/constants';
import { StripePriceService } from '@/lib/services/StripePriceService';

/**
 * POST /api/subscription/create-payment-intent
 * 
 * Creates a Stripe Payment Intent for subscription checkout with Elements
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
  const userEmail = session.user.email;
  
  if (!userEmail) {
    return NextResponse.json({
      success: false,
      error: 'User email is required'
    }, { status: 400 });
  }
  
  try {
    // Parse request body
    const body = await req.json();
    const { email, annualBilling, returnUrl } = body;
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[create-payment-intent] Stripe secret key not configured');
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
    
    // Check if user already has a Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, plan_type')
      .eq('id', userId)
      .single();
    
    if (userError) {
      logger.error('[create-payment-intent] Error fetching user:', userError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user data'
      }, { status: 500 });
    }
    
    // Prevent upgrade if already Pro
    if (userData?.plan_type === 'PRO') {
      return NextResponse.json({
        success: false,
        error: 'User is already subscribed to Pro'
      }, { status: 400 });
    }
    
    let stripeCustomerId = userData?.stripe_customer_id;
    
    // ✅ Vérifier si le customer existe dans Stripe
    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId);
        logger.info(`[create-payment-intent] Existing Stripe customer ${stripeCustomerId} is valid`);
      } catch (error: any) {
        logger.warn(`[create-payment-intent] Stripe customer ${stripeCustomerId} not found, creating new customer`);
        stripeCustomerId = null;
        
        // Clear the invalid customer ID from database
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: null })
          .eq('id', userId);
      }
    }
    
    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      logger.info(`[create-payment-intent] Creating new Stripe customer for user ${userId}`);
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          minato_user_id: userId
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Update user with new Stripe customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
      
      logger.info(`[create-payment-intent] Created new Stripe customer ${stripeCustomerId} for user ${userId}`);
    }
    
    // ✅ Utiliser le service de prix automatique basé sur lib/constants.ts
    const priceService = new StripePriceService(stripe);
    const billingCycle = annualBilling ? 'annual' : 'monthly';
    
    // Récupérer ou créer automatiquement le prix basé sur lib/constants.ts
    const price = await priceService.getPrice(billingCycle);
    const amount = priceService.calculateAmount(billingCycle);
    
    logger.info(`[create-payment-intent] Using price ${price.id} for ${billingCycle} billing`);
    logger.info(`[create-payment-intent] Amount calculated from lib/constants.ts: ${amount} cents`);
    
    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: annualBilling ? amount : baseAmount, // For annual, charge full year upfront
      currency: STRIPE_CONFIG.MINATO_PRO_PRICE_CURRENCY,
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        minato_user_id: userId,
        subscription_type: 'pro_upgrade',
        minato_product_type: 'pro_subscription',
        billing_cycle: annualBilling ? 'annual' : 'monthly',
        return_url: returnUrl || ''
      },
      setup_future_usage: 'off_session', // For recurring payments
    });
    
    logger.info(`[create-payment-intent] Created payment intent ${paymentIntent.id} for user ${userId}`);
    logger.info(`[create-payment-intent] Amount: ${amount}, Billing: ${annualBilling ? 'annual' : 'monthly'}`);
    
    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
    
  } catch (error: any) {
    logger.error('[create-payment-intent] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    }, { status: 500 });
  }
} 