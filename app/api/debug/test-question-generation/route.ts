import { NextRequest, NextResponse } from 'next/server';
import { getGameOrchestratorServer } from '@/lib/core/game-orchestrator-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing question generation...');
    
    // Test basic question generation
    const gameOrchestrator = getGameOrchestratorServer();
    
    const testSettings = {
      language: 'en',
      ai_personality: 'friendly',
      topic_focus: 'general'
    };
    
    console.log('🎯 Generating test questions with settings:', testSettings);
    
    const questions = await gameOrchestrator.generateQuestions(
      'classic_academia_quiz',
      'medium',
      3, // Just 3 questions for testing
      testSettings
    );
    
    console.log('✅ Test questions generated successfully:', {
      count: questions.length,
      preview: questions.map(q => ({
        question: q.question.substring(0, 50) + '...',
        optionsCount: q.options.length,
        correctAnswer: q.correct_answer
      }))
    });
    
    return NextResponse.json({
      success: true,
      message: 'Question generation test successful',
      questions,
      testSettings
    });
  } catch (error) {
    console.error('❌ Question generation test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      }
    });
  }
} 