import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Achievement definitions for Phase 3
const ACHIEVEMENTS = {
  // First Time Achievements
  'first_game': {
    id: 'first_game',
    name: 'First Steps',
    description: 'Play your first AI game',
    icon: '🎮',
    xp_reward: 100,
    condition: (stats: any) => stats.total_games_played >= 1
  },
  'first_win': {
    id: 'first_win',
    name: 'Victory Royale',
    description: 'Win your first game',
    icon: '👑',
    xp_reward: 200,
    condition: (stats: any) => stats.total_wins >= 1
  },
  
  // Game Count Achievements
  'game_veteran': {
    id: 'game_veteran',
    name: 'Game Veteran',
    description: 'Play 25 games',
    icon: '🏅',
    xp_reward: 500,
    condition: (stats: any) => stats.total_games_played >= 25
  },
  'game_master': {
    id: 'game_master',
    name: 'Game Master',
    description: 'Play 100 games',
    icon: '🎖️',
    xp_reward: 1000,
    condition: (stats: any) => stats.total_games_played >= 100
  },
  
  // Win Streak Achievements
  'win_streak_5': {
    id: 'win_streak_5',
    name: 'Hot Streak',
    description: 'Win 5 games in a row',
    icon: '🔥',
    xp_reward: 300,
    condition: (stats: any) => stats.current_win_streak >= 5
  },
  'win_streak_10': {
    id: 'win_streak_10',
    name: 'Unstoppable',
    description: 'Win 10 games in a row',
    icon: '⚡',
    xp_reward: 750,
    condition: (stats: any) => stats.current_win_streak >= 10
  },
  
  // Creative Game Achievements
  'haiku_poet': {
    id: 'haiku_poet',
    name: 'Digital Poet',
    description: 'Win a Haiku Battle',
    icon: '🌸',
    xp_reward: 250,
    condition: (stats: any) => stats.game_type_stats?.haiku_battle?.wins >= 1
  },
  'story_weaver': {
    id: 'story_weaver',
    name: 'Story Weaver',
    description: 'Complete 5 Story Chain games',
    icon: '📚',
    xp_reward: 300,
    condition: (stats: any) => stats.game_type_stats?.story_chain?.games_played >= 5
  },
  
  // Score Achievements
  'high_scorer': {
    id: 'high_scorer',
    name: 'High Scorer',
    description: 'Reach 10,000 total points',
    icon: '💯',
    xp_reward: 400,
    condition: (stats: any) => stats.total_score >= 10000
  },
  'score_legend': {
    id: 'score_legend',
    name: 'Score Legend',
    description: 'Reach 50,000 total points',
    icon: '💎',
    xp_reward: 1000,
    condition: (stats: any) => stats.total_score >= 50000
  },
  
  // Social Achievements
  'team_player': {
    id: 'team_player',
    name: 'Team Player',
    description: 'Win 3 team games',
    icon: '🤝',
    xp_reward: 350,
    condition: (stats: any) => stats.team_wins >= 3
  },
  
  // Level Achievements
  'level_5': {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    xp_reward: 200,
    condition: (stats: any) => stats.level >= 5
  },
  'level_10': {
    id: 'level_10',
    name: 'Experienced Gamer',
    description: 'Reach level 10',
    icon: '🌟',
    xp_reward: 500,
    condition: (stats: any) => stats.level >= 10
  }
};

// XP calculation formula
function calculateXP(gameResult: any): number {
  let baseXP = 50; // Base XP for participating
  
  // Win bonus
  if (gameResult.won) {
    baseXP += 100;
  }
  
  // Rank bonus (for multiplayer games)
  if (gameResult.rank) {
    const rankBonus = Math.max(0, 50 - (gameResult.rank - 1) * 10);
    baseXP += rankBonus;
  }
  
  // Score bonus (1 XP per 100 points)
  if (gameResult.score) {
    baseXP += Math.floor(gameResult.score / 100);
  }
  
  // Game type multipliers
  const gameTypeMultipliers: { [key: string]: number } = {
    'haiku_battle': 1.5,        // Creative games give more XP
    'story_chain': 1.4,
    'courtroom_drama': 1.3,
    'escape_room': 1.6,         // Difficult games give more XP
    'solo_adventure': 1.7,
    'classic_academia_quiz': 1.0, // Standard XP
  };
  
  const multiplier = gameTypeMultipliers[gameResult.game_type] || 1.0;
  baseXP = Math.floor(baseXP * multiplier);
  
  // Difficulty bonus
  const difficultyMultipliers: { [key: string]: number } = {
    'beginner': 0.8,
    'easy': 1.0,
    'medium': 1.2,
    'hard': 1.4,
    'expert': 1.6
  };
  
  const difficultyMultiplier = difficultyMultipliers[gameResult.difficulty] || 1.0;
  baseXP = Math.floor(baseXP * difficultyMultiplier);
  
  return Math.max(10, baseXP); // Minimum 10 XP
}

