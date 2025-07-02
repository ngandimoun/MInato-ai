"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Target, Star, Lightbulb, Award, BarChart3, Zap, Trophy, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CoachingInsights {
  insights: string[];
  recommendations: string[];
  confidence_score: number;
  focus_areas: string[];
}

interface PerformanceAnalysis {
  overall_performance: {
    total_games: number;
    win_rate: number;
    average_score: number;
    current_level: number;
    current_streak: number;
    best_streak: number;
  };
  game_type_performance: Record<string, {
    games_played: number;
    total_score: number;
    wins: number;
    accuracy: number;
    total_correct: number;
    total_questions: number;
  }>;
  difficulty_performance: Record<string, {
    games_played: number;
    total_score: number;
    wins: number;
    accuracy: number;
    total_correct: number;
    total_questions: number;
  }>;
  recent_trends: {
    last_5_games: Array<{
      game_type: string;
      difficulty: string;
      score: number;
      accuracy: number;
      rank: number;
      date: string;
    }>;
    performance_trend: 'improving' | 'declining' | 'stable';
    accuracy_trend: 'improving' | 'declining' | 'stable';
  };
  strengths: string[];
  weaknesses: string[];
  current_game_analysis?: {
    game_type: string;
    difficulty: string;
    score: number;
    accuracy: number;
    rank: number;
    performance_vs_average: number;
  };
}

interface AICoachData {
  coaching_insights: CoachingInsights;
  performance_analysis: PerformanceAnalysis;
  insight_id?: string;
}

export default function AICoach() {
  const { user } = useAuth();
  const [coachData, setCoachData] = useState<AICoachData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("insights");

  const fetchCoachingInsights = async (gameSessionId?: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-coach/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          game_session_id: gameSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch coaching insights');
      }

      const data = await response.json();
      setCoachData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCoachingInsights();
    }
  }, [user]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <Target className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-500';
      case 'declining': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to access AI Coach
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Brain className="w-6 h-6 text-purple-500 animate-pulse" />
              <p className="text-muted-foreground">Minato is analyzing your performance...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-red-500">{error}</p>
              <Button onClick={() => fetchCoachingInsights()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!coachData) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No coaching data available yet</p>
              <p className="text-sm text-muted-foreground">Play some games to get personalized insights!</p>
              <Button onClick={() => fetchCoachingInsights()}>
                Analyze Performance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          <Brain className="inline-block w-8 h-8 mr-2 text-purple-500" />
          AI Coach
        </h1>
        <p className="text-muted-foreground">
          Personalized insights and recommendations from Minato AI
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <CoachingInsightsSection insights={coachData.coaching_insights} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceOverview analysis={coachData.performance_analysis} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <TrendsAnalysis analysis={coachData.performance_analysis} />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <RecommendationsSection 
            insights={coachData.coaching_insights} 
            analysis={coachData.performance_analysis}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button 
          onClick={() => fetchCoachingInsights()}
          variant="outline"
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-300"
        >
          <Brain className="w-4 h-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
}

function CoachingInsightsSection({ insights }: { insights: CoachingInsights }) {
  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Personal Insights
            <Badge variant="secondary" className="ml-auto">
              {Math.round(insights.confidence_score * 100)}% confidence
            </Badge>
          </CardTitle>
          <CardDescription>
            What Minato AI discovered about your gaming performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {insights.insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg"
              >
                <Star className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed">{insight}</p>
              </motion.div>
            ))}
          </AnimatePresence>

          {insights.focus_areas.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {insights.focus_areas.map((area, index) => (
                  <Badge key={index} variant="outline" className="capitalize">
                    <Target className="w-3 h-3 mr-1" />
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceOverview({ analysis }: { analysis: PerformanceAnalysis }) {
  const { overall_performance } = analysis;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Overall Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Win Rate</span>
              <span className="font-medium">{(overall_performance.win_rate * 100).toFixed(1)}%</span>
            </div>
            <Progress value={overall_performance.win_rate * 100} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Games Played</p>
              <p className="font-medium">{overall_performance.total_games}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Score</p>
              <p className="font-medium">{Math.round(overall_performance.average_score)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current Level</p>
              <p className="font-medium">{overall_performance.current_level}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Best Streak</p>
              <p className="font-medium">{overall_performance.best_streak}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Game Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(analysis.game_type_performance)
            .sort((a, b) => b[1].accuracy - a[1].accuracy)
            .slice(0, 3)
            .map(([gameType, stats]) => (
              <div key={gameType} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{gameType.replace('_', ' ')}</span>
                  <span className="font-medium">{(stats.accuracy * 100).toFixed(1)}%</span>
                </div>
                <Progress value={stats.accuracy * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.games_played} games, {stats.wins} wins
                </p>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            Difficulty Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(analysis.difficulty_performance)
            .sort((a, b) => b[1].accuracy - a[1].accuracy)
            .map(([difficulty, stats]) => (
              <div key={difficulty} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{difficulty}</span>
                  <span className="font-medium">{(stats.accuracy * 100).toFixed(1)}%</span>
                </div>
                <Progress value={stats.accuracy * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.games_played} games
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsAnalysis({ analysis }: { analysis: PerformanceAnalysis }) {
  const { recent_trends } = analysis;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getTrendIcon(recent_trends.performance_trend)}
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={cn("text-lg font-semibold capitalize", getTrendColor(recent_trends.performance_trend))}>
                {recent_trends.performance_trend}
              </p>
              <p className="text-sm text-muted-foreground">
                Based on your last {recent_trends.last_5_games.length} games
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getTrendIcon(recent_trends.accuracy_trend)}
              Accuracy Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={cn("text-lg font-semibold capitalize", getTrendColor(recent_trends.accuracy_trend))}>
                {recent_trends.accuracy_trend}
              </p>
              <p className="text-sm text-muted-foreground">
                Answer accuracy over recent games
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Games</CardTitle>
          <CardDescription>Your last {recent_trends.last_5_games.length} game sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recent_trends.last_5_games.map((game, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium capitalize">
                    {game.game_type?.replace('_', ' ')} - {game.difficulty}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(game.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">Score: {game.score}</p>
                  <p className="text-xs text-muted-foreground">
                    {(game.accuracy * 100).toFixed(1)}% accuracy
                  </p>
                  <Badge variant={game.rank === 1 ? 'default' : 'secondary'} className="text-xs">
                    Rank #{game.rank}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendationsSection({ 
  insights, 
  analysis 
}: { 
  insights: CoachingInsights; 
  analysis: PerformanceAnalysis; 
}) {
  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-500" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Actionable advice to improve your gaming performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {insights.recommendations.map((recommendation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <Award className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed">{recommendation}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>

      {analysis.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.weaknesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.weaknesses.map((weakness, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">{weakness}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}