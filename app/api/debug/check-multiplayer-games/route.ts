import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    console.log('🔍 [CHECK MULTIPLAYER GAMES] Checking current multiplayer games...');

    // Get all multiplayer games
    const { data: games, error: gamesError } = await supabase
      .from('live_game_rooms')
      .select(`
        *,
        game_types!inner(name, display_name),
        live_game_players(*)
      `)
      .eq('mode', 'multiplayer')
      .order('created_at', { ascending: false })
      .limit(10);

    if (gamesError) {
      console.error('❌ [CHECK MULTIPLAYER GAMES] Error fetching games:', gamesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch games',
        details: gamesError.message
      }, { status: 500 });
    }

    console.log(`📊 [CHECK MULTIPLAYER GAMES] Found ${games?.length || 0} multiplayer games`);

    const gamesSummary = games?.map((game: any) => ({
      id: game.id,
      roomCode: game.room_code,
      status: game.status,
      gameType: game.game_types?.display_name || game.game_types?.name,
      host: game.host_user_id,
      playersCount: game.live_game_players?.length || 0,
      questionsCount: game.questions?.length || 0,
      hasCurrentQuestion: !!game.current_question,
      currentQuestionIndex: game.current_question_index,
      createdAt: game.created_at,
      startedAt: game.started_at,
      settings: game.settings,
      firstQuestionPreview: game.questions?.[0] ? {
        question: game.questions[0].question?.substring(0, 100) + '...',
        language: game.questions[0].question?.includes('Qu\'est-ce') || game.questions[0].question?.includes('Quelle') ? 'French' : 'English/Other',
        optionsCount: game.questions[0].options?.length || 0,
        hasExplanation: !!game.questions[0].explanation
      } : null
    })) || [];

    return NextResponse.json({
      success: true,
      message: 'Multiplayer games retrieved successfully',
      data: {
        totalGames: games?.length || 0,
        games: gamesSummary
      }
    });

  } catch (error: any) {
    console.error('❌ [CHECK MULTIPLAYER GAMES] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check multiplayer games',
      details: error.stack
    }, { status: 500 });
  }
} 