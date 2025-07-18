import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { 
  CreateGameRequest, 
  JoinGameRequest, 
  GameLibraryItem, 
  ActiveGameItem, 
  GameInviteItem,
  UserGameStats,
  GameType,
  GAME_ICONS 
} from "@/lib/types/games";
import { useTrialProtectedApiCall } from '@/hooks/useTrialExpirationHandler';

// Import new Supabase hooks
import {
  useSupabaseGame,
  useUserActiveGames as useSupabaseUserActiveGames,
  useUserInvitations as useSupabaseUserInvitations,
  useSupabaseGameMutations,
  useGameLibrary as useSupabaseGameLibrary,
  useUserGameStats as useSupabaseUserGameStats,
  useGameTimer as useSupabaseGameTimer,
  useGameProgress as useSupabaseGameProgress,
  UserGameStats as SupabaseUserGameStats
} from "@/hooks/useSupabaseGames";

// Extended GameResponse to include additional fields for backward compatibility
interface GameResponse {
  success: boolean;
  game_id?: string;
  room_code?: string;
  topic?: string;
  error?: string;
  message?: string;
  auto_started?: boolean;
  preferences_applied?: boolean;
}

// ============================================================================
// MIGRATION WRAPPER HOOKS - Redirect to Supabase Realtime
// ============================================================================

/**
 * @deprecated Use useSupabaseGame from useSupabaseGames.ts instead
 * This is a compatibility wrapper for the migration
 */
export function useGame(gameId: string | null) {
  console.warn('[DEPRECATED] useGame hook - use useSupabaseGame instead');
  return useSupabaseGame(gameId);
}

/**
 * @deprecated Use useUserActiveGames from useSupabaseGames.ts instead
 * This is a compatibility wrapper for the migration
 */
export function useUserActiveGames() {
  console.warn('[DEPRECATED] useUserActiveGames hook - use Supabase version instead');
  return useSupabaseUserActiveGames();
}

/**
 * @deprecated Use useUserInvitations from useSupabaseGames.ts instead
 * This is a compatibility wrapper for the migration
 */
export function useUserInvitations() {
  console.warn('[DEPRECATED] useUserInvitations hook - use Supabase version instead');
  return useSupabaseUserInvitations();
}

