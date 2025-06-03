import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';
import { headers } from 'next/headers';

interface OnboardingResponse {
  success: boolean;
  onboardingUrl?: string;
  error?: string;
}

/**
 * POST /api/seller/onboarding
 * 
 * Initiates the Stripe Express onboarding process for a user
 */
export async function POST(req: NextRequest): Promise<NextResponse<OnboardingResponse>> {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user using getUser() for security
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authUser) {
    logger.error('[seller-onboarding] Authentication error:', authError);
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
    // Initialize Stripe first since we'll need it in multiple places
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[seller-onboarding] Stripe secret key not configured');
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

    // First, try to get the user record
    let { data: userData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();
    
    let stripeAccountId = userData?.stripe_account_id;

    // If user record doesn't exist, create it
    if (fetchError?.code === 'PGRST116') {
      logger.info('[seller-onboarding] User profile not found, creating new profile');
      
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert([{ 
          id: userId,
          email: userEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (createError) {
        logger.error('[seller-onboarding] Error creating user profile:', createError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create user profile'
        }, { status: 500 });
      }
      
      userData = newUser;
    } else if (fetchError) {
      logger.error('[seller-onboarding] Error fetching user profile:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user profile'
      }, { status: 500 });
    }

    // If user has a Stripe account ID, verify it still exists and is valid
    if (stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        if (account.email !== userEmail) {
          // Email mismatch - create new account
          stripeAccountId = null;
        }
      } catch (error) {
        // Account doesn't exist or other error - create new account
        stripeAccountId = null;
        logger.warn('[seller-onboarding] Existing Stripe account not found or invalid, will create new one');
      }
    }
    
    // Create new Stripe account if needed
    if (!stripeAccountId) {
      logger.info('[seller-onboarding] Creating new Stripe Express account');
      
      const account = await stripe.accounts.create({
        type: 'express',
        email: userEmail,
        metadata: {
          userId: userId
        }
      });
      
      stripeAccountId = account.id;
      
      // Update user record with new Stripe account ID
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          stripe_account_id: stripeAccountId,
          stripe_onboarding_complete: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        logger.error('[seller-onboarding] Error updating user with Stripe account:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update user profile'
        }, { status: 500 });
      }
    }
    
    // Get the host from headers for the redirect URLs
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    
    // Create an account link for onboarding
    logger.info(`[seller-onboarding] Creating onboarding link for account ${stripeAccountId}`);
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard?onboarding=refresh`,
      return_url: `${baseUrl}/dashboard?onboarding=complete`,
      type: 'account_onboarding',
    });
    
    logger.info('[seller-onboarding] Successfully created onboarding link');
    
    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url
    });
    
  } catch (error: any) {
    logger.error('[seller-onboarding] Unexpected error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: error.message || 'Invalid Stripe request'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initiate seller onboarding'
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