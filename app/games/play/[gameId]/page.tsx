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
  Pause, Play, Home, RotateCcw, AlertCircle, Loader2,
  Share2, Twitter, Facebook, Download, Copy, Camera,
  Sparkles, Award, TrendingUp
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
    skipQuestion: skipQuestionMutation,
    startGame: startGameMutation
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
        
        // Auto-advance after time up for both solo and multiplayer games
        handleAutoAdvance();
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
    }, 8000); // Increased timeout for multiplayer coordination
    
    // Add a small delay to prevent multiple simultaneous calls
    const delay = 500; // Same delay for both solo and multiplayer
    
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
        
        // Let real-time updates handle the UI changes for both solo and multiplayer
        console.log('🔄 Auto-advance complete, waiting for real-time updates...');
        
        // Add immediate fallback in case real-time fails
        setTimeout(() => {
          console.log('🔄 [FALLBACK] Force refreshing after auto-advance');
          window.location.reload();
        }, 3000); // 3 second fallback
      } catch (error) {
        console.error('❌ Auto-advance failed:', error);
        clearTimeout(safetyTimeout);
        setIsAutoAdvancing(false);
      }
    }, delay);
  }, [roomId, user, nextQuestionMutation, isAutoAdvancing, gameData?.mode]);

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
        
        console.log(`✅ Answer submitted. Game mode: ${gameData?.mode}, Auto-advance expected for both solo and multiplayer games`);
        
        // Auto-advance after showing results for both solo and multiplayer games
        handleAutoAdvance();
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

  const handleStartGame = async () => {
    if (!gameData?.id || !user?.id) return;
    
    try {
      const result = await startGameMutation(gameData.id);
      if (result.success) {
        toast({
          title: "🚀 Game Started!",
          description: "The game has begun. Good luck!",
        });
        // The real-time subscription will automatically update the game state
      } else {
        toast({
          title: "Failed to Start Game",
          description: result.error || "Could not start the game. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while starting the game.",
        variant: "destructive",
      });
    }
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
    const currentPlayer = getCurrentPlayer();
    const isWinner = players && players[0]?.user_id === user?.id;
    const totalQuestions = gameData.rounds || 5;
    const correctAnswers = Math.min(Math.floor((currentPlayer?.score || 0) / 100), totalQuestions); // Cap at total questions
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const handleScreenshot = async () => {
      try {
        // Use html2canvas to capture the results card
        const { default: html2canvas } = await import('html2canvas');
        const element = document.getElementById('game-results-card');
        if (element) {
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
          });
          
          // Generate filename with game name and difficulty
          const gameType = (gameData.game_type_display_name || gameData.game_type_id || 'game').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
          const difficulty = gameData.difficulty || 'unknown';
          const timestamp = Date.now();
          
          // Download the image
          const link = document.createElement('a');
          link.download = `minato-ai-${gameType}-${difficulty}-results-${timestamp}.png`;
          link.href = canvas.toDataURL();
          link.click();
          
          toast({
            title: "Screenshot saved!",
            description: "Your game results have been saved as an image.",
          });
        }
      } catch (error) {
        console.error('Screenshot failed:', error);
        toast({
          title: "Screenshot failed",
          description: "Unable to capture screenshot. Please try again.",
          variant: "destructive"
        });
      }
    };

    const handleShare = (platform: string) => {
      const gameType = gameData.game_type_display_name || gameData.game_type_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Game';
      const difficultyText = gameData.difficulty ? ` on ${gameData.difficulty} difficulty` : '';
      const text = `Just scored ${currentPlayer?.score || 0} points in ${gameType}${difficultyText} on Minato AI! 🎯 ${accuracy}% accuracy. Challenge me at minatoai.com`;
      const url = 'https://minatoai.com/games';
      
      switch (platform) {
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
          break;
        case 'copy':
          navigator.clipboard.writeText(`${text} ${url}`);
          toast({
            title: "Copied to clipboard!",
            description: "Share text has been copied to your clipboard.",
          });
          break;
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card id="game-results-card" className="relative overflow-hidden border-2 shadow-2xl">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
            
            {/* Minato AI Branding Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                <h2 className="text-2xl font-bold">Minato AI</h2>
              </div>
              <p className="text-center text-blue-100">AI-Powered Gaming Platform</p>
            </div>

            <CardHeader className="text-center relative pt-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center"
              >
                <CardTitle className="text-4xl mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Game Complete!
                </CardTitle>
                
                {/* Game Info Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col items-center gap-3 mb-6"
                >
                  <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full border border-indigo-200 dark:border-indigo-800">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🎮</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-indigo-900 dark:text-indigo-200">
                        {gameData.game_type_display_name || gameData.game_type_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Game'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`px-3 py-1 text-sm font-medium ${
                        gameData.difficulty === 'beginner' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300' :
                        gameData.difficulty === 'easy' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300' :
                        gameData.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        gameData.difficulty === 'hard' ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' :
                        gameData.difficulty === 'expert' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}
                    >
                      <span className="capitalize">{gameData.difficulty}</span> Difficulty
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 text-sm">
                      {gameData.rounds} Questions
                    </Badge>
                  </div>
                </motion.div>
                
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
                    <AvatarImage src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                      {(currentPlayer?.username || user?.user_metadata?.full_name || 'P')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <CardDescription className="text-lg text-muted-foreground">
                    {isWinner ? `🎉 Congratulations ${currentPlayer?.username || user?.user_metadata?.full_name || 'Champion'}! You won!` : `Great job ${currentPlayer?.username || user?.user_metadata?.full_name || 'Player'}! Here are your final results.`}
                  </CardDescription>
                </div>
              </motion.div>
            </CardHeader>

            <CardContent className="relative space-y-6 pb-8">
              {/* Personal Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border"
              >
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {currentPlayer?.score || 0}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Points Earned</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {accuracy}%
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Accuracy Rate</div>
                  </div>
                </div>
              </motion.div>

              {/* Player Scores */}
              {players && players.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-3"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Final Leaderboard
                  </h3>
                  <div className="space-y-2">
                    {players.map((player, index) => (
                      <motion.div 
                        key={player.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + index * 0.1 }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border",
                          player.user_id === user?.id ? "bg-primary/10 border-primary/20" : "bg-muted/50",
                          index === 0 && "ring-2 ring-yellow-400/50 bg-yellow-50 dark:bg-yellow-900/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={index === 0 ? "default" : "secondary"} className="text-sm">
                            {index === 0 ? <Crown className="w-3 h-3 mr-1" /> : null}
                            #{index + 1}
                          </Badge>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={player.avatar_url} />
                            <AvatarFallback>{player.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{player.username}</span>
                        </div>
                        <span className="text-xl font-bold text-primary">
                          {player.score} pts
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Social Sharing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2 text-center justify-center">
                  <Share2 className="w-5 h-5" />
                  Share Your Achievement
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button
                    onClick={handleScreenshot}
                    variant="outline"
                    className="flex-col h-16 gap-1"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-xs">Screenshot</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleShare('twitter')}
                    variant="outline"
                    className="flex-col h-16 gap-1 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Twitter className="w-5 h-5 text-blue-500" />
                    <span className="text-xs">Twitter</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleShare('facebook')}
                    variant="outline"
                    className="flex-col h-16 gap-1 hover:bg-blue-50 hover:border-blue-600"
                  >
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">Facebook</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleShare('copy')}
                    variant="outline"
                    className="flex-col h-16 gap-1"
                  >
                    <Copy className="w-5 h-5" />
                    <span className="text-xs">Copy Link</span>
                  </Button>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="flex gap-3"
              >
                <Button onClick={handleExitGame} variant="outline" className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Games
                </Button>
                <Button 
                  onClick={() => router.push('/games?tab=library')} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              </motion.div>

              {/* Minato AI Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="text-center pt-4 border-t"
              >
                <p className="text-sm text-muted-foreground">
                  Powered by <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Minato AI</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Experience the future of AI-powered gaming
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Waiting for players or game start
  if (gameData.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <Card className="relative overflow-hidden border-2 shadow-xl">
            {/* Game Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="p-3 bg-primary/20 rounded-full">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {gameData.game_type_id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Game'}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {gameData.difficulty && (
                        <Badge variant="secondary" className="mt-1">
                          {gameData.difficulty.charAt(0).toUpperCase() + gameData.difficulty.slice(1)} Level
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Room Code */}
                {gameData.room_code && (
                  <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Room Code</p>
                    <p className="font-mono text-lg font-bold text-primary">
                      {gameData.room_code}
                    </p>
                  </div>
                )}
              </CardHeader>
            </div>

            <CardContent className="pt-6 space-y-6">
              {/* Status Section */}
              <div className="text-center space-y-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center"
                >
                  <Users className="w-8 h-8 text-primary" />
                </motion.div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {gameData.mode === 'solo' ? 'Preparing Solo Game' : 'Multiplayer Lobby'}
                  </h3>
                  <p className="text-muted-foreground">
                    {gameData.mode === 'solo' 
                      ? "Setting up your personalized challenge..."
                      : `Waiting for ${gameData.max_players - (players?.length || 0)} more player${gameData.max_players - (players?.length || 0) !== 1 ? 's' : ''} to join`
                    }
                  </p>
                </div>
              </div>

              {/* Players Section for Multiplayer */}
              {gameData.mode === 'multiplayer' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Players ({players?.length || 0}/{gameData.max_players})
                    </h4>
                    <Badge variant="outline">
                      {players?.length || 0} joined
                    </Badge>
                  </div>
                  
                  <div className="grid gap-2">
                    {players?.map((player, index) => (
                      <motion.div
                        key={player.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={player.avatar_url} />
                          <AvatarFallback>
                            {player.username?.charAt(0)?.toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{player.username}</p>
                          <p className="text-xs text-muted-foreground">Ready to play</p>
                        </div>
                        {player.user_id === user?.id && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </motion.div>
                    ))}
                    
                    {/* Empty slots */}
                    {Array.from({ length: (gameData.max_players || 2) - (players?.length || 0) }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="flex items-center gap-3 p-3 border-2 border-dashed border-muted-foreground/30 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-muted/30 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Waiting for player...</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Info */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Game Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mode</p>
                    <p className="font-medium capitalize">{gameData.mode}</p>
                  </div>
                                     <div>
                     <p className="text-muted-foreground">Questions</p>
                     <p className="font-medium">{gameData.questions?.length || gameData.rounds || 'TBD'}</p>
                   </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Start Game Button for Host */}
                {gameData.mode === 'multiplayer' && gameData.host_user_id === user?.id && (
                  <Button 
                    onClick={handleStartGame} 
                    className="w-full"
                    disabled={(players?.length || 0) < 2}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {(players?.length || 0) < 2 ? 'Need 2+ Players to Start' : 'Start Game'}
                  </Button>
                )}
                
                {/* Waiting message for non-host */}
                {gameData.mode === 'multiplayer' && gameData.host_user_id !== user?.id && (
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Waiting for host to start the game...
                    </p>
                  </div>
                )}
                
                <Button onClick={handleExitGame} variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Leave Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
          {!hasAnswered && (
            <Button 
              onClick={handleSkipQuestion}
              variant="outline"
              className="gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip Question
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
        {gameData.mode === 'multiplayer' && hasAnswered && !isAutoAdvancing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center"
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <p className="text-lg">Answer submitted! Auto-advancing in a moment...</p>
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