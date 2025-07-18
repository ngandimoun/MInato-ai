// FILE: lib/middleware/subscription-guards.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

// Types pour les quotas et plans
export interface UserQuotas {
  leads: number;
  recordings: number;
  images: number;
  videos: number;
}

export interface UserCredits {
  images: number;
  videos: number;
  recordings: number;
}

export interface UserSubscription {
  planType: 'FREE_TRIAL' | 'PRO' | 'EXPIRED';
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  monthlyUsage: UserQuotas;
  oneTimeCredits: UserCredits;
  stripeCustomerId: string | null;
}

// Quotas par plan
export const QUOTAS = {
  FREE_TRIAL: {
    leads: 10, // 10 leads pendant l'essai gratuit
    recordings: 5, // 5 recordings pendant l'essai gratuit
    images: 0, // Pas d'accès aux images pendant l'essai gratuit
    videos: 0  // Pas d'accès aux vidéos pendant l'essai gratuit
  },
  PRO: {
    leads: 1000,
    recordings: 20,
    images: 30,
    videos: 30
  },
  EXPIRED: {
    leads: 0,
    recordings: 0,
    images: 0,
    videos: 0
  }
} as const;

// Fonction pour récupérer les informations d'abonnement d'un utilisateur
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        plan_type,
        trial_end_date,
        subscription_end_date,
        monthly_usage,
        one_time_credits,
        stripe_customer_id
      `)
      .eq('id', userId)
      .single();

    if (error) {
      logger.error(`[SubscriptionGuard] Error fetching user subscription: ${error.message}`);
      return null;
    }

    if (!data) {
      logger.warn(`[SubscriptionGuard] No subscription data found for user: ${userId.substring(0, 8)}`);
      return null;
    }

    return {
      planType: data.plan_type,
      trialEndDate: data.trial_end_date,
      subscriptionEndDate: data.subscription_end_date,
      monthlyUsage: data.monthly_usage || { leads: 0, recordings: 0, images: 0, videos: 0 },
      oneTimeCredits: data.one_time_credits || { images: 0, videos: 0, recordings: 0 },
      stripeCustomerId: data.stripe_customer_id
    };
  } catch (error) {
    logger.error(`[SubscriptionGuard] Exception fetching user subscription: ${error}`);
    return null;
  }
}

// Fonction pour vérifier si un utilisateur a accès à une fonctionnalité Pro
export function hasProAccess(subscription: UserSubscription): boolean {
  if (subscription.planType === 'PRO') {
    return true;
  }

  if (subscription.planType === 'FREE_TRIAL') {
    const trialEnd = new Date(subscription.trialEndDate || '');
    const now = new Date();
    return trialEnd > now;
  }

  return false;
}

// Fonction pour vérifier si un utilisateur peut utiliser une fonctionnalité (quota)
export function canUseFeature(
  subscription: UserSubscription, 
  feature: keyof UserQuotas
): { canUse: boolean; reason?: string } {
  // Vérifier d'abord l'accès Pro
  if (!hasProAccess(subscription)) {
    return { 
      canUse: false, 
      reason: subscription.planType === 'EXPIRED' ? 'subscription_expired' : 'trial_expired' 
    };
  }

  // Vérifier si la fonctionnalité est bloquée pour ce plan
  const maxQuota = QUOTAS[subscription.planType][feature];
  if (maxQuota === 0) {
    return { 
      canUse: false, 
      reason: 'feature_blocked' 
    };
  }

  // Vérifier les quotas
  const currentUsage = subscription.monthlyUsage[feature];

  if (currentUsage >= maxQuota) {
    return { 
      canUse: false, 
      reason: 'quota_exceeded' 
    };
  }

  return { canUse: true };
}

// Fonction pour vérifier les crédits à usage unique
export function hasOneTimeCredits(
  subscription: UserSubscription, 
  feature: keyof UserCredits
): boolean {
  return (subscription.oneTimeCredits[feature] || 0) > 0;
}

// Middleware pour protéger les routes Pro
export async function requireProAccess(
  req: NextRequest,
  featureName: string
): Promise<{ success: boolean; response?: NextResponse; subscription?: UserSubscription }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn(`[SubscriptionGuard] Unauthorized access attempt to ${featureName}`);
      return {
        success: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      };
    }

    const subscription = await getUserSubscription(user.id);
    if (!subscription) {
      logger.error(`[SubscriptionGuard] Could not fetch subscription for user: ${user.id.substring(0, 8)}`);
      return {
        success: false,
        response: NextResponse.json({ error: 'Subscription data unavailable' }, { status: 500 })
      };
    }

    if (!hasProAccess(subscription)) {
      logger.warn(`[SubscriptionGuard] User ${user.id.substring(0, 8)} attempted to access ${featureName} without Pro access`);
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'Pro access required',
          code: subscription.planType === 'EXPIRED' ? 'subscription_expired' : 'trial_expired',
          feature: featureName
        }, { status: 403 }),
        subscription
      };
    }

    return { success: true, subscription };
  } catch (error) {
    logger.error(`[SubscriptionGuard] Error in requireProAccess: ${error}`);
    return {
      success: false,
      response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    };
  }
}

// Middleware pour vérifier les quotas
export async function checkQuota(
  req: NextRequest,
  feature: keyof UserQuotas
): Promise<{ success: boolean; response?: NextResponse; subscription?: UserSubscription }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn(`[SubscriptionGuard] Unauthorized access attempt to ${feature}`);
      return {
        success: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      };
    }

    const subscription = await getUserSubscription(user.id);
    if (!subscription) {
      logger.error(`[SubscriptionGuard] Could not fetch subscription for user: ${user.id.substring(0, 8)}`);
      return {
        success: false,
        response: NextResponse.json({ error: 'Subscription data unavailable' }, { status: 500 })
      };
    }

    const quotaCheck = canUseFeature(subscription, feature);
    if (!quotaCheck.canUse) {
      logger.warn(`[SubscriptionGuard] User ${user.id.substring(0, 8)} quota exceeded for ${feature}: ${quotaCheck.reason}`);
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'Quota exceeded',
          code: quotaCheck.reason,
          feature: feature,
          currentUsage: subscription.monthlyUsage[feature],
          maxQuota: QUOTAS[subscription.planType][feature]
        }, { status: 403 }),
        subscription
      };
    }

    return { success: true, subscription };
  } catch (error) {
    logger.error(`[SubscriptionGuard] Error in checkQuota: ${error}`);
    return {
      success: false,
      response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    };
  }
}

// Fonction pour incrémenter l'utilisation mensuelle
export async function incrementMonthlyUsage(
  userId: string, 
  feature: keyof UserQuotas
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Récupérer l'utilisation actuelle
    const { data: currentData } = await supabase
      .from('user_profiles')
      .select('monthly_usage')
      .eq('id', userId)
      .single();

    if (!currentData) {
      logger.error(`[SubscriptionGuard] Could not fetch current usage for user: ${userId.substring(0, 8)}`);
      return false;
    }

    const currentUsage = currentData.monthly_usage || { leads: 0, recordings: 0, images: 0, videos: 0 };
    const newUsage = {
      ...currentUsage,
      [feature]: (currentUsage[feature] || 0) + 1
    };

    // Mettre à jour l'utilisation
    const { error } = await supabase
      .from('user_profiles')
      .update({ monthly_usage: newUsage })
      .eq('id', userId);

    if (error) {
      logger.error(`[SubscriptionGuard] Error updating monthly usage: ${error.message}`);
      return false;
    }

    logger.info(`[SubscriptionGuard] Updated ${feature} usage for user ${userId.substring(0, 8)}: ${newUsage[feature]}`);
    return true;
  } catch (error) {
    logger.error(`[SubscriptionGuard] Error incrementing monthly usage: ${error}`);
    return false;
  }
}

// Fonction pour consommer un crédit à usage unique
export async function consumeOneTimeCredit(
  userId: string, 
  feature: keyof UserCredits
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Récupérer les crédits actuels
    const { data: currentData } = await supabase
      .from('user_profiles')
      .select('one_time_credits')
      .eq('id', userId)
      .single();

    if (!currentData) {
      logger.error(`[SubscriptionGuard] Could not fetch current credits for user: ${userId.substring(0, 8)}`);
      return false;
    }

    const currentCredits = currentData.one_time_credits || { images: 0, videos: 0, recordings: 0 };
    
    if (currentCredits[feature] <= 0) {
      logger.warn(`[SubscriptionGuard] User ${userId.substring(0, 8)} has no ${feature} credits to consume`);
      return false;
    }

    const newCredits = {
      ...currentCredits,
      [feature]: currentCredits[feature] - 1
    };

    // Mettre à jour les crédits
    const { error } = await supabase
      .from('user_profiles')
      .update({ one_time_credits: newCredits })
      .eq('id', userId);

    if (error) {
      logger.error(`[SubscriptionGuard] Error updating one-time credits: ${error.message}`);
      return false;
    }

    logger.info(`[SubscriptionGuard] Consumed ${feature} credit for user ${userId.substring(0, 8)}: ${newCredits[feature]} remaining`);
    return true;
  } catch (error) {
    logger.error(`[SubscriptionGuard] Error consuming one-time credit: ${error}`);
    return false;
  }
}

// Fonction pour réinitialiser les quotas mensuels (à exécuter mensuellement)
export async function resetMonthlyUsage(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        monthly_usage: { leads: 0, recordings: 0, images: 0, videos: 0 }
      })
      .eq('id', userId);

    if (error) {
      logger.error(`[SubscriptionGuard] Error resetting monthly usage: ${error.message}`);
      return false;
    }

    logger.info(`[SubscriptionGuard] Reset monthly usage for user ${userId.substring(0, 8)}`);
    return true;
  } catch (error) {
    logger.error(`[SubscriptionGuard] Error resetting monthly usage: ${error}`);
    return false;
  }
} 

// ✅ NOUVELLE FONCTION: Vérification et traitement automatique de l'expiration Pro
export async function checkAndHandleProExpiration(userId: string): Promise<{ expired: boolean; updated?: boolean }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Récupérer les informations d'abonnement
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        plan_type,
        subscription_end_date
      `)
      .eq('id', userId)
      .single();

    if (error || !data) {
      logger.error(`[SubscriptionGuard] Error fetching user subscription for expiration check: ${error?.message}`);
      return { expired: false };
    }

    // ✅ LOGIQUE DE GARDE BACKEND: Vérifier si l'abonnement Pro a expiré
    if (data.plan_type === 'PRO' && data.subscription_end_date) {
      const subscriptionEndDate = new Date(data.subscription_end_date);
      const currentDate = new Date();
      
      if (currentDate > subscriptionEndDate) {
        logger.info(`[SubscriptionGuard] Pro subscription expired for user ${userId.substring(0, 8)}. Updating to EXPIRED.`);
        
        // ✅ ACTION BACKEND: Mettre à jour planType à EXPIRED
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            plan_type: 'EXPIRED',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          logger.error(`[SubscriptionGuard] Failed to update user to EXPIRED: ${updateError.message}`);
          return { expired: true, updated: false };
        }

        logger.info(`[SubscriptionGuard] Successfully updated user ${userId.substring(0, 8)} to EXPIRED status.`);
        return { expired: true, updated: true };
      }
    }

    return { expired: false };
  } catch (error) {
    logger.error(`[SubscriptionGuard] Exception in checkAndHandleProExpiration: ${error}`);
    return { expired: false };
  }
}

