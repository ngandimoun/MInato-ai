import { NextRequest, NextResponse } from 'next/server';
import { SupabaseGameService } from '@/lib/services/SupabaseGameService';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing multiplayer game question generation...');
    
    // Create a test game service
    const gameService = new SupabaseGameService();
    
    // Test settings with different preferences
    const testSettings = {
      language: 'fr', // French language
      ai_personality: 'friendly',
      topic_focus: 'science',
      auto_advance: true,
      show_explanations: true,
      time_per_question: 30,
    };
    
    // Create a mock game room for testing
    const mockGameRoom = {
      id: 'test-room-123',
      game_type_id: 'classic_academia_quiz',
      difficulty: 'medium',
      rounds: 5,
      settings: testSettings,
      topic: 'science',
      host_user_id: 'test-user',
      status: 'lobby' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      ended_at: null,
      current_question_index: 0,
      current_question: null,
      questions: [],
      max_players: 4,
      room_code: 'TEST123'
    };
    
    console.log('🎯 Testing question generation with settings:', testSettings);
    
    // Test question generation using the private method
    // We'll access it through reflection since it's private
    const questions = await (gameService as any).generateQuestions(mockGameRoom);
    
    console.log('✅ Multiplayer questions generated successfully:', {
      count: questions.length,
      expectedCount: mockGameRoom.rounds,
      language: testSettings.language,
      topic: testSettings.topic_focus,
      firstQuestion: questions[0]?.question.substring(0, 100) + '...',
      isAIGenerated: !questions[0]?.question.includes('fallback'),
      sampleQuestions: questions.slice(0, 2).map((q: any) => ({
        question: q.question.substring(0, 80) + '...',
        optionsCount: q.options.length,
        correctAnswer: q.correct_answer,
        explanation: q.explanation?.substring(0, 60) + '...',
        language: q.question.includes('Qu\'est-ce') || q.question.includes('Quelle') ? 'French' : 'English/Other'
      }))
    });
    
    // Verify that preferences are applied
    const preferencesApplied = {
      correctLanguage: questions.some((q: any) => 
        q.question.includes('Qu\'est-ce') || 
        q.question.includes('Quelle') || 
        q.question.includes('Comment') ||
        q.explanation?.includes('est') ||
        q.explanation?.includes('une')
      ),
      correctRounds: questions.length === mockGameRoom.rounds,
      hasExplanations: questions.every((q: any) => q.explanation && q.explanation.length > 0),
      topicFocus: questions.some((q: any) => 
        q.question.toLowerCase().includes('science') ||
        q.question.toLowerCase().includes('physique') ||
        q.question.toLowerCase().includes('chimie') ||
        q.question.toLowerCase().includes('biologie')
      )
    };
    
    return NextResponse.json({
      success: true,
      message: 'Multiplayer question generation test completed',
      testSettings,
      questions,
      preferencesApplied,
      summary: {
        totalQuestions: questions.length,
        expectedQuestions: mockGameRoom.rounds,
        isAIGenerated: !questions[0]?.question.includes('fallback'),
        languageCorrect: preferencesApplied.correctLanguage,
        allPreferencesApplied: Object.values(preferencesApplied).every(Boolean)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Multiplayer question generation test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Multiplayer question generation test failed',
      details: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 