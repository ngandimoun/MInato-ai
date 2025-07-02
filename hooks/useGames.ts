import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { 
  CreateGameRequest, 
  JoinGameRequest, 
  GameResponse, 
  LiveGame, 
  GameLibraryItem, 
  ActiveGameItem, 
  GameInviteItem,
  UserGameStats,
  GameType,
  GAME_ICONS 
} from "@/lib/types/games";

// ============================================================================
// GAME HOOKS - Using static data until Convex is properly set up
// ============================================================================

export function useGame(gameId: string | null) {
  // Mock implementation for now
  return {
    game: null,
    isLoading: false,
    error: gameId ? "Game not found" : null,
  };
}

export function useUserActiveGames() {
  const { user } = useAuth();
  
  // Mock implementation for now
  return {
    activeGames: [],
    isLoading: false,
  };
}

export function useUserInvitations() {
  const { user } = useAuth();
  
  // Mock implementation for now
  return {
    invitations: [],
    isLoading: false,
  };
}

export function useGameMutations() {
  const { user } = useAuth();

  const createGameWithQuestions = useCallback(async (request: CreateGameRequest): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation - just return success for now
      console.log('Creating game with request:', request);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, game_id: crypto.randomUUID() };
    } catch (error) {
      console.error("Error creating game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create game" 
      };
    }
  }, [user?.id]);

  const joinGameById = useCallback(async (request: JoinGameRequest): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Joining game:', request);
      return { success: true, game_id: request.game_id };
    } catch (error) {
      console.error("Error joining game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to join game" 
      };
    }
  }, [user]);

  const leaveGameById = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Leaving game:', gameId);
      return { success: true };
    } catch (error) {
      console.error("Error leaving game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to leave game" 
      };
    }
  }, [user?.id]);

  const setReady = useCallback(async (gameId: string, isReady: boolean): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Setting ready status:', { gameId, isReady });
      return { success: true };
    } catch (error) {
      console.error("Error setting ready status:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to set ready status" 
      };
    }
  }, [user?.id]);

  const startGameById = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Starting game:', gameId);
      return { success: true };
    } catch (error) {
      console.error("Error starting game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to start game" 
      };
    }
  }, [user?.id]);

  const submitPlayerAnswer = useCallback(async (gameId: string, answerIndex: number): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Submitting answer:', { gameId, answerIndex });
      return { success: true };
    } catch (error) {
      console.error("Error submitting answer:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to submit answer" 
      };
    }
  }, [user?.id]);

  const advanceQuestion = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Advancing question:', gameId);
      return { success: true };
    } catch (error) {
      console.error("Error advancing question:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to advance question" 
      };
    }
  }, [user?.id]);

  const invitePlayer = useCallback(async (gameId: string, invitedUserId: string, invitedUsername: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Inviting player:', { gameId, invitedUserId, invitedUsername });
      return { success: true };
    } catch (error) {
      console.error("Error creating invitation:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to send invitation" 
      };
    }
  }, [user?.id]);

  const respondToInvite = useCallback(async (invitationId: string, response: 'accepted' | 'declined'): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Mock implementation
      console.log('Responding to invitation:', { invitationId, response });
      return { success: true };
    } catch (error) {
      console.error("Error responding to invitation:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to respond to invitation" 
      };
    }
  }, [user?.id]);

  return {
    createGameWithQuestions,
    joinGameById,
    leaveGameById,
    setReady,
    startGameById,
    submitPlayerAnswer,
    advanceQuestion,
    invitePlayer,
    respondToInvite,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export function useGameTimer(startTime: number | null, timeLimit: number) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!startTime) {
      setTimeRemaining(timeLimit);
      setIsExpired(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeLimit * 1000 - elapsed);
      
      setTimeRemaining(Math.ceil(remaining / 1000));
      
      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, timeLimit]);

  return { timeRemaining, isExpired };
}

export function useGameProgress(gameId: string | null) {
  // Mock implementation
  const progress = {
    currentRound: 0,
    totalRounds: 0,
    currentQuestion: 0,
    totalQuestions: 0,
    playersReady: 0,
    totalPlayers: 0,
    percentage: 0,
  };

  return progress;
} 