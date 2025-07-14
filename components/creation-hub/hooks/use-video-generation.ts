import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/memory-framework/config';

export interface GeneratedVideo {
  id: string;
  taskId: string;
  status: 'generating' | 'completed' | 'failed' | 'cancelled';
  videoUrl?: string;
  thumbnailUrl?: string;
  originalImageUrl?: string;
  prompt: string;
  enhancedPrompt?: string;
  duration: number;
  progress: number;
  errorMessage?: string;
  timestamp: Date;
  metadata?: {
    fileSize?: number;
    dimensions?: { width: number; height: number };
  };
}

export interface VideoGenerationOptions {
  streaming?: boolean;
  onSuccess?: (video: GeneratedVideo) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  pollInterval?: number; // Polling interval in milliseconds
}

export interface VideoGenerationRequest {
  imageUrl?: string;
  imageFile?: File;
  prompt: string;
  duration?: number;
  platform?: string;
  format?: string;
}

export function useVideoGeneration(options: VideoGenerationOptions = {}) {
  const {
    streaming = true,
    onSuccess,
    onError,
    onProgress,
    pollInterval = 3000 // Poll every 3 seconds
  } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to convert File to base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll for video status
  const pollVideoStatus = useCallback(async (videoId: string, taskId: string) => {
    try {
      const response = await fetch(`/api/video/generate?videoId=${videoId}&taskId=${taskId}`, {
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info('[Video Generation Hook] Status update', {
        videoId,
        taskId,
        status: result.status,
        progress: result.progress
      });

      // Update progress
      if (result.progress !== undefined) {
        setProgress(result.progress);
        onProgress?.(result.progress);
      }

      // Check if generation is complete
      if (result.status === 'SUCCEEDED' || result.status === 'completed') {
        const completedVideo: GeneratedVideo = {
          ...currentVideo!,
          status: 'completed',
          videoUrl: result.videoUrl,
          progress: 100
        };

        setCurrentVideo(completedVideo);
        setProgress(100);
        setIsGenerating(false);
        cleanup();
        
        onSuccess?.(completedVideo);
        
      } else if (result.status === 'FAILED' || result.status === 'failed') {
        const error = new Error(result.errorMessage || 'Video generation failed');
        setError(error);
        setIsGenerating(false);
        setCurrentVideo(prev => prev ? { ...prev, status: 'failed', errorMessage: result.errorMessage } : null);
        cleanup();
        
        onError?.(error);
        
      } else if (result.status === 'PROCESSING' || result.status === 'PENDING' || result.status === 'generating') {
        // Continue polling
        setCurrentVideo(prev => prev ? { ...prev, status: 'generating', progress: result.progress || prev.progress } : null);
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.info('[Video Generation Hook] Polling aborted');
        return;
      }

      logger.error('[Video Generation Hook] Polling error', { err, videoId, taskId });
      
      const error = err instanceof Error ? err : new Error('Status check failed');
      setError(error);
      setIsGenerating(false);
      cleanup();
      
      onError?.(error);
    }
  }, [currentVideo, onSuccess, onError, onProgress, cleanup]);

  // Start polling
  const startPolling = useCallback((videoId: string, taskId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(() => {
      pollVideoStatus(videoId, taskId);
    }, pollInterval);

    // Also poll immediately
    pollVideoStatus(videoId, taskId);
  }, [pollVideoStatus, pollInterval]);

  // Main generation function
  const generate = useCallback(async (request: VideoGenerationRequest) => {
    try {
      // Reset state
      setIsGenerating(true);
      setProgress(0);
      setError(null);
      cleanup();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      logger.info('[Video Generation Hook] Starting generation', {
        hasImageUrl: !!request.imageUrl,
        hasImageFile: !!request.imageFile,
        prompt: request.prompt.substring(0, 100),
        duration: request.duration
      });

      // Prepare request payload
      const payload: any = {
        prompt: request.prompt,
        duration: request.duration || 5,
        platform: request.platform,
        format: request.format
      };

      if (request.imageUrl) {
        payload.imageUrl = request.imageUrl;
      } else if (request.imageFile) {
        // Convert file to base64
        const base64Image = await fileToBase64(request.imageFile);
        payload.imageFile = base64Image;
      }

      // Make API request
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Create initial video object
      const initialVideo: GeneratedVideo = {
        id: result.videoId || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId: result.taskId,
        status: 'generating',
        originalImageUrl: request.imageUrl,
        prompt: request.prompt,
        duration: request.duration || 5,
        progress: 0,
        timestamp: new Date()
      };

      setCurrentVideo(initialVideo);
      
      logger.info('[Video Generation Hook] Generation initiated', {
        videoId: result.videoId,
        taskId: result.taskId
      });

      // Start polling for status updates if streaming is enabled
      if (streaming) {
        startPolling(result.videoId, result.taskId);
      }

      return initialVideo;

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.info('[Video Generation Hook] Generation aborted');
        return;
      }

      logger.error('[Video Generation Hook] Generation error', { err });
      
      const error = err instanceof Error ? err : new Error('Video generation failed');
      setError(error);
      setIsGenerating(false);
      cleanup();
      
      onError?.(error);
      
      throw error;
    }
  }, [streaming, fileToBase64, startPolling, onError, cleanup]);

  // Cancel function
  const cancel = useCallback(() => {
    logger.info('[Video Generation Hook] Cancelling generation');
    cleanup();
    setIsGenerating(false);
    setProgress(0);
    setCurrentVideo(prev => prev ? { ...prev, status: 'cancelled' } : null);
  }, [cleanup]);

  // Check status manually
  const checkStatus = useCallback(async (videoId: string, taskId?: string) => {
    return pollVideoStatus(videoId, taskId || '');
  }, [pollVideoStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    generate,
    cancel,
    checkStatus,
    isGenerating,
    progress,
    error,
    currentVideo
  };
} 