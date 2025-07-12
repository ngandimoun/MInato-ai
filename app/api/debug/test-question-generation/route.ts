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
      firstQuestion: questions[0]?.question.substring(0, 50) + '...',
      settings: testSettings
    });
    
    return NextResponse.json({
      success: true,
      message: 'Question generation test completed',
      questions: questions,
      settings: testSettings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Question generation test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Question generation test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 