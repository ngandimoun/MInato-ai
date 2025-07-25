import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log(`[Subscription Status API] Request received for user: ${userId}`);

    if (!userId) {
      console.error('[Subscription Status API] Error: User ID is required');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Subscription Status API] Fetching subscription status for user: ${userId}`);

    // Utiliser la fonction RPC pour récupérer le statut d'abonnement
    const { data, error } = await supabase
      .rpc('get_user_subscription_status', { user_uuid: userId });

    if (error) {
      console.error('[Subscription Status API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log(`[Subscription Status API] No user found with ID: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const subscriptionStatus = data[0];

    // Get current month usage data from actual tables
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Count recordings from audio_recordings table
    const { count: recordingsCount, error: recordingsError } = await supabase
      .from('audio_recordings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);

    if (recordingsError) {
      console.error('[Subscription Status API] Error counting recordings:', recordingsError);
    }

    // Count images from generated_images table (if exists)
    const { count: imagesCount, error: imagesError } = await supabase
      .from('generated_images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);

    if (imagesError && imagesError.code !== '42P01') { // Ignore table not exists error
      console.error('[Subscription Status API] Error counting images:', imagesError);
    }

    // Count videos from video tables (if exists)
    const { count: videosCount, error: videosError } = await supabase
      .from('generated_videos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);

    if (videosError && videosError.code !== '42P01') { // Ignore table not exists error
      console.error('[Subscription Status API] Error counting videos:', videosError);
    }

    // Add monthly usage to subscription status
    subscriptionStatus.monthly_usage = {
      recordings: recordingsCount || 0,
      images: imagesCount || 0,
      videos: videosCount || 0
    };

    console.log(`[Subscription Status API] Monthly usage for ${userId}:`, subscriptionStatus.monthly_usage);
    
    console.log(`[Subscription Status API] Success - User ${userId} subscription status:`, {
      plan_type: subscriptionStatus.plan_type,
      is_active: subscriptionStatus.is_active,
      is_trial: subscriptionStatus.is_trial,
      is_pro: subscriptionStatus.is_pro,
      is_expired: subscriptionStatus.is_expired,
      days_remaining: subscriptionStatus.days_remaining,
      trial_end_date: subscriptionStatus.trial_end_date,
      subscription_end_date: subscriptionStatus.subscription_end_date
    });

    // Detailed status log
    if (subscriptionStatus.is_trial) {
      console.log(`[Subscription Status API] User ${userId} is on FREE TRIAL with ${subscriptionStatus.days_remaining} days remaining`);
      console.log(`[Subscription Status API] PLAN TYPE: FREE TRIAL - User can access basic features for 7 days`);
    } else if (subscriptionStatus.is_pro) {
      console.log(`[Subscription Status API] User ${userId} is on PRO PLAN with ${subscriptionStatus.days_remaining} days remaining`);
      console.log(`[Subscription Status API] PLAN TYPE: PRO - User has full access to all features`);
      // Log only the quota for the connected user
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('email, monthly_usage, quota_limits')
        .eq('id', userId)
        .single();
      if (!userError && userData) {
        const limits = userData.quota_limits || {};
        const imageLimit = limits.images ?? 30;
        const videoLimit = limits.videos ?? 20;
        const recordingLimit = limits.recordings ?? 20;
        const logMsg = [
          '=========== REMAINING QUOTAS FOR PRO USER ===========',
          `User: ${userData.email}`,
          `  Images     : ${(userData.monthly_usage?.images ?? 0)} / ${imageLimit}`,
          `  Videos     : ${(userData.monthly_usage?.videos ?? 0)} / ${videoLimit}`,
          `  Recordings : ${(userData.monthly_usage?.recordings ?? 0)} / ${recordingLimit}`,
          '====================================================='
        ].join('\n');
        console.log(logMsg);
      }
    } else if (subscriptionStatus.is_expired) {
      console.log(`[Subscription Status API] User ${userId} subscription is EXPIRED`);
      console.log(`[Subscription Status API] PLAN TYPE: EXPIRED - User needs to upgrade to continue`);
    }

    // Log du plan type pour le terminal
    console.log(`[Subscription Status API] === USER PLAN TYPE ===`);
    console.log(`[Subscription Status API] User ID: ${userId}`);
    console.log(`[Subscription Status API] Plan Type: ${subscriptionStatus.plan_type}`);
    console.log(`[Subscription Status API] Status: ${subscriptionStatus.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`[Subscription Status API] Days Remaining: ${subscriptionStatus.days_remaining}`);
    console.log(`[Subscription Status API] ========================`);

    return NextResponse.json(subscriptionStatus);

  } catch (error) {
    console.error('[Subscription Status API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 