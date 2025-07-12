import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const { roomId, userId } = await request.json();

    if (!roomId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'roomId and userId are required'
      }, { status: 400 });
    }

    console.log(`🧪 [TEST START GAME] Testing startGame for room ${roomId} and user ${userId}`);

    // First check if the room exists and is in lobby state
    const { data: room, error: roomError } = await supabase
      .from('live_game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('❌ [TEST START GAME] Room fetch error:', roomError);
      return NextResponse.json({
        success: false,
        error: 'Room not found',
        details: roomError.message
      }, { status: 404 });
    }

    console.log(`📋 [TEST START GAME] Room found:`, {
      id: room.id,
      status: room.status,
      host: room.host_user_id,
      mode: room.mode,
      questionsCount: room.questions?.length || 0
    });

    // Check if user is the host
    if (room.host_user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Only the host can start the game'
      }, { status: 403 });
    }

    // Check if game is in lobby state
    if (room.status !== 'lobby') {
      return NextResponse.json({
        success: false,
        error: `Game is not in lobby state (current: ${room.status})`
      }, { status: 400 });
    }

    // Simulate the startGame process step by step
    console.log(`🔄 [TEST START GAME] Simulating startGame process...`);

    // Step 1: Update game status to in_progress
    const { error: updateError } = await supabase
      .from('live_game_rooms')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (updateError) {
      console.error('❌ [TEST START GAME] Failed to update game status:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update game status',
        details: updateError.message
      }, { status: 500 });
    }

    console.log(`✅ [TEST START GAME] Game status updated to 'in_progress'`);

    // Step 2: Check if we need to generate questions
    const needsQuestions = !room.questions || room.questions.length === 0 || room.mode === 'multiplayer';
    console.log(`🔄 [TEST START GAME] Needs questions: ${needsQuestions}`);

    if (needsQuestions) {
      console.log(`⚠️ [TEST START GAME] Room needs questions but test won't generate them`);
    }

    // Step 3: Set current question (if questions exist)
    if (room.questions && room.questions.length > 0) {
      const currentQuestion = {
        question: room.questions[0].question,
        options: room.questions[0].options,
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
        console.error('❌ [TEST START GAME] Failed to set current question:', questionError);
      } else {
        console.log(`✅ [TEST START GAME] Current question set to index 0`);
      }
    }

    // Final check - get updated room state
    const { data: updatedRoom } = await supabase
      .from('live_game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    console.log(`🎉 [TEST START GAME] Test completed successfully!`);

    return NextResponse.json({
      success: true,
      message: 'Start game test completed',
      results: {
        roomId: roomId,
        originalStatus: room.status,
        newStatus: updatedRoom?.status,
        hasQuestions: !!(updatedRoom?.questions && updatedRoom.questions.length > 0),
        questionsCount: updatedRoom?.questions?.length || 0,
        hasCurrentQuestion: !!updatedRoom?.current_question,
        currentQuestionIndex: updatedRoom?.current_question_index
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST START GAME] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Start game test failed',
      details: error.stack
    }, { status: 500 });
  }
} 