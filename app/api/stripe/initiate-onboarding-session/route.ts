import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  logger.error('[initiate-onboarding-session] STRIPE_SECRET_KEY is not configured.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
}) : null;

type OnboardingSessionResponse = {
  clientSecret?: string;
  connectedAccountId?: string;
  error?: string;
  message?: string;
};

/**
 * POST /api/stripe/initiate-onboarding-session
 * 
 * Creates or retrieves a Stripe Connect account and generates an Account Session
 * for the embedded onboarding component
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' }, 
      { status: 500 }
    );
  }

  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }

  try {
    const { minatoUserId, email, country, entityType } = await req.json();

    // Validate required parameters
    if (!minatoUserId || !email || !country || !entityType) {
      return NextResponse.json(
        { error: 'Missing required parameters for onboarding.' },
        { status: 400 }
      );
    }

    // Ensure the authenticated user matches the requested user ID
    if (session.user.id !== minatoUserId) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // First, check if user already has a Stripe account
    const { data: userData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', minatoUserId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: row not found
      logger.error('[initiate-onboarding-session] Supabase error fetching user:', fetchError);
      return NextResponse.json(
        { error: 'Database error. Could not retrieve user data.' },
        { status: 500 }
      );
    }

    let connectedAccountId = userData?.stripe_account_id;
    let accountStatusMessage = '';

    // Create new Stripe Connect account if doesn't exist
    if (!connectedAccountId) {
      logger.info(`[initiate-onboarding-session] Creating new Stripe Connect account for user ${minatoUserId}. Country: ${country}, Entity: ${entityType}`);
      
      const account = await stripe.accounts.create({
        type: 'express', // Use Express account type
        country: country,
        email: email,
        business_type: entityType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
            },
          },
        },
        metadata: { 
          minato_user_id: minatoUserId,
          created_via: 'minato_onboarding'
        },
      });

      connectedAccountId = account.id;
      accountStatusMessage = `New Stripe Account ${connectedAccountId} created.`;

      // Update user record with Stripe account ID
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: minatoUserId,
          email: email,
          stripe_account_id: connectedAccountId,
          stripe_onboarding_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        logger.error('[initiate-onboarding-session] Supabase error updating user with new Stripe ID:', updateError);
        return NextResponse.json(
          { error: 'Database error. Could not save Stripe account association.' },
          { status: 500 }
        );
      }
    } else {
      accountStatusMessage = `Using existing Stripe Account ${connectedAccountId}.`;
      logger.info(`[initiate-onboarding-session] Using existing Stripe Connect account ${connectedAccountId} for user ${minatoUserId}.`);
    }

    // Create Account Session for onboarding component
    const accountSession = await stripe.accountSessions.create({
      account: connectedAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: { 
            external_account_collection: true 
          }
        },
      },
    });

    logger.info(`[initiate-onboarding-session] AccountSession created for ${connectedAccountId}.`);
    
    return NextResponse.json({
      clientSecret: accountSession.client_secret,
      connectedAccountId: connectedAccountId,
      message: accountStatusMessage
    });

  } catch (error: any) {
    logger.error('[initiate-onboarding-session] Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'An unknown server error occurred.' },
      { status: 500 }
    );
  }
} 