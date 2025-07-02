"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserActiveGames, useSupabaseGameMutations } from "@/hooks/useSupabaseGames";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, Users, Clock, Play, Eye, Crown, Timer, Heart,
  Gamepad2, ArrowRight, RefreshCw, Plus, Sparkles,
  TrendingUp, Star, Trophy, Target, Flame, Brain,
  ChevronRight, Calendar, MapPin, Wifi, WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type GameStatus = "lobby" | "in_progress" | "finished" | "cancelled";

// Import types from Supabase
import { ActiveGameItem } from "@/lib/types/games";

type ActiveGame = ActiveGameItem;

const difficultyColors = {
  beginner: "bg-green-500/10 text-green-600 border-green-500/20",
  easy: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  expert: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusIcons = {
  lobby: Gamepad2,
  in_progress: Zap,
  finished: Trophy,
  cancelled: Clock,
};

export function ActiveGames() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Check if we should auto-refresh (after game creation)
  const shouldRefresh = searchParams.get("refresh") === "true";
  
  // Fetch active games from Supabase with real-time updates
  const { activeGames, isLoading: gamesLoading } = useUserActiveGames();
  
  // Mutations
  const { joinGame, startGame } = useSupabaseGameMutations();
  
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // Auto-refresh effect after game creation
  useEffect(() => {
    if (shouldRefresh && typeof window !== "undefined") {
      // Remove the refresh parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("refresh");
      window.history.replaceState({}, "", url.toString());
      
      // Show success toast
      toast({
        title: "🎮 Game Created Successfully!",
        description: "Your game is ready. Invite friends or start playing!",
        duration: 4000,
      });
    }
  }, [shouldRefresh, toast]);

  const handleJoinGame = async (roomId: string, roomCode?: string) => {
    if (!user) {
      toast({
        title: "🔐 Authentication Required",
        description: "Please sign in to join games",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(roomId);
      const result = await joinGame({
        room_code: roomCode || roomId,
        user_id: user.id,
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player',
        avatar_url: user.user_metadata?.avatar_url,
      });
      
      if (result.success) {
        toast({
          title: "🎉 Joined Game!",
          description: "You've successfully joined the game",
        });
      } else {
        throw new Error(result.error || 'Failed to join game');
      }
    } catch (error) {
      console.error("Failed to join game:", error);
      toast({
        title: "❌ Failed to Join",
        description: error instanceof Error ? error.message : "Could not join the game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleResumeGame = (gameId: string) => {
    // Navigate to the game interface
    router.push(`/games/play/${gameId}`);
  };

  const handleSpectateGame = (gameId: string) => {
    // Navigate to spectator view
    router.push(`/games/spectate/${gameId}`);
  };

  const handleStartGame = async (gameId: string) => {
    try {
      setIsLoading(gameId);
      const result = await startGame(gameId);
      
      if (result.success) {
        toast({
          title: "🚀 Game Started!",
          description: "The game has begun. Good luck!",
        });
        
        // Navigate to game
        handleResumeGame(gameId);
      } else {
        throw new Error(result.error || 'Failed to start game');
      }
    } catch (error) {
      console.error("Failed to start game:", error);
      toast({
        title: "❌ Failed to Start",
        description: error instanceof Error ? error.message : "Could not start the game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
      niche_hobbyist_corner: "🎯",
      guess_the_entity: "🔍",
      guess_the_title: "🎭",
      twenty_questions: "❓",
      hangman_themed: "📝",
      guess_the_song: "🎵",
      story_chain: "📚",
      pitch_movie: "🎬",
      haiku_battle: "🌸",
      courtroom_drama: "⚖️",
      ai_improv: "🎭",
      couples_challenge: "💕",
      two_sides_story: "👥",
      memory_lane: "🛤️",
      dare_or_describe: "😊",
      escape_room: "🔐",
      solo_adventure: "⚔️",
      five_levels_challenge: "🔢",
      code_breaker: "🔒",
      connect_dots: "🔗",
      math_physics_challenge: "🧮",
      chemistry_lab: "🧪",
      astronomy_explorer: "⭐",
      medical_mysteries: "🩺",
      pharmacy_knowledge: "💊",
      biology_quest: "🧬",
      history_detective: "🔍",
      language_master: "🌍",
      art_appreciation: "🎨",
      philosophy_cafe: "🧠",
      psychology_insights: "🧠",
      economics_game: "📈",
      geography_explorer: "🗺️",
      default: "🎮"
    };
    
    return emojiMap[gameType] || emojiMap.default;
  };

  const isPlayerInGame = (game: ActiveGame) => {
    return game.players.some(p => p.user_id === user?.id);
  };

  const isGameHost = (game: ActiveGame) => {
    return game.host_user_id === user?.id;
  };

  const canJoinGame = (game: ActiveGame) => {
    return !isPlayerInGame(game) && 
           game.status === 'lobby' && 
           game.players.length < game.max_players &&
           game.mode === 'multiplayer'; // Solo games can't be joined
  };

  const canStartGame = (game: ActiveGame) => {
    return isGameHost(game) && 
           game.status === 'lobby' && 
           (game.mode === 'solo' || game.players.length > 0);
  };

  const canResumeGame = (game: ActiveGame) => {
    return (isPlayerInGame(game) || isGameHost(game)) && 
           game.status === 'in_progress';
  };

  const getPlayerInGame = (game: ActiveGame) => {
    return game.players.find(p => p.user_id === user?.id);
  };

  // Filter and sort games from Supabase
  const allRelevantGames = React.useMemo(() => {
    if (!activeGames || activeGames.length === 0) return [];
    
    // Filter out solo games and sort by priority
    const filteredGames = activeGames.filter((game) => {
      return game && game.mode !== 'solo'; // Hide solo games from active list
    });
    
    return filteredGames.sort((a, b) => {
      // Sort by status priority, then by creation time
      const statusOrder = { in_progress: 0, lobby: 1, finished: 2, cancelled: 3 };
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 999;
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 999;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // If same status, sort by most recent
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [activeGames]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
        <p className="text-muted-foreground mb-4">Please sign in to view and join active games.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
      >
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Active Games
                </h2>
                <p className="text-muted-foreground">
                  {allRelevantGames.length} active • {allRelevantGames.filter(g => g.status === "in_progress").length} in progress
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full border border-green-500/20">
                <Wifi className="w-4 h-4" />
                <span>Live</span>
              </div>
            </div>
            <Button
              onClick={() => router.push('/games?tab=library')}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Game</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Active Games List */}
      <AnimatePresence mode="wait">
        {allRelevantGames.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="relative overflow-hidden border-dashed border-2 border-muted/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="pt-12 pb-8">
                <div className="text-center space-y-6 max-w-md mx-auto">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                      <Gamepad2 className="w-10 h-10 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2">
                      <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                    </div>
                  </motion.div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">No Active Games</h3>
                    <p className="text-muted-foreground">
                      Ready to challenge your mind? Create your first AI-powered game and start the adventure!
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => router.push('/games?tab=library')}
                      className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                      size="lg"
                    >
                      <Plus className="w-5 h-5" />
                      Create Your First Game
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/games?tab=tournaments')}
                      className="gap-2 hover:bg-primary/5"
                    >
                      <Trophy className="w-4 h-4" />
                      Browse Tournaments
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="games"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 md:gap-6"
          >
            {allRelevantGames.map((game, index) => {
              const StatusIcon = statusIcons[game.status];
              const playerInGame = getPlayerInGame(game);
              const isHost = isGameHost(game);
              const canJoin = canJoinGame(game);
              const canStart = canStartGame(game);
              const canResume = canResumeGame(game);
              
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => setSelectedGame(selectedGame === game.id ? null : game.id)}
                  className="cursor-pointer"
                >
                  <Card className={cn(
                    "relative overflow-hidden group hover:shadow-xl transition-all duration-500 border bg-gradient-to-br from-background to-muted/10",
                    isPlayerInGame(game) && "ring-2 ring-primary/30 shadow-lg shadow-primary/10",
                    game.status === "in_progress" && "border-green-500/30 shadow-green-500/10",
                    selectedGame === game.id && "scale-[1.02] shadow-2xl"
                  )}>
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Status indicator */}
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1",
                      game.status === "lobby" && "bg-gradient-to-r from-blue-500 to-blue-400",
                      game.status === "in_progress" && "bg-gradient-to-r from-green-500 to-green-400",
                      game.status === "finished" && "bg-gradient-to-r from-yellow-500 to-yellow-400",
                      game.status === "cancelled" && "bg-gradient-to-r from-red-500 to-red-400"
                    )} />

                    <CardContent className="p-6 space-y-4">
                      {/* Game Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                              <StatusIcon className="w-6 h-6 text-primary" />
                            </div>
                            {game.status === "in_progress" && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{getGameTypeEmoji(game.game_type)}</span>
                              <h3 className="font-bold text-lg leading-tight">
                                {getGameTypeDisplayName(game.game_type)}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge 
                                variant={game.status === "in_progress" ? "default" : "secondary"}
                                className={cn(
                                  "text-xs font-medium",
                                  game.status === "in_progress" && "bg-green-500/10 text-green-600 border-green-500/20 animate-pulse"
                                )}
                              >
                                {game.status === "in_progress" && <Zap className="w-3 h-3 mr-1" />}
                                {game.status.replace("_", " ")}
                              </Badge>
                              
                              {game.status === "in_progress" && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    Round {game.current_round}/{game.rounds}
                                  </span>
                                </>
                              )}
                              
                              {game.created_at && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatTimeAgo(game.created_at)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs font-medium", difficultyColors[game.difficulty as keyof typeof difficultyColors])}
                          >
                            {game.difficulty}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {game.mode} • {game.rounds} rounds
                          </div>
                        </div>
                      </div>

                      {/* Player indicators and special badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Player avatars */}
                          <div className="flex -space-x-3">
                            {game.players.slice(0, 4).map((player, playerIndex) => (
                              <motion.div
                                key={playerIndex}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.1 + playerIndex * 0.05 }}
                              >
                                <Avatar className={cn(
                                  "w-9 h-9 border-3 border-background shadow-lg",
                                  player.user_id === user?.id && "ring-2 ring-primary/50"
                                )}>
                                  <AvatarImage src={player.avatar_url} />
                                  <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                                    {player.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                            ))}
                            {game.players.length > 4 && (
                              <div className="w-9 h-9 rounded-full bg-muted border-3 border-background flex items-center justify-center text-xs font-bold shadow-lg">
                                +{game.players.length - 4}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium">{game.players.length}</span>
                            <span className="text-muted-foreground">/{game.max_players}</span>
                          </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-2">
                          {isPlayerInGame(game) && (
                            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                              <Crown className="w-3 h-3 mr-1" />
                              {isHost ? "Host" : "Joined"}
                            </Badge>
                          )}
                          
                          {playerInGame && playerInGame.score > 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/5 text-yellow-600 border-yellow-500/20">
                              <Star className="w-3 h-3 mr-1" />
                              {playerInGame.score} pts
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Game Progress (for in-progress games) */}
                      {game.status === "in_progress" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2 pt-2 border-t border-border/50"
                        >
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{game.current_round}/{game.rounds} rounds</span>
                          </div>
                          <Progress 
                            value={(game.current_round / game.rounds) * 100} 
                            className="h-2 bg-muted/50"
                          />
                        </motion.div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        {canStart && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartGame(game._id);
                            }}
                            disabled={isLoading === game._id}
                            className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            {isLoading === game._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                            Start Game
                          </Button>
                        )}
                        
                        {canJoin && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinGame(game._id);
                            }}
                            disabled={isLoading === game._id}
                            variant="outline"
                            className="flex-1 gap-2 hover:bg-primary/5 border-primary/20 hover:border-primary/40"
                          >
                            {isLoading === game._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                            Join Game
                          </Button>
                        )}
                        
                        {canResume && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResumeGame(game._id);
                            }}
                            className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Play className="w-4 h-4" />
                            Resume
                          </Button>
                        )}
                        
                        {!isPlayerInGame(game) && game.status === "in_progress" && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpectateGame(game._id);
                            }}
                            variant="outline"
                            className="flex-1 gap-2 hover:bg-muted/50"
                          >
                            <Eye className="w-4 h-4" />
                            Watch
                          </Button>
                        )}
                        
                        {game.status === "lobby" && !canJoin && !canStart && !isPlayerInGame(game) && (
                          <div className="flex-1 text-center py-2 text-sm text-muted-foreground">
                            Game Full
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 