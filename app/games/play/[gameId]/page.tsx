"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { useSupabaseGame, useSupabaseGameMutations, useGameTimer } from '@/hooks/useSupabaseGames';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, Users, Trophy, Star, Zap, ArrowRight, SkipForward,
  CheckCircle2, XCircle, Brain, Timer, Crown, Target,
  Pause, Play, Home, RotateCcw, AlertCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import types from Supabase service
import { GameRoom, GamePlayer } from '@/lib/services/SupabaseGameService';

type GameStatus = "lobby" | "in_progress" | "finished" | "cancelled";

type Question = {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  category?: string;
};

type CurrentQuestion = {
  question: string;
  options: string[];
  time_limit: number;
  started_at: number;
};

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const roomId = params.gameId as string;
  
  // Fetch game data using Supabase hooks
  const { game: gameData, players, isLoading, error } = useSupabaseGame(roomId);
  const { 
    submitAnswer: submitAnswerMutation, 
    nextQuestion: nextQuestionMutation, 
    skipQuestion: skipQuestionMutation 
  } = useSupabaseGameMutations();

  // Game state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [lastAnswerResult, setLastAnswerResult] = useState<{
    isCorrect: boolean;
    pointsEarned: number;
    explanation?: string;
  } | null>(null);

  // Timer for current question
  const currentQuestion = gameData?.current_question;
  const { timeRemaining, isActive: timerActive } = useGameTimer(
    currentQuestion?.started_at || null,
    currentQuestion?.time_limit || 30,
    hasAnswered // Stop timer when answer is submitted
  );

  // Reset answer state when question changes (for auto-advance)
  useEffect(() => {
    if (gameData?.current_question_index !== undefined) {
      console.log(`🔄 Question changed to index ${gameData.current_question_index}, resetting UI state`);
      console.log(`   New question timer started at: ${gameData.current_question?.started_at}`);
      console.log(`   Time limit: ${gameData.current_question?.time_limit}s`);
      
      setSelectedAnswer(null);
      setHasAnswered(false);
      setShowResults(false);
      setLastAnswerResult(null);
      setIsAutoAdvancing(false);
    }
  }, [gameData?.current_question_index, gameData?.current_question?.started_at]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timerActive && timeRemaining === 0 && !hasAnswered && user && roomId) {
      handleTimeUp();
    }
  }, [timerActive, timeRemaining, hasAnswered, user, roomId]);

  const handleTimeUp = async () => {
    // Auto-submit with no answer
    if (user && roomId) {
      try {
        console.log('⏰ Time up! Auto-submitting answer...');
        await submitAnswerMutation(roomId, -1, 0); // No answer, 0 time taken
        setHasAnswered(true); // This will stop the timer
        
        // For solo games, auto-advance after time up
        if (gameData?.mode === 'solo') {
          handleAutoAdvance();
        }
      } catch (error) {
        console.error('Failed to submit answer:', error);
      }
    }
  };

  const handleAutoAdvance = useCallback(async () => {
    if (isAutoAdvancing) {
      console.log('⚠️ Auto-advance already in progress, skipping...');
      return;
    }
    
    console.log('🚀 Starting auto-advance...');
    setIsAutoAdvancing(true);
    
    // Safety timeout to reset state if something goes wrong
    const safetyTimeout = setTimeout(() => {
      console.log('⚠️ Safety timeout: resetting auto-advance state');
      setIsAutoAdvancing(false);
    }, 5000);
    
    setTimeout(async () => {
      if (!roomId || !user) {
        clearTimeout(safetyTimeout);
        setIsAutoAdvancing(false);
        return;
      }
      
      try {
        console.log('⏭️ Auto-advancing to next question...');
        const result = await nextQuestionMutation(roomId);
        console.log('✅ Auto-advance result:', result);
        
        // Clear safety timeout and reset state
        clearTimeout(safetyTimeout);
        setIsAutoAdvancing(false);
        
        // Force refresh game data after successful advancement
        // This ensures UI updates even if real-time events fail
        setTimeout(() => {
          console.log('🔄 Force refreshing game data after auto-advance');
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error('❌ Auto-advance failed:', error);
        clearTimeout(safetyTimeout);
        setIsAutoAdvancing(false);
      }
    }, 2000);
  }, [roomId, user, nextQuestionMutation, isAutoAdvancing]);

  const handleAnswerSelect = async (answerIndex: number) => {
    if (hasAnswered || !user || !roomId) return;
    
    console.log(`🎯 Selecting answer ${answerIndex} for question ${gameData?.current_question_index}`);
    
    setSelectedAnswer(answerIndex);
    setHasAnswered(true); // This will stop the timer
    
    const timeTaken = gameData?.current_question ? Date.now() - gameData.current_question.started_at : 0;
    
    try {
      const result = await submitAnswerMutation(roomId, answerIndex, timeTaken);
      console.log('📤 Submit answer result:', result);
      
      if (result.success && result.data) {
        setLastAnswerResult({
          isCorrect: result.data.is_correct || false,
          pointsEarned: result.data.pointsEarned || 0,
          explanation: result.data.explanation
        });
        setShowResults(true);
        
        console.log(`✅ Answer submitted. Game mode: ${gameData?.mode}, Auto-advance expected for solo games`);
        
        // For solo games, auto-advance after showing results
        if (gameData?.mode === 'solo') {
          handleAutoAdvance();
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive"
      });
      setHasAnswered(false);
      setSelectedAnswer(null);
    }
  };

  const handleNextQuestion = async () => {
    if (!roomId) return;
    
    console.log('⏭️ Manual next question clicked');
    
    try {
      const result = await nextQuestionMutation(roomId);
      console.log('⏭️ Next question result:', result);
      
      // Reset UI state
      setSelectedAnswer(null);
      setHasAnswered(false);
      setShowResults(false);
      setLastAnswerResult(null);
      
      // Force refresh to ensure UI updates
      setTimeout(() => {
        console.log('🔄 Force refreshing after manual next question');
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to advance question:', error);
      toast({
        title: "Error",
        description: "Failed to advance question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSkipQuestion = async () => {
    if (!roomId) return;
    
    console.log('⏩ Skip question clicked');
    
    try {
      const result = await skipQuestionMutation(roomId);
      console.log('⏩ Skip question result:', result);
      
      setSelectedAnswer(null);
      setHasAnswered(false);
      setShowResults(false);
      setLastAnswerResult(null);
    } catch (error) {
      console.error('Failed to skip question:', error);
      toast({
        title: "Error", 
        description: "Failed to skip question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExitGame = () => {
    router.push('/games');
  };

  const getPlayerScore = (playerId: string) => {
    const player = players?.find(p => p.user_id === playerId);
    return player?.score || 0;
  };

  const getCurrentPlayer = () => {
    return players?.find(p => p.user_id === user?.id);
  };

  const getGameProgress = () => {
    if (!gameData) return { current: 0, total: 0, percentage: 0 };
    
    const current = (gameData.current_question_index || 0) + 1;
    const total = gameData.questions?.length || gameData.rounds || 10;
    const percentage = (current / total) * 100;
    
    return { current, total, percentage };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Game Not Found</h3>
              <p className="text-muted-foreground">
                {error || "The game you're looking for doesn't exist or has ended."}
              </p>
            </div>
            <Button onClick={handleExitGame} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game finished state
  if (gameData.status === 'finished') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            <CardHeader className="text-center relative">
              <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
              <CardTitle className="text-3xl mb-2">Game Complete!</CardTitle>
              <CardDescription className="text-lg">
                Great job! Here are the final results.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-6">
              {/* Player Scores */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Final Scores
                </h3>
                <div className="space-y-2">
                  {players?.map((player, index) => (
                    <div 
                      key={player.user_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        player.user_id === user?.id ? "bg-primary/10" : "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={player.avatar_url} />
                          <AvatarFallback>{player.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{player.username}</span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {player.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleExitGame} variant="outline" className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Games
                </Button>
                <Button onClick={() => router.push('/games?tab=library')} className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Waiting for players or game start
  if (gameData.status === 'lobby') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Users className="w-12 h-12 text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Waiting for Game to Start</h3>
              <p className="text-muted-foreground">
                {gameData.mode === 'solo' 
                  ? "Setting up your solo challenge..."
                  : `${players?.length || 0}/${gameData.max_players} players joined`
                }
              </p>
            </div>
            <Button onClick={handleExitGame} variant="outline" className="w-full">
              Leave Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = getGameProgress();
  const currentPlayer = getCurrentPlayer();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Game Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleExitGame}
              >
                <Home className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {gameData.game_type_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </h1>
                <p className="text-muted-foreground">
                  Question {progress.current} of {progress.total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {gameData.mode === 'multiplayer' && (
                <Badge variant="outline" className="gap-2">
                  <Users className="w-4 h-4" />
                  {players?.length || 0} Players
                </Badge>
              )}
              {currentPlayer && (
                <Badge className="gap-2">
                  <Star className="w-4 h-4" />
                  {currentPlayer.score} pts
                </Badge>
              )}
            </div>
          </div>
          
          <Progress value={progress.percentage} className="h-2" />
        </motion.div>

        {/* Current Question */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={`question-${gameData.current_question_index}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg">Question {progress.current}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <span className={cn(
                        "font-mono text-lg font-bold",
                        timeRemaining <= 10 ? "text-destructive" : "text-primary"
                      )}>
                        {timeRemaining}s
                      </span>
                    </div>
                  </div>
                  <CardDescription className="text-base leading-relaxed">
                    {currentQuestion.question}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={hasAnswered}
                      whileHover={!hasAnswered ? { scale: 1.02 } : undefined}
                      whileTap={!hasAnswered ? { scale: 0.98 } : undefined}
                      className={cn(
                        "w-full p-4 text-left rounded-lg border-2 transition-all duration-200",
                        "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                        hasAnswered && selectedAnswer === index && "border-primary bg-primary/10",
                        hasAnswered && selectedAnswer !== index && "opacity-50",
                        hasAnswered && "cursor-not-allowed",
                        !hasAnswered && "cursor-pointer hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center font-semibold">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span>{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </CardContent>
              </Card>

              {/* Answer Results */}
              <AnimatePresence>
                {showResults && lastAnswerResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className={cn(
                      "mb-6",
                      lastAnswerResult.isCorrect ? "border-green-500/50" : "border-red-500/50"
                    )}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          {lastAnswerResult.isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                          <span className="text-lg font-semibold">
                            {lastAnswerResult.isCorrect ? "Correct!" : "Incorrect"}
                          </span>
                          <Badge variant={lastAnswerResult.isCorrect ? "default" : "destructive"}>
                            +{lastAnswerResult.pointsEarned} pts
                          </Badge>
                        </div>
                        {lastAnswerResult.explanation && (
                          <p className="text-muted-foreground">
                            {lastAnswerResult.explanation}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Controls */}
        <div className="flex gap-3 justify-center">
          {gameData.mode === 'solo' && !hasAnswered && (
            <Button 
              onClick={handleSkipQuestion}
              variant="outline"
              className="gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip Question
            </Button>
          )}
          
          {hasAnswered && !isAutoAdvancing && gameData.mode === 'solo' && (
            <Button 
              onClick={handleNextQuestion}
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Next Question
            </Button>
          )}
          
          {isAutoAdvancing && (
            <Button disabled className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Auto-advancing...
            </Button>
          )}
        </div>

        {/* Multiplayer Status */}
        {gameData.mode === 'multiplayer' && hasAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center"
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <p className="text-lg">Answer submitted! Waiting for other players...</p>
                  <div className="flex justify-center gap-4">
                    {players?.map((player) => (
                      <div key={player.user_id} className="text-center">
                        <Avatar className="w-12 h-12 mx-auto mb-2">
                          <AvatarImage src={player.avatar_url} />
                          <AvatarFallback>{player.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{player.username}</p>
                        <p className="text-xs text-muted-foreground">{player.score} pts</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
} 