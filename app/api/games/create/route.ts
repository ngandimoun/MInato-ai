import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

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
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: CreateGameRequest = await request.json();

    // Validate the request
    if (!body.game_type || !body.difficulty || !body.rounds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Initialize Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
    }
    
    const convex = new ConvexHttpClient(convexUrl);
    
    // Generate unique game session ID
    const gameSessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the game in Convex
    const gameId = await convex.mutation(api.games.createGame, {
      supabase_session_id: gameSessionId,
      game_type: body.game_type,
      host_user_id: user.id,
      difficulty: body.difficulty,
      max_players: body.max_players,
      rounds: body.rounds,
      mode: body.mode,
      settings: {
        auto_advance: body.settings?.auto_advance ?? true,
        show_explanations: body.settings?.show_explanations ?? true,
        time_per_question: body.settings?.time_per_question ?? 30,
        category: body.settings?.category,
        language: body.settings?.language ?? 'en',
        ai_personality: body.settings?.ai_personality ?? 'friendly',
        topic_focus: body.settings?.topic_focus ?? 'general',
      }
    });

    // Initialize the game with AI-generated questions
    await convex.action(api.gameOrchestrator.initializeGameWithQuestions, {
      game_id: gameId,
      game_type: body.game_type,
      difficulty: body.difficulty,
      rounds: body.rounds,
      category: body.settings?.category,
      language: body.settings?.language,
      ai_personality: body.settings?.ai_personality,
      topic_focus: body.settings?.topic_focus,
    });

    console.log('Game creation request:', {
      gameId: gameSessionId,
      convexGameId: gameId,
      userId: user.id,
      gameType: body.game_type,
      settings: body.settings,
    });

    return NextResponse.json({
      success: true,
      game_id: gameSessionId,
      convex_game_id: gameId,
      message: "Game created successfully",
      settings_applied: {
        language: body.settings?.language || 'en',
        ai_personality: body.settings?.ai_personality || 'friendly',
        topic_focus: body.settings?.topic_focus || 'general',
      }
    });

  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: "Failed to create game: " + (error as Error).message },
      { status: 500 }
    );
  }
} 