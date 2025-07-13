import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { TTSService } from '@/lib/providers/tts_service';
import { OpenAITtsVoice } from '@/lib/types';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { checkFFmpegAvailability, createUserFriendlyError } from '@/lib/utils/ffmpeg-helper';
import { alternativeVideoService } from '@/lib/services/AlternativeVideoService';

// Enhanced FFmpeg configuration for Windows compatibility
async function configureFfmpeg(): Promise<boolean> {
  try {
    // First, check what FFmpeg paths are available
    const ffmpegConfig = await checkFFmpegAvailability();
    
    if (!ffmpegConfig.isAvailable) {
      logger.error('[FFmpeg Config] No FFmpeg installation found');
      if (ffmpegConfig.installGuide) {
        logger.error('[FFmpeg Config] Installation guide:', ffmpegConfig.installGuide);
      }
      return false;
    }

    // Always set the FFmpeg path explicitly
    if (ffmpegConfig.path) {
      logger.info(`[FFmpeg Config] Setting FFmpeg path to: ${ffmpegConfig.path}`);
      ffmpeg.setFfmpegPath(ffmpegConfig.path);
      
      // Also set ffprobe path if we have a specific FFmpeg path
      if (ffmpegConfig.path !== 'ffmpeg') {
        const ffprobePath = ffmpegConfig.path.replace('ffmpeg.exe', 'ffprobe.exe').replace('ffmpeg', 'ffprobe');
        try {
          await fs.access(ffprobePath);
          ffmpeg.setFfprobePath(ffprobePath);
          logger.info(`[FFmpeg Config] Setting FFprobe path to: ${ffprobePath}`);
        } catch {
          logger.warn(`[FFmpeg Config] FFprobe not found at: ${ffprobePath}, using system PATH`);
        }
      }
    }

    // Test if FFmpeg is accessible with a timeout
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        logger.error('[FFmpeg Config] FFmpeg test timed out');
        resolve(false);
      }, 10000); // 10 second timeout

      try {
        ffmpeg.getAvailableFormats((err) => {
          clearTimeout(timeout);
          if (err) {
            logger.error('[FFmpeg Config] FFmpeg test failed:', err.message);
            resolve(false);
          } else {
            logger.info('[FFmpeg Config] FFmpeg verified successfully');
            resolve(true);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        logger.error('[FFmpeg Config] FFmpeg test threw error:', error);
        resolve(false);
      }
    });
  } catch (error) {
    logger.error('[FFmpeg Config] Error configuring FFmpeg:', error);
    return false;
  }
}

// Initialize FFmpeg configuration
let ffmpegConfigured = false;

// Helper function to ensure FFmpeg is configured
async function ensureFfmpegConfigured(): Promise<void> {
  if (ffmpegConfigured) return;
  
  try {
    const configSuccess = await configureFfmpeg();
    
    if (!configSuccess) {
      throw new Error('FFmpeg configuration failed. Please ensure FFmpeg is properly installed and accessible.');
    }
    
    ffmpegConfigured = true;
    logger.info('[FFmpeg Config] FFmpeg configuration completed successfully');
  } catch (error) {
    logger.error('[FFmpeg Config] Failed to configure FFmpeg:', error);
    throw new Error(`FFmpeg is not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface CreateVideoRequest {
  media?: File;
  mediaUrl?: string;
  text?: string;
  voice?: OpenAITtsVoice;
  language?: string;
  duration?: string;
}

// Helper function to get video dimensions
async function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (videoStream) {
        resolve({
          width: videoStream.width || 1280,
          height: videoStream.height || 720
        });
      } else {
        resolve({ width: 1280, height: 720 });
      }
    });
  });
}

// Helper function to get audio duration
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        logger.error('[Audio Duration] Error getting audio duration:', err);
        reject(err);
        return;
      }
      const duration = metadata.format.duration || 0;
      logger.info(`[Audio Duration] Audio file duration: ${duration} seconds`);
      resolve(duration);
    });
  });
}

// Helper function to get video duration
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        logger.error('[Video Duration] Error getting video duration:', err);
        reject(err);
        return;
      }
      const duration = metadata.format.duration || 0;
      logger.info(`[Video Duration] Video file duration: ${duration} seconds`);
      resolve(duration);
    });
  });
}

// Helper function to create video from single image
async function createVideoFromImage(
  imagePath: string,
  outputPath: string,
  audioDuration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(imagePath)
      .outputOptions([
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-t', audioDuration.toString(),
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
        '-movflags', '+faststart',
        '-preset', 'medium',
        '-crf', '23'
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        logger.info('[Video Creation] FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        logger.debug(`[Video Creation] Processing: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        logger.info('[Video Creation] Video from image created successfully');
        resolve();
      })
      .on('error', (err) => {
        logger.error('[Video Creation] Error creating video from image:', err);
        reject(new Error(`FFmpeg error: ${err.message}. Ensure FFmpeg is properly installed.`));
      });

    // Add timeout to prevent hanging
    setTimeout(() => {
      command.kill('SIGKILL');
      reject(new Error('Video creation timed out after 2 minutes'));
    }, 120000);

    command.run();
  });
}

