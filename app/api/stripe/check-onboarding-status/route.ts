import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

interface OnboardingStatusResponse {
  success: boolean;
  isComplete?: boolean;
  error?: string;
}

/**
 * POST /api/stripe/check-onboarding-status
 * 
 * Checks if a user's Stripe Express onboarding is complete
 */
export async function POST(req: NextRequest): Promise<NextResponse<OnboardingStatusResponse>> {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user using getUser() for security
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authUser) {
    logger.error('[check-onboarding] Authentication error:', authError);
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }
  
  const userId = authUser.id;
  
  try {
    // Get user's Stripe account ID
    const { data: userData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();
    
    if (fetchError || !userData?.stripe_account_id) {
      logger.error('[check-onboarding] Error fetching user profile:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'No Stripe account found'
      }, { status: 404 });
    }
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[check-onboarding] Stripe secret key not configured');
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
    
    // Retrieve the account from Stripe
    const account = await stripe.accounts.retrieve(userData.stripe_account_id);
    
    // Check if the account details are complete
    const isComplete = account.details_submitted && 
                      account.charges_enabled && 
                      account.payouts_enabled;
    
    // Update the user's onboarding status if it has changed
    if (isComplete !== userData.stripe_onboarding_complete) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          stripe_onboarding_complete: isComplete,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        logger.error('[check-onboarding] Error updating onboarding status:', updateError);
      }
    }
    
    return NextResponse.json({
      success: true,
      isComplete
    });
    
  } catch (error: any) {
    logger.error('[check-onboarding] Unexpected error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid Stripe request'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check onboarding status'
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