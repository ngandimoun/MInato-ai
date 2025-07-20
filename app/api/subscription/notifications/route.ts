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

    // Vérifier les notifications d'expiration
    if (subscriptionStatus.is_trial && subscriptionStatus.days_remaining <= 2 && subscriptionStatus.days_remaining > 0) {
      notifications.push({
        type: 'trial_expiring',
        title: 'Free trial expiring',
        message: `Your free trial expires in ${subscriptionStatus.days_remaining} day(s). Upgrade to Pro plan to continue using all features.`,
        action: 'upgrade'
      });
      console.log(`[Notifications API] User ${userId} - Trial expiring in ${subscriptionStatus.days_remaining} days`);
    }

    if (subscriptionStatus.is_pro && subscriptionStatus.days_remaining <= 2 && subscriptionStatus.days_remaining > 0) {
      notifications.push({
        type: 'subscription_expiring',
        title: 'Abonnement Pro expirant',
        message: `Votre abonnement Pro expire dans ${subscriptionStatus.days_remaining} jour(s). Renouvelez pour continuer à profiter de toutes les fonctionnalités.`,
        action: 'renew'
      });
      console.log(`[Notifications API] User ${userId} - Pro subscription expiring in ${subscriptionStatus.days_remaining} days`);
    }

    // Notification de bienvenue pour les nouveaux utilisateurs
    if (subscriptionStatus.is_trial && subscriptionStatus.days_remaining >= 6) {
      // Vérifier si l'utilisateur s'est inscrit il y a moins de 10 minutes
      const userCreatedAt = subscriptionStatus.created_at;
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - new Date(userCreatedAt).getTime();
      const minutesDifference = timeDifference / (1000 * 60); // Convertir en minutes
      
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

    // Notification d'expiration
    if (subscriptionStatus.is_expired) {
      notifications.push({
        type: 'expired',
        title: 'Abonnement expiré',
        message: 'Votre abonnement a expiré. Passez au plan Pro pour continuer à utiliser toutes les fonctionnalités.',
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