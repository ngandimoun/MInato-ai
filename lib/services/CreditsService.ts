// FILE: lib/services/CreditsService.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

export interface UserCredits {
  monthly: {
    images: number;
    videos: number;
    recordings: number;
    leads: number;
  };
  oneTime: {
    images: number;
    videos: number;
    recordings: number;
    leads: number;
  };
  limits: {
    images: number;
    videos: number;
    recordings: number;
    leads: number;
  };
}

export interface CreditUsage {
  feature: 'images' | 'videos' | 'recordings' | 'leads';
  currentUsage: number;
  limit: number;
  remainingMonthly: number;
  remainingOneTime: number;
  canUse: boolean;
  needsPurchase: boolean;
}

export class CreditsService {
  /**
   * Récupère les crédits et limites d'un utilisateur
   */
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select('plan_type, monthly_usage, one_time_credits, subscription_end_date')
        .eq('id', userId)
        .single();

      if (error || !user) {
        logger.error('[CreditsService] Error fetching user credits:', error);
        return null;
      }

      // Définir les limites selon le plan
      const limits = this.getLimitsForPlan(user.plan_type);
      
      // Nettoyer les crédits expirés si nécessaire
      const cleanedCredits = await this.cleanupExpiredCredits(userId, user);

      return {
        monthly: {
          images: user.monthly_usage?.images || 0,
          videos: user.monthly_usage?.videos || 0,
          recordings: user.monthly_usage?.recordings || 0,
          leads: user.monthly_usage?.leads || 0,
        },
        oneTime: {
          images: cleanedCredits.images || 0,
          videos: cleanedCredits.videos || 0,
          recordings: cleanedCredits.recordings || 0,
          leads: cleanedCredits.leads || 0,
        },
        limits
      };
    } catch (error) {
      logger.error('[CreditsService] Error in getUserCredits:', error);
      return null;
    }
  }

  /**
   * Vérifie si un utilisateur peut utiliser une fonctionnalité
   */
  async checkCreditUsage(userId: string, feature: 'images' | 'videos' | 'recordings' | 'leads'): Promise<CreditUsage> {
    const credits = await this.getUserCredits(userId);
    if (!credits) {
      return {
        feature,
        currentUsage: 0,
        limit: 0,
        remainingMonthly: 0,
        remainingOneTime: 0,
        canUse: false,
        needsPurchase: false
      };
    }

    const currentUsage = credits.monthly[feature];
    const limit = credits.limits[feature];
    const remainingMonthly = Math.max(0, limit - currentUsage);
    const remainingOneTime = credits.oneTime[feature];
    const canUse = remainingMonthly > 0 || remainingOneTime > 0;
    const needsPurchase = !canUse;

    return {
      feature,
      currentUsage,
      limit,
      remainingMonthly,
      remainingOneTime,
      canUse,
      needsPurchase
    };
  }

  /**
   * Consomme un crédit pour une fonctionnalité
   */
  async consumeCredit(userId: string, feature: 'images' | 'videos' | 'recordings' | 'leads'): Promise<boolean> {
    try {
      const usage = await this.checkCreditUsage(userId, feature);
      
      if (!usage.canUse) {
        logger.warn(`[CreditsService] User ${userId} cannot use ${feature} - no credits available`);
        return false;
      }

      // Priorité aux crédits à usage unique
      if (usage.remainingOneTime > 0) {
        await this.consumeOneTimeCredit(userId, feature);
        logger.info(`[CreditsService] Consumed one-time credit for ${feature} - user ${userId}`);
      } else {
        await this.consumeMonthlyCredit(userId, feature);
        logger.info(`[CreditsService] Consumed monthly credit for ${feature} - user ${userId}`);
      }

      return true;
    } catch (error) {
      logger.error(`[CreditsService] Error consuming credit for ${feature}:`, error);
      return false;
    }
  }

  /**
   * Consomme un crédit mensuel
   */
  private async consumeMonthlyCredit(userId: string, feature: 'images' | 'videos' | 'recordings' | 'leads'): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('user_profiles')
      .update({
        monthly_usage: supabase.sql`jsonb_set(
          COALESCE(monthly_usage, '{}'::jsonb),
          '{${feature}}',
          COALESCE((monthly_usage->>${feature})::int, 0) + 1
        )`
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to consume monthly credit: ${error.message}`);
    }
  }

  /**
   * Consomme un crédit à usage unique
   */
  private async consumeOneTimeCredit(userId: string, feature: 'images' | 'videos' | 'recordings' | 'leads'): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('user_profiles')
      .update({
        one_time_credits: supabase.sql`jsonb_set(
          COALESCE(one_time_credits, '{}'::jsonb),
          '{${feature}}',
          GREATEST(0, COALESCE((one_time_credits->>${feature})::int, 0) - 1)
        )`
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to consume one-time credit: ${error.message}`);
    }
  }

  /**
   * Nettoie les crédits expirés
   */
  private async cleanupExpiredCredits(userId: string, user: any): Promise<any> {
    if (!user.subscription_end_date || new Date(user.subscription_end_date) >= new Date()) {
      return user.one_time_credits || { images: 0, videos: 0, recordings: 0, leads: 0 };
    }

    // L'abonnement a expiré, réinitialiser les crédits à usage unique
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from('user_profiles')
      .update({
        one_time_credits: { images: 0, videos: 0, recordings: 0, leads: 0 }
      })
      .eq('id', userId);

    if (error) {
      logger.error('[CreditsService] Error cleaning up expired credits:', error);
    }

    return { images: 0, videos: 0, recordings: 0, leads: 0 };
  }

  /**
   * Définit les limites selon le plan utilisateur
   */
  private getLimitsForPlan(planType: string): { images: number; videos: number; recordings: number; leads: number } {
    switch (planType) {
      case 'PRO':
        return {
          images: 30,
          videos: 20,
          recordings: 20,
          leads: 50
        };
      case 'FREE':
      default:
        return {
          images: 2,
          videos: 1,
          recordings: 3,
          leads: 5
        };
    }
  }

  /**
   * Récupère l'historique des achats de crédits d'un utilisateur
   */
  async getCreditPurchaseHistory(userId: string): Promise<any[]> {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('credit_purchases')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false });

      if (error) {
        logger.error('[CreditsService] Error fetching credit purchase history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('[CreditsService] Error in getCreditPurchaseHistory:', error);
      return [];
    }
  }

  /**
   * Vérifie si un utilisateur a des crédits expirés
   */
  async hasExpiredCredits(userId: string): Promise<boolean> {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select('subscription_end_date, one_time_credits')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return false;
      }

      // Vérifier si l'abonnement a expiré et qu'il y a des crédits
      if (user.subscription_end_date && new Date(user.subscription_end_date) < new Date()) {
        const credits = user.one_time_credits || {};
        return (credits.images || 0) > 0 || 
               (credits.videos || 0) > 0 || 
               (credits.recordings || 0) > 0 || 
               (credits.leads || 0) > 0;
      }

      return false;
    } catch (error) {
      logger.error('[CreditsService] Error checking expired credits:', error);
      return false;
    }
  }
} 