import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { gameService, CreateGameRequest as SupabaseCreateGameRequest } from "@/lib/services/SupabaseGameService";
import { v4 as uuidv4 } from 'uuid';

interface CreateGameRequest {
  game_type: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  max_players: number;
  rounds: number;
  mode: 'solo' | 'multiplayer';
  settings?: {
    auto_advance: boolean;
    show_explanations: boolean;
    time_per_question: number;
    category?: string;
    language?: string;
    ai_personality?: string;
    topic_focus?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Create a guest user ID if not authenticated
    const userId = user ? user.id : `guest-${uuidv4()}`;
    const isGuest = !user;
    
    console.log(`[Game Creation API] Request received - User: ${userId}, Guest: ${isGuest}`);
    
    // If guest, log this information
    if (isGuest) {
      console.log(`[Game Creation API] Creating game with guest user: ${userId}`);
    }

    const body: CreateGameRequest = await request.json();

    console.log(`[Game Creation API] Game creation request:`, {
      game_type: body.game_type,
      mode: body.mode,
      difficulty: body.difficulty,
      max_players: body.max_players,
      rounds: body.rounds,
      user_id: userId,
      is_guest: isGuest
    });

    // Validate the request
    if (!body.game_type || !body.difficulty || !body.rounds) {
      console.error('[Game Creation API] Validation error: Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check user subscription status for non-guest users
    if (!isGuest) {
      try {
        const { data: subscriptionStatus } = await supabase
          .rpc('get_user_subscription_status', { user_uuid: userId })
          .single();
        
        console.log(`[Game Creation API] User subscription status:`, {
          user_id: userId,
          plan_type: (subscriptionStatus as any)?.plan_type,
          is_active: (subscriptionStatus as any)?.is_active,
          is_trial: (subscriptionStatus as any)?.is_trial,
          is_pro: (subscriptionStatus as any)?.is_pro,
          is_expired: (subscriptionStatus as any)?.is_expired
        });

        // Check if user can create multiplayer games
        if (body.mode === 'multiplayer' && !(subscriptionStatus as any)?.is_pro) {
          console.log(`[Game Creation API] Access denied - User ${userId} cannot create multiplayer games`);
          return NextResponse.json(
            { error: "Multiplayer games require Pro subscription" },
            { status: 403 }
          );
        }
      } catch (subscriptionError) {
        console.error('[Game Creation API] Error checking subscription status:', subscriptionError);
        // Continue with game creation even if subscription check fails
      }
    }

    // Fetch user preferences from Supabase if authenticated
    let userPreferences = null;
    if (!isGuest) {
      try {
        const { data: preferencesData } = await supabase
          .from('user_states')
          .select('workflow_preferences')
          .eq('user_id', userId)
          .single();
        
        userPreferences = preferencesData?.workflow_preferences;
        console.log('[Game Creation API] Fetched user preferences for game creation:', userPreferences);
      } catch (error) {
        console.log('[Game Creation API] Could not fetch user preferences, using defaults');
      }
    }
    
    // Create Supabase game request with proper settings structure
    const supabaseGameRequest: SupabaseCreateGameRequest = {
      game_type: body.game_type,
      difficulty: body.difficulty,
      max_players: body.max_players,
      rounds: body.rounds,
      mode: body.mode,
      settings: {
        auto_advance: body.settings?.auto_advance ?? true,
        show_explanations: body.settings?.show_explanations ?? true,
        time_per_question: body.settings?.time_per_question ?? 30,
        language: body.settings?.language ?? userPreferences?.gamePreferences?.language ?? 'en',
        ai_personality: body.settings?.ai_personality ?? userPreferences?.gamePreferences?.ai_personality ?? 'friendly',
        topic_focus: body.settings?.topic_focus ?? userPreferences?.gamePreferences?.topic_focus ?? 'general',
        // User preference arrays for personalization
        user_interests: userPreferences?.interestCategories || [],
        user_news_categories: userPreferences?.newsPreferredCategories || [],
      }
    };

    // Get user's display name for the game
    const username = isGuest ? 'Guest Player' : (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player');

    console.log(`[Game Creation API] Creating game with Supabase service...`);

    // Create the game using Supabase Game Service
    const gameResult = await gameService.createGameRoom(supabaseGameRequest, userId, username);

    if (!gameResult.success) {
      console.error('[Game Creation API] Game creation failed:', gameResult.error);
      return NextResponse.json(
        { error: gameResult.error || "Failed to create game" },
        { status: 500 }
      );
    }

    console.log('[Game Creation API] Game creation successful:', {
      roomId: gameResult.data?.room_id,
      roomCode: gameResult.data?.room_code,
      userId: userId,
      isGuest: isGuest,
      gameType: body.game_type,
      settings: supabaseGameRequest.settings,
      preferencesApplied: !!userPreferences,
    });

    return NextResponse.json({
      success: true,
      room_id: gameResult.data?.room_id,
      room_code: gameResult.data?.room_code,
      topic: gameResult.data?.topic,
      message: gameResult.message || "Game created successfully",
      settings_applied: supabaseGameRequest.settings,
      preferences_applied: !!userPreferences,
      is_guest: isGuest,
      auto_started: body.mode === 'solo', // Solo games are auto-started, multiplayer games stay in lobby
    });

  } catch (error) {
    console.error('[Game Creation API] Unexpected error:', error);
    return NextResponse.json(
      { error: "Failed to create game: " + (error as Error).message },
      { status: 500 }
    );
  }
} 