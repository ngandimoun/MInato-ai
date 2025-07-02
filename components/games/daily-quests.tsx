"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target,
  CheckCircle,
  Star,
  Sparkles,
  Clock,
  RefreshCw,
  Zap,
  Trophy,
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-provider';

interface DailyQuest {
  quest_id: string;
  template_id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  target_value: number;
  current_progress: number;
  xp_reward: number;
  completed: boolean;
  date: string;
  game_types?: string[] | null;
  difficulty: string;
  completed_at?: string | null;
}

interface QuestData {
  success: boolean;
  quests: DailyQuest[];
  generated_new: boolean;
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    case 'hard':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
}

function QuestCard({ quest, onComplete }: { quest: DailyQuest; onComplete?: () => void }) {
  const progressPercentage = Math.min((quest.current_progress / quest.target_value) * 100, 100);
  const isCompleted = quest.completed;

  return (
    <Card className={cn(
      "glass-card transition-all duration-300 hover:shadow-lg",
      isCompleted && "bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20",
      !isCompleted && "hover:scale-[1.02]"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Quest Icon */}
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-full text-xl",
            isCompleted 
              ? "bg-green-100 dark:bg-green-900/30" 
              : "bg-muted/50"
          )}>
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <span>{quest.icon}</span>
            )}
          </div>

          {/* Quest Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cn(
                "font-semibold text-sm",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {quest.name}
              </h3>
              <Badge 
                variant="outline" 
                className={cn("text-xs px-2 py-0", getDifficultyColor(quest.difficulty))}
              >
                {quest.difficulty}
              </Badge>
              {isCompleted && (
                <Badge variant="default" className="text-xs px-2 py-0 bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Done
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {quest.description}
            </p>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Progress: {quest.current_progress} / {quest.target_value}
                </span>
                <span className="font-medium">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              
              <Progress 
                value={progressPercentage} 
                className={cn(
                  "h-2 transition-all duration-500",
                  isCompleted && "bg-green-200 dark:bg-green-900/40"
                )}
              />
              
              {isCompleted && quest.completed_at && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Completed {new Date(quest.completed_at).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Reward */}
          <div className="text-right">
            <div className={cn(
              "flex items-center gap-1 text-sm font-bold",
              isCompleted ? "text-green-600" : "text-primary"
            )}>
              <Star className="w-4 h-4" />
              {quest.xp_reward} XP
            </div>
            {quest.game_types && (
              <div className="text-xs text-muted-foreground mt-1">
                Specific games
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuestStats({ quests }: { quests: DailyQuest[] }) {
  const completedQuests = quests.filter(q => q.completed).length;
  const totalXP = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xp_reward, 0);
  const completionRate = quests.length > 0 ? (completedQuests / quests.length) * 100 : 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="glass-card">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary mb-1">
            {completedQuests}/{quests.length}
          </div>
          <div className="text-xs text-muted-foreground">
            Completed
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600 mb-1">
            {totalXP}
          </div>
          <div className="text-xs text-muted-foreground">
            XP Earned
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {Math.round(completionRate)}%
          </div>
          <div className="text-xs text-muted-foreground">
            Success Rate
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DailyQuests() {
  const { user } = useAuth();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuests = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/quests/daily');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: QuestData = await response.json();
      
      if (data.success) {
        setQuests(data.quests);
      } else {
        throw new Error('Failed to fetch quests');
      }
    } catch (error) {
      console.error('Error fetching quests:', error);
      setError('Failed to load daily quests');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQuests();
  };

  useEffect(() => {
    if (user) {
      fetchQuests();
    }
  }, [user]);

  const timeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (!user) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground">
            Sign in to view your daily quests
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <Target className="w-7 h-7 text-blue-500" />
            Daily Quests
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Resets in {timeUntilReset()}</span>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isLoading || refreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", (isLoading || refreshing) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Quest Stats */}
      {!isLoading && quests.length > 0 && (
        <QuestStats quests={quests} />
      )}

      {/* Quest List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-2 bg-muted rounded w-full" />
                  </div>
                  <div className="w-16 h-6 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quests.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground">
              No quests available today. Check back tomorrow!
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quests.map((quest) => (
            <QuestCard 
              key={quest.quest_id} 
              quest={quest}
              onComplete={fetchQuests}
            />
          ))}
        </div>
      )}

      {/* Completion Celebration */}
      {!isLoading && quests.length > 0 && quests.every(q => q.completed) && (
        <Card className="glass-card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">
              All Quests Complete! 🎉
            </h3>
            <p className="text-sm text-green-600 dark:text-green-500 mb-4">
              Congratulations! You've completed all your daily quests. 
              Come back tomorrow for new challenges!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Gift className="w-4 h-4" />
              <span>Total XP earned today: {quests.reduce((sum, q) => sum + q.xp_reward, 0)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Footer */}
      {!isLoading && quests.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground text-center">
              💡 Complete quests by playing games that match the requirements. 
              Progress updates automatically as you play!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 