import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const body = await request.json();
    const { tournament_id, winner_user_id, prize_pool, participants } = body;

    if (!tournament_id || !winner_user_id || !prize_pool) {
      return NextResponse.json(
        { error: 'Missing required fields: tournament_id, winner_user_id, prize_pool' },
        { status: 400 }
      );
    }

    // Calculate prize distribution (winner gets 70%, runner-up gets 20%, third place gets 10%)
    const winnerPrize = Math.floor(prize_pool * 0.7);
    const runnerUpPrize = Math.floor(prize_pool * 0.2);
    const thirdPlacePrize = Math.floor(prize_pool * 0.1);

    // Award coins to the winner
    const { data: winnerProfile, error: winnerError } = await supabase
      .from('user_profiles')
      .select('minato_coins')
      .eq('user_id', winner_user_id)
      .single();

    if (winnerError || !winnerProfile) {
      console.error('Winner profile not found:', winner_user_id);
      return NextResponse.json(
        { error: 'Winner profile not found' },
        { status: 404 }
      );
    }

    // Update winner's coins
    const { error: updateWinnerError } = await supabase
      .from('user_profiles')
      .update({
        minato_coins: winnerProfile.minato_coins + winnerPrize
      })
      .eq('user_id', winner_user_id);

    if (updateWinnerError) {
      console.error('Error updating winner coins:', updateWinnerError);
      return NextResponse.json(
        { error: 'Failed to distribute prize to winner' },
        { status: 500 }
      );
    }

    // Log the prize distribution
    const { error: logError } = await supabase
      .from('user_transactions')
      .insert({
        user_id: winner_user_id,
        type: 'tournament_prize',
        amount: winnerPrize,
        description: `Tournament ${tournament_id} - 1st Place Prize`,
        metadata: {
          tournament_id,
          rank: 1,
          total_participants: participants,
          total_prize_pool: prize_pool,
        },
      });

    if (logError) {
      console.error('Error logging prize transaction:', logError);
      // Don't fail the request for logging errors
    }

    // Update user game stats for tournament win
    const { error: statsError } = await supabase
      .from('user_game_stats')
      .update({
        tournaments_won: supabase.sql`tournaments_won + 1`,
        total_tournaments: supabase.sql`total_tournaments + 1`,
        tournament_earnings: supabase.sql`tournament_earnings + ${winnerPrize}`,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', winner_user_id);

    if (statsError) {
      console.error('Error updating tournament stats:', statsError);
      // Don't fail the request for stats errors
    }

    console.log(`[Tournament Prize] Distributed ${winnerPrize} coins to winner ${winner_user_id} for tournament ${tournament_id}`);

    return NextResponse.json({
      success: true,
      winner_prize: winnerPrize,
      total_distributed: winnerPrize, // For now, only distributing to winner
      transaction_logged: !logError,
      stats_updated: !statsError,
    });

  } catch (error) {
    console.error('Error distributing tournament prizes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 