import { logger } from '@/memory-framework/config';
import fs from 'fs/promises';
import path from 'path';

export interface VideoCreationOptions {
  width?: number;
  height?: number;
  duration?: number;
  frameRate?: number;
  outputPath?: string;
  format?: 'webm' | 'mp4' | 'gif';
}

export interface VideoFrame {
  imagePath?: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
  text?: string;
  duration?: number;
}

export class AlternativeVideoService {
  private frameRate: number;
  private width: number;
  private height: number;

  constructor() {
    this.frameRate = 30;
    this.width = 1280;
    this.height = 720;
  }

  async initialize(options: VideoCreationOptions = {}) {
    this.width = options.width || 1280;
    this.height = options.height || 720;
    this.frameRate = options.frameRate || 30;

    logger.info('[Alternative Video Service] Initialized with file-based rendering');
  }

  async createVideoFromImages(frames: VideoFrame[], options: VideoCreationOptions = {}): Promise<string> {
    try {
      await this.initialize(options);
      
      const outputPath = options.outputPath || `video_${Date.now()}.${options.format || 'webm'}`;
      const totalDuration = options.duration || frames.length * 2; // 2 seconds per frame by default
      
      logger.info(`[Alternative Video Service] Creating video from ${frames.length} frames`);
      
      // For now, create a simple frame sequence approach
      // This is a fallback solution that creates individual frames
      const frameOutputs: string[] = [];
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const frameOutput = await this.renderFrame(frame, i);
        frameOutputs.push(frameOutput);
      }
      
      // Create a simple video metadata file
      const videoMetadata = {
        frames: frameOutputs,
        width: this.width,
        height: this.height,
        frameRate: this.frameRate,
        duration: totalDuration,
        format: options.format || 'webm',
        timestamp: new Date().toISOString()
      };
      
      const metadataPath = outputPath.replace(/\.[^.]+$/, '_metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(videoMetadata, null, 2));
      
      logger.info(`[Alternative Video Service] Video frames created: ${frameOutputs.length} frames`);
      logger.info(`[Alternative Video Service] Metadata saved to: ${metadataPath}`);
      
      return metadataPath;
      
    } catch (error) {
      logger.error('[Alternative Video Service] Error creating video:', error);
      throw error;
    }
  }

  async createVideoWithAudio(
    frames: VideoFrame[],
    audioPath: string,
    options: VideoCreationOptions = {}
  ): Promise<string> {
    try {
      // First create the video frames
      const videoMetadataPath = await this.createVideoFromImages(frames, options);
      
      // Read the metadata
      const metadataContent = await fs.readFile(videoMetadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      // Add audio information to metadata
      metadata.audioPath = audioPath;
      metadata.hasAudio = true;
      
      // Save updated metadata
      await fs.writeFile(videoMetadataPath, JSON.stringify(metadata, null, 2));
      
      logger.info('[Alternative Video Service] Video with audio metadata created');
      
      return videoMetadataPath;
      
    } catch (error) {
      logger.error('[Alternative Video Service] Error creating video with audio:', error);
      throw error;
    }
  }

  private async renderFrame(frame: VideoFrame, frameIndex: number): Promise<string> {
    try {
      const frameOutputPath = path.join(process.cwd(), 'temp', `frame_${frameIndex.toString().padStart(5, '0')}.png`);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(frameOutputPath), { recursive: true });
      
      if (frame.imagePath) {
        // Copy image file
        const imageBuffer = await fs.readFile(frame.imagePath);
        await fs.writeFile(frameOutputPath, imageBuffer);
      } else if (frame.imageUrl) {
        // Download image from URL
        const response = await fetch(frame.imageUrl);
        const imageBuffer = await response.arrayBuffer();
        await fs.writeFile(frameOutputPath, Buffer.from(imageBuffer));
      } else if (frame.imageBuffer) {
        // Use provided buffer
        await fs.writeFile(frameOutputPath, frame.imageBuffer);
      } else if (frame.text) {
        // Create a simple text placeholder - just create a minimal PNG
        // For now, create a black 1x1 pixel PNG as placeholder
        const blackPixelPNG = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
          0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
          0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x00, 0x00, 0x00, 0x02,
          0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
          0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        await fs.writeFile(frameOutputPath, blackPixelPNG);
      }
      
      logger.debug(`[Alternative Video Service] Frame ${frameIndex} saved to: ${frameOutputPath}`);
      
      return frameOutputPath;
      
    } catch (error) {
      logger.error(`[Alternative Video Service] Error rendering frame ${frameIndex}:`, error);
      throw error;
    }
  }

  async createSimpleVideo(text: string, duration: number = 5): Promise<string> {
    try {
      const frame: VideoFrame = {
        text: text,
        duration: duration
      };
      
      // Create multiple frames for the duration
      const framesNeeded = Math.ceil(duration * this.frameRate);
      const frames = Array(Math.min(framesNeeded, 150)).fill(frame); // Limit to 150 frames (5 seconds at 30fps)
      
      return await this.createVideoFromImages(frames, {
        duration: duration,
        format: 'webm'
      });
      
    } catch (error) {
      logger.error('[Alternative Video Service] Error creating simple video:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up temp directory
      const tempDir = path.join(process.cwd(), 'temp');
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        logger.info('[Alternative Video Service] Temporary files cleaned up');
      } catch (error) {
        logger.warn('[Alternative Video Service] Could not clean up temp directory:', error);
      }
    } catch (error) {
      logger.error('[Alternative Video Service] Error during cleanup:', error);
    }
  }

  // Utility method to convert frame sequence to video using system tools
  async convertFramesToVideo(metadataPath: string): Promise<string> {
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      // This would require FFmpeg, but we can provide instructions for manual conversion
      const instructions = `
To convert the generated frames to a video, you can use one of these methods:

1. If you have FFmpeg installed:
   ffmpeg -framerate ${metadata.frameRate} -i "${path.dirname(metadata.frames[0])}/frame_%05d.png" -c:v libx264 -pix_fmt yuv420p -r ${metadata.frameRate} output.mp4

2. Online converter:
   - Upload the frames to an online frame-to-video converter
   - Set frame rate to ${metadata.frameRate} FPS
   - Download the resulting video

3. Using video editing software:
   - Import the frame sequence into software like DaVinci Resolve (free)
   - Set the frame rate to ${metadata.frameRate} FPS
   - Export as your desired format

Frame files are located in: ${path.dirname(metadata.frames[0])}
Total frames: ${metadata.frames.length}
`;
      
      const instructionsPath = metadataPath.replace('_metadata.json', '_conversion_instructions.txt');
      await fs.writeFile(instructionsPath, instructions);
      
      logger.info(`[Alternative Video Service] Conversion instructions saved to: ${instructionsPath}`);
      
      return instructionsPath;
      
    } catch (error) {
      logger.error('[Alternative Video Service] Error creating conversion instructions:', error);
      throw error;
    }
  }
}

export const alternativeVideoService = new AlternativeVideoService(); 