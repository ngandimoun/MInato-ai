import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGameOrchestratorServer } from '@/lib/core/game-orchestrator-server';
import { GameQuestion } from '@/lib/types/games';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
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

    // Get server-side game orchestrator
    const gameOrchestrator = getGameOrchestratorServer();

    // Generate questions using the server-side orchestrator
    const questions = await gameOrchestrator.generateQuestions(
      gameType,
      difficulty,
      rounds || 10,
      settings
    );

    // Return questions
    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate questions',
      },
      { status: 500 }
    );
  }
} 