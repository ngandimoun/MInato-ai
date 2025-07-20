"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Star, 
  TrendingUp, 
  Target,
  RefreshCw,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-provider';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url?: string;
  level: number;
  xp_points: number;
  total_games?: number;
  total_wins?: number;
  win_rate?: number;
  total_score?: number;
  weekly_wins?: number;
  category_games?: number;
  category_wins?: number;
  category_best_score?: number;
  category_total_score?: number;
  category_win_rate?: number;
}

interface LeaderboardData {
  success: boolean;
  type: string;
  category: string | null;
  leaderboard: LeaderboardEntry[];
  user_position: LeaderboardEntry | null;
  total_entries: number;
  generated_at: string;
}

const GAME_CATEGORIES = [
  { id: 'haiku_battle', name: 'Haiku Battle', icon: '🌸' },
  { id: 'story_chain', name: 'Story Chain', icon: '📚' },
  { id: 'classic_academia_quiz', name: 'Academia Quiz', icon: '🎓' },
  { id: 'escape_room', name: 'Escape Room', icon: '🗝️' },
  { id: 'courtroom_drama', name: 'Courtroom Drama', icon: '⚖️' },
  { id: 'solo_adventure', name: 'Solo Adventure', icon: '🗺️' },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
}

function LeaderboardCard({ 
  entry, 
  isCurrentUser = false, 
  type = 'global' 
}: { 
  entry: LeaderboardEntry; 
  isCurrentUser?: boolean; 
  type?: string; 
}) {
  return (
    <Card className={cn(
      "glass-card transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      isCurrentUser && "ring-2 ring-primary/50 bg-primary/5",
      entry.rank <= 3 && "bg-gradient-to-r from-yellow-50/50 to-amber-50/50 dark:from-yellow-900/20 dark:to-amber-900/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50">
            {getRankIcon(entry.rank)}
          </div>

          {/* Avatar */}
          <Avatar className="w-12 h-12 ring-2 ring-background shadow-md">
            <AvatarImage src={entry.avatar_url} alt={entry.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
              {entry.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{entry.name}</h3>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  You
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="w-3 h-3" />
              <span>Level {entry.level}</span>
              
              {type === 'global' && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{entry.xp_points?.toLocaleString()} XP</span>
                </>
              )}
              
              {type === 'weekly' && entry.weekly_wins && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <Trophy className="w-3 h-3" />
                  <span>{entry.weekly_wins} wins</span>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="text-right">
            {type === 'global' && (
              <div className="space-y-1">
                <div className="text-lg font-bold text-primary">
                  {entry.total_score?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.win_rate || 0}% win rate
                </div>
              </div>
            )}
            
            {type === 'weekly' && (
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-600">
                  {entry.weekly_wins || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  wins this week
                </div>
              </div>
            )}
            
            {type === 'category' && (
              <div className="space-y-1">
                <div className="text-lg font-bold text-purple-600">
                  {entry.category_total_score?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.category_win_rate || 0}% win rate
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserPositionCard({ userPosition, type }: { userPosition: LeaderboardEntry; type: string }) {
  return (
    <Card className="glass-card border-primary/50 bg-gradient-to-r from-primary/10 to-secondary/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Your Position</h3>
          <Badge variant="outline" className="bg-primary/10">
            #{userPosition.rank}
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-primary">
              {type === 'global' ? userPosition.xp_points?.toLocaleString() : 
               type === 'weekly' ? userPosition.weekly_wins :
               userPosition.category_total_score?.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {type === 'global' ? 'XP' : type === 'weekly' ? 'Wins' : 'Score'}
            </div>
          </div>
          
          <div>
            <div className="text-lg font-bold">
              {userPosition.level}
            </div>
            <div className="text-xs text-muted-foreground">Level</div>
          </div>
          
          <div>
            <div className="text-lg font-bold text-green-600">
              {type === 'global' ? userPosition.win_rate :
               type === 'weekly' ? '—' :
               userPosition.category_win_rate}%
            </div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Leaderboards() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [selectedCategory, setSelectedCategory] = useState('haiku_battle');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (type: string, category?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ type, limit: '50' });
      if (category) params.append('category', category);
      
      const response = await fetch(`/api/leaderboards?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'category') {
      fetchLeaderboard(activeTab, selectedCategory);
    } else {
      fetchLeaderboard(activeTab);
    }
  }, [activeTab, selectedCategory]);

  const handleRefresh = () => {
    if (activeTab === 'category') {
      fetchLeaderboard(activeTab, selectedCategory);
    } else {
      fetchLeaderboard(activeTab);
    }
  };

  if (error) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground mb-4">
            {error}
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            Leaderboards
          </h2>
          <p className="text-muted-foreground">
            Compete with players worldwide
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="global" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <Zap className="w-4 h-4" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="category" className="gap-2">
            <Target className="w-4 h-4" />
            Category
          </TabsTrigger>
        </TabsList>

        {/* Category Selection */}
        {activeTab === 'category' && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {GAME_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="gap-2"
                >
                  <span>{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* User Position */}
        {leaderboardData?.user_position && (
          <div className="mt-4">
            <UserPositionCard 
              userPosition={leaderboardData.user_position} 
              type={activeTab}
            />
          </div>
        )}

        {/* Leaderboard Content */}
        <TabsContent value="global" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className="glass-card animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                      <div className="w-16 h-8 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData?.leaderboard.map((entry) => (
                <LeaderboardCard
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={user?.id === entry.user_id}
                  type="global"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className="glass-card animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                      <div className="w-16 h-8 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData?.leaderboard.map((entry) => (
                <LeaderboardCard
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={user?.id === entry.user_id}
                  type="weekly"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="category" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className="glass-card animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                      <div className="w-16 h-8 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData?.leaderboard.map((entry) => (
                <LeaderboardCard
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={user?.id === entry.user_id}
                  type="category"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Stats Footer */}
      {leaderboardData && !isLoading && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing top {leaderboardData.leaderboard.length} players
              </span>
              <span>
                Updated {new Date(leaderboardData.generated_at).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 