import { logger } from "@/memory-framework/config";
import { VideoProcessingService } from "./VideoProcessingService";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export interface VideoProcessingJob {
  id: string;
  streamId: string;
  videoUrl: string;
  userId: string;
  scenario: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export class VideoProcessingQueue {
  private static instance: VideoProcessingQueue;
  private queue: VideoProcessingJob[] = [];
  private processing: Map<string, VideoProcessingJob> = new Map();
  private maxConcurrentJobs = 2; // Process max 2 videos simultaneously
  private processingService: VideoProcessingService;
  private supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>;
  private isRunning = false;

  private constructor() {
    this.processingService = new VideoProcessingService();
    this.supabaseAdmin = getSupabaseAdminClient();
  }

  public static getInstance(): VideoProcessingQueue {
    if (!VideoProcessingQueue.instance) {
      VideoProcessingQueue.instance = new VideoProcessingQueue();
    }
    return VideoProcessingQueue.instance;
  }

  /**
   * Add a video processing job to the queue
   */
  public async addJob(
    streamId: string,
    videoUrl: string,
    userId: string,
    scenario: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: VideoProcessingJob = {
      id: jobId,
      streamId,
      videoUrl,
      userId,
      scenario,
      priority,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    // Insert job based on priority
    if (priority === 'high') {
      this.queue.unshift(job);
    } else if (priority === 'medium') {
      const highPriorityIndex = this.queue.findIndex(j => j.priority !== 'high');
      if (highPriorityIndex === -1) {
        this.queue.push(job);
      } else {
        this.queue.splice(highPriorityIndex, 0, job);
      }
    } else {
      this.queue.push(job);
    }

    logger.info(`[VideoProcessingQueue] Added job ${jobId} for stream ${streamId} with priority ${priority}`);
    
    // Start processing if not already running
    if (!this.isRunning) {
      this.startProcessing();
    }

    return jobId;
  }

  /**
   * Get job status
   */
  public getJobStatus(jobId: string): VideoProcessingJob | null {
    // Check if job is currently processing
    const processingJob = this.processing.get(jobId);
    if (processingJob) {
      return processingJob;
    }

    // Check if job is in queue
    const queuedJob = this.queue.find(job => job.id === jobId);
    if (queuedJob) {
      return queuedJob;
    }

    return null;
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): {
    pending: number;
    processing: number;
    totalJobs: number;
    averageProcessingTime: number;
  } {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      totalJobs: this.queue.length + this.processing.size,
      averageProcessingTime: this.calculateAverageProcessingTime()
    };
  }

  /**
   * Start processing jobs from the queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('[VideoProcessingQueue] Starting queue processing');

    while (this.isRunning) {
      try {
        // Check if we can process more jobs
        if (this.processing.size < this.maxConcurrentJobs && this.queue.length > 0) {
          const job = this.queue.shift()!;
          await this.processJob(job);
        } else {
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Stop if queue is empty and no jobs are processing
        if (this.queue.length === 0 && this.processing.size === 0) {
          this.isRunning = false;
          logger.info('[VideoProcessingQueue] Queue processing stopped - no jobs remaining');
        }
      } catch (error) {
        logger.error('[VideoProcessingQueue] Error in processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: VideoProcessingJob): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date();
    this.processing.set(job.id, job);

    logger.info(`[VideoProcessingQueue] Starting job ${job.id} for stream ${job.streamId}`);

    try {
      // Update stream status to processing
      await this.updateStreamStatus(job.streamId, 'processing');

      // Process the video
      const result = await this.processingService.processUploadedVideo(
        job.streamId,
        job.videoUrl,
        job.userId,
        job.scenario
      );

      if (result.success) {
        job.status = 'completed';
        job.completedAt = new Date();
        
        // Update stream with processing results
        await this.updateStreamWithResults(job.streamId, result);
        
        logger.info(`[VideoProcessingQueue] Job ${job.id} completed successfully. Frames: ${result.frames_analyzed}, Audio: ${result.audio_analyzed}`);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      logger.error(`[VideoProcessingQueue] Job ${job.id} failed:`, error);
      
      job.retryCount++;
      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.retryCount < job.maxRetries) {
        // Retry the job
        job.status = 'pending';
        job.startedAt = undefined;
        this.queue.push(job); // Add back to queue for retry
        logger.info(`[VideoProcessingQueue] Job ${job.id} will be retried (attempt ${job.retryCount + 1}/${job.maxRetries})`);
      } else {
        // Max retries reached
        job.status = 'failed';
        job.completedAt = new Date();
        await this.updateStreamStatus(job.streamId, 'error');
        logger.error(`[VideoProcessingQueue] Job ${job.id} failed permanently after ${job.maxRetries} attempts`);
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  /**
   * Update stream status in database
   */
  private async updateStreamStatus(streamId: string, status: string): Promise<void> {
    if (this.supabaseAdmin) {
      try {
        await this.supabaseAdmin
          .from('video_intelligence_streams')
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', streamId);
      } catch (error) {
        logger.error(`[VideoProcessingQueue] Error updating stream status:`, error);
      }
    }
  }

  /**
   * Update stream with processing results
   */
  private async updateStreamWithResults(streamId: string, result: any): Promise<void> {
    if (this.supabaseAdmin) {
      try {
        await this.supabaseAdmin
          .from('video_intelligence_streams')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString(),
            metadata: {
              frames_analyzed: result.frames_analyzed,
              audio_analyzed: result.audio_analyzed,
              total_analysis_results: result.total_analysis_results,
              processing_time: result.processing_time
            }
          })
          .eq('id', streamId);
      } catch (error) {
        logger.error(`[VideoProcessingQueue] Error updating stream results:`, error);
      }
    }
  }

  /**
   * Calculate average processing time
   */
  private calculateAverageProcessingTime(): number {
    const completedJobs = Array.from(this.processing.values()).filter(
      job => job.status === 'completed' && job.startedAt && job.completedAt
    );

    if (completedJobs.length === 0) {
      return 0;
    }

    const totalTime = completedJobs.reduce((sum, job) => {
      if (job.startedAt && job.completedAt) {
        return sum + (job.completedAt.getTime() - job.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / completedJobs.length;
  }

  /**
   * Clear completed and failed jobs from memory
   */
  public cleanup(): void {
    const before = this.processing.size;
    for (const [jobId, job] of this.processing.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.processing.delete(jobId);
      }
    }
    const after = this.processing.size;
    
    if (before !== after) {
      logger.info(`[VideoProcessingQueue] Cleaned up ${before - after} completed/failed jobs`);
    }
  }

  /**
   * Stop the queue processing
   */
  public stop(): void {
    this.isRunning = false;
    logger.info('[VideoProcessingQueue] Queue processing stopped');
  }

  /**
   * Get all pending jobs for a user
   */
  public getUserJobs(userId: string): VideoProcessingJob[] {
    const queuedJobs = this.queue.filter(job => job.userId === userId);
    const processingJobs = Array.from(this.processing.values()).filter(job => job.userId === userId);
    
    return [...queuedJobs, ...processingJobs];
  }
} 