import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, feature } = await request.json();

    console.log(`[Feature Access API] Request received - User: ${userId}, Feature: ${feature}`);

    if (!userId || !feature) {
      console.error('[Feature Access API] Error: User ID and feature are required');
      return NextResponse.json(
        { error: 'User ID and feature are required' },
        { status: 400 }
      );
    }

    console.log(`[Feature Access API] Checking access for user ${userId} to feature ${feature}`);

    // Utiliser la fonction RPC pour récupérer le statut d'abonnement
    const { data, error } = await supabase
      .rpc('get_user_subscription_status', { user_uuid: userId });

    if (error) {
      console.error('[Feature Access API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log(`[Feature Access API] No user found with ID: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const subscriptionStatus = data[0];
    
    console.log(`[Feature Access API] User ${userId} subscription status:`, {
      plan_type: subscriptionStatus.plan_type,
      is_active: subscriptionStatus.is_active,
      is_trial: subscriptionStatus.is_trial,
      is_pro: subscriptionStatus.is_pro,
      is_expired: subscriptionStatus.is_expired,
      days_remaining: subscriptionStatus.days_remaining
    });

    // Log du plan type pour le terminal
    console.log(`[Feature Access API] === USER PLAN TYPE ===`);
    console.log(`[Feature Access API] User ID: ${userId}`);
    console.log(`[Feature Access API] Plan Type: ${subscriptionStatus.plan_type}`);
    console.log(`[Feature Access API] Status: ${subscriptionStatus.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`[Feature Access API] Days Remaining: ${subscriptionStatus.days_remaining}`);
    console.log(`[Feature Access API] ========================`);

    // Définir les règles d'accès aux fonctionnalités selon les nouveaux plans Minato
    let hasAccess = false;
    let reason = '';

    if (subscriptionStatus.is_expired) {
      hasAccess = false;
      reason = 'Subscription expired';
      console.log(`[Feature Access API] User ${userId} access DENIED - Subscription expired`);
    } else if (subscriptionStatus.is_active) {
      // Plan actif (FREE ou PRO)
      switch (feature) {
        // Features disponibles pour les plans FREE et PRO
        case 'chat':
        case 'memory':
        case 'leads':
        case 'listening':
        case 'game_solo':
        case 'solo_games':
          hasAccess = true;
          reason = subscriptionStatus.is_pro ? 'Available in Pro plan' : 'Available in Free plan';
          console.log(`[Feature Access API] User ${userId} access GRANTED to ${feature} - Available in current plan`);
          break;
          
        // Features disponibles uniquement pour le plan PRO
        case 'game_multiplayer':
        case 'multiplayer_games':
        case 'image_generation':
        case 'generate_image':
        case 'video_generation':
        case 'generate_video':
          if (subscriptionStatus.is_pro) {
            hasAccess = true;
            reason = 'Available in Pro plan';
            console.log(`[Feature Access API] User ${userId} access GRANTED to ${feature} - Pro plan feature`);
          } else {
            hasAccess = false;
            reason = 'Pro feature - upgrade required ($25/month)';
            console.log(`[Feature Access API] User ${userId} access DENIED to ${feature} - Pro plan required`);
          }
          break;
          
        default:
          hasAccess = false;
          reason = 'Unknown feature';
          console.log(`[Feature Access API] User ${userId} access DENIED to ${feature} - Unknown feature`);
      }
    } else {
      hasAccess = false;
      reason = 'No active subscription';
      console.log(`[Feature Access API] User ${userId} access DENIED to ${feature} - No active subscription`);
    }

    return NextResponse.json({
      success: true,
      hasAccess,
      reason,
      subscriptionStatus
    });

  } catch (error) {
    console.error('[Feature Access API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 