import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { STRIPE_CONFIG } from '@/lib/constants';

interface CreateCheckoutSessionRequest {
  email: string;
  annualBilling: boolean;
  returnUrl?: string;
}

interface CreateCheckoutSessionResponse {
  success: boolean;
  clientSecret?: string;
  error?: string;
}

/**
 * POST /api/subscription/create-checkout-session
 * 
 * Creates a Stripe Checkout Session for Minato Pro subscription
 * Uses the new Stripe Elements for a better checkout experience
 */
export async function POST(req: NextRequest): Promise<NextResponse<CreateCheckoutSessionResponse>> {
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
    const body: CreateCheckoutSessionRequest = await req.json();
    
    // Validate required fields
    if (!body.email?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }
    
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

    // ✅ Calculate pricing from lib/constants.ts
    const monthlyPriceCents = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS;
    const annualPriceCents = monthlyPriceCents * 12 * 0.8; // 20% discount for annual
    
    logger.info(`[create-checkout-session] Using price from lib/constants.ts: ${monthlyPriceCents} cents (${STRIPE_CONFIG.MINATO_PRO_PRICE_DISPLAY})`);
    
    // Create or get the product
    let product: Stripe.Product;
    const { data: existingProducts } = await stripe.products.list({
      limit: 100,
      active: true
    });
    
    // Filter by metadata after fetching
    const minatoProProduct = existingProducts.find(p => p.metadata?.name === 'minato_pro_subscription');
    
    if (minatoProProduct) {
      product = minatoProProduct;
      logger.info(`[create-checkout-session] Using existing product: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: 'Minato Pro Subscription',
        description: 'Unlock the full Minato experience with unlimited AI chat, creation tools, and premium features',
        metadata: {
          name: 'minato_pro_subscription',
          created_via: 'minato_api'
        }
      });
      logger.info(`[create-checkout-session] Created new product: ${product.id}`);
    }

    // Create or get the price
    const interval = body.annualBilling ? 'year' : 'month';
    const priceAmount = body.annualBilling ? annualPriceCents : monthlyPriceCents;
    
    let price: Stripe.Price;
    const { data: existingPrices } = await stripe.prices.list({
      limit: 100,
      active: true,
      product: product.id,
      recurring: { interval: interval as 'month' | 'year' }
    });
    
    // Find exact price match
    const exactPrice = existingPrices.find(p => 
      p.unit_amount === priceAmount && 
      p.currency === 'usd' && 
      p.recurring?.interval === interval
    );
    
    if (exactPrice) {
      price = exactPrice;
      logger.info(`[create-checkout-session] Using existing price: ${price.id}`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceAmount,
        currency: 'usd',
        recurring: {
          interval: interval as 'month' | 'year',
        },
        metadata: {
          billing_interval: interval,
          created_via: 'minato_api'
        }
      });
      logger.info(`[create-checkout-session] Created new price: ${price.id}`);
    }

    // Create or get customer
    let customer: Stripe.Customer;
    const { data: existingCustomers } = await stripe.customers.list({
      email: body.email,
      limit: 1
    });
    
    if (existingCustomers.length > 0) {
      customer = existingCustomers[0];
      logger.info(`[create-checkout-session] Using existing customer: ${customer.id}`);
    } else {
      customer = await stripe.customers.create({
        email: body.email,
        metadata: {
          minato_user_id: userId
        }
      });
      logger.info(`[create-checkout-session] Created new customer: ${customer.id}`);
    }

    // Create payment intent for subscription
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceAmount,
      currency: 'usd',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        subscription_type: 'pro_upgrade',
        minato_user_id: userId,
        billing_interval: interval,
        price_id: price.id,
        customer_email: body.email
      },
      setup_future_usage: 'off_session', // For future subscription payments
      receipt_email: body.email,
      description: `Minato Pro ${interval}ly subscription`,
    });

    logger.info(`[create-checkout-session] Created payment intent ${paymentIntent.id} for user ${userId} with amount ${priceAmount} cents`);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret || undefined,
      paymentIntentId: paymentIntent.id
    });

  } catch (error: any) {
    logger.error(`[create-checkout-session] Error creating checkout session: ${error.message}`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 });
  }
} 