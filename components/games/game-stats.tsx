"use client";

import React, { useState } from "react";
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
  Gamepad2, Brain, BookOpen, Atom
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GameStats() {
  const [isLoading, setIsLoading] = useState(false);

  // Mock user stats
  const userStats = {
    total_games_played: 47,
    total_wins: 28,
    total_score: 15420,
    xp_points: 2340,
    level: 12
  };

  const winRate = userStats.total_games_played > 0 
    ? Math.round((userStats.total_wins / userStats.total_games_played) * 100)
    : 0;

  const refreshStats = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

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
              660 XP to next level
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Level {userStats.level + 1}</span>
              <span>68%</span>
            </div>
            <Progress value={68} className="h-2" />
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
                <p className="text-2xl font-bold">{winRate}%</p>
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

      {/* Coming Soon Message */}
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">More Stats Coming Soon!</h3>
          <p className="text-muted-foreground">
            Detailed achievements, game-specific statistics, and leaderboards will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 