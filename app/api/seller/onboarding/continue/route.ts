import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { headers } from 'next/headers';

interface ContinueOnboardingResponse {
  success: boolean;
  onboardingUrl?: string;
  error?: string;
}

/**
 * POST /api/seller/onboarding/continue
 * 
 * Continues the Stripe Express onboarding process for a user
 */
export async function POST(req: NextRequest): Promise<NextResponse<ContinueOnboardingResponse>> {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user using getUser() for security
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authUser) {
    logger.error('[continue-onboarding] Authentication error:', authError);
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }
  
  const userId = authUser.id;
  
  try {
    // Get the user record to check for existing Stripe account
    const { data: userData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();
    
    if (fetchError || !userData?.stripe_account_id) {
      logger.error('[continue-onboarding] Error fetching user profile:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'No Stripe account found'
      }, { status: 404 });
    }
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[continue-onboarding] Stripe secret key not configured');
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
    
    // Get the host from headers for the redirect URLs
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    
    // Create a new account link for continuing onboarding
    logger.info(`[continue-onboarding] Creating new onboarding link for account ${userData.stripe_account_id}`);
    
    const accountLink = await stripe.accountLinks.create({
      account: userData.stripe_account_id,
      refresh_url: `${baseUrl}/dashboard?onboarding=refresh`,
      return_url: `${baseUrl}/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    });
    
    logger.info('[continue-onboarding] Successfully created onboarding link');
    
    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url
    });
    
  } catch (error: any) {
    logger.error('[continue-onboarding] Unexpected error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: error.message || 'Invalid Stripe request'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to continue onboarding'
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