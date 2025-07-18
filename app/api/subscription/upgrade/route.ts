import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { STRIPE_CONFIG } from '@/lib/constants';

/**
 * POST /api/subscription/upgrade
 * 
 * Creates a Stripe checkout session for upgrading to Minato Pro
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
    // Parse request body to get return URL
    const body = await req.json();
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/subscription`;
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[subscription-upgrade] Stripe secret key not configured');
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
      logger.error('[subscription-upgrade] Error fetching user:', userError);
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
    
    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          minato_user_id: userId
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
    }
    
    // Create or get the Pro subscription product/price
    // Note: In production, these should be created once and reused
    const product = await stripe.products.create({
      name: 'Minato Pro',
      description: 'Unlock the full Minato experience with: Core Features - Unlimited AI Chat Conversations, Persistent Memory & Conversation History. Creation Hub - AI-Powered Lead Generation Tools, 30 AI-Generated Images per Month, 20 AI-Generated Videos per Month. Premium Features - Multiplayer Games & Social Features, 20 Recording Sessions, Priority Support & Faster Response Times',
      metadata: {
        minato_product_type: 'pro_subscription'
      }
    });

    const price = await stripe.prices.create({
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
    
    // Create checkout session with return URL
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: {
        minato_user_id: userId,
        subscription_type: 'pro_upgrade',
        minato_product_type: 'pro_subscription',
        return_url: returnUrl
      },
      client_reference_id: userId, // ✅ CRUCIAL: Lier l'utilisateur
      subscription_data: {
        metadata: {
          minato_user_id: userId,
          subscription_type: 'pro_upgrade'
        }
      }
    });
    
    logger.info(`[subscription-upgrade] Created checkout session ${checkoutSession.id} for user ${userId} with return URL: ${returnUrl}`);
    logger.info(`[subscription-upgrade] Session metadata: ${JSON.stringify(checkoutSession.metadata)}`);
    logger.info(`[subscription-upgrade] Client reference ID: ${checkoutSession.client_reference_id}`);
    
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    });
    
  } catch (error: any) {
    logger.error('[subscription-upgrade] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create upgrade session'
    }, { status: 500 });
  }
} 