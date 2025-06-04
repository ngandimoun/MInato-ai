import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

interface CreateOnboardingSessionRequest {
  accountId: string | null;
}

interface CreateOnboardingSessionResponse {
  success: boolean;
  clientSecret?: string;
  error?: string;
}

/**
 * POST /api/stripe/create-onboarding-session
 * 
 * Creates a Stripe Connect onboarding session for embedded onboarding
 */
export async function POST(req: NextRequest): Promise<NextResponse<CreateOnboardingSessionResponse>> {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user using getUser() for security
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authUser) {
    logger.error('[create-onboarding-session] Authentication error:', authError);
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }
  
  const userId = authUser.id;
  const userEmail = authUser.email;

  if (!userEmail) {
    return NextResponse.json({
      success: false,
      error: 'User email is required for Stripe onboarding'
    }, { status: 400 });
  }
  
  try {
    // Parse request body
    const body: CreateOnboardingSessionRequest = await req.json();
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[create-onboarding-session] Stripe secret key not configured');
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

    let stripeAccountId = body.accountId;

    // If no account ID provided, create a new Stripe account
    if (!stripeAccountId) {
      logger.info('[create-onboarding-session] Creating new Stripe Express account');
      
      const account = await stripe.accounts.create({
        type: 'express',
        email: userEmail,
        metadata: {
          userId: userId
        }
      });
      
      stripeAccountId = account.id;
      
      // Create user record or update existing one with new Stripe account ID
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          email: userEmail,
          stripe_account_id: stripeAccountId,
          stripe_onboarding_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (upsertError) {
        logger.error('[create-onboarding-session] Error updating user profile:', upsertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update user profile'
        }, { status: 500 });
      }
    }
    
    // Create an account session for embedded onboarding
    logger.info(`[create-onboarding-session] Creating session for account ${stripeAccountId}`);
    
    const session = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });
    
    logger.info('[create-onboarding-session] Successfully created session');
    
    return NextResponse.json({
      success: true,
      clientSecret: session.client_secret
    });
    
  } catch (error: any) {
    logger.error('[create-onboarding-session] Unexpected error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: error.message || 'Invalid Stripe request'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create onboarding session'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 