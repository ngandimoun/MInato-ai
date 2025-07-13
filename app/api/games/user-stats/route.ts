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

    // Get user stats
    const { data: userStats, error: statsError } = await supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError)
      return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 })
    }

    // If no stats exist, create default stats
    let stats = userStats
    if (!userStats) {
      const defaultStats = {
        user_id: user.id,
        total_games_played: 0,
        total_wins: 0,
        total_score: 0,
        xp_points: 0,
        level: 1,
        game_type_stats: {},
        achievements: [],
        favorite_game_types: [],
        preferred_difficulty: 'medium'
      }

      const { data: newStats, error: createError } = await supabase
        .from('user_game_stats')
        .insert(defaultStats)
        .select()
        .single()

      if (createError) {
        console.error('Error creating user stats:', createError)
        return NextResponse.json({ error: 'Failed to create user stats' }, { status: 500 })
      }

      stats = newStats
    }

    // Calculate XP to next level
    function calculateLevel(xp: number): number {
      if (xp < 200) return 1
      
      let level = 1
      let requiredXP = 0
      let increment = 200
      
      while (requiredXP <= xp) {
        level++
        requiredXP += increment
        increment = Math.floor(increment * 1.3)
        
        if (level > 100) break
      }
      
      return level - 1
    }

    function getXPForNextLevel(currentLevel: number): number {
      let totalXP = 0
      let increment = 200
      
      for (let i = 2; i <= currentLevel + 1; i++) {
        totalXP += increment
        increment = Math.floor(increment * 1.3)
      }
      
      return totalXP
    }

    const currentLevel = calculateLevel(stats.xp_points)
    const xpToNextLevel = getXPForNextLevel(currentLevel) - stats.xp_points

    return NextResponse.json({
      success: true,
      stats: {
        total_games_played: stats.total_games_played,
        total_wins: stats.total_wins,
        total_score: stats.total_score,
        xp_points: stats.xp_points,
        level: currentLevel,
        current_streak: stats.current_win_streak || 0,
        best_streak: stats.best_win_streak || 0,
        favorite_game_types: stats.favorite_game_types || [],
        achievements: stats.achievements || [],
        game_type_stats: stats.game_type_stats || {},
        xp_to_next_level: Math.max(0, xpToNextLevel),
        win_rate: stats.total_games_played > 0 
          ? Math.round((stats.total_wins / stats.total_games_played) * 100) 
          : 0,
        daily_games_played: stats.daily_games_played || 0,
        daily_wins: stats.daily_wins || 0,
        team_wins: stats.team_wins || 0
      }
    })

  } catch (error) {
    console.error('Error in user stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 