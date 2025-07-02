import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const body = await request.json();
    const { user_id, game_session_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }

    // Get user's game stats (using existing schema)
    let { data: userStats, error: statsError } = await supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (statsError) {
      console.log('User stats not found, creating default stats');
      // Create default user stats if they don't exist
      const defaultStats = {
        user_id,
        total_games_played: 0,
        total_games_won: 0,
        total_score: 0,
        total_xp_earned: 0,
        current_level: 1,
        current_win_streak: 0,
        best_win_streak: 0,
        team_games_won: 0,
        daily_games_played: 0,
        daily_games_won: 0,
        daily_score: 0,
        last_daily_reset: new Date().toISOString().split('T')[0],
        total_achievements: 0,
        haiku_poems_created: 0,
        stories_created: 0,
        perfect_rounds: 0,
        game_type_stats: {}
      };

      const { data: newStats, error: createError } = await supabase
        .from('user_game_stats')
        .insert(defaultStats)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user stats:', createError);
        return NextResponse.json(
          { error: 'Failed to initialize user stats' },
          { status: 500 }
        );
      }

      userStats = newStats;
    }

    // Try to get recent game history (simplified query)
    let gameHistory = [];
    try {
      const { data: sessions, error: historyError } = await supabase
        .from('game_sessions_history')
        .select('*')
        .eq('host_user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!historyError && sessions) {
        gameHistory = sessions;
      }
    } catch (error) {
      console.log('Game history not available, using stats only');
    }

    // Get current game data if provided
    let currentGameData = null;
    if (game_session_id) {
      try {
        const { data: currentGame, error: gameError } = await supabase
          .from('game_sessions_history')
          .select('*')
          .eq('id', game_session_id)
          .single();

        if (!gameError && currentGame) {
          currentGameData = currentGame;
        }
      } catch (error) {
        console.log('Current game data not available');
      }
    }

    // Analyze performance patterns with available data
    const performanceAnalysis = analyzePerformancePatterns(gameHistory, userStats, currentGameData);

    // Generate AI coaching insights
    const coachingInsights = await generateCoachingInsights(performanceAnalysis, userStats, currentGameData);

    // Store insights in database (using existing schema + new columns)
    try {
      const { data: insight, error: insertError } = await supabase
        .from('ai_coach_insights')
        .insert({
          user_id,
          session_id: game_session_id || null,
          insight_type: 'performance_analysis',
          content: JSON.stringify(coachingInsights),
          metrics: performanceAnalysis,
          ai_confidence: coachingInsights.confidence_score || 0.5,
          // New columns for compatibility
          game_session_id: game_session_id || null,
          insights: coachingInsights.insights || [],
          recommendations: coachingInsights.recommendations || [],
          performance_summary: performanceAnalysis,
          confidence_score: coachingInsights.confidence_score || 0.5,
          focus_areas: coachingInsights.focus_areas || [],
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error storing insights:', insertError);
        // Don't fail the request if storage fails
      }
    } catch (insertError) {
      console.error('Error storing insights:', insertError);
      // Continue without failing
    }

    return NextResponse.json({
      success: true,
      coaching_insights: coachingInsights,
      performance_analysis: performanceAnalysis,
    });

  } catch (error) {
    console.error('Error in AI coach analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function analyzePerformancePatterns(gameHistory: any[], userStats: any, currentGame: any) {
  // Use existing database fields and provide safe defaults
  const analysis = {
    overall_performance: {
      total_games: userStats?.total_games_played || 0,
      win_rate: userStats?.total_games_played > 0 ? (userStats?.total_games_won || 0) / userStats.total_games_played : 0,
      average_score: userStats?.total_games_played > 0 ? (userStats?.total_score || 0) / userStats.total_games_played : 0,
      current_level: userStats?.current_level || 1,
      current_streak: userStats?.current_win_streak || 0,
      best_streak: userStats?.best_win_streak || 0,
    },
    game_type_performance: userStats?.game_type_stats || {},
    difficulty_performance: {},
    recent_trends: {
      last_5_games: gameHistory.slice(0, 5).map(game => ({
        game_type: 'unknown',
        difficulty: game.difficulty || 'medium',
        score: 0,
        accuracy: 0.5,
        rank: 1,
        date: game.created_at,
      })),
      performance_trend: 'stable' as 'improving' | 'declining' | 'stable',
      accuracy_trend: 'stable' as 'improving' | 'declining' | 'stable',
    },
    strengths: [] as string[],
    weaknesses: [] as string[],
    current_game_analysis: currentGame ? {
      game_type: 'unknown',
      difficulty: currentGame.difficulty || 'medium',
      score: 0,
      accuracy: 0.5,
      rank: 1,
      performance_vs_average: 0,
    } : null,
  };

  // Add some basic insights based on available data
  if (userStats?.current_win_streak > 3) {
    analysis.strengths.push(`Great winning streak of ${userStats.current_win_streak} games!`);
  }

  if (userStats?.total_games_played > 10) {
    analysis.strengths.push(`Experienced player with ${userStats.total_games_played} games played`);
  }

  if ((userStats?.total_games_won || 0) / Math.max(userStats?.total_games_played || 1, 1) < 0.3) {
    analysis.weaknesses.push('Win rate could be improved with more practice');
  }

  return analysis;
}

async function generateCoachingInsights(analysis: any, userStats: any, currentGame: any) {
  try {
    const prompt = `You are Minato, a hyper-personalized AI gaming coach. Analyze this player's performance data and provide encouraging, actionable coaching insights.

PLAYER PERFORMANCE DATA:
- Total Games Played: ${userStats?.total_games_played || 0}
- Total Games Won: ${userStats?.total_games_won || 0}
- Total Score: ${userStats?.total_score || 0}
- Current Level: ${userStats?.current_level || 1}
- Current Win Streak: ${userStats?.current_win_streak || 0}
- Best Win Streak: ${userStats?.best_win_streak || 0}

COACHING GUIDELINES:
1. Be encouraging and motivational
2. Provide specific, actionable recommendations
3. Highlight both strengths and areas for improvement
4. Reference specific performance patterns you observe
5. Suggest concrete strategies for improvement
6. Keep insights concise but comprehensive
7. Use a friendly, supportive tone

${currentGame ? `
CURRENT GAME CONTEXT:
The player just finished a game with difficulty: ${currentGame.difficulty}
` : ''}

Provide insights in this JSON format:
{
  "insights": [
    "insight 1 about their performance",
    "insight 2 about patterns you notice",
    "insight 3 about their progress"
  ],
  "recommendations": [
    "specific recommendation 1",
    "specific recommendation 2", 
    "specific recommendation 3"
  ],
  "confidence_score": 0.8,
  "focus_areas": ["area1", "area2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are Minato, an expert AI gaming coach who provides personalized, encouraging feedback to help players improve their gaming performance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Try to parse JSON response
    try {
      const insights = JSON.parse(content);
      return insights;
    } catch (parseError) {
      // Fallback to default insights if JSON parsing fails
      return {
        insights: [
          "Welcome to Minato AI Games! Your gaming journey is just beginning.",
          "Every game is an opportunity to learn and improve your skills.",
          "Focus on enjoying the experience while building your knowledge base."
        ],
        recommendations: [
          "Start with easier difficulty levels to build confidence",
          "Try different game types to discover your strengths",
          "Practice regularly to develop consistent performance"
        ],
        confidence_score: 0.6,
        focus_areas: ["practice", "exploration", "consistency"]
      };
    }

  } catch (error) {
    console.error('Error generating coaching insights:', error);
    // Return default insights on error
    return {
      insights: [
        "Your gaming performance shows great potential for improvement!",
        "Each game you play contributes to your overall skill development.",
        "Stay consistent with your practice to see steady progress."
      ],
      recommendations: [
        "Continue playing regularly to build your skills",
        "Experiment with different game types and difficulties",
        "Focus on learning from each game experience"
      ],
      confidence_score: 0.5,
      focus_areas: ["consistency", "variety", "learning"]
    };
  }
} 