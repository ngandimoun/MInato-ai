// import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface GameRoom {
  id: string;
  room_code: string;
  topic: string;
  game_type_id: string;
  host_user_id: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  max_players: number;
  rounds: number;
  mode: 'solo' | 'multiplayer';
  status: 'lobby' | 'in_progress' | 'finished' | 'cancelled';
  current_round: number;
  current_question_index?: number;
  questions: Question[];
  current_question?: CurrentQuestion;
  settings: GameSettings;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  updated_at: string;
  // Game type information
  game_type_name?: string;
  game_type_display_name?: string;
  game_type_icon?: string;
  game_type_color?: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  score: number;
  correct_answers: number;
  is_ready: boolean;
  is_online: boolean;
  connection_id?: string;
  current_answer_index?: number;
  answer_submitted_at?: string;
  answer_time_taken?: number;
  joined_at: string;
  last_seen: string;
}

export interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  difficulty: string;
  category?: string;
}

export interface CurrentQuestion {
  question: string;
  options: string[];
  time_limit: number;
  started_at: number;
}

export interface GameSettings {
  auto_advance: boolean;
  show_explanations: boolean;
  time_per_question: number;
  language?: string;
  ai_personality?: string;
  topic_focus?: string;
  user_interests?: string[];
  user_news_categories?: string[];
}

