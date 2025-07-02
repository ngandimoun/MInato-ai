"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/context/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, Trophy, Zap, Users, ArrowLeft, CheckCircle, 
  XCircle, Brain, Target, Star, Crown, Timer,
  Sparkles, Heart, Flame, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type GameStatus = "lobby" | "in_progress" | "finished" | "cancelled";

type Question = {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  difficulty: string;
  category?: string;
};

type Player = {
  user_id: string;
  username: string;
  avatar_url?: string;
  score: number;
  is_ready: boolean;
};

type GameData = {
  _id: Id<"live_games">;
  game_type: string;
  status: GameStatus;
  current_round: number;
  rounds: number;
  host_user_id: string;
  players: Player[];
  questions?: Question[];
  current_question?: {
    question: string;
    options: string[];
    time_limit: number;
    started_at: number;
  };
  settings?: {
    auto_advance?: boolean;
    show_explanations?: boolean;
    time_per_question?: number;
    language?: string;
    ai_personality?: string;
    topic_focus?: string;
  };
  created_at?: number;
  difficulty: string;
  mode: "solo" | "multiplayer";
};

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const gameId = params.gameId as Id<"live_games">;
  
  // Fetch game data
  const gameData = useQuery(api.games.getGame, gameId ? { game_id: gameId } : "skip") as GameData | null;
  
  // Game state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showResults, setShowResults] = useState(false);
  
  // Mutations
  const submitAnswer = useMutation(api.games.submitAnswer);
  const nextQuestion = useMutation(api.games.nextQuestion);
  
  // Timer effect
  useEffect(() => {
    if (!gameData?.current_question || hasAnswered) return;
    
    const startTime = gameData.current_question.started_at;
    const timeLimit = gameData.current_question.time_limit;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeLimit - Math.floor(elapsed / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && !hasAnswered) {
        handleTimeUp();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameData?.current_question, hasAnswered]);
  
  const handleTimeUp = useCallback(async () => {
    if (hasAnswered) return;
    
    setHasAnswered(true);
    toast({
      title: "⏰ Time's Up!",
      description: "Moving to next question...",
      variant: "destructive",
    });
    
    // Auto-submit with no answer
    if (user && gameId) {
      try {
        await submitAnswer({
          game_id: gameId,
          user_id: user.id,
          answer: -1, // No answer
          time_taken: gameData?.settings?.time_per_question || 30,
        });
      } catch (error) {
        console.error('Failed to submit answer:', error);
      }
    }
  }, [hasAnswered, user, gameId, submitAnswer, gameData?.settings?.time_per_question, toast]);
  
  const handleAnswerSelect = async (answerIndex: number) => {
    if (hasAnswered || !user || !gameId) return;
    
    setSelectedAnswer(answerIndex);
    setHasAnswered(true);
    
    const timeSpent = (gameData?.settings?.time_per_question || 30) - timeRemaining;
    
    try {
      await submitAnswer({
        game_id: gameId,
        user_id: user.id,
        answer: answerIndex,
        time_taken: timeSpent,
      });
      
      toast({
        title: "✅ Answer Submitted!",
        description: "Waiting for other players...",
      });
      
      // Show results after a delay
      setTimeout(() => {
        setShowResults(true);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast({
        title: "❌ Submission Failed",
        description: "There was an error submitting your answer.",
        variant: "destructive",
      });
      setHasAnswered(false);
      setSelectedAnswer(null);
    }
  };
  
  const handleNextQuestion = async () => {
    if (!gameId || !user) return;
    
    try {
      await nextQuestion({ game_id: gameId });
      
      // Reset state for next question
      setSelectedAnswer(null);
      setHasAnswered(false);
      setShowResults(false);
      setTimeRemaining(gameData?.settings?.time_per_question || 30);
      
    } catch (error) {
      console.error('Failed to go to next question:', error);
      toast({
        title: "❌ Failed to Continue",
        description: "There was an error loading the next question.",
        variant: "destructive",
      });
    }
  };
  
  const getGameTypeDisplayName = (gameType: string) => {
    return gameType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const getGameTypeEmoji = (gameType: string) => {
    const emojiMap: Record<string, string> = {
      classic_academia_quiz: "🎓",
      pop_culture_trivia: "🎬",
      niche_hobbyist_corner: "🧩",
      guess_the_entity: "🔍",
      pharmacy_knowledge: "💊",
      medical_mysteries: "🏥",
      history_detective: "🏛️",
      math_physics_challenge: "📐",
      biology_quest: "🧬",
      chemistry_lab: "⚗️",
    };
    return emojiMap[gameType] || "🎮";
  };
  
  const currentPlayer = gameData?.players.find(p => p.user_id === user?.id);
  const isHost = gameData?.host_user_id === user?.id;
  
  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Timer className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Loading Game...</h3>
            <p className="text-muted-foreground">Please wait while we load your game.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (gameData.status === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-500/20 to-yellow-400/10 rounded-full flex items-center justify-center">
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Game Finished!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-center">Final Leaderboard</h3>
              {gameData.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div 
                    key={player.user_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      index === 0 && "bg-gradient-to-r from-yellow-500/10 to-yellow-400/5 border border-yellow-500/20",
                      index === 1 && "bg-gradient-to-r from-gray-500/10 to-gray-400/5 border border-gray-500/20",
                      index === 2 && "bg-gradient-to-r from-orange-500/10 to-orange-400/5 border border-orange-500/20",
                      index > 2 && "bg-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback>{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{player.username}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{player.score}</div>
                      <div className="text-xs text-muted-foreground">points</div>
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push('/games')} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Games
              </Button>
              <Button variant="outline" onClick={() => router.push('/games?tab=leaderboards')} className="gap-2">
                <Trophy className="w-4 h-4" />
                View Leaderboards
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="ghost"
            onClick={() => router.push('/games?tab=active')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
          
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <span className="text-2xl">{getGameTypeEmoji(gameData.game_type)}</span>
              <h1 className="text-xl font-bold">{getGameTypeDisplayName(gameData.game_type)}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{gameData.difficulty}</Badge>
              <span>•</span>
              <span>Round {gameData.current_round}/{gameData.rounds}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              timeRemaining > 10 ? "bg-green-500/10 text-green-600" :
              timeRemaining > 5 ? "bg-yellow-500/10 text-yellow-600" :
              "bg-red-500/10 text-red-600"
            )}>
              <Timer className="w-3 h-3 mr-1 inline" />
              {timeRemaining}s
            </div>
          </div>
        </motion.div>
        
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="space-y-2"
        >
          <div className="flex justify-between text-sm">
            <span>Game Progress</span>
            <span>{gameData.current_round}/{gameData.rounds} rounds</span>
          </div>
          <Progress value={(gameData.current_round / gameData.rounds) * 100} className="h-3" />
        </motion.div>
        
        {/* Players Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {gameData.players.map((player, index) => (
                    <div key={player.user_id} className="relative">
                      <Avatar className={cn(
                        "w-10 h-10 border-3 border-background",
                        player.user_id === user?.id && "ring-2 ring-primary/50"
                      )}>
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback className="text-xs font-bold">
                          {player.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && (
                        <Crown className="absolute -top-2 -right-1 w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Your Score</div>
                  <div className="text-2xl font-bold text-primary">{currentPlayer?.score || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Game Content */}
        <AnimatePresence mode="wait">
          {gameData.status === "lobby" ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="text-center">
                <CardContent className="pt-8 pb-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Waiting for Game to Start</h3>
                      <p className="text-muted-foreground">
                        {isHost ? "You can start the game once all players are ready!" : "Waiting for the host to start the game..."}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {gameData.players.map((player) => (
                        <div key={player.user_id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={player.avatar_url} />
                              <AvatarFallback>{player.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{player.username}</span>
                            {player.user_id === gameData.host_user_id && (
                              <Badge variant="outline">Host</Badge>
                            )}
                          </div>
                          <div>
                            {player.is_ready ? (
                              <Badge className="bg-green-500/10 text-green-600">Ready</Badge>
                            ) : (
                              <Badge variant="outline">Not Ready</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {isHost && (
                      <Button size="lg" className="gap-2">
                        <Zap className="w-5 h-5" />
                        Start Game
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : gameData.current_question ? (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Question Card */}
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                <CardContent className="pt-8 pb-6">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold mb-4">{gameData.current_question.question}</h2>
                    </div>
                    
                    <div className="grid gap-3">
                      {gameData.current_question.options.map((option, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={hasAnswered}
                          className={cn(
                            "p-4 text-left rounded-xl border-2 transition-all duration-300 relative",
                            "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                            hasAnswered && selectedAnswer === index 
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background hover:border-primary/50",
                            hasAnswered && "cursor-not-allowed opacity-70"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                              hasAnswered && selectedAnswer === index
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="font-medium">{option}</span>
                          </div>
                          
                          {hasAnswered && selectedAnswer === index && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2"
                            >
                              <CheckCircle className="w-5 h-5 text-primary" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                    
                    {hasAnswered && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-muted-foreground"
                      >
                        <p>Answer submitted! Waiting for other players...</p>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Results Card */}
              <AnimatePresence>
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                            <h3 className="text-lg font-semibold">Round Complete!</h3>
                          </div>
                          
                          {isHost && (
                            <Button onClick={handleNextQuestion} className="gap-2">
                              <ArrowLeft className="w-4 h-4 rotate-180" />
                              Next Question
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="pt-8 pb-8 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
                  <h3 className="text-lg font-semibold mb-2">Preparing Next Question...</h3>
                  <p className="text-muted-foreground">AI is generating your personalized question</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 