import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'global'; // global, weekly, category
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    let leaderboardData = [];

    switch (type) {
      case 'global':
        // Global XP leaderboard with manual join
        const { data: globalStats, error: globalError } = await supabase
          .from('user_game_stats')
          .select('user_id, level, xp_points, total_games_played, total_wins, total_score')
          .order('xp_points', { ascending: false })
          .limit(limit);

        if (globalError) {
          throw globalError;
        }

        // Get user profiles separately
        const userIds = globalStats?.map((stat: any) => stat.user_id) || [];
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, first_name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.warn('Error fetching profiles:', profilesError);
        }

        // Create profiles map for quick lookup
        const profilesMap = new Map();
        profiles?.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });

        leaderboardData = globalStats?.map((user: any, index: number) => {
          const profile = profilesMap.get(user.user_id);
          return {
            rank: index + 1,
            user_id: user.user_id,
            name: profile?.full_name || profile?.first_name || 'Anonymous Player',
            avatar_url: profile?.avatar_url,
            level: user.level,
            xp_points: user.xp_points,
            total_games: user.total_games_played,
            total_wins: user.total_wins,
            win_rate: user.total_games_played > 0 
              ? Math.round((user.total_wins / user.total_games_played) * 100) 
              : 0,
            total_score: user.total_score,
          };
        }) || [];
        break;

      case 'weekly':
        // Weekly winners (games won in last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: weeklyGames, error: weeklyError } = await supabase
          .from('game_sessions_history')
          .select('winner_user_id, created_at')
          .gte('created_at', oneWeekAgo.toISOString())
          .not('winner_user_id', 'is', null);

        if (weeklyError) {
          throw weeklyError;
        }

        // Count wins per user
        const weeklyWins: { [key: string]: number } = {};
        weeklyGames?.forEach((game: any) => {
          const userId = game.winner_user_id;
          weeklyWins[userId] = (weeklyWins[userId] || 0) + 1;
        });

        // Get top users and their profiles
        const topWeeklyUsers = Object.entries(weeklyWins)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit);

        const weeklyUserIds = topWeeklyUsers.map(([userId]) => userId);
        const { data: weeklyProfiles, error: weeklyProfilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, first_name, avatar_url')
          .in('id', weeklyUserIds);

        if (weeklyProfilesError) {
          console.warn('Error fetching weekly profiles:', weeklyProfilesError);
        }

        // Also get their game stats for level info
        const { data: weeklyStats, error: weeklyStatsError } = await supabase
          .from('user_game_stats')
          .select('user_id, level')
          .in('user_id', weeklyUserIds);

        if (weeklyStatsError) {
          console.warn('Error fetching weekly stats:', weeklyStatsError);
        }

        const weeklyProfilesMap = new Map();
        weeklyProfiles?.forEach((profile: any) => {
          weeklyProfilesMap.set(profile.id, profile);
        });

        const weeklyStatsMap = new Map();
        weeklyStats?.forEach((stat: any) => {
          weeklyStatsMap.set(stat.user_id, stat);
        });

        leaderboardData = topWeeklyUsers.map(([userId, wins], index) => {
          const profile = weeklyProfilesMap.get(userId);
          const stats = weeklyStatsMap.get(userId);
          return {
            rank: index + 1,
            user_id: userId,
            name: profile?.full_name || profile?.first_name || 'Anonymous Player',
            avatar_url: profile?.avatar_url,
            level: stats?.level || 1,
            weekly_wins: wins,
          };
        });
        break;

      case 'category':
        if (!category) {
          return NextResponse.json(
            { error: 'Category parameter required for category leaderboard' },
            { status: 400 }
          );
        }

        // Category-specific leaderboard based on game type stats
        const { data: categoryStats, error: categoryError } = await supabase
          .from('user_game_stats')
          .select('user_id, game_type_stats, level, xp_points')
          .not('game_type_stats', 'is', null);

        if (categoryError) {
          throw categoryError;
        }

        // Filter and sort by category stats
        const categoryUsers = categoryStats
          ?.map((user: any) => {
            const categoryData = user.game_type_stats?.[category];
            if (!categoryData) return null;

            return {
              user_id: user.user_id,
              level: user.level,
              category_games: categoryData.games_played || 0,
              category_wins: categoryData.wins || 0,
              category_best_score: categoryData.best_score || 0,
              category_total_score: categoryData.total_score || 0,
              category_win_rate: categoryData.games_played > 0 
                ? Math.round((categoryData.wins / categoryData.games_played) * 100) 
                : 0,
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => b.category_total_score - a.category_total_score)
          .slice(0, limit) || [];

        // Get profiles for category users
        const categoryUserIds = categoryUsers.map((user: any) => user.user_id);
        const { data: categoryProfiles, error: categoryProfilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, first_name, avatar_url')
          .in('id', categoryUserIds);

        if (categoryProfilesError) {
          console.warn('Error fetching category profiles:', categoryProfilesError);
        }

        const categoryProfilesMap = new Map();
        categoryProfiles?.forEach((profile: any) => {
          categoryProfilesMap.set(profile.id, profile);
        });

        leaderboardData = categoryUsers.map((user: any, index: number) => {
          const profile = categoryProfilesMap.get(user.user_id);
          return {
            ...user,
            rank: index + 1,
            name: profile?.full_name || profile?.first_name || 'Anonymous Player',
            avatar_url: profile?.avatar_url,
          };
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid leaderboard type' },
          { status: 400 }
        );
    }

    // Get current user's position if authenticated
    let userPosition = null;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const userEntry = leaderboardData.find((entry: any) => entry.user_id === user.id);
      if (userEntry) {
        userPosition = userEntry;
      } else if (type === 'global') {
        // Find user's actual rank in global leaderboard
        const { data: userRankData } = await supabase
          .from('user_game_stats')
          .select('user_id, xp_points')
          .gt('xp_points', 0)
          .order('xp_points', { ascending: false });

        const userRank = userRankData?.findIndex((u: any) => u.user_id === user.id) + 1;
        if (userRank > 0) {
          const { data: userData } = await supabase
            .from('user_game_stats')
            .select('user_id, level, xp_points, total_games_played, total_wins, total_score')
            .eq('user_id', user.id)
            .single();

          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('full_name, first_name, avatar_url')
            .eq('id', user.id)
            .single();

          if (userData) {
            userPosition = {
              rank: userRank,
              user_id: user.id,
              name: userProfile?.full_name || userProfile?.first_name || 'Anonymous Player',
              avatar_url: userProfile?.avatar_url,
              level: userData.level,
              xp_points: userData.xp_points,
              total_games: userData.total_games_played,
              total_wins: userData.total_wins,
              win_rate: userData.total_games_played > 0 
                ? Math.round((userData.total_wins / userData.total_games_played) * 100) 
                : 0,
              total_score: userData.total_score,
            };
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      type,
      category: category || null,
      leaderboard: leaderboardData,
      user_position: userPosition,
      total_entries: leaderboardData.length,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
} 