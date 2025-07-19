import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

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

    // Calculate pricing
    const monthlyPriceCents = 2500; // $25.00
    const annualPriceCents = monthlyPriceCents * 12 * 0.8; // 20% discount
    
    // Create or get the product
    let product: Stripe.Product;
    const { data: existingProducts } = await stripe.products.list({
      limit: 1,
      active: true
    });
    
    // Filter by metadata after fetching
    const minatoProProduct = existingProducts.find(p => p.metadata?.name === 'minato_pro_subscription');
    
    if (minatoProProduct) {
      product = minatoProProduct;
    } else {
      product = await stripe.products.create({
        name: 'Minato Pro Subscription',
        description: 'Unlock the full Minato experience with unlimited AI chat, creation tools, and premium features',
        metadata: {
          name: 'minato_pro_subscription',
          created_via: 'minato_api'
        }
      });
    }

    // Create or get the price
    const interval = body.annualBilling ? 'year' : 'month';
    const priceAmount = body.annualBilling ? annualPriceCents : monthlyPriceCents;
    
    let price: Stripe.Price;
    const { data: existingPrices } = await stripe.prices.list({
      limit: 1,
      active: true,
      product: product.id,
      recurring: { interval: interval as 'month' | 'year' }
    });
    
    if (existingPrices.length > 0) {
      price = existingPrices[0];
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
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      customer_email: body.email,
      client_reference_id: userId,
      metadata: {
        subscription_type: 'pro_upgrade',
        minato_user_id: userId,
        billing_interval: interval,
        created_via: 'minato_checkout_session'
      },
      success_url: body.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/subscription?cancelled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      payment_method_collection: 'always',
      subscription_data: {
        metadata: {
          minato_user_id: userId,
          subscription_type: 'pro_upgrade',
          billing_interval: interval
        }
      }
    };

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    logger.info(`[create-checkout-session] Created checkout session ${checkoutSession.id} for user ${userId}`);

    return NextResponse.json({
      success: true,
      clientSecret: checkoutSession.client_secret || undefined
    });

  } catch (error: any) {
    logger.error(`[create-checkout-session] Error creating checkout session: ${error.message}`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create checkout session'
    }, { status: 500 });
  }
} 