import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGameOrchestratorServer } from '@/lib/core/game-orchestrator-server';
import { GameQuestion } from '@/lib/types/games';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - allow both authenticated users and guest users
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    // For now, allow guest users to generate questions too
    // In production, you might want to add rate limiting for guests
    const isGuest = !session?.user;
    
    if (isGuest) {
      console.log('🎮 Generating questions for guest user');
    } else {
      console.log(`🎮 Generating questions for authenticated user: ${session.user.id}`);
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
      isGuest
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

    // Return questions
    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('❌ Error generating questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate questions',
      },
      { status: 500 }
    );
  }
} 