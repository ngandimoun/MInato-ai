import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { checkAndHandleProExpiration } from '@/lib/middleware/subscription-guards';

/**
 * POST /api/subscription/check-expiration
 * 
 * Vérifie et traite automatiquement l'expiration des abonnements Pro
 * Peut être appelé par un cron job ou manuellement
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // ✅ VÉRIFICATION AUTOMATIQUE: Contrôler l'expiration Pro
    const { expired, updated } = await checkAndHandleProExpiration(userId);
    
    if (expired) {
      logger.info(`[check-expiration] User ${userId.substring(0, 8)} subscription expired. Updated: ${updated}`);
      
      return NextResponse.json({
        success: true,
        expired: true,
        updated: updated,
        message: updated ? 'Subscription marked as expired' : 'Subscription already expired'
      });
    }
    
    return NextResponse.json({
      success: true,
      expired: false,
      message: 'Subscription is still active'
    });
    
  } catch (error: any) {
    logger.error(`[check-expiration] Error checking subscription expiration: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: 'Failed to check subscription expiration'
    }, { status: 500 });
  }
}

/**
 * GET /api/subscription/check-expiration
 * 
 * Vérifie l'expiration pour tous les utilisateurs Pro (pour les cron jobs)
 * Nécessite une clé API spéciale pour la sécurité
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  const expectedApiKey = process.env.SUBSCRIPTION_CHECK_API_KEY;
  
  // Vérification de sécurité pour les appels automatisés
  if (!apiKey || apiKey !== expectedApiKey) {
    return NextResponse.json({
      success: false,
      error: 'Invalid API key'
    }, { status: 401 });
  }
  
  const supabase = await createServerSupabaseClient();
  
  try {
    // Récupérer tous les utilisateurs Pro avec une date d'expiration
    const { data: proUsers, error } = await supabase
      .from('user_profiles')
      .select('id, plan_type, subscription_end_date')
      .eq('plan_type', 'PRO')
      .not('subscription_end_date', 'is', null);
    
    if (error) {
      logger.error(`[check-expiration] Error fetching Pro users: ${error.message}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch Pro users'
      }, { status: 500 });
    }
    
    const results = {
      totalChecked: proUsers.length,
      expired: 0,
      updated: 0,
      errors: 0
    };
    
    // Vérifier chaque utilisateur Pro
    for (const user of proUsers) {
      try {
        const { expired, updated } = await checkAndHandleProExpiration(user.id);
        
        if (expired) {
          results.expired++;
          if (updated) {
            results.updated++;
          }
        }
      } catch (error) {
        logger.error(`[check-expiration] Error checking user ${user.id.substring(0, 8)}: ${error}`);
        results.errors++;
      }
    }
    
    logger.info(`[check-expiration] Batch check completed: ${JSON.stringify(results)}`);
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error: any) {
    logger.error(`[check-expiration] Batch check error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform batch expiration check'
    }, { status: 500 });
  }
} 