// FILE: app/api/subscription/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserSubscription, QUOTAS } from '@/lib/middleware/subscription-guards';
import { logger } from '@/memory-framework/config';

export async function GET(req: NextRequest) {
  const logPrefix = "[API Subscription Status]";
  
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn(`${logPrefix} Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Status request from user: ${userId.substring(0, 8)}`);

    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      logger.error(`${logPrefix} Could not fetch subscription for user: ${userId.substring(0, 8)}`);
      return NextResponse.json({ error: 'Subscription data unavailable' }, { status: 500 });
    }

    // Calculer les quotas restants
    const remainingQuotas = {
      leads: Math.max(0, QUOTAS[subscription.planType].leads - subscription.monthlyUsage.leads),
      recordings: Math.max(0, QUOTAS[subscription.planType].recordings - subscription.monthlyUsage.recordings),
      images: Math.max(0, QUOTAS[subscription.planType].images - subscription.monthlyUsage.images),
      videos: Math.max(0, QUOTAS[subscription.planType].videos - subscription.monthlyUsage.videos)
    };

    // Calculer le pourcentage d'utilisation
    const usagePercentages = {
      leads: Math.round((subscription.monthlyUsage.leads / QUOTAS[subscription.planType].leads) * 100),
      recordings: Math.round((subscription.monthlyUsage.recordings / QUOTAS[subscription.planType].recordings) * 100),
      images: Math.round((subscription.monthlyUsage.images / QUOTAS[subscription.planType].images) * 100),
      videos: Math.round((subscription.monthlyUsage.videos / QUOTAS[subscription.planType].videos) * 100)
    };

    // Vérifier si l'essai est expiré
    const trialEndDate = subscription.trialEndDate ? new Date(subscription.trialEndDate) : null;
    const isTrialExpired = trialEndDate ? new Date() > trialEndDate : false;
    const daysUntilTrialExpires = trialEndDate ? Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

    const response = {
      plan: {
        type: subscription.planType,
        name: subscription.planType === 'FREE_TRIAL' ? 'Free Trial' : 
              subscription.planType === 'PRO' ? 'Minato Pro' : 'Expired',
        isActive: subscription.planType === 'PRO' || (subscription.planType === 'FREE_TRIAL' && !isTrialExpired)
      },
      trial: {
        isActive: subscription.planType === 'FREE_TRIAL' && !isTrialExpired,
        endDate: subscription.trialEndDate,
        daysRemaining: daysUntilTrialExpires,
        isExpired: isTrialExpired
      },
      subscription: {
        endDate: subscription.subscriptionEndDate,
        hasStripeCustomer: !!subscription.stripeCustomerId
      },
      quotas: {
        monthly: {
          leads: {
            used: subscription.monthlyUsage.leads,
            limit: QUOTAS[subscription.planType].leads,
            remaining: remainingQuotas.leads,
            percentage: usagePercentages.leads
          },
          recordings: {
            used: subscription.monthlyUsage.recordings,
            limit: QUOTAS[subscription.planType].recordings,
            remaining: remainingQuotas.recordings,
            percentage: usagePercentages.recordings
          },
          images: {
            used: subscription.monthlyUsage.images,
            limit: QUOTAS[subscription.planType].images,
            remaining: remainingQuotas.images,
            percentage: usagePercentages.images
          },
          videos: {
            used: subscription.monthlyUsage.videos,
            limit: QUOTAS[subscription.planType].videos,
            remaining: remainingQuotas.videos,
            percentage: usagePercentages.videos
          }
        },
        oneTime: {
          images: subscription.oneTimeCredits.images,
          videos: subscription.oneTimeCredits.videos,
          recordings: subscription.oneTimeCredits.recordings
        }
      },
      features: {
        multiplayer: subscription.planType === 'PRO',
        advancedAnalytics: subscription.planType === 'PRO',
        prioritySupport: subscription.planType === 'PRO',
        customPersonas: subscription.planType === 'PRO'
      }
    };

    logger.info(`${logPrefix} Status retrieved for user ${userId.substring(0, 8)}: ${subscription.planType} plan`);
    return NextResponse.json(response);

  } catch (error) {
    logger.error(`${logPrefix} Error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 