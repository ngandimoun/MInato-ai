import { logger } from '@/memory-framework/config';
import OpenAI from 'openai';
import { GameQuestion, GameType, GameSettings } from '@/lib/types/games';

// Singleton instance
let gameOrchestratorServerInstance: GameOrchestratorServer | null = null;

export function getGameOrchestratorServer(): GameOrchestratorServer {
  if (!gameOrchestratorServerInstance) {
    logger.info(`[Game Orchestrator Server] Initializing Game Orchestrator Server instance...`);
    try {
      gameOrchestratorServerInstance = new GameOrchestratorServer();
    } catch (e: any) {
      logger.error(`[Game Orchestrator Server] FATAL: Failed to initialize Game Orchestrator Server:`, e.message, e.stack);
      throw new Error(`Game Orchestrator Server initialization failed: ${e.message}`);
    }
  }
  return gameOrchestratorServerInstance;
}

export class GameOrchestratorServer {
  private openai: OpenAI;
  
  constructor() {
    logger.info(`[Game Orchestrator Server] Initializing...`);
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    logger.info(`[Game Orchestrator Server] Initialized successfully`);
  }
  
  /**
   * Generate questions for a game using direct OpenAI API call
   */
  async generateQuestions(
    gameType: string,
    difficulty: string,
    rounds: number = 10,
    settings?: Partial<GameSettings>
  ): Promise<GameQuestion[]> {
    try {
      const topicFocus = settings?.topic_focus || gameType;
      const language = settings?.language || 'en';
      const personality = settings?.ai_personality || 'friendly';
      
      logger.info(`[Game Orchestrator Server] Generating ${rounds} questions for ${gameType} (${difficulty}) in ${language}`);
      
      // Create prompt for OpenAI
      const prompt = `
        Generate ${rounds} multiple-choice questions for a trivia game about "${topicFocus}".
        Difficulty level: ${difficulty}
        Language: ${language}
        Personality: ${personality}
        
        IMPORTANT: Each question MUST have exactly 4 options with indices 0, 1, 2, 3.
        The correct_answer field MUST be the index (0-3) of the correct option.
        
        For each question:
        1. Write a clear, specific question
        2. Create exactly 4 distinct answer options
        3. Set correct_answer to the index (0-3) of the correct option
        4. Include a brief explanation
        
        Example for French language:
        {
          "questions": [
            {
              "question": "Qu'est-ce qu'une exoplanète?",
              "options": [
                "Une planète en dehors de notre système solaire",
                "Une étoile dans une autre galaxie", 
                "Un satellite naturel de Jupiter",
                "Un astéroïde dans la ceinture de Kuiper"
              ],
              "correct_answer": 0,
              "explanation": "Une exoplanète est une planète qui orbite autour d'une étoile autre que le Soleil, donc en dehors de notre système solaire.",
              "difficulty": "${difficulty}"
            }
          ]
        }
        
        Generate ${rounds} questions following this exact format. Make sure:
        - Each question is unique and relevant to "${topicFocus}"
        - All 4 options are plausible but only one is correct
        - The correct_answer index matches the position of the correct option
        - Questions are appropriate for ${difficulty} difficulty level
      `;
      
      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: process.env.LLM_GENERAL_MODEL || "gpt-4o-2024-08-06",
        messages: [
          { 
            role: "system", 
            content: "You are an expert quiz creator. Generate high-quality trivia questions with accurate answer indices. Always respond with valid JSON in the exact format requested."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent formatting
        max_tokens: 4000,
      });
      
      // Parse response
      const content = response.choices[0]?.message?.content || '';
      let parsedData;
      
      try {
        parsedData = JSON.parse(content);
      } catch (e) {
        logger.error(`[Game Orchestrator Server] Failed to parse OpenAI response:`, e);
        throw new Error('Failed to parse question data');
      }
      
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        logger.error(`[Game Orchestrator Server] Invalid response format:`, parsedData);
        throw new Error('Invalid question data format');
      }
      
      // Validate and fix questions
      const validatedQuestions = parsedData.questions.map((question: any, index: number) => {
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
        options = options.map((opt: any, idx: number) => {
          const trimmed = typeof opt === 'string' ? opt.trim() : '';
          return trimmed ? trimmed : `Option ${String.fromCharCode(65 + idx)}`;
        });
        
        // Ensure exactly 4 options (not more, not less)
        if (options.length > 4) {
          options = options.slice(0, 4);
        }
        
        // Validate and fix correct_answer index
        let correctAnswer = question.correct_answer;
        
        // If the AI provided a string or invalid index, try to find the right answer
        if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= options.length) {
          // For exoplanet questions, look for the most obvious correct answer
          if (question.question && question.question.toLowerCase().includes('exoplanète')) {
            const correctAnswerText = options.find((opt: string) => 
              opt.toLowerCase().includes('planète') && 
              opt.toLowerCase().includes('système solaire')
            );
            if (correctAnswerText) {
              correctAnswer = options.indexOf(correctAnswerText);
            } else {
              correctAnswer = 0; // Default fallback
            }
          } else {
            // General fallback - set to first option
            correctAnswer = 0;
          }
        }
        
        // Final validation - ensure the index is within bounds
        if (correctAnswer < 0 || correctAnswer >= options.length) {
          correctAnswer = 0;
        }
        
        const validatedQuestion = {
          question: question.question,
          options,
          correct_answer: correctAnswer,
          explanation: question.explanation || `The correct answer is: ${options[correctAnswer]}`,
          difficulty: question.difficulty || difficulty,
        };
        
        // Debug logging to verify question structure
        logger.info(`[Question ${index + 1}] Generated:`, {
          question: validatedQuestion.question.substring(0, 50) + '...',
          optionsCount: validatedQuestion.options.length,
          correctAnswer: validatedQuestion.correct_answer,
          correctOption: validatedQuestion.options[validatedQuestion.correct_answer]
        });
        
        return validatedQuestion;
      });
      
      logger.info(`[Game Orchestrator Server] Successfully generated ${validatedQuestions.length} questions`);
      return validatedQuestions;
    } catch (error) {
      logger.error(`[Game Orchestrator Server] Error generating questions:`, error);
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
    
    logger.info(`[Game Orchestrator Server] Generated ${questions.length} fallback questions for topic: ${gameType}`);
    return questions;
  }
} 