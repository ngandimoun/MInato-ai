import { logger } from '@/memory-framework/config';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { Question, GameSettings } from '@/lib/services/SupabaseGameService';
import OpenAI from 'openai';
import { GameQuestion, GameType } from '@/lib/types/games';

// Singleton instance
let gameOrchestratorInstance: GameOrchestrator | null = null;

export function getGameOrchestrator(): GameOrchestrator {
  if (!gameOrchestratorInstance) {
    logger.info(`[Game Orchestrator] Initializing Game Orchestrator instance...`);
    try {
      gameOrchestratorInstance = new GameOrchestrator();
    } catch (e: any) {
      logger.error(`[Game Orchestrator] FATAL: Failed to initialize Game Orchestrator:`, e.message, e.stack);
      throw new Error(`Game Orchestrator initialization failed: ${e.message}`);
    }
  }
  return gameOrchestratorInstance;
}

export class GameOrchestrator {
  private openai: OpenAI;
  private supabase = getBrowserSupabaseClient();
  
  constructor() {
    logger.info(`[Game Orchestrator] Initializing...`);
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    logger.info(`[Game Orchestrator] Initialized successfully`);
  }
  
  /**
   * Generate questions for a game
   */
  async generateQuestions(
    gameType: string,
    difficulty: string,
    rounds: number = 10,
    settings?: Partial<GameSettings>
  ): Promise<GameQuestion[]> {
    try {
      // Get the base URL for the API call
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Call the API to generate questions with absolute URL
      const response = await fetch(`${baseUrl}/api/games/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          gameType,
          difficulty,
          rounds,
          settings,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.questions) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      // Validate and fix questions
      const validatedQuestions = data.questions.map((question: GameQuestion, index: number) => {
        // Ensure question has text
        if (!question.question || typeof question.question !== 'string') {
          question.question = `Question ${index + 1}`;
        }
        
        // Ensure options array exists and has content
        let options = Array.isArray(question.options) ? [...question.options] : [];
        
        // Fill missing options with defaults
        while (options.length < 4) {
          options.push(`Option ${String.fromCharCode(65 + options.length)}`);
        }
        
        // Ensure each option has content and trim whitespace
        options = options.map((opt, idx) => {
          const trimmed = typeof opt === 'string' ? opt.trim() : '';
          return trimmed ? trimmed : `Option ${String.fromCharCode(65 + idx)}`;
        });
        
        // Ensure exactly 4 options (not more, not less)
        if (options.length > 4) {
          options = options.slice(0, 4);
        }
        
        // Ensure correct_answer index is valid
        let correctAnswer = question.correct_answer;
        if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= options.length) {
          correctAnswer = 0;
        }
        
        return {
          ...question,
          options,
          correct_answer: correctAnswer,
        };
      });

      return validatedQuestions;
    } catch (error) {
      console.error('Error generating questions:', error);
      // Return fallback questions
      return this.generateFallbackQuestions(gameType, difficulty, rounds);
    }
  }

  /**
   * Generate fallback questions if API call fails
   */
  private generateFallbackQuestions(
    gameType: string,
    difficulty: string,
    rounds: number = 10
  ): GameQuestion[] {
    const questions: GameQuestion[] = [];
    
    // Basic question templates
    const templates = [
      {
        question: `${gameType} question about general knowledge`,
        options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
        correct_answer: 0,
      },
      {
        question: `${gameType} question about science`,
        options: ['First option', 'Second option', 'Third option', 'Fourth option'],
        correct_answer: 1,
      },
      {
        question: `${gameType} question about history`,
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correct_answer: 2,
      },
      {
        question: `${gameType} question about geography`,
        options: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
        correct_answer: 3,
      },
    ];
    
    // Generate required number of questions
    for (let i = 0; i < rounds; i++) {
      const templateIndex = i % templates.length;
      const template = templates[templateIndex];
      
      questions.push({
        question: `${template.question} (${i + 1})`,
        options: [...template.options], // Create a copy to avoid reference issues
        correct_answer: template.correct_answer,
        explanation: `This is a fallback question for ${gameType} at ${difficulty} difficulty.`,
        difficulty,
      });
    }
    
    return questions;
  }

  /**
   * Get available game types
   */
  async getGameTypes(): Promise<GameType[]> {
    try {
      const { data, error } = await this.supabase
        .from('game_types')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      return data as GameType[];
    } catch (error) {
      console.error('Error fetching game types:', error);
      return [];
    }
  }
} 