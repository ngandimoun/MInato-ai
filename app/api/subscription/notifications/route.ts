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

    console.log(`[Notifications API] Request received for user: ${userId}`);

    if (!userId) {
      console.error('[Notifications API] Error: User ID is required');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Notifications API] Checking notifications for user: ${userId}`);

    // Utiliser la fonction RPC pour récupérer le statut d'abonnement
    const { data, error } = await supabase
      .rpc('get_user_subscription_status', { user_uuid: userId });

    if (error) {
      console.error('[Notifications API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log(`[Notifications API] No user found with ID: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const subscriptionStatus = data[0];
    
    console.log(`[Notifications API] User ${userId} subscription status:`, {
      plan_type: subscriptionStatus.plan_type,
      is_active: subscriptionStatus.is_active,
      is_trial: subscriptionStatus.is_trial,
      is_pro: subscriptionStatus.is_pro,
      is_expired: subscriptionStatus.is_expired,
      days_remaining: subscriptionStatus.days_remaining,
      trial_end_date: subscriptionStatus.trial_end_date,
      subscription_end_date: subscriptionStatus.subscription_end_date
    });

    const notifications: any[] = [];

    // Expiration notifications
    if (subscriptionStatus.is_trial && subscriptionStatus.days_remaining === 1) {
      notifications.push({
        type: 'trial_expiring',
        title: 'Free trial expiring',
        message: `Your free trial expires in 1 day. Upgrade to Pro plan to continue using all features.`,
        action: 'upgrade'
      });
      console.log(`[Notifications API] User ${userId} - Trial expiring in 1 day`);
    }

    if (subscriptionStatus.is_pro && subscriptionStatus.days_remaining === 1) {
      notifications.push({
        type: 'subscription_expiring',
        title: 'Pro subscription expiring',
        message: `Your Pro subscription expires in 1 day. Renew to continue enjoying all features.`,
        action: 'renew'
      });
      console.log(`[Notifications API] User ${userId} - Pro subscription expiring in 1 day`);
      
      // Log quota using real-time database counts (consistent with other APIs)
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Get actual usage counts from database
      const [recordingsResult, imagesResult, videosResult] = await Promise.all([
        supabase.from('audio_recordings').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', firstDayOfMonth).lte('created_at', lastDayOfMonth),
        supabase.from('generated_images').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', firstDayOfMonth).lte('created_at', lastDayOfMonth),
        supabase.from('generated_videos').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', firstDayOfMonth).lte('created_at', lastDayOfMonth)
      ]);

      const recordingsUsed = recordingsResult.count || 0;
      const imagesUsed = imagesResult.count || 0;
      const videosUsed = videosResult.count || 0;

      const logMsg = [
        '=========== REMAINING QUOTAS FOR PRO USER ===========',
        `User: ${userId}`,
        `  Images     : ${imagesUsed} / 30`,
        `  Videos     : ${videosUsed} / 20`,
        `  Recordings : ${recordingsUsed} / 20`,
        '====================================================='
      ].join('\n');
      console.log(logMsg);
    }

    // Welcome notification for new users
    if (subscriptionStatus.is_trial && subscriptionStatus.days_remaining >= 6) {
      // Check if the user registered less than 10 minutes ago
      const userCreatedAt = subscriptionStatus.created_at;
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - new Date(userCreatedAt).getTime();
      const minutesDifference = timeDifference / (1000 * 60); // Convert to minutes
      
      if (minutesDifference <= 10) {
        notifications.push({
          type: 'welcome',
          title: 'Welcome to Minato!',
          message: 'You have 7 days of free trial. Explore all features and upgrade to Pro plan when you\'re ready.',
          action: 'dismiss'
        });
        console.log(`[Notifications API] User ${userId} - Welcome notification for new trial user (registered ${minutesDifference.toFixed(1)} minutes ago)`);
      } else {
        console.log(`[Notifications API] User ${userId} - Skipping welcome notification (registered ${minutesDifference.toFixed(1)} minutes ago, > 10 minutes)`);
      }
    }

    // Expired notification
    if (subscriptionStatus.is_expired) {
      notifications.push({
        type: 'expired',
        title: 'Subscription expired',
        message: 'Your subscription has expired. Upgrade to Pro plan to continue using all features.',
        action: 'upgrade'
      });
      console.log(`[Notifications API] User ${userId} - Subscription expired notification`);
    }

    console.log(`[Notifications API] User ${userId} - Found ${notifications.length} notifications`);

    return NextResponse.json({
      success: true,
      notifications,
      subscriptionStatus
    });

  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 