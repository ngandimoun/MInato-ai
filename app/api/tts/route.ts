import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OpenAITtsVoice } from '@/lib/types';
import { logger } from '@/memory-framework/config';
import { appConfig } from '@/lib/config';

// Initialize OpenAI client directly for this endpoint
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default voice if not specified
const DEFAULT_VOICE = 'nova';

// Default TTS model based on config or fallback
const TTS_MODEL = appConfig?.llm?.ttsModel || 'tts-1';

/**
 * POST /api/tts
 * Simple endpoint to convert text to speech for voice samples
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { text, voice } = body;

    // Validate request
    if (!text) {
      return new NextResponse(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limit sample text length for security/performance
    const limitedText = text.substring(0, 200);
    
    // Select voice, defaulting if needed
    const selectedVoice = voice || DEFAULT_VOICE;
    
    logger.info(`[Voice Sample] Generating sample for voice: ${selectedVoice}, text length: ${limitedText.length}`);
    
    try {
      // Make direct request to OpenAI API
      const response = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice: selectedVoice as OpenAITtsVoice,
        input: limitedText,
        response_format: 'mp3',
      });
      
      if (!response.body) {
        throw new Error('OpenAI did not return audio data');
      }
      
      // Get the audio data as arrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Return the audio data as a response
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (openaiError: any) {
      logger.error('[Voice Sample] OpenAI API error:', openaiError);
      return new NextResponse(JSON.stringify({ 
        error: 'Failed to generate speech',
        details: openaiError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    logger.error('[Voice Sample] Error in TTS API:', error);
    return new NextResponse(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 