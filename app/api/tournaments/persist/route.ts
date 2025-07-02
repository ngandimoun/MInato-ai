import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const body = await request.json();
    const { convex_tournament_id, tournament_data } = body;

    if (!convex_tournament_id || !tournament_data) {
      return NextResponse.json(
        { error: 'Missing required fields: convex_tournament_id, tournament_data' },
        { status: 400 }
      );
    }

    // Get the game type ID
    const { data: gameTypeData, error: gameTypeError } = await supabase
      .from('game_types')
      .select('id')
      .eq('name', tournament_data.settings.game_type)
      .single();

    if (gameTypeError || !gameTypeData) {
      console.error('Game type not found:', tournament_data.settings.game_type);
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      );
    }

    // Update the existing tournament record in Supabase
    const { data: existingTournament, error: findError } = await supabase
      .from('tournaments')
      .select('id')
      .eq('tournament_id', tournament_data.tournament_id)
      .single();

    if (findError || !existingTournament) {
      console.error('Tournament not found in Supabase:', tournament_data.tournament_id);
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Update tournament with final results
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({
        status: tournament_data.status,
        current_round: tournament_data.current_round,
        total_rounds: tournament_data.total_rounds,
        started_at: tournament_data.started_at ? new Date(tournament_data.started_at) : null,
        finished_at: new Date(),
        winner_user_id: tournament_data.participants.find((p: any) => p.status === 'winner')?.user_id,
        final_bracket: tournament_data.bracket,
        convex_tournament_doc_id: convex_tournament_id,
      })
      .eq('id', existingTournament.id);

    if (updateError) {
      console.error('Error updating tournament:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tournament' },
        { status: 500 }
      );
    }

    // Update participant records with final standings
    const participantUpdates = tournament_data.participants.map(async (participant: any) => {
      const { error: participantError } = await supabase
        .from('tournament_participants')
        .update({
          status: participant.status,
          final_rank: participant.status === 'winner' ? 1 : 
                     participant.status === 'eliminated' ? 
                     tournament_data.participants.filter((p: any) => p.status === 'eliminated').length + 2 : 
                     null,
          total_score: participant.total_score,
          matches_won: participant.matches_won,
          matches_lost: participant.matches_lost,
        })
        .eq('tournament_id', existingTournament.id)
        .eq('user_id', participant.user_id);

      if (participantError) {
        console.error(`Error updating participant ${participant.user_id}:`, participantError);
      }
    });

    await Promise.all(participantUpdates);

    // Create match records for the bracket
    const matchInserts = tournament_data.bracket
      .filter((match: any) => match.status === 'completed' || match.status === 'bye')
      .map(async (match: any) => {
        const { error: matchError } = await supabase
          .from('tournament_matches')
          .insert({
            tournament_id: existingTournament.id,
            round: match.round,
            player1_id: match.player1_id,
            player2_id: match.player2_id,
            winner_id: match.winner_id,
            player1_score: match.scores.player1_score,
            player2_score: match.scores.player2_score,
            status: match.status,
            scheduled_at: new Date(match.scheduled_at),
            started_at: match.started_at ? new Date(match.started_at) : null,
            completed_at: match.completed_at ? new Date(match.completed_at) : null,
            game_session_id: null, // We don't store Convex game IDs in Supabase
          });

        if (matchError) {
          console.error(`Error creating match record:`, matchError);
        }
      });

    await Promise.all(matchInserts);

    console.log(`[Tournament Persist] Successfully saved tournament ${tournament_data.tournament_id}`);

    return NextResponse.json({
      success: true,
      tournament_id: existingTournament.id,
      participants_updated: tournament_data.participants.length,
      matches_created: tournament_data.bracket.filter((m: any) => m.status === 'completed' || m.status === 'bye').length,
    });

  } catch (error) {
    console.error('Error persisting tournament:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 