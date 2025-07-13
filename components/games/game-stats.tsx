"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, Target, Zap, Star, Crown, Medal, Award,
  TrendingUp, Calendar, Clock, Users, RefreshCw,
  Gamepad2, Brain, BookOpen, Atom, History, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-provider";
import { useGameStats, useGameHistory } from "@/hooks/useGameStats";

export function GameStats() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { stats: userStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useGameStats();
  const { history: gameHistory, isLoading: historyLoading, error: historyError, refetch: refetchHistory } = useGameHistory(20);
  
  const isLoading = statsLoading || historyLoading;
  const error = statsError || historyError;

  const refreshStats = async () => {
    await Promise.all([refetchStats(), refetchHistory()]);
  };

  if (!user) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Sign In Required</h3>
          <p className="text-muted-foreground">
            Please sign in to view your game statistics and achievements.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Error Loading Stats</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshStats} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const xpProgress = userStats ? (userStats.xp_to_next_level > 0 ? 
    Math.round(((userStats.xp_points % 1000) / (userStats.xp_to_next_level + (userStats.xp_points % 1000))) * 100) : 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Statistics & Achievements</h2>
          <p className="text-muted-foreground">
            Track your progress and compete with others
          </p>
        </div>
        <Button
          onClick={refreshStats}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {/* Loading skeleton */}
          <Card className="glass-card animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div>
                    <div className="h-6 w-24 bg-muted rounded mb-2" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-2 w-full bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="glass-card animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                    <div>
                      <div className="h-6 w-12 bg-muted rounded mb-2" />
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : userStats ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="overview" className="gap-2">
              <Trophy className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Game History
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Medal className="w-4 h-4" />
              Achievements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Level and XP Card */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Star className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Level {userStats.level}</h3>
                      <p className="text-sm text-muted-foreground">
                        {userStats.xp_points.toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {userStats.xp_to_next_level > 0 ? `${userStats.xp_to_next_level} XP to next level` : 'Max Level'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to Level {userStats.level + 1}</span>
                    <span>{xpProgress}%</span>
                  </div>
                  <Progress value={xpProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Gamepad2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.total_games_played}</p>
                      <p className="text-sm text-muted-foreground">Games Played</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.total_wins}</p>
                      <p className="text-sm text-muted-foreground">Wins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Target className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.win_rate}%</p>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Zap className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.total_score.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{userStats.current_streak}</p>
                      <p className="text-sm text-muted-foreground">Current Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Crown className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{userStats.best_streak}</p>
                      <p className="text-sm text-muted-foreground">Best Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <Users className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{userStats.team_wins}</p>
                      <p className="text-sm text-muted-foreground">Team Wins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            {gameHistory && gameHistory.games.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recent Games</h3>
                  <Badge variant="outline">
                    {gameHistory.games.length} games shown
                  </Badge>
                </div>

                <div className="space-y-3">
                  {gameHistory.games.map((game) => (
                    <Card key={game.id} className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                              game.won ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {game.won ? "W" : "L"}
                            </div>
                            <div>
                              <h4 className="font-semibold">{game.game_type_display_name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="capitalize">{game.difficulty}</span>
                                <span>•</span>
                                <span className="capitalize">{game.mode}</span>
                                <span>•</span>
                                <span>{formatDate(game.finished_at)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Score</p>
                                <p className="font-bold">{game.score.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Rank</p>
                                <p className="font-bold">#{game.rank}/{game.total_players}</p>
                              </div>
                              {game.accuracy > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Accuracy</p>
                                  <p className="font-bold">{game.accuracy}%</p>
                                </div>
                              )}
                              {game.duration_seconds && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Duration</p>
                                  <p className="font-bold">{formatDuration(game.duration_seconds)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {gameHistory.pagination.has_more && (
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Button variant="outline" className="gap-2">
                        Load More Games
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <History className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Games Yet</h3>
                  <p className="text-muted-foreground">
                    Start playing games to see your history here!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6 mt-6">
            {userStats.achievements && userStats.achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userStats.achievements.map((achievement: any, index: number) => (
                  <Card key={index} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{achievement.icon}</div>
                        <div>
                          <h4 className="font-semibold">{achievement.name}</h4>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          <p className="text-xs text-primary">+{achievement.xp_reward} XP</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Medal className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Achievements Yet</h3>
                  <p className="text-muted-foreground">
                    Keep playing to unlock achievements and earn rewards!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Stats Available</h3>
            <p className="text-muted-foreground">
              Start playing games to build your statistics!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 