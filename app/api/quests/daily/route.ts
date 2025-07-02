import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Daily quest templates
const DAILY_QUEST_TEMPLATES = [
  {
    id: 'play_games',
    name: 'Daily Player',
    description: 'Play {count} games today',
    icon: '🎮',
    type: 'play_count',
    target_values: [2, 3, 5],
    xp_rewards: [100, 150, 200],
    difficulty_weights: [0.5, 0.3, 0.2]
  },
  {
    id: 'win_games',
    name: 'Victory Seeker',
    description: 'Win {count} games today',
    icon: '👑',
    type: 'win_count',
    target_values: [1, 2, 3],
    xp_rewards: [150, 250, 350],
    difficulty_weights: [0.4, 0.4, 0.2]
  },
  {
    id: 'score_points',
    name: 'Score Hunter',
    description: 'Score {count} points in total today',
    icon: '💯',
    type: 'score_total',
    target_values: [500, 1000, 2000],
    xp_rewards: [100, 175, 275],
    difficulty_weights: [0.4, 0.4, 0.2]
  },
  {
    id: 'play_category',
    name: 'Category Explorer',
    description: 'Play {count} different game types today',
    icon: '🌟',
    type: 'category_variety',
    target_values: [2, 3, 4],
    xp_rewards: [125, 200, 300],
    difficulty_weights: [0.3, 0.5, 0.2]
  },
  {
    id: 'creative_games',
    name: 'Creative Mind',
    description: 'Play {count} creative games today',
    icon: '🎨',
    type: 'creative_count',
    target_values: [1, 2, 3],
    xp_rewards: [150, 225, 325],
    difficulty_weights: [0.4, 0.4, 0.2],
    game_types: ['haiku_battle', 'story_chain', 'courtroom_drama']
  },
  {
    id: 'team_games',
    name: 'Team Spirit',
    description: 'Play {count} team games today',
    icon: '🤝',
    type: 'team_count',
    target_values: [1, 2, 3],
    xp_rewards: [125, 200, 275],
    difficulty_weights: [0.4, 0.4, 0.2]
  },
  {
    id: 'perfect_round',
    name: 'Perfectionist',
    description: 'Get a perfect score in any round',
    icon: '⭐',
    type: 'perfect_score',
    target_values: [1],
    xp_rewards: [200],
    difficulty_weights: [1.0]
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Answer within 5 seconds {count} times',
    icon: '⚡',
    type: 'fast_answers',
    target_values: [3, 5, 8],
    xp_rewards: [100, 150, 225],
    difficulty_weights: [0.4, 0.4, 0.2]
  }
];

