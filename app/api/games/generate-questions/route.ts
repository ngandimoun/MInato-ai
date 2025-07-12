import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGameOrchestratorServer } from '@/lib/core/game-orchestrator-server';
import { GameQuestion } from '@/lib/types/games';

export async function POST(request: NextRequest) {
  try {
    // Get user session from Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Log authentication status
    if (sessionError) {
      console.log('🔐 Session error:', sessionError.message);
    }
    
    const isAuthenticated = !!session?.user;
    const userId = session?.user?.id || 'guest';
    
    if (isAuthenticated) {
      console.log(`🎮 Generating questions for authenticated user: ${userId}`);
    } else {
      console.log('🎮 Generating questions for guest/unauthenticated user');
    }

    // Parse request body
    const body = await request.json();
    const { gameType, difficulty, rounds, settings } = body;

    // Validate required parameters
    if (!gameType || !difficulty) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🎯 Question generation request:', {
      gameType,
      difficulty,
      rounds: rounds || 10,
      settings,
      isAuthenticated,
      userId: userId.substring(0, 8) + '...'
    });

    // Get server-side game orchestrator
    const gameOrchestrator = getGameOrchestratorServer();

    // Generate questions using the server-side orchestrator
    const questions = await gameOrchestrator.generateQuestions(
      gameType,
      difficulty,
      rounds || 10,
      settings
    );

    console.log(`✅ Successfully generated ${questions.length} questions for ${gameType}`);
    
    // Log first question for debugging
    if (questions.length > 0) {
      console.log('📝 Sample question:', {
        question: questions[0].question.substring(0, 100) + '...',
        optionsCount: questions[0].options.length,
        correctAnswer: questions[0].correct_answer,
        language: questions[0].question.includes('Qu\'est-ce') ? 'French' : 'English/Other'
      });
    }

    // Return questions
    return NextResponse.json({
      success: true,
      questions,
    });

  } catch (error: any) {
    console.error('💥 Error in question generation API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate questions' },
      { status: 500 }
    );
  }
} 