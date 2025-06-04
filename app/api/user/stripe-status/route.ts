import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { isOnboardingComplete } from '@/lib/stripe';

/**
 * GET /api/user/stripe-status
 * 
 * Returns the Stripe seller status for the current authenticated user
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  const userId = session.user.id;
  
  try {
    // Get the user's profile from Supabase user_profiles table
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error(`[stripe-status] Error fetching user profile: ${error.message}`);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' }, 
        { status: 500 }
      );
    }
    
    // If the user has a Stripe account but onboarding status is unknown,
    // check with Stripe API to see if onboarding is complete
    if (profile?.stripe_account_id && profile.stripe_onboarding_complete === null) {
      try {
        const onboardingComplete = await isOnboardingComplete(profile.stripe_account_id);
        
        // Update the user's profile with the onboarding status
        await supabase
          .from('user_profiles')
          .update({ stripe_onboarding_complete: onboardingComplete })
          .eq('id', userId);
        
        profile.stripe_onboarding_complete = onboardingComplete;
      } catch (err) {
        logger.error(`[stripe-status] Error checking onboarding status: ${err}`);
        // Leave the status as is if there was an error checking
      }
    }
    
    return NextResponse.json({
      stripe_account_id: profile?.stripe_account_id || null,
      stripe_onboarding_complete: profile?.stripe_onboarding_complete || false,
    });
    
  } catch (error) {
    logger.error(`[stripe-status] Unexpected error: ${error}`);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 