function generateDailyQuests(userStats: any): any[] {
  const quests = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Generate 3 quests per user
  const selectedTemplates = [...DAILY_QUEST_TEMPLATES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  for (const template of selectedTemplates) {
    // Select difficulty based on user level
    const userLevel = userStats?.level || 1;
    let difficultyIndex = 0;
    
    if (userLevel >= 5) difficultyIndex = 1;
    if (userLevel >= 10) difficultyIndex = 2;
    
    // Add some randomness
    const weights = template.difficulty_weights;
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        difficultyIndex = i;
        break;
      }
    }
    
    const targetValue = template.target_values[difficultyIndex];
    const xpReward = template.xp_rewards[difficultyIndex];
    
    quests.push({
      quest_id: `${today}_${template.id}_${difficultyIndex}`,
      template_id: template.id,
      name: template.name,
      description: template.description.replace('{count}', targetValue.toString()),
      icon: template.icon,
      type: template.type,
      target_value: targetValue,
      current_progress: 0,
      xp_reward: xpReward,
      completed: false,
      date: today,
      game_types: template.game_types || null,
      difficulty: difficultyIndex === 0 ? 'easy' : difficultyIndex === 1 ? 'medium' : 'hard'
    });
  }
  
  return quests;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if user already has quest progress for today's quests
    const { data: todayQuests, error: questError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('active_date', today);

    if (questError) {
      console.error('Error fetching daily quests:', questError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (todayQuests && todayQuests.length > 0) {
      // Get user's progress on these quests
      const questIds = todayQuests.map(q => q.id);
      const { data: userProgress, error: progressError } = await supabase
        .from('user_quest_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('quest_id', questIds);

      if (progressError) {
        console.error('Error fetching quest progress:', progressError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      // Combine quest data with user progress
      const questsWithProgress = todayQuests.map(quest => {
        const progress = userProgress?.find(p => p.quest_id === quest.id);
        return {
          ...quest,
          current_progress: progress?.progress || 0,
          completed: !!progress?.completed_at,
          claimed: !!progress?.claimed_at,
          progress_id: progress?.id
        };
      });

      return NextResponse.json({
        success: true,
        quests: questsWithProgress,
        generated_new: false
      });
    }

    // Get user stats to determine quest difficulty
    const { data: userStats } = await supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Generate new quests
    const newQuests = generateDailyQuests(userStats);

    // Insert quests into daily_quests table (without user_id)
    const questsToInsert = newQuests.map(quest => ({
      name: quest.name,
      description: quest.description,
      category: quest.type,
      icon: quest.icon,
      requirement_type: quest.type,
      requirement_value: quest.target_value,
      requirement_data: quest.game_types ? { game_types: quest.game_types } : {},
      reward_xp: quest.xp_reward,
      reward_coins: 50, // Default coin reward
      difficulty: quest.difficulty,
      active_date: today,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24 hours
      created_at: new Date().toISOString(),
    }));

    const { data: insertedQuests, error: insertError } = await supabase
      .from('daily_quests')
      .insert(questsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting quests:', insertError);
      return NextResponse.json({ error: 'Failed to create daily quests' }, { status: 500 });
    }

    // Create user quest progress entries
    const progressEntries = insertedQuests?.map(quest => ({
      user_id: user.id,
      quest_id: quest.id,
      progress: 0,
      created_at: new Date().toISOString(),
    })) || [];

    const { data: insertedProgress, error: progressError } = await supabase
      .from('user_quest_progress')
      .insert(progressEntries)
      .select();

    if (progressError) {
      console.error('Error creating quest progress:', progressError);
      return NextResponse.json({ error: 'Failed to create quest progress' }, { status: 500 });
    }

    // Return quests with progress data
    const questsWithProgress = insertedQuests?.map(quest => ({
      ...quest,
      current_progress: 0,
      completed: false,
      claimed: false,
      progress_id: insertedProgress?.find(p => p.quest_id === quest.id)?.id
    })) || [];

    return NextResponse.json({
      success: true,
      quests: questsWithProgress,
      generated_new: true
    });

  } catch (error) {
    console.error('Error in daily quests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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
    const { quest_id, progress_increment = 1 } = body;

    if (!quest_id) {
      return NextResponse.json({ error: 'Missing quest_id' }, { status: 400 });
    }

    // Get current quest
    const { data: quest, error: questError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_id', quest_id)
      .eq('user_id', user.id)
      .single();

    if (questError || !quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (quest.completed) {
      return NextResponse.json({ error: 'Quest already completed' }, { status: 400 });
    }

    // Update progress
    const newProgress = quest.current_progress + progress_increment;
    const isCompleted = newProgress >= quest.target_value;

    const { data: updatedQuest, error: updateError } = await supabase
      .from('daily_quests')
      .update({
        current_progress: Math.min(newProgress, quest.target_value),
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('quest_id', quest_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating quest:', updateError);
      return NextResponse.json({ error: 'Failed to update quest' }, { status: 500 });
    }

    // If quest completed, grant XP reward
    let xpGranted = 0;
    if (isCompleted && !quest.completed) {
      const rewardResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/rewards/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify({
          game_session_id: null,
          game_type: 'daily_quest',
          difficulty: 'medium',
          score: quest.xp_reward,
          won: true,
          rank: 1,
          total_players: 1
        }),
      });

      if (rewardResponse.ok) {
        const rewardResult = await rewardResponse.json();
        xpGranted = rewardResult.xp_earned;
      }
    }

    return NextResponse.json({
      success: true,
      quest: updatedQuest,
      completed: isCompleted,
      xp_granted: xpGranted,
      progress_was: quest.current_progress,
      progress_now: updatedQuest.current_progress
    });

  } catch (error) {
    console.error('Error updating quest progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 