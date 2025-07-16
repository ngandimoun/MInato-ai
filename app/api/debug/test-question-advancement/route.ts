import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SupabaseGameService } from '@/lib/services/SupabaseGameService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    const { roomId, action } = await request.json();

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

    console.log(`🧪 [TEST QUESTION ADVANCEMENT] Action: ${action} for room ${roomId} by user ${user.id}`);

    // Get current room state
    const { data: room, error: roomError } = await supabase
      .from('live_game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found'
      }, { status: 404 });
    }

    const gameService = new SupabaseGameService();
    
    if (action === 'next_question') {
      console.log(`🧪 [TEST] Current question index: ${room.current_question_index}`);
      console.log(`🧪 [TEST] Total questions: ${room.questions?.length}`);
      
      const result = await gameService.nextQuestion(roomId, user.id);
      
      return NextResponse.json({
        success: result.success,
        message: result.message,
        data: result.data,
        error: result.error,
        debug: {
          previousIndex: room.current_question_index,
          totalQuestions: room.questions?.length,
          roomStatus: room.status
        }
      });
    } else if (action === 'get_status') {
      return NextResponse.json({
        success: true,
        data: {
          roomId: room.id,
          status: room.status,
          currentQuestionIndex: room.current_question_index,
          totalQuestions: room.questions?.length,
          currentQuestion: room.current_question,
          questionsPreview: room.questions?.slice(0, 3).map((q: any, index: number) => ({
            index,
            question: q.question?.substring(0, 50) + '...',
            options: q.options?.length || 0
          }))
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "next_question" or "get_status"'
    }, { status: 400 });

  } catch (error: any) {
    console.error('🧪 [TEST QUESTION ADVANCEMENT] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Test failed'
    }, { status: 500 });
  }
} 