// Helper function to process single video
async function processVideo(
  videoPath: string,
  outputPath: string,
  targetDuration?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath);
    
    const outputOptions = [
      '-c:v', 'libx264',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-r', '30',
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
      '-movflags', '+faststart',
      '-preset', 'medium',
      '-crf', '23'
    ];

    if (targetDuration) {
      outputOptions.push('-t', targetDuration.toString());
    }

    command
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('end', () => {
        logger.info('[Video Creation] Video processed successfully');
        resolve();
      })
      .on('error', (err) => {
        logger.error('[Video Creation] Error processing video:', err);
        reject(err);
      })
      .run();
  });
}

// Helper function to create video with black background (text-only)
async function createTextOnlyVideo(
  outputPath: string,
  audioDuration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(`color=black:size=1280x720:duration=${audioDuration}:rate=30`)
      .inputFormat('lavfi')
      .outputOptions([
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-preset', 'medium',
        '-crf', '23'
      ])
      .output(outputPath)
      .on('end', () => {
        logger.info('[Video Creation] Text-only video created successfully');
        resolve();
      })
      .on('error', (err) => {
        logger.error('[Video Creation] Error creating text-only video:', err);
        reject(err);
      })
      .run();
  });
}

// Helper function to add audio to video
async function addAudioToVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get actual audio duration
      const audioDuration = await getAudioDuration(audioPath);
      logger.info(`[Video Creation] Syncing video to audio duration: ${audioDuration} seconds`);
      
      ffmpeg()
        .addInput(videoPath)
        .addInput(audioPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-map', '0:v:0',
          '-map', '1:a:0',
          // Use audio stream as the reference for duration instead of -shortest
          '-t', audioDuration.toString(),
          '-movflags', '+faststart',
          '-preset', 'medium',
          '-crf', '23'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info('[Video Creation] FFmpeg command for audio sync:', commandLine);
        })
        .on('end', () => {
          logger.info('[Video Creation] Audio added to video successfully');
          
          // Add debug info about the final video
          logger.debug(`[Video Creation] Final video created at: ${outputPath}`);
          
          // Check if file exists and get size
          fs.stat(outputPath).then(stats => {
            logger.debug(`[Video Creation] Final video size: ${Math.round(stats.size / 1024)} KB`);
          }).catch(err => {
            logger.warn('[Video Creation] Could not get final video stats:', err.message);
          });
          
          resolve();
        })
        .on('error', (err) => {
          logger.error('[Video Creation] Error adding audio to video:', err);
          reject(err);
        })
        .run();
    } catch (error) {
      logger.error('[Video Creation] Error in audio sync setup:', error);
      reject(error);
    }
  });
}

