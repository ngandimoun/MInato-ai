import { NextRequest, NextResponse } from 'next/server';
import { SupabaseGameService } from '@/lib/services/SupabaseGameService';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing multiplayer game start flow...');
    
    const supabase = await createServerSupabaseClient();
    const gameService = new SupabaseGameService(supabase);
    
    // Create a test multiplayer game room
    const testGameRequest = {
      game_type: 'classic_academia_quiz',
      difficulty: 'medium' as const,
      max_players: 4,
      rounds: 3,
      mode: 'multiplayer' as const,
      settings: {
        language: 'fr',
        ai_personality: 'friendly',
        topic_focus: 'science',
        auto_advance: true,
        show_explanations: true,
        time_per_question: 30,
        user_interests: [],
        user_news_categories: []
      }
    };
    
    console.log('🎯 Creating test multiplayer game room...');
    const createResult = await gameService.createGameRoom(testGameRequest, 'test-user-123', 'Test User');
    
    if (!createResult.success) {
      throw new Error(`Failed to create game room: ${createResult.error}`);
    }
    
    const roomId = createResult.data?.room_id;
    if (!roomId) {
      throw new Error('No room ID returned from game creation');
    }
    
    console.log(`✅ Game room created successfully: ${roomId}`);
    
    // Now try to start the game
    console.log('🚀 Starting the multiplayer game...');
    const startResult = await gameService.startGame(roomId, 'test-user-123');
    
    if (!startResult.success) {
      throw new Error(`Failed to start game: ${startResult.error}`);
    }
    
    console.log('✅ Game started successfully!');
    
    // Check if questions were generated
    const { data: room } = await supabase
      .from('live_game_rooms')
      .select('questions, current_question, status')
      .eq('id', roomId)
      .single();
    
    if (!room) {
      throw new Error('Room not found after starting game');
    }
    
    const questionsGenerated = room.questions && Array.isArray(room.questions) && room.questions.length > 0;
    const firstQuestion = questionsGenerated ? room.questions[0] : null;
    
    console.log('🔍 Game room status after start:', {
      status: room.status,
      questionsCount: room.questions?.length || 0,
      hasCurrentQuestion: !!room.current_question,
      firstQuestionPreview: firstQuestion ? {
        question: firstQuestion.question?.substring(0, 100) + '...',
        language: firstQuestion.question?.includes('Qu\'est-ce') ? 'French' : 'English/Other',
        optionsCount: firstQuestion.options?.length || 0
      } : null
    });
    
    // Clean up the test game
    await supabase
      .from('live_game_rooms')
      .delete()
      .eq('id', roomId);
    
    return NextResponse.json({
      success: true,
      message: 'Multiplayer game start test completed',
      testResults: {
        gameCreated: createResult.success,
        gameStarted: startResult.success,
        questionsGenerated,
        questionsCount: room.questions?.length || 0,
        gameStatus: room.status,
        hasCurrentQuestion: !!room.current_question,
        firstQuestionLanguage: firstQuestion?.question?.includes('Qu\'est-ce') ? 'French' : 'English/Other',
        roomId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Multiplayer game start test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Multiplayer game start test failed',
      details: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 