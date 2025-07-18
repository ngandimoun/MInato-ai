import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/memory-framework/config';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useTrialProtectedApiCall } from '@/hooks/useTrialExpirationHandler';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

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
  const { handleSubscriptionError } = useSubscriptionGuard();
  const { callTrialProtectedApi } = useTrialProtectedApiCall();
  const { checkPermission } = usePermissionCheck();

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

      // Vérification préventive des permissions
      const permissionCheck = await checkPermission('videos');
      if (!permissionCheck.allowed) {
        logger.info('[Video Generation Hook] Permission denied, showing upgrade modal');
        setIsGenerating(false);
        cleanup();
        
        // Déclencher le modal d'upgrade
        handleSubscriptionError({
          code: permissionCheck.reason,
          feature: 'videos',
          currentUsage: permissionCheck.currentUsage,
          maxQuota: permissionCheck.maxQuota
        });
        
        return;
      }

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

      // Make API request with trial protection
      const result = await callTrialProtectedApi(
        async () => {
          const response = await fetch('/api/video/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: abortControllerRef.current?.signal
          });

          if (!response.ok) {
            // Vérifier si la réponse a du contenu avant de tenter de la parser
            const contentType = response.headers.get('content-type');
            let errorData;
            
            try {
              if (contentType && contentType.includes('application/json')) {
                const responseText = await response.text();
                if (responseText.trim()) {
                  errorData = JSON.parse(responseText);
                } else {
                  errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
              } else {
                errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
              }
            } catch (parseError) {
              logger.error('[Video Generation Hook] Failed to parse error response', { parseError, status: response.status });
              errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            // Handle subscription errors
            if (handleSubscriptionError(errorData)) {
              throw new Error('Subscription required');
            }
            
            throw new Error(errorData.error || `Generation failed: ${response.status}`);
          }

          return await response.json();
        },
        (data) => {
          // Success callback - will be handled below
        },
        (error) => {
          // Si c'est une erreur de subscription, on ne la relance pas
          if (error.message === 'Subscription required') {
            logger.info('[Video Generation Hook] Subscription error handled, not re-throwing');
            return;
          }
          throw error; // Re-throw to be caught by outer catch
        }
      );

      if (!result) {
        // Si result est null, c'est probablement dû à une erreur de subscription
        logger.info('[Video Generation Hook] Generation cancelled due to subscription error');
        setIsGenerating(false);
        cleanup();
        return;
      }
      
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

      // Check if this is a subscription error that was already handled
      if (err instanceof Error && err.message === 'Subscription required') {
        // Don't show error toast or set error state for subscription errors
        // The modal is already shown by handleSubscriptionError
        logger.info('[Video Generation Hook] Subscription error handled by modal');
        throw err; // Re-throw to be handled by the caller
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