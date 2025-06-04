import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  logger.error('[refresh-account-session] STRIPE_SECRET_KEY is not configured.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
}) : null;

/**
 * POST /api/stripe/refresh-account-session
 * 
 * Refreshes an Account Session for the embedded onboarding component
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
    const { connectedAccountId } = await req.json();
    
    if (!connectedAccountId) {
      return NextResponse.json(
        { error: 'connectedAccountId is required.' },
        { status: 400 }
      );
    }

    // Verify that the connected account belongs to the authenticated user
    const { data: userData, error: dbError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', session.user.id)
      .single();

    if (dbError || userData?.stripe_account_id !== connectedAccountId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this Stripe account' },
        { status: 403 }
      );
    }

    logger.info(`[refresh-account-session] Refreshing AccountSession for ${connectedAccountId}.`);
    
    // Create a new Account Session
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
    
    return NextResponse.json({ 
      clientSecret: accountSession.client_secret 
    });
    
  } catch (error: any) {
    logger.error('[refresh-account-session] Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Server error refreshing session.' },
      { status: 500 }
    );
  }
} 