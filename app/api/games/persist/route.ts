import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const body = await request.json();
    const {
      convex_game_id,
      game_type,
      host_user_id,
      difficulty,
      max_players,
      rounds,
      mode,
      status,
      final_scores,
      winner_user_id,
      total_duration_seconds,
      started_at,
      finished_at,
      settings
    } = body;

    // Validate required fields
    if (!convex_game_id || !game_type || !host_user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: convex_game_id, game_type, host_user_id' },
        { status: 400 }
      );
    }

    // Get the game type ID from game_types table
    const { data: gameTypeData, error: gameTypeError } = await supabase
      .from('game_types')
      .select('id')
      .eq('name', game_type)
      .single();

    if (gameTypeError || !gameTypeData) {
      console.error('Game type not found:', game_type);
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      );
    }

    // Create game session in Supabase
    const sessionData = {
      convex_game_id,
      game_type_id: gameTypeData.id,
      host_user_id,
      difficulty: difficulty || 'medium',
      max_players: max_players || 2,
      rounds: rounds || 10,
      mode: mode || 'multiplayer',
      status: status || 'completed',
      final_scores: final_scores || [],
      winner_user_id,
      total_duration_seconds,
      started_at: started_at ? new Date(started_at) : null,
      finished_at: finished_at ? new Date(finished_at) : null,
      settings: settings || {}
    };

    const { data: session, error: sessionError } = await supabase
      .from('game_sessions_history')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating game session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create game session' },
        { status: 500 }
      );
    }

    // Create participant records
    if (final_scores && final_scores.length > 0) {
      const participantData = final_scores.map((score: any) => ({
        game_session_id: session.id,
        user_id: score.user_id,
        score: score.score || 0,
        correct_answers: score.correct_answers || 0,
        total_answers: score.total_answers || rounds,
        rank: score.rank
      }));

      const { error: participantError } = await supabase
        .from('game_participants')
        .insert(participantData);

      if (participantError) {
        console.error('Error creating participants:', participantError);
        // Don't fail the whole operation for participant errors
      }
    }

    console.log(`[Game Persist] Successfully saved game ${convex_game_id} as session ${session.id}`);

    return NextResponse.json({
      success: true,
      session_id: session.id,
      participants_created: final_scores?.length || 0
    });

  } catch (error) {
    console.error('Error persisting game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 