// ✅ NOUVELLE FONCTION: Middleware pour vérifier l'expiration avant chaque requête
export async function requireValidSubscription(
  req: NextRequest,
  featureName: string
): Promise<{ success: boolean; response?: NextResponse; subscription?: UserSubscription }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn(`[SubscriptionGuard] Unauthorized access attempt to ${featureName}`);
      return {
        success: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      };
    }

    // ✅ VÉRIFICATION AUTOMATIQUE: Contrôler l'expiration Pro avant tout
    const { expired, updated } = await checkAndHandleProExpiration(user.id);
    
    if (expired) {
      logger.warn(`[SubscriptionGuard] User ${user.id.substring(0, 8)} attempted to access ${featureName} with expired Pro subscription`);
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'Subscription expired',
          code: 'subscription_expired',
          feature: featureName,
          message: 'Your Pro subscription has expired. Please renew to continue accessing premium features.'
        }, { status: 403 })
      };
    }

    // Si l'utilisateur a été mis à jour vers EXPIRED, récupérer les nouvelles données
    const subscription = await getUserSubscription(user.id);
    if (!subscription) {
      logger.error(`[SubscriptionGuard] Could not fetch subscription for user: ${user.id.substring(0, 8)}`);
      return {
        success: false,
        response: NextResponse.json({ error: 'Subscription data unavailable' }, { status: 500 })
      };
    }

    // Vérifier l'accès Pro normal
    if (!hasProAccess(subscription)) {
      logger.warn(`[SubscriptionGuard] User ${user.id.substring(0, 8)} attempted to access ${featureName} without Pro access`);
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'Pro access required',
          code: subscription.planType === 'EXPIRED' ? 'subscription_expired' : 'trial_expired',
          feature: featureName
        }, { status: 403 }),
        subscription
      };
    }

    return { success: true, subscription };
  } catch (error) {
    logger.error(`[SubscriptionGuard] Error in requireValidSubscription: ${error}`);
    return {
      success: false,
      response: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    };
  }
} 