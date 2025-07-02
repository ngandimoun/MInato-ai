"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Timer, Feather, Star, Crown, Sparkles, Clock, 
  Send, BookOpen, Heart, Trophy, Pen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-provider';

type HaikuSubmission = {
  user_id: string;
  username: string;
  content: string;
  submitted_at: number;
  ai_score?: number;
  ai_feedback?: string;
  rank?: number;
};

type HaikuTheme = {
  theme: string;
  round_number: number;
  time_limit: number;
  bonus_points: number;
};

interface HaikuBattleProps {
  gameId: string;
  currentRound: number;
  totalRounds: number;
  players: Array<{
    user_id: string;
    username: string;
    avatar_url?: string;
    score: number;
  }>;
  onSubmitHaiku: (content: string) => Promise<void>;
  onNextRound: () => void;
  gameStatus: 'lobby' | 'in_progress' | 'finished';
}

export function HaikuBattle({
  gameId,
  currentRound,
  totalRounds,
  players,
  onSubmitHaiku,
  onNextRound,
  gameStatus
}: HaikuBattleProps) {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<HaikuTheme | null>(null);
  const [haikuContent, setHaikuContent] = useState('');
  const [submissions, setSubmissions] = useState<HaikuSubmission[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [judingResults, setJudingResults] = useState<any>(null);
  const [phase, setPhase] = useState<'theme' | 'writing' | 'judging' | 'results'>('theme');

  // Mock theme generation (in real implementation, this would call Convex action)
  useEffect(() => {
    if (gameStatus === 'in_progress' && !currentTheme) {
      const themes = [
        "Digital loneliness", "Cherry blossoms falling", "City rain at night",
        "Virtual reality dreams", "Ancient wisdom", "Neon-lit memories",
        "Code and consciousness", "Mountain mist rising", "Lost connections"
      ];
      
      setCurrentTheme({
        theme: themes[Math.floor(Math.random() * themes.length)],
        round_number: currentRound,
        time_limit: 90,
        bonus_points: 30,
      });
      
      setTimeRemaining(90);
      setPhase('writing');
    }
  }, [gameStatus, currentRound, currentTheme]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && phase === 'writing') {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setPhase('judging');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, phase]);

  const handleSubmitHaiku = async () => {
    if (!haikuContent.trim() || isSubmitting || hasSubmitted) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitHaiku(haikuContent);
      setHasSubmitted(true);
      
      // Add to local submissions for immediate feedback
      const newSubmission: HaikuSubmission = {
        user_id: user?.id || '',
        username: user?.email?.split('@')[0] || 'Player',
        content: haikuContent,
        submitted_at: Date.now(),
      };
      
      setSubmissions(prev => [...prev, newSubmission]);
    } catch (error) {
      console.error('Error submitting haiku:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    if (timeRemaining > 60) return 'bg-green-500';
    if (timeRemaining > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const countLines = (text: string) => {
    return text.split('\n').filter(line => line.trim().length > 0).length;
  };

  const validateHaiku = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.length === 3 && text.trim().length > 10;
  };

  if (gameStatus === 'lobby') {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <Feather className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">Haiku Battle</h3>
          <p className="text-muted-foreground">
            Waiting for the poetic journey to begin...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card border-pink-200 dark:border-pink-800 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Feather className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">🌸 Haiku Battle</h2>
                <p className="text-sm text-muted-foreground">
                  Round {currentRound} of {totalRounds}
                </p>
              </div>
            </div>
            
            <Badge variant="secondary" className="text-sm">
              <Sparkles className="w-4 h-4 mr-1" />
              AI Judge
            </Badge>
          </div>

          {currentTheme && (
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-medium text-pink-600 dark:text-pink-400">Theme</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                "{currentTheme.theme}"
              </h3>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Writing Phase */}
      {phase === 'writing' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Timer */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm font-medium">Time Remaining</span>
                </div>
                <span className="text-lg font-mono font-bold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <Progress 
                value={(timeRemaining / 90) * 100} 
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Haiku Input */}
          {!hasSubmitted && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pen className="w-5 h-5" />
                  Write Your Haiku
                </CardTitle>
                <CardDescription>
                  Express the theme in three lines (5-7-5 syllables traditional, but creativity welcomed)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={haikuContent}
                  onChange={(e) => setHaikuContent(e.target.value)}
                  placeholder="Line 1: Five syllables here&#10;Line 2: Seven syllables in this&#10;Line 3: Five more to end"
                  className="min-h-32 resize-none font-mono text-center leading-relaxed"
                  maxLength={200}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Lines: {countLines(haikuContent)}/3
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {haikuContent.length}/200
                    </span>
                  </div>
                  
                  <Button
                    onClick={handleSubmitHaiku}
                    disabled={!validateHaiku(haikuContent) || isSubmitting || timeRemaining <= 0}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Haiku'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submitted State */}
          {hasSubmitted && (
            <Card className="glass-card border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-green-500 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                  Haiku Submitted!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                  Your poetic creation has been sent to the AI judge.
                </p>
                <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
                  <pre className="text-sm font-mono whitespace-pre-line">
                    {haikuContent}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Judging Phase */}
      {phase === 'judging' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Card className="glass-card">
            <CardContent className="p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center"
              >
                <Star className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">AI Judge Deliberating</h3>
              <p className="text-muted-foreground">
                The AI is carefully evaluating all haiku submissions for creativity, 
                emotion, and adherence to the theme...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results Phase */}
      {phase === 'results' && judingResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                AI Judge Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {judingResults.individual_scores.map((result: any, index: number) => (
                <motion.div
                  key={result.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="bg-muted/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {index === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                      <span className="font-medium">{result.username}</span>
                    </div>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {result.score}/10
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {result.explanation}
                  </p>
                  <div className="bg-white/50 dark:bg-gray-900/50 rounded p-2">
                    <pre className="text-xs font-mono whitespace-pre-line">
                      {submissions.find(s => s.user_id === result.user_id)?.content}
                    </pre>
                  </div>
                </motion.div>
              ))}

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium mb-2">Overall Feedback</h4>
                <p className="text-sm text-muted-foreground">
                  {judingResults.overall_feedback}
                </p>
              </div>

              <Button onClick={onNextRound} className="w-full">
                {currentRound >= totalRounds ? 'Finish Game' : 'Next Round'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Players List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Poets ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
              <div 
                key={player.user_id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {player.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{player.username}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{player.score.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 