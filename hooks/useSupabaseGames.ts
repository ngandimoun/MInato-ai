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
            // Add game type information
            game_type_name: gameData.game_types?.name,
            game_type_display_name: gameData.game_types?.display_name,
            game_type_icon: gameData.game_types?.icon_name,
            game_type_color: gameData.game_types?.color_theme,
          };

          console.log('🎮 Game data fetched:', {
            id: gameRoom.id,
            status: gameRoom.status,
            current_question_index: gameRoom.current_question_index,
            total_questions: gameRoom.questions?.length,
            current_question: gameRoom.current_question,
            timer_start: gameRoom.current_question?.started_at,
            game_type: gameRoom.game_type_display_name,
            difficulty: gameRoom.difficulty,
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
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error, attempting to reconnect...');
            // Retry subscription after a delay
            setTimeout(() => {
              if (mounted) {
                setupRealtimeSubscription();
              }
            }, 2000);
          } else if (status === 'TIMED_OUT') {
            console.error('⏰ Subscription timed out, retrying...');
            // Retry subscription after a delay
            setTimeout(() => {
              if (mounted) {
                setupRealtimeSubscription();
              }
            }, 1000);
          }
        });

        // Assign to the outer scope variable
        channel = newChannel;

      } catch (error) {
        console.error('❌ Failed to setup realtime subscription:', error);
        // Retry after a delay
        setTimeout(() => {
          if (mounted) {
            console.log('🔄 Retrying realtime subscription setup...');
            setupRealtimeSubscription();
          }
        }, 3000);
      }
    };

    const handleGameEvent = (payload: any) => {
      console.log('🎮 Game event received:', payload);
      
      // Handle different event types
      const eventType = payload.event || payload.payload?.event_type;
      
      switch (eventType) {
        case 'GAME_STARTED':
          console.log('🚀 Game started, refetching data...');
          
          // Optimistic update - immediately update game status
          if (mounted) {
            setGame(prevGame => {
              if (!prevGame) return null;
              
              return {
                ...prevGame,
                status: 'in_progress',
                started_at: payload.payload?.started_at || new Date().toISOString(),
              };
            });
          }
          
          // Also fetch from database for consistency
          fetchGameData();
          break;
          
        case 'PLAYER_JOINED':
          console.log('👤 Player joined lobby, updating players list...');
          
          // Optimistic update - add player immediately to UI
          const playerData = payload.payload?.player;
          if (playerData && mounted) {
            setPlayers(prevPlayers => {
              // Check if player already exists
              const existingPlayer = prevPlayers?.find(p => p.user_id === playerData.user_id);
              if (existingPlayer) {
                return prevPlayers; // Player already exists, no update needed
              }
              
              // Add new player
              const newPlayer = {
                id: `temp-${playerData.user_id}`,
                room_id: payload.payload?.room_id || '',
                user_id: playerData.user_id,
                username: playerData.username,
                avatar_url: playerData.avatar_url,
                score: 0,
                correct_answers: 0,
                is_ready: false,
                is_online: true,
                joined_at: new Date().toISOString(),
                last_seen: new Date().toISOString(),
              };
              
              return [...(prevPlayers || []), newPlayer];
            });
          }
          
          // Also fetch from database for consistency
          fetchPlayers();
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
            live_game_rooms!room_id (
              room_code,
              game_types (name, display_name, icon_name, color_theme)
            ),
            user_profiles!host_user_id (
              full_name,
              first_name,
              avatar_url
            )
          `)
          .eq('invited_user_id', user.id)
          .in('status', ['pending', 'accepted', 'declined'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching invitations:', error);
          setInvitations([]);
          setIsLoading(false);
          return;
        }

        const invitationsData = data?.map((invite: any) => {
          const hostProfile = invite.user_profiles;
          const hostName = hostProfile?.full_name || hostProfile?.first_name || 'Unknown Host';
          const hostAvatar = hostProfile?.avatar_url || '';
          const gameRoom = invite.live_game_rooms;
          const gameType = gameRoom?.game_types;

          return {
            id: invite.id,
            hostUserId: invite.host_user_id,
            hostUsername: hostName,
            hostAvatar: hostAvatar,
            gameType: gameType?.display_name || 'Unknown Game',
            gameIcon: gameType?.icon_name || '🎮',
            gameColor: gameType?.color_theme || 'blue',
            roomCode: gameRoom?.room_code || '',
            status: invite.status,
            createdAt: invite.created_at,
            expiresAt: invite.expires_at,
          };
        }) || [];

        setInvitations(invitationsData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error in fetchInvitations:', error);
        setInvitations([]);
        setIsLoading(false);
      }
    };

    fetchInvitations();

    // Set up real-time subscription for invitations
    const subscription = supabase
      .channel('game_invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `invited_user_id=eq.${user.id}`,
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, supabase]);

  return { invitations, isLoading };
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
      console.log(`🚀 [START GAME HOOK] Starting game ${roomId} via API...`);
      
      // Use the server-side API endpoint for better reliability
      const response = await fetch('/api/games/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start game');
      }

      console.log(`✅ [START GAME HOOK] Game started successfully:`, data);

      return {
        success: true,
        message: data.message,
        data: data.data
      };
    } catch (error) {
      console.error("❌ [START GAME HOOK] Error starting game:", error);
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

  const deleteGame = useCallback(async (roomId: string): Promise<GameResponse> => {
    if (!user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      return await gameService.deleteGameRoom(roomId, user.id);
    } catch (error) {
      console.error("Error deleting game:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to delete game" 
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
    deleteGame,
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

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchUserStats = async () => {
      try {
        const response = await fetch('/api/games/user-stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user stats');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setStats({
            total_games_played: data.stats.total_games_played,
            total_wins: data.stats.total_wins,
            total_score: data.stats.total_score,
            level: data.stats.level,
            xp_points: data.stats.xp_points,
            current_streak: data.stats.current_streak,
            best_streak: data.stats.best_streak,
            favorite_game_types: data.stats.favorite_game_types,
            achievements: data.stats.achievements,
          });
        } else {
          throw new Error(data.error || 'Failed to fetch user stats');
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