// Level calculation (exponential growth)
function calculateLevel(xp: number): number {
  // Level 1: 0 XP
  // Level 2: 200 XP
  // Level 3: 500 XP
  // Level 4: 900 XP
  // Level 5: 1400 XP
  // And so on...
  
  if (xp < 200) return 1;
  
  let level = 1;
  let requiredXP = 0;
  let increment = 200;
  
  while (requiredXP <= xp) {
    level++;
    requiredXP += increment;
    increment = Math.floor(increment * 1.3); // 30% increase each level
    
    if (level > 100) break; // Safety cap
  }
  
  return level - 1;
}

function getXPForNextLevel(currentLevel: number): number {
  let totalXP = 0;
  let increment = 200;
  
  for (let i = 2; i <= currentLevel + 1; i++) {
    totalXP += increment;
    increment = Math.floor(increment * 1.3);
  }
  
  return totalXP;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      game_session_id,
      game_type,
      difficulty,
      score,
      won,
      rank,
      total_players
    } = body;

    // Calculate XP earned
    const xpEarned = calculateXP({
      game_type,
      difficulty,
      score,
      won,
      rank
    });

    // Get or create user stats
    const { data: currentStats, error: statsError } = await supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') { // Not "not found" error
      console.error('Error fetching user stats:', statsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Initialize stats if user doesn't exist
    const stats = currentStats || {
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
    };

    // Update stats
    const newStats = {
      ...stats,
      total_games_played: stats.total_games_played + 1,
      total_wins: stats.total_wins + (won ? 1 : 0),
      total_score: stats.total_score + score,
      xp_points: stats.xp_points + xpEarned,
    };

    // Update game type specific stats
    const gameTypeStats = stats.game_type_stats || {};
    if (!gameTypeStats[game_type]) {
      gameTypeStats[game_type] = {
        games_played: 0,
        wins: 0,
        best_score: 0,
        total_score: 0
      };
    }
    
    gameTypeStats[game_type].games_played += 1;
    gameTypeStats[game_type].wins += won ? 1 : 0;
    gameTypeStats[game_type].best_score = Math.max(
      gameTypeStats[game_type].best_score || 0, 
      score
    );
    gameTypeStats[game_type].total_score += score;
    
    newStats.game_type_stats = gameTypeStats;

    // Calculate new level
    const newLevel = calculateLevel(newStats.xp_points);
    const leveledUp = newLevel > stats.level;
    newStats.level = newLevel;

    // Check for new achievements
    const newAchievements = [];
    const currentAchievementIds = stats.achievements?.map((a: any) => a.id) || [];
    
    for (const [achievementId, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (!currentAchievementIds.includes(achievementId) && 
          achievement.condition(newStats)) {
        newAchievements.push({
          ...achievement,
          earned_at: new Date().toISOString()
        });
        newStats.xp_points += achievement.xp_reward; // Bonus XP for achievements
      }
    }

    newStats.achievements = [...(stats.achievements || []), ...newAchievements];

    // Recalculate level if achievements gave bonus XP
    if (newAchievements.length > 0) {
      newStats.level = calculateLevel(newStats.xp_points);
    }

    // Update favorite game types
    const gameTypePlayCounts = Object.entries(gameTypeStats)
      .map(([type, data]: [string, any]) => ({ type, count: data.games_played }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.type);
    
    newStats.favorite_game_types = gameTypePlayCounts;

    // Save to database
    const { error: updateError } = await supabase
      .from('user_game_stats')
      .upsert(newStats, { onConflict: 'user_id' });

    if (updateError) {
      console.error('Error updating user stats:', updateError);
      return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
    }

    // Calculate XP to next level
    const xpToNextLevel = getXPForNextLevel(newStats.level) - newStats.xp_points;

    return NextResponse.json({
      success: true,
      xp_earned: xpEarned,
      total_xp: newStats.xp_points,
      level: newStats.level,
      leveled_up: leveledUp,
      new_achievements: newAchievements,
      xp_to_next_level: Math.max(0, xpToNextLevel),
      stats: newStats
    });

  } catch (error) {
    console.error('Error in rewards grant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 