export interface GameEvent {
  id: string;
  room_id: string;
  user_id?: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

export interface CreateGameRequest {
  game_type: string;
  difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';
  max_players: number;
  rounds: number;
  mode: 'solo' | 'multiplayer';
  settings?: Partial<GameSettings>;
}

export interface JoinGameRequest {
  room_code: string;
  user_id: string;
  username: string;
  avatar_url?: string;
}

export interface SubmitAnswerRequest {
  room_id: string;
  user_id: string;
  answer_index: number;
  time_taken: number;
}

export interface GameResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// ============================================================================
// SUPABASE REALTIME GAME SERVICE
// ============================================================================

export class SupabaseGameService {
  private supabase = getBrowserSupabaseClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceState: Map<string, RealtimePresenceState> = new Map();

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  async createGameRoom(request: CreateGameRequest, userId: string, username: string): Promise<GameResponse> {
    try {
      // Get user preferences for game personalization
      const { data: preferences } = await this.supabase
        .from('user_game_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Generate unique room code and topic
      const roomCode = await this.generateRoomCode();
      const topic = `game_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Look up game type
      const { data: gameTypes, error: gameTypeError } = await this.supabase
        .from('game_types')
        .select('id, name, display_name, category, min_players, max_players, default_rounds, difficulty_levels')
        .eq('name', request.game_type)
        .eq('is_active', true)
        .single();

      if (gameTypeError || !gameTypes) {
        console.error('Game type lookup error:', gameTypeError);
        throw new Error(`Invalid game type: ${request.game_type}. Please ensure this game type exists in the database.`);
      }

      // Enhanced settings with user preferences
      const enhancedSettings: GameSettings = {
        auto_advance: request.settings?.auto_advance ?? preferences?.auto_advance_questions ?? true,
        show_explanations: request.settings?.show_explanations ?? preferences?.show_explanations ?? true,
        time_per_question: request.settings?.time_per_question ?? preferences?.preferred_time_per_question ?? 30,
        language: request.settings?.language ?? 'en',
        ai_personality: request.settings?.ai_personality ?? preferences?.ai_personality ?? 'friendly',
        topic_focus: request.settings?.topic_focus ?? preferences?.topic_focus ?? 'general',
        user_interests: preferences?.interest_categories || [],
        user_news_categories: preferences?.news_categories || [],
      };

      // Create the game room
      const { data: room, error: roomError } = await this.supabase
        .from('live_game_rooms')
        .insert({
          room_code: roomCode,
          topic: topic,
          game_type_id: gameTypes.id,
          host_user_id: userId,
          difficulty: request.difficulty,
          max_players: request.max_players,
          rounds: request.rounds,
          mode: request.mode,
          settings: enhancedSettings,
        })
        .select()
        .single();

      if (roomError) {
        throw roomError;
      }

      // Auto-join the host as a player
      await this.joinGameRoom({
        room_code: roomCode,
        user_id: userId,
        username: username,
      });

      // For solo games, auto-start
      if (request.mode === 'solo') {
        await this.startGame(room.id, userId);
      }

      return {
        success: true,
        data: {
          room_id: room.id,
          room_code: roomCode,
          topic: topic,
          settings_applied: enhancedSettings,
          preferences_applied: !!preferences,
        },
        message: 'Game room created successfully',
      };
    } catch (error) {
      console.error('Error creating game room:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create game room',
      };
    }
  }

  async joinGameRoom(request: JoinGameRequest): Promise<GameResponse> {
    try {
      // Find the room by code
      const { data: room, error: roomError } = await this.supabase
        .from('live_game_rooms')
        .select('*')
        .eq('room_code', request.room_code)
        .eq('status', 'lobby')
        .single();

      if (roomError || !room) {
        return { success: false, error: 'Game room not found or not accepting players' };
      }

      // Check if room is full
      const { count: playerCount } = await this.supabase
        .from('live_game_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      if (playerCount && playerCount >= room.max_players) {
        return { success: false, error: 'Game room is full' };
      }

      // Check if player already in room
      const { data: existingPlayer } = await this.supabase
        .from('live_game_players')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', request.user_id)
        .single();

      if (existingPlayer) {
        return { success: true, data: { room_id: room.id }, message: 'Already in game room' };
      }

      // Add player to room
      const { error: joinError } = await this.supabase
        .from('live_game_players')
        .insert({
          room_id: room.id,
          user_id: request.user_id,
          username: request.username,
          avatar_url: request.avatar_url,
        });

      if (joinError) {
        throw joinError;
      }

      // Subscribe to room channel for realtime updates
      await this.subscribeToRoom(room.topic, request.user_id);

      return {
        success: true,
        data: { room_id: room.id, topic: room.topic },
        message: 'Successfully joined game room',
      };
    } catch (error) {
      console.error('Error joining game room:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join game room',
      };
    }
  }

  async leaveGameRoom(roomId: string, userId: string): Promise<GameResponse> {
    try {
      // Get room info
      const { data: room } = await this.supabase
        .from('live_game_rooms')
        .select('topic, host_user_id')
        .eq('id', roomId)
        .single();

      // Remove player from room
      const { error: leaveError } = await this.supabase
        .from('live_game_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (leaveError) {
        throw leaveError;
      }

      // If host left, transfer host or cancel game
      if (room?.host_user_id === userId) {
        const { data: remainingPlayers } = await this.supabase
          .from('live_game_players')
          .select('user_id')
          .eq('room_id', roomId)
          .limit(1);

        if (remainingPlayers && remainingPlayers.length > 0) {
          // Transfer host to first remaining player
          await this.supabase
            .from('live_game_rooms')
            .update({ host_user_id: remainingPlayers[0].user_id })
            .eq('id', roomId);
        } else {
          // Cancel game if no players left
          await this.supabase
            .from('live_game_rooms')
            .update({ status: 'cancelled' })
            .eq('id', roomId);
        }
      }

      // Unsubscribe from room channel
      if (room?.topic) {
        await this.unsubscribeFromRoom(room.topic);
      }

      return {
        success: true,
        message: 'Successfully left game room',
      };
    } catch (error) {
      console.error('Error leaving game room:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave game room',
      };
    }
  }

  // ============================================================================
  // GAME FLOW MANAGEMENT
  // ============================================================================

  async startGame(roomId: string, userId: string): Promise<GameResponse> {
    try {
      // Verify user is host
      const { data: room } = await this.supabase
        .from('live_game_rooms')
        .select('*')
        .eq('id', roomId)
        .eq('host_user_id', userId)
        .single();

      if (!room) {
        return { success: false, error: 'Only the host can start the game' };
      }

      if (room.status !== 'lobby') {
        return { success: false, error: 'Game is not in lobby state' };
      }

      // Generate questions if not already present
      if (!room.questions || room.questions.length === 0) {
        const questions = await this.generateQuestions(room);
        
        // Update room with questions
        await this.supabase
          .from('live_game_rooms')
          .update({ questions })
          .eq('id', roomId);
      }

      // Start the game
      const { error: startError } = await this.supabase
        .from('live_game_rooms')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', roomId);

      if (startError) {
        throw startError;
      }

      // Set first question
      await this.setCurrentQuestion(roomId, 0);

      // Broadcast game start event
      await this.broadcastGameEvent(roomId, 'GAME_STARTED', {
        message: 'Game has started!',
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: 'Game started successfully',
      };
    } catch (error) {
      console.error('Error starting game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start game',
      };
    }
  }

  async submitAnswer(request: SubmitAnswerRequest): Promise<GameResponse> {
    try {
      // Get current question info
      const { data: room } = await this.supabase
        .from('live_game_rooms')
        .select('*')
        .eq('id', request.room_id)
        .single();

      if (!room || !room.current_question) {
        return { success: false, error: 'No active question' };
      }

      // Update player's answer
      const { error: updateError } = await this.supabase
        .from('live_game_players')
        .update({
          current_answer_index: request.answer_index,
          answer_submitted_at: new Date().toISOString(),
          answer_time_taken: request.time_taken,
        })
        .eq('room_id', request.room_id)
        .eq('user_id', request.user_id);

      if (updateError) {
        throw updateError;
      }

      // Check if answer is correct and update score
      const currentQuestion = room.questions[room.current_question_index || 0];
      
      // Debug logging to identify the issue
      console.log('🔍 Answer validation debug:', {
        questionIndex: room.current_question_index || 0,
        submittedAnswer: request.answer_index,
        correctAnswer: currentQuestion.correct_answer,
        questionText: currentQuestion.question,
        options: currentQuestion.options,
        explanation: currentQuestion.explanation
      });
      
      const isCorrect = request.answer_index === currentQuestion.correct_answer;
      
      let points = 0;
      if (isCorrect) {
        // Calculate points based on time taken
        const basePoints = 100;
        const timeBonus = Math.max(0, Math.floor((room.settings.time_per_question * 1000 - request.time_taken) / 100));
        points = basePoints + timeBonus;

        // Update player score - get current score first, then update
        console.log(`💰 Adding ${points} points to player ${request.user_id}`);
        
        const { data: currentPlayer } = await this.supabase
          .from('live_game_players')
          .select('score, correct_answers')
          .eq('room_id', request.room_id)
          .eq('user_id', request.user_id)
          .single();

        if (currentPlayer) {
          const newScore = (currentPlayer.score || 0) + points;
          const newCorrectAnswers = (currentPlayer.correct_answers || 0) + 1;
          
          await this.supabase
            .from('live_game_players')
            .update({
              score: newScore,
              correct_answers: newCorrectAnswers
            })
            .eq('room_id', request.room_id)
            .eq('user_id', request.user_id);
            
          console.log(`✅ Player score updated: ${currentPlayer.score || 0} + ${points} = ${newScore} points`);
        }
      }

      // Broadcast answer submission
      await this.broadcastGameEvent(request.room_id, 'ANSWER_SUBMITTED', {
        user_id: request.user_id,
        is_correct: isCorrect,
        answer_index: request.answer_index,
        time_taken: request.time_taken,
      });

      // Auto-advance logic is now handled in the frontend for better UX control
      // The frontend will call nextQuestion after showing results for solo games

      console.log(`✅ Answer processed: ${isCorrect ? 'CORRECT' : 'INCORRECT'} (+${points} pts)`);

      return {
        success: true,
        data: {
          is_correct: isCorrect,
          correct_answer: currentQuestion.correct_answer,
          explanation: currentQuestion.explanation,
          pointsEarned: isCorrect ? points : 0,
        },
        message: isCorrect ? 'Correct answer!' : 'Incorrect answer',
      };
    } catch (error) {
      console.error('Error submitting answer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit answer',
      };
    }
  }

  async nextQuestion(roomId: string, userId: string): Promise<GameResponse> {
    try {
      console.log(`🔄 NextQuestion called for room ${roomId} by user ${userId}`);
      
      // Get current room state
      const { data: room } = await this.supabase
        .from('live_game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!room) {
        console.error('❌ Room not found for nextQuestion');
        return { success: false, error: 'Room not found' };
      }

      const currentIndex = room.current_question_index || 0;
      const nextQuestionIndex = currentIndex + 1;
      
      console.log(`📊 Question progression: ${currentIndex} → ${nextQuestionIndex} (total: ${room.questions?.length})`);

      // Check if game is finished
      if (nextQuestionIndex >= room.questions.length) {
        console.log('🏁 Game finished, calling finishGame');
        return await this.finishGame(roomId);
      }

      // Set next question
      console.log(`⏭️ Setting question ${nextQuestionIndex}`);
      await this.setCurrentQuestion(roomId, nextQuestionIndex);

      console.log('✅ NextQuestion completed successfully');
      return {
        success: true,
        message: 'Advanced to next question',
        data: { new_question_index: nextQuestionIndex }
      };
    } catch (error) {
      console.error('❌ Error advancing to next question:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to advance question',
      };
    }
  }

  async skipQuestion(roomId: string, userId: string): Promise<GameResponse> {
    try {
      // Update player to show they skipped
      await this.supabase
        .from('live_game_players')
        .update({
          current_answer_index: -1, // -1 indicates skipped
          answer_submitted_at: new Date().toISOString(),
          answer_time_taken: 0,
        })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      // Broadcast skip event
      await this.broadcastGameEvent(roomId, 'QUESTION_SKIPPED', {
        user_id: userId,
        timestamp: Date.now(),
      });

      // For solo games, auto-advance
      const { data: room } = await this.supabase
        .from('live_game_rooms')
        .select('mode, settings')
        .eq('id', roomId)
        .single();

      if (room?.mode === 'solo') {
        setTimeout(() => {
          this.nextQuestion(roomId, userId);
        }, 1000);
      }

      return {
        success: true,
        message: 'Question skipped',
      };
    } catch (error) {
      console.error('Error skipping question:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to skip question',
      };
    }
  }

  // ============================================================================
  // REALTIME SUBSCRIPTION MANAGEMENT
  // ============================================================================

  async subscribeToRoom(topic: string, userId: string): Promise<RealtimeChannel> {
    const channel = this.supabase
      .channel(`game_room:${topic}`, {
        config: { private: true },
      })
      .on('broadcast', { event: '*' }, (payload: any) => {
        this.handleBroadcastEvent(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        this.presenceState.set(topic, state);
        this.handlePresenceSync(topic, state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        this.handlePresenceJoin(topic, key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        this.handlePresenceLeave(topic, key, leftPresences);
      })
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'live_game_rooms', filter: `topic=eq.${topic}` },
        (payload: any) => this.handleRoomChange(payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_game_players' },
        (payload: any) => this.handlePlayerChange(payload)
      );

    // Subscribe first, then track presence
    await channel.subscribe();
    
    // Wait a bit to ensure subscription is established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Track user presence after subscription is established
    await channel.track({
      user_id: userId,
      online_at: new Date().toISOString(),
    });

    this.channels.set(topic, channel);
    return channel;
  }

  async unsubscribeFromRoom(topic: string): Promise<void> {
    const channel = this.channels.get(topic);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(topic);
      this.presenceState.delete(topic);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async generateRoomCode(): Promise<string> {
    // Call the database function to generate a unique room code
    const { data, error } = await this.supabase.rpc('generate_room_code');
    
    if (error) {
      // Fallback to client-side generation
      return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    return data;
  }

  private async generateQuestions(room: GameRoom): Promise<Question[]> {
    try {
      const topicFocus = room.settings?.topic_focus || room.topic || room.game_type_id;
      
      console.log(`🎯 Generating questions for topic: ${topicFocus}`);
      
      // Check if we're running on the server (no window object)
      if (typeof window === 'undefined') {
        // Server-side: Use the GameOrchestratorServer directly
        const { getGameOrchestratorServer } = await import('@/lib/core/game-orchestrator-server');
        const gameOrchestrator = getGameOrchestratorServer();
        
        const questions = await gameOrchestrator.generateQuestions(
          room.game_type_id,
          room.difficulty,
          room.rounds,
          room.settings
        );
        
        console.log(`✅ Generated ${questions.length} questions using server orchestrator`);
        return questions;
      } else {
        // Client-side: Use the regular GameOrchestrator with API calls
        const { getGameOrchestrator } = await import('@/lib/core/game-orchestrator');
        const gameOrchestrator = getGameOrchestrator();
        
        const questions = await gameOrchestrator.generateQuestions(
          room.game_type_id,
          room.difficulty,
          room.rounds,
          room.settings
        );
        
        console.log(`✅ Generated ${questions.length} questions using client orchestrator`);
        return questions;
      }
    } catch (error) {
      console.error('💥 Failed to generate questions:', error);
      console.log('🔄 Using fallback questions instead...');
      
      // Generate fallback questions
      return this.generateFallbackQuestions(room);
    }
  }

  private generateFallbackQuestions(room: GameRoom): Question[] {
    // Enhanced fallback questions with mobile-friendly design and better variety
    const topicFocus = room.settings.topic_focus || 'general';
    const difficulty = room.difficulty;
    
    // Different question sets based on topic focus for better engagement
    const fallbackSets: Record<string, Question[]> = {
      'ai_improv': [
        {
          question: "In workplace communication, what's the most effective response to constructive criticism?",
          options: ["Defend immediately", "Listen and reflect", "Ignore it", "Change the subject"],
          correct_answer: 1,
          explanation: "Active listening and reflection show professionalism and growth mindset. 🌟",
          difficulty,
          category: "communication"
        },
        {
          question: "During team improvisation, the golden rule is to always say:",
          options: ["No, but...", "Yes, and...", "Maybe if...", "I disagree..."],
          correct_answer: 1,
          explanation: "Yes, and... builds on ideas collaboratively and keeps creativity flowing! 🎭",
          difficulty,
          category: "improvisation"
        },
        {
          question: "When presenting ideas to a difficult client, you should:",
          options: ["Rush through points", "Use empathy first", "Be defensive", "Speak louder"],
          correct_answer: 1,
          explanation: "Empathy creates connection and understanding before solutions. 💡",
          difficulty,
          category: "client_relations"
        }
      ],
      'code_breaker': [
        {
          question: "Which programming principle helps make code more maintainable?",
          options: ["Write long functions", "Use DRY principle", "Avoid comments", "Hardcode values"],
          correct_answer: 1,
          explanation: "DRY (Don't Repeat Yourself) reduces redundancy and makes code easier to maintain! 💻",
          difficulty,
          category: "programming"
        },
        {
          question: "In debugging, what's the first step you should take?",
          options: ["Rewrite everything", "Understand the problem", "Ask for help", "Delete code"],
          correct_answer: 1,
          explanation: "Understanding the problem is crucial before attempting any solution. 🔍",
          difficulty,
          category: "debugging"
        }
      ],
      'general': [
        {
          question: "What percentage of communication is typically non-verbal?",
          options: ["25%", "45%", "55%", "75%"],
          correct_answer: 2,
          explanation: "About 55% of communication is body language and non-verbal cues! 👥",
          difficulty,
          category: "communication"
        },
        {
          question: "Which learning technique is most effective for retention?",
          options: ["Re-reading", "Highlighting", "Active recall", "Passive listening"],
          correct_answer: 2,
          explanation: "Active recall strengthens memory by forcing your brain to retrieve information. 🧠",
          difficulty,
          category: "learning"
        }
      ]
    };
    
    // Get relevant question set or fallback to general
    const questionSet = fallbackSets[topicFocus] || fallbackSets['general'];
    const questions: Question[] = [];
    
    // Fill up to requested rounds, cycling through available questions
    for (let i = 0; i < room.rounds; i++) {
      let question: Question;
      
      if (i < questionSet.length) {
        question = { ...questionSet[i] };
      } else {
        // Generate additional questions if needed
        const cycleIndex = i % questionSet.length;
        const baseQuestion = questionSet[cycleIndex];
        question = {
          ...baseQuestion,
          question: `${baseQuestion.question} (Round ${Math.floor(i / questionSet.length) + 1})`,
        };
      }
      
      // Validate question options
      if (!question.options || !Array.isArray(question.options) || question.options.length < 4) {
        // Ensure we have at least 4 options
        question.options = question.options || [];
        while (question.options.length < 4) {
          question.options.push(`Option ${question.options.length + 1}`);
        }
      }
      
      // Ensure each option has content
      question.options = question.options.map((opt: string, index: number) => 
        opt && opt.trim() ? opt.trim() : `Option ${String.fromCharCode(65 + index)}`
      );
      
      // Ensure correct answer index is valid
      if (typeof question.correct_answer !== 'number' || 
          question.correct_answer < 0 || 
          question.correct_answer >= question.options.length) {
        question.correct_answer = 0;
      }
      
      questions.push(question);
    }
    
    console.log(`🎯 Generated ${questions.length} fallback questions for topic: ${topicFocus}`);
    return questions;
  }

  private async setCurrentQuestion(roomId: string, questionIndex: number): Promise<void> {
    const { data: room } = await this.supabase
      .from('live_game_rooms')
      .select('questions, settings')
      .eq('id', roomId)
      .single();

    if (!room || !room.questions[questionIndex]) {
      return;
    }

    const question = room.questions[questionIndex];
    
    // Ensure the question has valid options
    let validOptions = [...(question.options || [])];
    
    // Ensure options array exists and has content
    if (!validOptions || !Array.isArray(validOptions) || validOptions.length < 4) {
      // Create new options array if needed
      validOptions = validOptions || [];
      
      // Fill missing options with defaults
      while (validOptions.length < 4) {
        validOptions.push(`Option ${String.fromCharCode(65 + validOptions.length)}`);
      }
    }
    
    // Ensure each option has content and trim whitespace
    validOptions = validOptions.map((opt: string, index: number) => {
      const trimmed = typeof opt === 'string' ? opt.trim() : '';
      return trimmed ? trimmed : `Option ${String.fromCharCode(65 + index)}`;
    });
    
    // Ensure exactly 4 options (not more, not less)
    if (validOptions.length > 4) {
      validOptions = validOptions.slice(0, 4);
    }
    
    // Ensure correct_answer index is valid
    if (typeof question.correct_answer !== 'number' || 
        question.correct_answer < 0 || 
        question.correct_answer >= validOptions.length) {
      question.correct_answer = 0;
    }
    
    const currentQuestion: CurrentQuestion = {
      question: question.question || `Question ${questionIndex + 1}`,
      options: validOptions,
      time_limit: room.settings.time_per_question,
      started_at: Date.now(),
    };

    await this.supabase
      .from('live_game_rooms')
      .update({
        current_question_index: questionIndex,
        current_question: currentQuestion,
      })
      .eq('id', roomId);

    // Reset all players' answers for new question
    await this.supabase
      .from('live_game_players')
      .update({
        current_answer_index: null,
        answer_submitted_at: null,
        answer_time_taken: null,
      })
      .eq('room_id', roomId);

    console.log(`📡 Broadcasting NEW_QUESTION event for question ${questionIndex}`);
    
    // Broadcast new question
    await this.broadcastGameEvent(roomId, 'NEW_QUESTION', {
      question_index: questionIndex,
      question: currentQuestion,
      timestamp: Date.now(),
    });
    
    console.log(`✅ NEW_QUESTION event broadcasted for question ${questionIndex}`);
  }

  private async finishGame(roomId: string): Promise<GameResponse> {
    try {
      // Get final scores
      const { data: players } = await this.supabase
        .from('live_game_players')
        .select('*')
        .eq('room_id', roomId)
        .order('score', { ascending: false });

      // Determine winner
      const winner = players?.[0];

      // Update room status
      await this.supabase
        .from('live_game_rooms')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('id', roomId);

      // Broadcast game finished
      await this.broadcastGameEvent(roomId, 'GAME_FINISHED', {
        final_scores: players,
        winner: winner,
        timestamp: Date.now(),
      });

      return {
        success: true,
        data: {
          final_scores: players,
          winner: winner,
        },
        message: 'Game finished successfully',
      };
    } catch (error) {
      console.error('Error finishing game:', error);
      return {
        success: false,
        error: 'Failed to finish game',
      };
    }
  }

  private async broadcastGameEvent(roomId: string, eventType: string, eventData: any): Promise<void> {
    try {
      console.log(`📡 Broadcasting event: ${eventType} for room ${roomId}`);
      
      // Get room topic for direct channel broadcast
      const { data: room } = await this.supabase
        .from('live_game_rooms')
        .select('topic')
        .eq('id', roomId)
        .single();

      if (!room?.topic) {
        console.error('❌ Room not found for broadcasting');
        return;
      }

      // Direct channel broadcast (more reliable than game_events table)
      const channel = this.channels.get(room.topic);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: eventType,
          payload: {
            room_id: roomId,
            event_type: eventType,
            event_data: eventData,
            timestamp: Date.now(),
          }
        });
        console.log(`✅ Event ${eventType} broadcasted successfully`);
      } else {
        console.warn(`⚠️ No active channel found for topic: ${room.topic}`);
      }

      // Also insert to game_events table as backup
      await this.supabase
        .from('game_events')
        .insert({
          room_id: roomId,
          event_type: eventType,
          event_data: eventData,
        });
    } catch (error) {
      console.error('❌ Failed to broadcast event:', error);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleBroadcastEvent(payload: { event: string; payload: Record<string, unknown> }): void {
    // Handle broadcast events from channel
    // This can be extended to emit events to subscribers
  }

  private handlePresenceSync(topic: string, state: RealtimePresenceState): void {
    // Handle presence sync events
  }

  private handlePresenceJoin(topic: string, key: string, newPresences: Array<{ user_id: string; online_at: string }>): void {
    // Handle presence join events
  }

  private handlePresenceLeave(topic: string, key: string, leftPresences: Array<{ user_id: string; online_at: string }>): void {
    // Handle presence leave events
  }

  private handleRoomChange(payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }): void {
    // Handle room changes from Postgres
  }

  private handlePlayerChange(payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }): void {
    // Handle player changes from Postgres
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
}

// Export singleton instance
export const gameService = new SupabaseGameService();