export function useGameMutations() {
  const { user } = useAuth();
  const { callTrialProtectedApi } = useTrialProtectedApiCall();
  const supabaseMutations = useSupabaseGameMutations();

  const createGameWithQuestions = useCallback(async (request: CreateGameRequest): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Use the Supabase-based API endpoint that handles user preferences
      const response = await callTrialProtectedApi(
        async () => fetch('/api/games/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })
      );

      if (!response?.ok) {
        const data = await response?.json();
        throw new Error(data?.error || 'Failed to create game');
      }

      const data = await response.json();

      console.log('Game created successfully:', data);

      return {
        success: true,
        game_id: data.room_id, // Use Supabase room ID for frontend
        room_code: data.room_code, // Include room code for joining
        topic: data.topic, // Include topic for real-time subscriptions
        auto_started: data.auto_started || (request.mode === 'solo'), // Use backend response or fallback
        preferences_applied: data.preferences_applied,
        message: data.message,
      };

    } catch (error) {
      console.error("Error creating game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create game" 
      };
    }
  }, [user, callTrialProtectedApi]);

  // Wrapper functions for backward compatibility that delegate to Supabase
  const joinGame = useCallback(async (request: JoinGameRequest): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Convert old request format to new Supabase format
      const supabaseJoinRequest = {
        room_code: request.game_id, // Assume game_id is actually room_code
        user_id: user.id,
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player',
        avatar_url: user.user_metadata?.avatar_url,
      };

      const result = await supabaseMutations.joinGame(supabaseJoinRequest);
      return {
        success: result.success,
        game_id: result.data?.room_id,
        error: result.error,
        message: result.message,
      };
    } catch (error) {
      console.error("Error joining game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to join game" 
      };
    }
  }, [user, supabaseMutations]);

  const leaveGame = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const result = await supabaseMutations.leaveGame(gameId);
      return {
        success: result.success,
        game_id: gameId,
        error: result.error,
        message: result.message,
      };
    } catch (error) {
      console.error("Error leaving game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to leave game" 
      };
    }
  }, [user, supabaseMutations]);

  const setPlayerReady = useCallback(async (gameId: string, isReady: boolean): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const result = await supabaseMutations.setPlayerReady(gameId, isReady);
      return {
        success: result.success,
        game_id: gameId,
        error: result.error,
        message: result.message,
      };
    } catch (error) {
      console.error("Error setting player ready:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update ready status" 
      };
    }
  }, [user, supabaseMutations]);

  const startGame = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const result = await supabaseMutations.startGame(gameId);
      return {
        success: result.success,
        game_id: gameId,
        error: result.error,
        message: result.message,
      };
    } catch (error) {
      console.error("Error starting game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to start game" 
      };
    }
  }, [user, supabaseMutations]);

  const submitAnswer = useCallback(async (gameId: string, answerIndex: number): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Calculate time taken (approximate)
      const timeTaken = 1000; // Default 1 second, can be improved with actual timing
      const result = await supabaseMutations.submitAnswer(gameId, answerIndex, timeTaken);
      return {
        success: result.success,
        game_id: gameId,
        error: result.error,
        message: result.message,
      };
    } catch (error) {
      console.error("Error submitting answer:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to submit answer" 
      };
    }
  }, [user, supabaseMutations]);

  const nextQuestion = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const result = await supabaseMutations.nextQuestion(gameId);
      return {
        success: result.success,
        game_id: gameId,
        error: result.error,
        message: result.message,
      };
    } catch (error) {
      console.error("Error advancing question:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to advance question" 
      };
    }
  }, [user, supabaseMutations]);

  const skipQuestion = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const result = await supabaseMutations.skipQuestion(gameId);
      return {
        success: result.success,
        game_id: gameId,
        error: result.error,
        message: result.message,
      };
    } catch (error) {
      console.error("Error skipping question:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to skip question" 
      };
    }
  }, [user, supabaseMutations]);

  // Placeholder functions for features not yet migrated
  const createInvitation = useCallback(async (gameId: string, inviteeId: string): Promise<GameResponse> => {
    console.warn('[NOT IMPLEMENTED] createInvitation - use Supabase invitations instead');
    return { success: false, error: "Feature not yet implemented in Supabase" };
  }, []);

  const respondToInvitation = useCallback(async (invitationId: string, response: 'accepted' | 'declined'): Promise<GameResponse> => {
    console.warn('[NOT IMPLEMENTED] respondToInvitation - use Supabase invitations instead');
    return { success: false, error: "Feature not yet implemented in Supabase" };
  }, []);

  return {
    createGameWithQuestions,
    joinGame,
    leaveGame,
    setPlayerReady,
    startGame,
    submitAnswer,
    nextQuestion,
    skipQuestion,
    createInvitation,
    respondToInvitation,
  };
}

// ============================================================================
// ADDITIONAL HOOKS - Redirect to Supabase versions
// ============================================================================

/**
 * @deprecated Use useGameLibrary from useSupabaseGames.ts instead
 */
export function useGameLibrary(): { games: GameLibraryItem[]; isLoading: boolean } {
  console.warn('[DEPRECATED] useGameLibrary hook - use Supabase version instead');
  return useSupabaseGameLibrary();
}

/**
 * @deprecated Use useUserGameStats from useSupabaseGames.ts instead  
 */
export function useUserGameStats(): { stats: SupabaseUserGameStats | null; isLoading: boolean } {
  console.warn('[DEPRECATED] useUserGameStats hook - use Supabase version instead');
  const { stats, isLoading }: { stats: SupabaseUserGameStats | null; isLoading: boolean } = useSupabaseUserGameStats();
  
  // Convert to old format for backward compatibility
  const convertedStats: SupabaseUserGameStats | null = stats ? {
    total_games_played: stats.total_games_played,
    total_wins: stats.total_wins,
    total_score: stats.total_score,
    level: stats.level,
    xp_points: stats.xp_points,
    current_streak: stats.current_streak,
    best_streak: stats.best_streak,
    favorite_game_types: stats.favorite_game_types,
    achievements: stats.achievements,
  } : null;

  return { stats: convertedStats, isLoading };
}

/**
 * @deprecated Use useGameTimer from useSupabaseGames.ts instead
 */
export function useGameTimer(startTime: number | null, timeLimit: number) {
  console.warn('[DEPRECATED] useGameTimer hook - use Supabase version instead');
  return useSupabaseGameTimer(startTime, timeLimit);
}

/**
 * @deprecated Use useGameProgress from useSupabaseGames.ts instead
 */
export function useGameProgress(gameId: string | null) {
  console.warn('[DEPRECATED] useGameProgress hook - use Supabase version instead');
  return useSupabaseGameProgress(gameId);
} 