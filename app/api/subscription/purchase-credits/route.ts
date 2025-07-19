// FILE: app/api/subscription/purchase-credits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { CREDIT_PACKS_CONFIG } from '@/lib/constants';

interface PurchaseCreditsRequest {
  creditType: 'images' | 'videos' | 'recordings' | 'leads';
  packId: string;
  priceId: string;
  credits: number;
  amount: number;
}

interface PurchaseCreditsResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

// ✅ Mapping des price IDs vers les vrais IDs Stripe (à configurer dynamiquement)
// Note: Ces IDs doivent être mis à jour avec les vrais IDs Stripe créés par le script setup-minato-pro-products.js
const STRIPE_PRICE_IDS: Record<string, string> = {
  // Images
  'price_images_10': 'price_1OqX8X2eZvKYlo2C1234567890', // À remplacer par les vrais IDs
  'price_images_30': 'price_1OqX8X2eZvKYlo2C1234567891',
  'price_images_50': 'price_1OqX8X2eZvKYlo2C1234567892',
  
  // Videos
  'price_videos_10': 'price_1OqX8X2eZvKYlo2C1234567893',
  'price_videos_20': 'price_1OqX8X2eZvKYlo2C1234567894',
  'price_videos_35': 'price_1OqX8X2eZvKYlo2C1234567895',
  
  // Recordings
  'price_recordings_10': 'price_1OqX8X2eZvKYlo2C1234567896',
  'price_recordings_20': 'price_1OqX8X2eZvKYlo2C1234567897',
  'price_recordings_35': 'price_1OqX8X2eZvKYlo2C1234567898',
  
  // Leads
  'price_leads_10': 'price_1OqX8X2eZvKYlo2C1234567899',
  'price_leads_20': 'price_1OqX8X2eZvKYlo2C1234567900',
  'price_leads_35': 'price_1OqX8X2eZvKYlo2C1234567901',
};

export async function POST(req: NextRequest): Promise<NextResponse<PurchaseCreditsResponse>> {
  const logPrefix = '[API Purchase Credits]';
  
  try {
    const supabase = await createServerSupabaseClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error(`${logPrefix} Authentication failed:`, authError);
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Processing credits purchase for user: ${userId.substring(0, 8)}`);

    // Parser la requête
    const body: PurchaseCreditsRequest = await req.json();
    const { creditType, packId, priceId, credits, amount } = body;

    // Validation des données
    if (!creditType || !packId || !priceId || !credits || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: creditType, packId, priceId, credits, amount'
      }, { status: 400 });
    }

    // Vérifier que l'utilisateur a un abonnement Pro actif
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('plan_type, subscription_end_date, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      logger.error(`${logPrefix} Error fetching user data:`, userError);
      return NextResponse.json({
        success: false,
        error: 'User data not found'
      }, { status: 404 });
    }

    if (userData.plan_type !== 'PRO') {
      return NextResponse.json({
        success: false,
        error: 'Pro subscription required to purchase credits'
      }, { status: 403 });
    }

    // Vérifier que l'abonnement n'est pas expiré
    if (userData.subscription_end_date && new Date(userData.subscription_end_date) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Subscription has expired. Please renew your subscription first.'
      }, { status: 403 });
    }

    // Initialiser Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error(`${logPrefix} Stripe secret key not configured`);
      return NextResponse.json({
        success: false,
        error: 'Stripe integration not configured'
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      typescript: true,
      apiVersion: '2025-06-30.basil',
    });

    // Obtenir le vrai price ID Stripe
    const realPriceId = STRIPE_PRICE_IDS[priceId];
    if (!realPriceId) {
      logger.error(`${logPrefix} Invalid price ID: ${priceId}`);
      return NextResponse.json({
        success: false,
        error: 'Invalid price configuration'
      }, { status: 400 });
    }

    // Créer ou récupérer le customer Stripe
    let customerId = userData.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          minato_user_id: userId
        }
      });
      customerId = customer.id;
      
      // Mettre à jour l'utilisateur avec le customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: realPriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=credits&credit_type=${creditType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/creation-hub`,
      metadata: {
        minato_user_id: userId,
        subscription_type: 'credits_purchase',
        credit_type: creditType,
        pack_id: packId,
        credits: credits.toString(),
        amount: amount.toString(),
        purchase_type: 'one_time_credits'
      },
      client_reference_id: userId,
    });

    logger.info(`${logPrefix} Created checkout session: ${session.id} for ${credits} ${creditType} credits`);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url || undefined
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error processing credits purchase:`, error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
} 