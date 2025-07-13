import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    })

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const gameType = searchParams.get('game_type')

    // Get game sessions where user was host or participant
    let hostGamesQuery = supabase
      .from('game_sessions_history')
      .select(`
        id,
        game_type_id,
        host_user_id,
        difficulty,
        max_players,
        rounds,
        mode,
        status,
        final_scores,
        winner_user_id,
        total_duration_seconds,
        created_at,
        started_at,
        finished_at,
        game_types (
          name,
          display_name,
          icon_name,
          color_theme
        )
      `)
      .eq('host_user_id', user.id)
      .eq('status', 'completed')

    if (gameType) {
      hostGamesQuery = hostGamesQuery.eq('game_types.name', gameType)
    }

    const { data: hostGames, error: hostError } = await hostGamesQuery
      .order('finished_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (hostError) {
      console.error('Error fetching host games:', hostError)
      return NextResponse.json({ error: 'Failed to fetch game history' }, { status: 500 })
    }

    // Get games where user was a participant
    let participantGamesQuery = supabase
      .from('game_participants')
      .select(`
        id,
        score,
        correct_answers,
        total_answers,
        rank,
        joined_at,
        game_sessions_history!inner (
          id,
          game_type_id,
          host_user_id,
          difficulty,
          max_players,
          rounds,
          mode,
          status,
          final_scores,
          winner_user_id,
          total_duration_seconds,
          created_at,
          started_at,
          finished_at,
          game_types (
            name,
            display_name,
            icon_name,
            color_theme
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('game_sessions_history.status', 'completed')
      .neq('game_sessions_history.host_user_id', user.id) // Exclude games where user was host

    if (gameType) {
      participantGamesQuery = participantGamesQuery.eq('game_sessions_history.game_types.name', gameType)
    }

    const { data: participantGames, error: participantError } = await participantGamesQuery
      .order('game_sessions_history.finished_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (participantError) {
      console.error('Error fetching participant games:', participantError)
      return NextResponse.json({ error: 'Failed to fetch game history' }, { status: 500 })
    }

    // Transform host games
    const transformedHostGames = (hostGames || []).map((game: any) => ({
      id: game.id,
      game_type: game.game_types?.name || 'unknown',
      game_type_display_name: game.game_types?.display_name || 'Unknown Game',
      game_type_icon: game.game_types?.icon_name || 'Gamepad2',
      game_type_color: game.game_types?.color_theme || 'blue',
      difficulty: game.difficulty,
      mode: game.mode,
      status: game.status,
      max_players: game.max_players,
      rounds: game.rounds,
      duration_seconds: game.total_duration_seconds,
      created_at: game.created_at,
      started_at: game.started_at,
      finished_at: game.finished_at,
      was_host: true,
      won: game.winner_user_id === user.id,
      score: game.final_scores ? 
        (Array.isArray(game.final_scores) ? 
          game.final_scores.find((s: any) => s.user_id === user.id)?.score || 0 : 0) : 0,
      rank: game.final_scores ? 
        (Array.isArray(game.final_scores) ? 
          game.final_scores.findIndex((s: any) => s.user_id === user.id) + 1 : 1) : 1,
      accuracy: 0, // Will be calculated if we have detailed data
      total_players: game.final_scores ? 
        (Array.isArray(game.final_scores) ? game.final_scores.length : 1) : 1
    }))

    // Transform participant games
    const transformedParticipantGames = (participantGames || []).map((participant: any) => {
      const game = participant.game_sessions_history
      return {
        id: game.id,
        game_type: game.game_types?.name || 'unknown',
        game_type_display_name: game.game_types?.display_name || 'Unknown Game',
        game_type_icon: game.game_types?.icon_name || 'Gamepad2',
        game_type_color: game.game_types?.color_theme || 'blue',
        difficulty: game.difficulty,
        mode: game.mode,
        status: game.status,
        max_players: game.max_players,
        rounds: game.rounds,
        duration_seconds: game.total_duration_seconds,
        created_at: game.created_at,
        started_at: game.started_at,
        finished_at: game.finished_at,
        was_host: false,
        won: game.winner_user_id === user.id,
        score: participant.score || 0,
        rank: participant.rank || 1,
        accuracy: participant.total_answers > 0 ? 
          Math.round((participant.correct_answers / participant.total_answers) * 100) : 0,
        total_players: game.final_scores ? 
          (Array.isArray(game.final_scores) ? game.final_scores.length : 1) : 1
      }
    })

    // Combine and sort all games by finished_at
    const allGames = [...transformedHostGames, ...transformedParticipantGames]
      .sort((a, b) => new Date(b.finished_at).getTime() - new Date(a.finished_at).getTime())
      .slice(0, limit)

    // Calculate summary statistics
    const totalGames = allGames.length
    const totalWins = allGames.filter(game => game.won).length
    const totalScore = allGames.reduce((sum, game) => sum + game.score, 0)
    const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0

    // Group games by type for breakdown
    const gameTypeBreakdown = allGames.reduce((acc: any, game) => {
      const type = game.game_type
      if (!acc[type]) {
        acc[type] = {
          game_type: type,
          display_name: game.game_type_display_name,
          icon: game.game_type_icon,
          color: game.game_type_color,
          games_played: 0,
          wins: 0,
          total_score: 0,
          best_score: 0
        }
      }
      acc[type].games_played++
      if (game.won) acc[type].wins++
      acc[type].total_score += game.score
      acc[type].best_score = Math.max(acc[type].best_score, game.score)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      games: allGames,
      summary: {
        total_games: totalGames,
        total_wins: totalWins,
        total_score: totalScore,
        average_score: averageScore,
        win_rate: winRate
      },
      game_type_breakdown: Object.values(gameTypeBreakdown),
      pagination: {
        limit,
        offset,
        has_more: allGames.length === limit
      }
    })

  } catch (error) {
    console.error('Error in game history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 