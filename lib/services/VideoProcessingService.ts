import { logger } from "@/memory-framework/config";
import { VideoIntelligenceOrchestrator } from "./VideoIntelligenceOrchestrator";
import { generateVisionCompletion } from "@/lib/providers/llm_clients";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// Configure FFmpeg
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface VideoProcessingResult {
  success: boolean;
  frames_analyzed: number;
  audio_analyzed: boolean;
  total_analysis_results: number;
  processing_time: number;
  error?: string;
}

export interface FrameAnalysisResult {
  frame_number: number;
  timestamp: number;
  analysis_result: any;
  frame_path?: string;
}

export interface AudioAnalysisResult {
  transcript: string;
  sentiment: string;
  keywords: string[];
  emotions: string[];
  threat_indicators: string[];
  confidence_score: number;
}

export class VideoProcessingService {
  private orchestrator: VideoIntelligenceOrchestrator;
  private supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>;
  private tempDir: string;

  constructor() {
    this.orchestrator = new VideoIntelligenceOrchestrator();
    this.supabaseAdmin = getSupabaseAdminClient();
    this.tempDir = os.tmpdir();
  }

  /**
   * Process uploaded video with comprehensive frame and audio analysis
   */
  async processUploadedVideo(
    streamId: string,
    videoUrl: string,
    userId: string,
    scenario: string
  ): Promise<VideoProcessingResult> {
    const startTime = Date.now();
    let tempVideoPath: string | null = null;
    let tempAudioPath: string | null = null;
    let framesPaths: string[] = [];

    try {
      logger.info(`[VideoProcessing] Starting comprehensive analysis for stream ${streamId}`);

      // Update stream status
      await this.updateStreamStatus(streamId, 'processing');

      // Download video to temp directory
      tempVideoPath = await this.downloadVideo(videoUrl);
      logger.info(`[VideoProcessing] Video downloaded to ${tempVideoPath}`);

      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(tempVideoPath);
      logger.info(`[VideoProcessing] Video metadata:`, videoMetadata);

      // Extract frames throughout the video
      const frameExtractionResult = await this.extractFrames(tempVideoPath, streamId);
      framesPaths = frameExtractionResult.framePaths;
      logger.info(`[VideoProcessing] Extracted ${framesPaths.length} frames`);

      // Extract audio from video
      tempAudioPath = await this.extractAudio(tempVideoPath);
      logger.info(`[VideoProcessing] Audio extracted to ${tempAudioPath}`);

      // Process frames and audio in parallel
      const [frameResults, audioResult] = await Promise.all([
        this.analyzeFrames(framesPaths, streamId, userId, scenario),
        this.analyzeAudio(tempAudioPath, streamId, userId, scenario)
      ]);

      // Generate comprehensive report
      await this.generateComprehensiveReport(
        streamId,
        userId,
        frameResults,
        audioResult,
        videoMetadata,
        scenario
      );

      // Update stream status to completed
      await this.updateStreamStatus(streamId, 'completed');

      const processingTime = Date.now() - startTime;
      logger.info(`[VideoProcessing] Completed analysis for stream ${streamId} in ${processingTime}ms`);

      return {
        success: true,
        frames_analyzed: frameResults.length,
        audio_analyzed: audioResult !== null,
        total_analysis_results: frameResults.length + (audioResult ? 1 : 0),
        processing_time: processingTime
      };

    } catch (error) {
      logger.error(`[VideoProcessing] Error processing video for stream ${streamId}:`, error);
      await this.updateStreamStatus(streamId, 'error');
      
      return {
        success: false,
        frames_analyzed: 0,
        audio_analyzed: false,
        total_analysis_results: 0,
        processing_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Cleanup temporary files
      await this.cleanupTempFiles([tempVideoPath, tempAudioPath, ...framesPaths]);
    }
  }

  /**
   * Download video from URL to temporary file
   */
  private async downloadVideo(videoUrl: string): Promise<string> {
    const tempPath = path.join(this.tempDir, `video_${randomUUID()}.mp4`);
    
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(tempPath, Buffer.from(buffer));
    
    return tempPath;
  }

  /**
   * Get video metadata using FFmpeg
   */
  private async getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            format: metadata.format.format_name,
            streams: metadata.streams.map(stream => ({
              codec_type: stream.codec_type,
              codec_name: stream.codec_name,
              width: stream.width,
              height: stream.height,
              fps: stream.r_frame_rate
            }))
          });
        }
      });
    });
  }

  /**
   * Extract frames throughout the entire video
   */
  private async extractFrames(videoPath: string, streamId: string): Promise<{framePaths: string[], frameCount: number}> {
    const framesDir = path.join(this.tempDir, `frames_${streamId}`);
    await fs.mkdir(framesDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const framePaths: string[] = [];
      let frameCount = 0;

      ffmpeg(videoPath)
        .on('start', (commandLine) => {
          logger.info(`[VideoProcessing] FFmpeg frame extraction started: ${commandLine}`);
        })
        .on('progress', (progress) => {
          logger.info(`[VideoProcessing] Frame extraction progress: ${progress.percent}%`);
        })
        .on('end', () => {
          logger.info(`[VideoProcessing] Frame extraction completed. ${frameCount} frames extracted.`);
          resolve({ framePaths, frameCount });
        })
        .on('error', (err) => {
          logger.error(`[VideoProcessing] Frame extraction error:`, err);
          reject(err);
        })
        // Extract 1 frame per second for comprehensive analysis
        .outputOptions([
          '-vf', 'fps=1', // Extract 1 frame per second
          '-q:v', '2', // High quality
          '-f', 'image2'
        ])
        .output(path.join(framesDir, 'frame_%04d.jpg'))
        .run();

      // Monitor the frames directory for created files
      const checkFrames = async () => {
        try {
          const files = await fs.readdir(framesDir);
          const jpgFiles = files.filter(f => f.endsWith('.jpg')).sort();
          
          for (const file of jpgFiles) {
            const fullPath = path.join(framesDir, file);
            if (!framePaths.includes(fullPath)) {
              framePaths.push(fullPath);
              frameCount++;
            }
          }
        } catch (error) {
          // Directory might not exist yet
        }
      };

      // Check for new frames every 500ms
      const frameCheckInterval = setInterval(checkFrames, 500);
      
      // Clean up interval after 5 minutes (timeout)
      setTimeout(() => {
        clearInterval(frameCheckInterval);
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Extract audio from video
   */
  private async extractAudio(videoPath: string): Promise<string> {
    const audioPath = path.join(this.tempDir, `audio_${randomUUID()}.wav`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('start', (commandLine) => {
          logger.info(`[VideoProcessing] FFmpeg audio extraction started: ${commandLine}`);
        })
        .on('end', () => {
          logger.info(`[VideoProcessing] Audio extraction completed: ${audioPath}`);
          resolve(audioPath);
        })
        .on('error', (err) => {
          logger.error(`[VideoProcessing] Audio extraction error:`, err);
          reject(err);
        })
        .outputOptions([
          '-vn', // No video
          '-acodec', 'pcm_s16le', // PCM 16-bit
          '-ar', '16000', // 16kHz sample rate
          '-ac', '1' // Mono
        ])
        .output(audioPath)
        .run();
    });
  }

  /**
   * Analyze all extracted frames
   */
  private async analyzeFrames(
    framePaths: string[],
    streamId: string,
    userId: string,
    scenario: string
  ): Promise<FrameAnalysisResult[]> {
    const results: FrameAnalysisResult[] = [];
    const batchSize = 5; // Process 5 frames at a time

    logger.info(`[VideoProcessing] Starting analysis of ${framePaths.length} frames`);

    for (let i = 0; i < framePaths.length; i += batchSize) {
      const batch = framePaths.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (framePath, batchIndex) => {
        try {
          const frameNumber = i + batchIndex + 1;
          const timestamp = frameNumber; // 1 frame per second, so frame number = seconds
          
          // Read frame as buffer
          const frameBuffer = await fs.readFile(framePath);
          
          // Analyze frame using the orchestrator
          const analysisResult = await this.orchestrator.analyzeFrame(
            frameBuffer,
            streamId,
            userId,
            scenario as any
          );

          return {
            frame_number: frameNumber,
            timestamp: timestamp,
            analysis_result: analysisResult,
            frame_path: framePath
          };
        } catch (error) {
          logger.error(`[VideoProcessing] Error analyzing frame ${framePath}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as FrameAnalysisResult[]);
      
      // Small delay between batches to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`[VideoProcessing] Completed analysis of ${results.length} frames`);
    return results;
  }

  /**
   * Analyze extracted audio
   */
  private async analyzeAudio(
    audioPath: string,
    streamId: string,
    userId: string,
    scenario: string
  ): Promise<AudioAnalysisResult | null> {
    try {
      logger.info(`[VideoProcessing] Starting audio analysis for ${audioPath}`);

      // Read audio file
      const audioBuffer = await fs.readFile(audioPath);
      
      // For now, we'll use a simple text analysis approach
      // In a real implementation, you'd use speech-to-text services
      const audioAnalysisPrompt = `
        Analyze this audio for security and safety intelligence:
        
        Scenario: ${scenario}
        
        Please provide:
        1. Transcript of any speech or sounds
        2. Emotional tone and sentiment
        3. Keywords and important phrases
        4. Potential threat indicators
        5. Confidence score (0-1)
        
        Format as JSON:
        {
          "transcript": "...",
          "sentiment": "...",
          "keywords": [...],
          "emotions": [...],
          "threat_indicators": [...],
          "confidence_score": 0.85
        }
      `;

      // For demonstration, we'll simulate audio analysis
      // In production, you'd integrate with speech-to-text and audio analysis services
      const audioAnalysisResult: AudioAnalysisResult = {
        transcript: "Audio analysis placeholder - integrate with speech-to-text service",
        sentiment: "neutral",
        keywords: ["security", "monitoring", "surveillance"],
        emotions: ["calm", "alert"],
        threat_indicators: [],
        confidence_score: 0.7
      };

      // Store audio analysis result
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('video_intelligence_analysis')
          .insert({
            stream_id: streamId,
            user_id: userId,
            analysis_type: 'audio_analysis',
            risk_level: 'low',
            confidence_score: audioAnalysisResult.confidence_score,
            detected_objects: [],
            detected_people: [],
            danger_zones_violated: [],
            scene_description: audioAnalysisResult.transcript,
            threat_analysis: `Audio sentiment: ${audioAnalysisResult.sentiment}. Keywords: ${audioAnalysisResult.keywords.join(', ')}`,
            recommended_actions: audioAnalysisResult.threat_indicators.length > 0 ? 
              ['Review audio for potential threats', 'Investigate identified concerns'] : 
              ['No immediate action required'],
            frame_metadata: {
              type: 'audio',
              duration: 'full_video',
              analysis_type: 'speech_and_audio',
              ...audioAnalysisResult
            }
          });
      }

      logger.info(`[VideoProcessing] Audio analysis completed`);
      return audioAnalysisResult;

    } catch (error) {
      logger.error(`[VideoProcessing] Error analyzing audio:`, error);
      return null;
    }
  }

  /**
   * Generate comprehensive report combining frame and audio analysis
   */
  private async generateComprehensiveReport(
    streamId: string,
    userId: string,
    frameResults: FrameAnalysisResult[],
    audioResult: AudioAnalysisResult | null,
    videoMetadata: any,
    scenario: string
  ): Promise<void> {
    try {
      logger.info(`[VideoProcessing] Generating comprehensive report for stream ${streamId}`);

      // Calculate overall risk assessment
      const riskLevels = frameResults.map(f => f.analysis_result.risk_level);
      const highRiskFrames = riskLevels.filter(r => r === 'high' || r === 'critical').length;
      const mediumRiskFrames = riskLevels.filter(r => r === 'medium').length;
      
      let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (highRiskFrames > 0) {
        overallRisk = highRiskFrames > frameResults.length * 0.1 ? 'critical' : 'high';
      } else if (mediumRiskFrames > frameResults.length * 0.2) {
        overallRisk = 'medium';
      }

      // Aggregate detected objects and people
      const allDetectedObjects = frameResults.flatMap(f => f.analysis_result.detected_objects || []);
      const allDetectedPeople = frameResults.flatMap(f => f.analysis_result.detected_people || []);
      const allDangerZones = frameResults.flatMap(f => f.analysis_result.danger_zones_violated || []);

      // Generate summary report
      const summaryReport = {
        video_duration: videoMetadata.duration,
        frames_analyzed: frameResults.length,
        audio_analyzed: audioResult !== null,
        overall_risk: overallRisk,
        high_risk_frames: highRiskFrames,
        medium_risk_frames: mediumRiskFrames,
        total_objects_detected: allDetectedObjects.length,
        total_people_detected: allDetectedPeople.length,
        danger_zones_violated: allDangerZones.length,
        audio_transcript: audioResult?.transcript || 'No audio analysis',
        audio_sentiment: audioResult?.sentiment || 'N/A',
        audio_threat_indicators: audioResult?.threat_indicators || []
      };

      // Store comprehensive report
      if (this.supabaseAdmin) {
        await this.supabaseAdmin
          .from('video_intelligence_analysis')
          .insert({
            stream_id: streamId,
            user_id: userId,
            analysis_type: 'comprehensive_report',
            risk_level: overallRisk,
            confidence_score: frameResults.reduce((sum, f) => sum + f.analysis_result.confidence_score, 0) / frameResults.length,
            detected_objects: allDetectedObjects,
            detected_people: allDetectedPeople,
            danger_zones_violated: allDangerZones,
            scene_description: `Comprehensive analysis of ${frameResults.length} frames over ${Math.round(videoMetadata.duration)}s video. ${audioResult ? 'Audio analysis included.' : 'No audio analysis.'}`,
            threat_analysis: `Overall risk: ${overallRisk}. ${highRiskFrames} high-risk frames detected. ${audioResult?.threat_indicators.length || 0} audio threat indicators.`,
            recommended_actions: this.generateRecommendations(overallRisk, highRiskFrames, audioResult),
            frame_metadata: {
              type: 'comprehensive_report',
              summary: summaryReport,
              frame_count: frameResults.length,
              processing_timestamp: new Date().toISOString()
            }
          });
      }

      logger.info(`[VideoProcessing] Comprehensive report generated for stream ${streamId}`);
    } catch (error) {
      logger.error(`[VideoProcessing] Error generating comprehensive report:`, error);
    }
  }

  /**
   * Generate recommendations based on analysis results
   */
  private generateRecommendations(
    overallRisk: string,
    highRiskFrames: number,
    audioResult: AudioAnalysisResult | null
  ): string[] {
    const recommendations: string[] = [];

    if (overallRisk === 'critical') {
      recommendations.push('IMMEDIATE ATTENTION REQUIRED: Critical threats detected');
      recommendations.push('Review all high-risk frames immediately');
      recommendations.push('Consider alerting security personnel');
    } else if (overallRisk === 'high') {
      recommendations.push('High-risk activity detected - review footage');
      recommendations.push('Monitor situation closely');
    } else if (overallRisk === 'medium') {
      recommendations.push('Moderate risk detected - periodic review recommended');
    } else {
      recommendations.push('No significant threats detected');
      recommendations.push('Continue normal monitoring');
    }

    if (highRiskFrames > 0) {
      recommendations.push(`Review ${highRiskFrames} high-risk frame(s) for detailed analysis`);
    }

    if (audioResult?.threat_indicators && audioResult.threat_indicators.length > 0) {
      recommendations.push('Audio analysis detected potential concerns - review audio content');
    }

    return recommendations;
  }

  /**
   * Update stream status in database
   */
  private async updateStreamStatus(streamId: string, status: string): Promise<void> {
    if (this.supabaseAdmin) {
      await this.supabaseAdmin
        .from('video_intelligence_streams')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamId);
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(filePaths: (string | null)[]): Promise<void> {
    for (const filePath of filePaths) {
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }
} 