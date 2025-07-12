import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    });

    console.log('🧪 [TEST QUESTION GENERATION] Testing direct question generation...');

    // Test settings similar to what we see in the database
    const testSettings = {
      language: 'fr',
      ai_personality: 'friendly',
      topic_focus: 'science',
      auto_advance: true,
      show_explanations: true,
      time_per_question: 30,
      user_interests: [],
      user_news_categories: []
    };

    console.log('🎯 [TEST QUESTION GENERATION] Testing with settings:', testSettings);

    // Try to import and use the server-side orchestrator
    try {
      console.log('🔄 [TEST QUESTION GENERATION] Importing server-side orchestrator...');
      const { getGameOrchestratorServer } = await import('@/lib/core/game-orchestrator-server');
      const gameOrchestrator = getGameOrchestratorServer();
      
      console.log('✅ [TEST QUESTION GENERATION] Server orchestrator imported successfully');
      
      console.log('🎯 [TEST QUESTION GENERATION] Generating questions...');
      const questions = await gameOrchestrator.generateQuestions(
        'biology_quest',
        'medium',
        3,
        testSettings
      );
      
      console.log(`✅ [TEST QUESTION GENERATION] Generated ${questions.length} questions`);
      console.log('📋 [TEST QUESTION GENERATION] Questions preview:', questions.slice(0, 2).map(q => ({
        question: q.question.substring(0, 100) + '...',
        language: q.question.includes('Qu\'est-ce') || q.question.includes('Quelle') ? 'French detected' : 'English or other',
        optionsCount: q.options?.length || 0,
        hasExplanation: !!q.explanation
      })));

      return NextResponse.json({
        success: true,
        message: 'Question generation test successful',
        data: {
          questionsGenerated: questions.length,
          questions: questions.map(q => ({
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            category: q.category
          })),
          settings: testSettings
        }
      });

    } catch (orchestratorError) {
      console.error('❌ [TEST QUESTION GENERATION] Server orchestrator failed:', orchestratorError);
      
      return NextResponse.json({
        success: false,
        error: 'Server orchestrator failed',
        details: {
          message: orchestratorError instanceof Error ? orchestratorError.message : 'Unknown error',
          stack: orchestratorError instanceof Error ? orchestratorError.stack : undefined
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ [TEST QUESTION GENERATION] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Question generation test failed',
      details: error.stack
    }, { status: 500 });
  }
} 