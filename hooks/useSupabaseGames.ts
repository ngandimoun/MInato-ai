import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  gameService, 
  GameRoom, 
  GamePlayer, 
  CreateGameRequest as SupabaseCreateGameRequest, 
  JoinGameRequest as SupabaseJoinGameRequest, 
  SubmitAnswerRequest, 
  GameResponse 
} from '@/lib/services/SupabaseGameService';
import { 
  GameLibraryItem, 
  ActiveGameItem, 
  GameInviteItem
} from "@/lib/types/games";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserGameStats {
  total_games_played: number;
  total_wins: number;
  total_score: number;
  level: number;
  xp_points: number;
  current_streak: number;
  best_streak: number;
  favorite_game_types: string[];
  achievements: string[];
}

interface GameEventPayload {
  event: string;
  type?: string;
  payload?: {
    new?: GameRoom;
    old?: GameRoom;
    eventType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface PostgresChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  errors?: string[] | null;
}

interface DatabaseRow {
  [key: string]: unknown;
}

interface GameTypeRow extends DatabaseRow {
  id: string;
  name: string;
  display_name: string;
  icon_name?: string;
  color_theme?: string;
}

interface RoomWithGameType extends DatabaseRow {
  id: string;
  room_code: string;
  topic: string;
  game_type_id: string;
  host_user_id: string;
  difficulty: string;
  max_players: number;
  rounds: number;
  mode: string;
  status: string;
  current_round: number;
  current_question_index?: number;
  questions?: unknown[];
  settings?: unknown;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  updated_at: string;
  game_types?: GameTypeRow;
  live_game_players?: PlayerWithUser[];
}

interface PlayerWithUser extends DatabaseRow {
  user_id: string;
  username?: string;
  avatar_url?: string;
}

interface InvitationRow extends DatabaseRow {
  id: string;
  room_id: string;
  host_user_id: string;
  host_username?: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  live_game_rooms?: {
    room_code: string;
    game_types?: GameTypeRow;
  };
}

interface UserStatsRow extends DatabaseRow {
  user_id: string;
  total_games_played: number;
  total_wins: number;
  total_score: number;
  level: number;
  xp_points: number;
  favorite_game_types: string[];
  achievements: string[];
}

// ============================================================================
// GAME HOOKS - Supabase Realtime implementation
// ============================================================================

export function useSupabaseGame(roomId: string | null) {
  const [game, setGame] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (!roomId) {
      setGame(null);
      setPlayers([]);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let channel: RealtimeChannel | null = null;

    const fetchGameData = async () => {
      try {
        const { data, error } = await supabase
          .from('live_game_rooms')
          .select(`
            *,
            game_types (
              name,
              display_name,
              icon_name,
              color_theme
            )
          `)
          .eq('id', roomId)
          .single();

        if (error) throw error;

        if (mounted) {
          const gameData = data as RoomWithGameType;
          
          // Parse settings and current_question with proper typing
          const parsedSettings = typeof gameData.settings === 'string' 
            ? JSON.parse(gameData.settings) 
            : gameData.settings;
            
          const parsedCurrentQuestion = typeof gameData.current_question === 'string'
            ? JSON.parse(gameData.current_question)
            : gameData.current_question;
            
          const parsedQuestions = typeof gameData.questions === 'string'
            ? JSON.parse(gameData.questions)
            : gameData.questions;

          const gameRoom: GameRoom = {
            id: gameData.id,
            room_code: gameData.room_code,
            topic: gameData.topic,
            game_type_id: gameData.game_type_id,
            host_user_id: gameData.host_user_id,
            difficulty: gameData.difficulty as GameRoom['difficulty'],
            max_players: gameData.max_players,
            rounds: gameData.rounds,
            mode: gameData.mode as GameRoom['mode'],
            status: gameData.status as GameRoom['status'],
            current_round: gameData.current_round,
            current_question_index: gameData.current_question_index,
            questions: parsedQuestions || [],
            current_question: parsedCurrentQuestion,
            settings: parsedSettings || {
              auto_advance: true,
              show_explanations: true,
              time_per_question: 30,
            },
            created_at: gameData.created_at,
            started_at: gameData.started_at,
            finished_at: gameData.finished_at,
            updated_at: gameData.updated_at,
          };

          console.log('🎮 Game data fetched:', {
            id: gameRoom.id,
            status: gameRoom.status,
            current_question_index: gameRoom.current_question_index,
            total_questions: gameRoom.questions?.length,
            current_question: gameRoom.current_question,
            timer_start: gameRoom.current_question?.started_at,
          });

          setGame(gameRoom);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching game data:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch game data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('live_game_players')
          .select('*')
          .eq('room_id', roomId)
          .order('score', { ascending: false });

        if (error) throw error;

        if (mounted) {
          setPlayers(data || []);
        }
      } catch (err) {
        console.error('Error fetching players:', err);
      }
    };

    const setupRealtimeSubscription = async () => {
      try {
        // First get the room topic for subscription
        const { data: roomData } = await supabase
          .from('live_game_rooms')
          .select('topic')
          .eq('id', roomId)
          .single();

        if (!roomData?.topic) {
          console.error('❌ No room topic found for subscription');
          return;
        }

        console.log(`📡 Setting up realtime subscription for topic: ${roomData.topic}`);

        // Create channel for this specific room
        const newChannel = supabase
          .channel(`game_room:${roomData.topic}`)
          .on('broadcast', { event: '*' }, (payload: any) => {
            console.log('📻 Broadcast event received:', payload);
            handleGameEvent(payload);
          })
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'live_game_rooms', filter: `id=eq.${roomId}` },
            (payload: any) => {
              console.log('🗄️ Room database change:', payload);
              // Refetch game data when room changes
              fetchGameData();
            }
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'live_game_players', filter: `room_id=eq.${roomId}` },
            (payload: any) => {
              console.log('👥 Player database change:', payload);
              // Refetch players when players change
              fetchPlayers();
            }
          );

        await newChannel.subscribe((status: string) => {
          console.log(`📡 Subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to realtime updates');
          }
        });

        // Assign to the outer scope variable
        channel = newChannel;

      } catch (error) {
        console.error('❌ Failed to setup realtime subscription:', error);
      }
    };

    const handleGameEvent = (payload: any) => {
      console.log('🎮 Game event received:', payload);
      
      // Handle different event types
      const eventType = payload.event || payload.payload?.event_type;
      
      switch (eventType) {
        case 'GAME_STARTED':
          console.log('🚀 Game started, refetching data...');
          fetchGameData();
          break;
          
        case 'NEW_QUESTION':
          console.log('❓ New question available, updating state immediately...');
          
          // Extract the new question data from the event
          const questionData = payload.payload?.event_data;
          if (questionData?.question) {
            console.log('🔄 Updating game state with new question:', {
              index: questionData.question_index,
              question: questionData.question?.question,
              started_at: questionData.question?.started_at,
            });
            
            // Update the current game state immediately
            setGame(prevGame => {
              if (!prevGame) return null;
              
              return {
                ...prevGame,
                current_question_index: questionData.question_index,
                current_question: questionData.question,
              };
            });
          }
          
          // Also refetch for complete data consistency
          setTimeout(() => fetchGameData(), 100);
          break;
          
        case 'ANSWER_SUBMITTED':
          console.log('💭 Someone submitted an answer, updating players...');
          fetchPlayers();
          break;
          
        case 'GAME_FINISHED':
          console.log('🏁 Game completed!');
          fetchGameData();
          break;
          
        default:
          console.log('📡 Other game event:', eventType);
          break;
      }
    };

    // Initialize data and subscription
    fetchGameData();
    fetchPlayers();
    setupRealtimeSubscription();

    return () => {
      mounted = false;
      if (channel) {
        console.log('🔌 Unsubscribing from realtime channel');
        channel.unsubscribe();
      }
    };
  }, [roomId]);

  return {
    game,
    players,
    isLoading,
    error,
  };
}

export function useUserActiveGames() {
  const { user } = useAuth();
  const [activeGames, setActiveGames] = useState<ActiveGameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchActiveGames = async () => {
      try {
        const { data, error } = await supabase
          .from('live_game_rooms')
          .select(`
            *,
            game_types (name, display_name, icon_name, color_theme),
            live_game_players!inner (user_id)
          `)
          .eq('live_game_players.user_id', user.id)
          .in('status', ['lobby', 'in_progress'])
          .order('created_at', { ascending: false });

        if (error) throw error;

        const activeGamesData: ActiveGameItem[] = (data || []).map((room: RoomWithGameType) => ({
          id: room.id,
          game_type: room.game_types?.name || 'unknown',
          display_name: room.game_types?.display_name || 'Unknown Game',
          status: room.status as 'lobby' | 'in_progress',
          players: (room.live_game_players as PlayerWithUser[] || []).map((p: PlayerWithUser) => ({
            user_id: p.user_id,
            username: p.username || 'Player',
            avatar_url: p.avatar_url,
          })),
          max_players: room.max_players,
          current_round: room.current_round,
          total_rounds: room.rounds,
          host_user_id: room.host_user_id,
          can_join: room.status === 'lobby' && (room.live_game_players as PlayerWithUser[]).length < room.max_players,
          can_resume: room.status === 'in_progress',
        }));

        setActiveGames(activeGamesData);
      } catch (error) {
        console.error('Error fetching active games:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveGames();

    // Set up real-time subscription for active games
    const channel = supabase
      .channel('user_active_games')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_game_rooms' },
        () => {
          fetchActiveGames(); // Refetch when games change
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_game_players' },
        () => {
          fetchActiveGames(); // Refetch when player joins/leaves
        }
      );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return {
    activeGames,
    isLoading,
  };
}

export function useUserInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<GameInviteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchInvitations = async () => {
      try {
        const { data, error } = await supabase
          .from('game_invitations')
          .select(`
            *,
            live_game_rooms (
              room_code,
              game_types (name, display_name, icon_name, color_theme)
            )
          `)
          .eq('invited_user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const invitationsData: GameInviteItem[] = (data || []).map((invite: InvitationRow) => ({
          id: invite.id,
          game_id: invite.room_id,
          host_user_id: invite.host_user_id,
          host_username: invite.host_username || 'Unknown Host',
          host_avatar: '',
          game_type: invite.live_game_rooms?.game_types?.name || 'unknown',
          display_name: invite.live_game_rooms?.game_types?.display_name || 'Unknown Game',
          status: 'pending' as const,
          created_at: Date.parse(invite.created_at),
          expires_at: Date.parse(invite.expires_at),
        }));

        setInvitations(invitationsData);
      } catch (error) {
        console.error('Error fetching invitations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitations();

    // Set up real-time subscription for invitations
    const channel = supabase
      .channel('user_invitations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_invitations', filter: `invited_user_id=eq.${user.id}` },
        () => {
          fetchInvitations(); // Refetch when invitations change
        }
      );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  return {
    invitations,
    isLoading,
  };
}

export function useSupabaseGameMutations() {
  const { user } = useAuth();

  const createGameWithQuestions = useCallback(async (request: SupabaseCreateGameRequest): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const username = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player';
      return await gameService.createGameRoom(request, user.id, username);
    } catch (error) {
      console.error("Error creating game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create game" 
      };
    }
  }, [user]);

  const joinGame = useCallback(async (request: SupabaseJoinGameRequest): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const joinRequest: SupabaseJoinGameRequest = {
        ...request,
        user_id: user.id,
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player',
        avatar_url: user.user_metadata?.avatar_url,
      };

      return await gameService.joinGameRoom(joinRequest);
    } catch (error) {
      console.error("Error joining game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to join game" 
      };
    }
  }, [user]);

  const leaveGame = useCallback(async (roomId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      return await gameService.leaveGameRoom(roomId, user.id);
    } catch (error) {
      console.error("Error leaving game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to leave game" 
      };
    }
  }, [user]);

  const setPlayerReady = useCallback(async (roomId: string, isReady: boolean): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const supabase = getBrowserSupabaseClient();
      const { error } = await supabase
        .from('live_game_players')
        .update({ is_ready: isReady })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) throw error;

      return { 
        success: true, 
        message: `Player marked as ${isReady ? 'ready' : 'not ready'}`
      };
    } catch (error) {
      console.error("Error setting player ready:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update ready status" 
      };
    }
  }, [user]);

  const startGame = useCallback(async (roomId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      return await gameService.startGame(roomId, user.id);
    } catch (error) {
      console.error("Error starting game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to start game" 
      };
    }
  }, [user]);

  const submitAnswer = useCallback(async (roomId: string, answerIndex: number, timeTaken: number): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const request: SubmitAnswerRequest = {
        room_id: roomId,
        user_id: user.id,
        answer_index: answerIndex,
        time_taken: timeTaken,
      };

      return await gameService.submitAnswer(request);
    } catch (error) {
      console.error("Error submitting answer:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to submit answer" 
      };
    }
  }, [user]);

  const nextQuestion = useCallback(async (roomId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      return await gameService.nextQuestion(roomId, user.id);
    } catch (error) {
      console.error("Error advancing question:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to advance question" 
      };
    }
  }, [user]);

  const skipQuestion = useCallback(async (roomId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      return await gameService.skipQuestion(roomId, user.id);
    } catch (error) {
      console.error("Error skipping question:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to skip question" 
      };
    }
  }, [user]);

  return {
    createGameWithQuestions,
    joinGame,
    leaveGame,
    setPlayerReady,
    startGame,
    submitAnswer,
    nextQuestion,
    skipQuestion,
  };
}

// ============================================================================
// ADDITIONAL HOOKS FOR GAME LIBRARY AND STATS
// ============================================================================

export function useGameLibrary(): { games: GameLibraryItem[]; isLoading: boolean } {
  const [games, setGames] = useState<GameLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    const fetchGameTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('game_types')
          .select('*')
          .eq('is_active', true)
          .order('display_name');

        if (error) throw error;

        const gameLibraryData: GameLibraryItem[] = (data || []).map((gameType: GameTypeRow) => ({
          id: gameType.name,
          name: gameType.name,
          display_name: gameType.display_name,
          description: (gameType.description as string) || '',
          category: (gameType.category as string) || 'general',
          difficulty_levels: (gameType.difficulty_levels as string[]) || ['easy', 'medium', 'hard'],
          min_players: (gameType.min_players as number) || 1,
          max_players: (gameType.max_players as number) || 8,
          estimated_duration_minutes: (gameType.estimated_duration_minutes as number) || 15,
          icon_name: gameType.icon_name || 'Gamepad2',
          color_theme: gameType.color_theme || 'blue',
          is_popular: false, // You can add popularity logic
          is_new: false,
        }));

        setGames(gameLibraryData);
      } catch (error) {
        console.error('Error fetching game library:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameTypes();
  }, []);

  return { games, isLoading };
}

export function useUserGameStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserGameStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchUserStats = async () => {
      try {
        const { data, error } = await supabase
          .from('user_game_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
          throw error;
        }

        if (data) {
          const statsRow = data as UserStatsRow;
          setStats({
            total_games_played: statsRow.total_games_played,
            total_wins: statsRow.total_wins,
            total_score: statsRow.total_score,
            level: statsRow.level,
            xp_points: statsRow.xp_points,
            current_streak: 0, // Add to your schema if needed
            best_streak: 0, // Add to your schema if needed
            favorite_game_types: statsRow.favorite_game_types,
            achievements: statsRow.achievements,
          });
        } else {
          // Create initial stats if none exist
          const { data: newStats, error: createError } = await supabase
            .from('user_game_stats')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (createError) throw createError;

          setStats({
            total_games_played: 0,
            total_wins: 0,
            total_score: 0,
            level: 1,
            xp_points: 0,
            current_streak: 0,
            best_streak: 0,
            favorite_game_types: [],
            achievements: [],
          });
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [user?.id]);

  return { stats, isLoading };
}

export function useGameTimer(startTime: number | null, timeLimit: number, shouldStop?: boolean) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!startTime || shouldStop) {
      setIsActive(false);
      if (!startTime) {
        setTimeRemaining(timeLimit);
      }
      return;
    }

    setIsActive(true);
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setIsActive(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, timeLimit, shouldStop]);

  return { timeRemaining, isActive };
}

export function useGameProgress(roomId: string | null) {
  const [progress, setProgress] = useState({
    currentQuestion: 0,
    totalQuestions: 0,
    percentage: 0,
  });

  const { game } = useSupabaseGame(roomId);

  useEffect(() => {
    if (game) {
      const currentQuestion = (game.current_question_index || 0) + 1;
      const totalQuestions = game.questions?.length || game.rounds || 10;
      const percentage = (currentQuestion / totalQuestions) * 100;

      setProgress({
        currentQuestion,
        totalQuestions,
        percentage,
      });
    }
  }, [game]);

  return progress;
}