// Helper function to download image from URL
async function downloadImageFromUrl(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

export async function POST(request: NextRequest) {
  const logPrefix = '[API Video Create]';
  const tempDir = path.join(os.tmpdir(), `video-create-${uuidv4()}`);
  
  try {
    // Always use alternative video service - skip FFmpeg checks
    const useAlternativeVideoService = true;
    logger.info(`${logPrefix} Using alternative video service by default`);
    
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Check authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error(`${logPrefix} Authentication failed`, { authError });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info(`${logPrefix} Processing video creation request for user: ${user.id.substring(0, 8)}`);

    // Parse form data
    const formData = await request.formData();
    
    const mediaFile = formData.get('media') as File | null;
    const mediaUrl = formData.get('mediaUrl') as string | null;
    const text = formData.get('text') as string | null;
    const voice = (formData.get('voice') as OpenAITtsVoice) || 'alloy';
    const language = formData.get('language') as string || 'en';
    const duration = parseInt(formData.get('duration') as string || '5');

    logger.info(`${logPrefix} Request parameters`, {
      hasMediaFile: !!mediaFile,
      hasMediaUrl: !!mediaUrl,
      hasText: !!text,
      voice,
      language,
      duration
    });

    // Validate input
    if (!mediaFile && !mediaUrl && !text?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Either media or text must be provided'
      }, { status: 400 });
    }

    const ttsService = new TTSService();
    let audioPath: string | null = null;

    // Generate TTS audio if text is provided
    let actualAudioDuration = duration; // Start with estimated duration
    if (text?.trim()) {
      logger.info(`${logPrefix} Generating TTS audio in ${language}`);
      
      const audioResult = await ttsService.generateAndStoreSpeech(
        text,
        user.id,
        voice,
        null, // No special instructions
        'mp3',
        1.0 // Normal speed
      );

      if (audioResult.error || !audioResult.url) {
        throw new Error(`TTS generation failed: ${audioResult.error}`);
      }

      // Download the audio file
      audioPath = path.join(tempDir, 'audio.mp3');
      const audioResponse = await fetch(audioResult.url);
      const audioBuffer = await audioResponse.arrayBuffer();
      await fs.writeFile(audioPath, Buffer.from(audioBuffer));
      
      // For alternative service, we'll just use the specified duration
      actualAudioDuration = duration;
      logger.info(`${logPrefix} TTS audio generated. Using specified duration: ${actualAudioDuration}s`);
    }

    // Generate frame sequence with alternative service
    logger.info(`${logPrefix} Using alternative video service (no FFmpeg)`);
    
    // Use alternative video service for frame sequence generation
    const frames = [];
    
    if (mediaFile || mediaUrl) {
      let mediaPath: string;
      const frame: any = {};
      
      if (mediaFile) {
        const fileExtension = mediaFile.name.split('.').pop()?.toLowerCase() || '';
        mediaPath = path.join(tempDir, `media.${fileExtension}`);
        const mediaBuffer = await mediaFile.arrayBuffer();
        await fs.writeFile(mediaPath, Buffer.from(mediaBuffer));
        frame.imagePath = mediaPath;
      } else if (mediaUrl) {
        frame.imageUrl = mediaUrl;
      }
      
      if (text?.trim()) {
        frame.text = text;
      }
      
      // Create multiple frames for the actual audio duration
      const framesNeeded = Math.ceil(actualAudioDuration * 30); // 30 FPS
      for (let i = 0; i < Math.min(framesNeeded, 150); i++) { // Limit to 150 frames
        frames.push({ ...frame });
      }
    } else if (text?.trim()) {
      // Text-only frames
      const framesNeeded = Math.ceil(actualAudioDuration * 30);
      for (let i = 0; i < Math.min(framesNeeded, 150); i++) {
        frames.push({ text: text });
      }
    }
    
    // Generate frame sequence
    const metadataPath = await alternativeVideoService.createVideoFromImages(frames, {
      width: 1280,
      height: 720,
      duration: actualAudioDuration,
      frameRate: 30,
      format: 'webm'
    });
    
    // Create conversion instructions
    const instructionsPath = await alternativeVideoService.convertFramesToVideo(metadataPath);
    
    // Return frame sequence information
    logger.info(`${logPrefix} Frame sequence created. See instructions: ${instructionsPath}`);
    
    // Store record in database
    const { data: insertedRecord, error: dbError } = await supabase
      .from('created-videos')
      .insert({
        user_id: user.id,
        filename: `frame_sequence_${Date.now()}.webm`,
        video_url: instructionsPath || null,
        original_text: text || null,
        voice_character: voice,
        audio_duration: actualAudioDuration,
        duration_seconds: actualAudioDuration,
        status: 'frame_sequence',
        media_files_count: (mediaFile || mediaUrl) ? 1 : 0,
        metadata: {
          frameSequence: true,
          metadataPath,
          instructionsPath,
        }
      })
      .select()
      .single();

    if (dbError) {
      logger.error(`${logPrefix} Database insert failed`, { 
        dbError: {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        }
      });
      // Don't fail the request, just log the error
      logger.warn(`${logPrefix} Frame sequence created but not saved to database`);
    } else {
      logger.info(`${logPrefix} Frame sequence record saved to database successfully`, {
        recordId: insertedRecord?.id,
        userId: user.id
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Video frames created successfully!',
      metadataPath: metadataPath,
      instructionsPath: instructionsPath,
      alternativeService: true,
      record: insertedRecord || null
    });
    
  } catch (error) {
    logger.error(`${logPrefix} Error creating video:`, error);
    
    // Send error response
    const errorMessage = error instanceof Error ? error.message : 'Failed to create video';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      logger.debug(`${logPrefix} Cleaned up temp directory: ${tempDir}`);
    } catch (cleanupError) {
      logger.error(`${logPrefix} Error cleaning up temp files:`, cleanupError);
    }
    
    // Cleanup alternative video service
    try {
      await alternativeVideoService.cleanup();
    } catch (cleanupError) {
      logger.error(`${logPrefix} Error cleaning up alternative video service:`, cleanupError);
    }
  }
} 