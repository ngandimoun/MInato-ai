import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SupabaseGameService } from '@/lib/services/SupabaseGameService';

export async function POST(request: NextRequest) {
  try {
    // Get user session from Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    const isAuthenticated = !!session?.user;
    const userId = session?.user?.id || 'guest';
    
    if (isAuthenticated) {
      console.log(`🔄 Regenerating questions for authenticated user: ${userId}`);
    } else {
      console.log('🔄 Regenerating questions for guest/unauthenticated user');
    }

    // Parse request body
    const body = await request.json();
    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    console.log('🎯 Regenerating questions for room:', roomId);

    // Get the game service
    const gameService = new SupabaseGameService();

    // Get the room data
    const { data: room, error: roomError } = await supabase
      .from('live_game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if user has permission (is host or admin)
    if (isAuthenticated && room.host_user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the host can regenerate questions' },
        { status: 403 }
      );
    }

    // Generate new questions
    const questions = await (gameService as any).generateQuestions(room);

    // Update room with new questions
    const { error: updateError } = await supabase
      .from('live_game_rooms')
      .update({ questions })
      .eq('id', roomId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Successfully regenerated ${questions.length} questions for room ${roomId}`);
    
    // Log first question for debugging
    if (questions.length > 0) {
      console.log('📝 Sample regenerated question:', {
        question: questions[0].question.substring(0, 100) + '...',
        optionsCount: questions[0].options.length,
        correctAnswer: questions[0].correct_answer,
        language: questions[0].question.includes('Qu\'est-ce') ? 'French' : 'English/Other'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Questions regenerated successfully',
      questionsCount: questions.length,
      roomId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('💥 Error regenerating questions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to regenerate questions' },
      { status: 500 }
    );
  }
} 