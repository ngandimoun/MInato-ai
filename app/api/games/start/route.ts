import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: 'roomId is required'
      }, { status: 400 });
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    console.log(`🚀 [START GAME API] Starting game ${roomId} for user ${user.id}`);

    // Verify user is host and get room details
    const { data: room, error: roomError } = await supabase
      .from('live_game_rooms')
      .select('*')
      .eq('id', roomId)
      .eq('host_user_id', user.id)
      .single();

    if (roomError || !room) {
      console.error('❌ [START GAME API] Room not found or user is not host:', roomError);
      return NextResponse.json({
        success: false,
        error: 'Only the host can start the game'
      }, { status: 403 });
    }

    if (room.status !== 'lobby') {
      console.error(`❌ [START GAME API] Game is not in lobby state: ${room.status}`);
      return NextResponse.json({
        success: false,
        error: `Game is not in lobby state (current: ${room.status})`
      }, { status: 400 });
    }

    console.log(`🎮 [START GAME API] Room found - Status: ${room.status}, Mode: ${room.mode}`);

    // Generate questions if needed (always for multiplayer games)
    const shouldGenerateQuestions = !room.questions || 
                                   room.questions.length === 0 || 
                                   room.mode === 'multiplayer';

    console.log(`🔄 [START GAME API] Should generate questions: ${shouldGenerateQuestions}`);

    let questions = room.questions || [];

    if (shouldGenerateQuestions) {
      try {
        console.log(`🔄 [START GAME API] Generating ${room.mode === 'multiplayer' ? 'fresh' : 'new'} questions...`);
        
        // Use server-side orchestrator for question generation
        const { getGameOrchestratorServer } = await import('@/lib/core/game-orchestrator-server');
        const gameOrchestrator = getGameOrchestratorServer();
        
        questions = await gameOrchestrator.generateQuestions(
          room.game_type_id,
          room.difficulty,
          room.rounds,
          room.settings
        );
        
        console.log(`✅ [START GAME API] Generated ${questions.length} questions`);
        console.log(`📊 [START GAME API] Questions preview:`, questions.slice(0, 2).map((q: any) => ({
          question: q.question.substring(0, 80) + '...',
          language: q.question.includes('Qu\'est-ce') || q.question.includes('Quelle') ? 'French' : 'English/Other',
          optionsCount: q.options?.length || 0
        })));
        
      } catch (error) {
        console.error('❌ [START GAME API] Failed to generate questions:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to generate questions for the game'
        }, { status: 500 });
      }
    }

    // Update room with questions and start the game
    const { error: updateError } = await supabase
      .from('live_game_rooms')
      .update({
        questions,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('❌ [START GAME API] Failed to update room:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to start the game'
      }, { status: 500 });
    }

    console.log(`✅ [START GAME API] Game status updated to 'in_progress' with ${questions.length} questions`);

    // Set the first question as current
    if (questions.length > 0) {
      const currentQuestion = {
        question: questions[0].question,
        options: questions[0].options,
        time_limit: room.settings?.time_per_question || 30,
        started_at: Date.now(),
      };

      const { error: questionError } = await supabase
        .from('live_game_rooms')
        .update({
          current_question_index: 0,
          current_question: currentQuestion,
        })
        .eq('id', roomId);

      if (questionError) {
        console.error('❌ [START GAME API] Failed to set current question:', questionError);
      } else {
        console.log(`✅ [START GAME API] Current question set to index 0`);
      }

      // Reset all players' answers for the new question
      await supabase
        .from('live_game_players')
        .update({
          current_answer_index: null,
          answer_submitted_at: null,
          answer_time_taken: null,
        })
        .eq('room_id', roomId);

      console.log('📡 [START GAME API] Broadcasting GAME_STARTED event...');

      // Broadcast GAME_STARTED event to all players using the correct channel name
      const gameStartedPayload = {
        type: 'GAME_STARTED',
        room_id: roomId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        timestamp: Date.now()
      };

      await supabase
        .channel(`game_room:${room.topic}`)
        .send({
          type: 'broadcast',
          event: 'GAME_STARTED',
          payload: gameStartedPayload
        });

      console.log('📡 [START GAME API] Broadcasting NEW_QUESTION event...');

      // Broadcast NEW_QUESTION event with the first question
      const newQuestionPayload = {
        type: 'NEW_QUESTION',
        room_id: roomId,
        question_index: 0,
        question: currentQuestion,
        timestamp: Date.now()
      };

      await supabase
        .channel(`game_room:${room.topic}`)
        .send({
          type: 'broadcast',
          event: 'NEW_QUESTION',
          payload: newQuestionPayload
        });

      console.log('✅ [START GAME API] Real-time events broadcasted successfully!');
    }

    console.log(`🎉 [START GAME API] Game started successfully!`);

    return NextResponse.json({
      success: true,
      message: 'Game started successfully',
      data: {
        roomId,
        questionsGenerated: questions.length,
        gameStatus: 'in_progress',
        firstQuestion: questions[0] ? {
          question: questions[0].question,
          options: questions[0].options,
          language: questions[0].question.includes('Qu\'est-ce') || questions[0].question.includes('Quelle') ? 'French' : 'English/Other'
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ [START GAME API] Error starting game:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to start game'
    }, { status: 500 });
  }
} 