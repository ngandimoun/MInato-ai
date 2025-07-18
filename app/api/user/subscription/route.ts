import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

/**
 * GET /api/user/subscription
 * 
 * Récupère les données d'abonnement de l'utilisateur connecté
 */
export async function GET(req: NextRequest) {
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
    // Récupérer les données d'abonnement depuis la table user_profiles
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        plan_type,
        trial_end_date,
        subscription_end_date,
        stripe_customer_id,
        monthly_usage,
        one_time_credits,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      logger.error(`[SubscriptionAPI] Error fetching user subscription: ${error.message}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch subscription data'
      }, { status: 500 });
    }

    if (!user) {
      // Créer un utilisateur par défaut si il n'existe pas
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: session.user.email,
          plan_type: 'FREE_TRIAL',
          trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours d'essai
          monthly_usage: { leads: 0, recordings: 0, images: 0, videos: 0 },
          one_time_credits: { leads: 0, recordings: 0, images: 0, videos: 0 }
        })
        .select()
        .single();

      if (createError) {
        logger.error(`[SubscriptionAPI] Error creating default user: ${createError.message}`);
        return NextResponse.json({
          success: false,
          error: 'Failed to create user subscription data'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        user: newUser
      });
    }

    return NextResponse.json({
      success: true,
      user: user
    });

  } catch (error: any) {
    logger.error(`[SubscriptionAPI] Exception: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 