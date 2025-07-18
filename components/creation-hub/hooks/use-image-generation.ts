import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { logger } from '@/memory-framework/config';
import type {
  GeneratedImage,
  ImageGenerationRequest,
  HubError,
  UseImageGenerationOptions,
  UseImageGenerationReturn
} from '../hub-types';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useCreditsPurchase } from '@/hooks/use-credits-purchase';
import { useAuth } from '@/context/auth-provider';
import { useTrialProtectedApiCall } from '@/hooks/useTrialExpirationHandler';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

export function useImageGeneration(options: UseImageGenerationOptions = {}): UseImageGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<HubError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { handleSubscriptionError } = useSubscriptionGuard();
  const { user } = useAuth();
  const { callTrialProtectedApi } = useTrialProtectedApiCall();
  const { checkPermission } = usePermissionCheck();
  
  // Hook pour l'achat de crédits
  const creditsPurchase = useCreditsPurchase({
    feature: 'images',
    currentUsage: (user as any)?.monthly_usage?.images || 0,
    limit: (user as any)?.plan_type === 'PRO' ? 30 : 2,
    subscriptionEndDate: (user as any)?.subscription_end_date
  });

  const {
    conversationId,
    onSuccess,
    onError,
    onProgress,
    streaming = false,
    onUpgradeRequired
  } = options;

  const generate = useCallback(async (request: ImageGenerationRequest): Promise<GeneratedImage> => {
    // Reset state
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    const requestId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info('[useImageGeneration] Starting generation', { requestId, prompt: request.prompt });

      // Vérification préventive des permissions
      const permissionCheck = await checkPermission('images');
      if (!permissionCheck.allowed) {
        logger.info('[useImageGeneration] Permission denied, showing upgrade modal');
        setIsGenerating(false);
        
        // Déclencher le modal d'upgrade via le callback
        if (onUpgradeRequired) {
          onUpgradeRequired({
            code: permissionCheck.reason,
            feature: 'images',
            currentUsage: permissionCheck.currentUsage,
            maxQuota: permissionCheck.maxQuota
          });
        } else {
          // Fallback vers l'ancien système
          handleSubscriptionError({
            code: permissionCheck.reason,
            feature: 'images',
            currentUsage: permissionCheck.currentUsage,
            maxQuota: permissionCheck.maxQuota
          });
        }
        
        throw new Error('Subscription required');
      }

      // Prepare request body for GPT Image 1
      const requestBody = {
        prompt: request.prompt,
        quality: request.quality || 'auto',
        size: request.size || 'auto',
        format: request.format || 'png',
        background: request.background || 'auto',
        compression: request.compression,
        streaming,
        conversationId,
        user: request.user,
        categoryId: request.categoryId,
        formValues: request.formValues
      };

      // Start generation with trial protection
      const data = await callTrialProtectedApi(
        async () => {
          const response = await fetch('/api/creation-hub/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
                    body: JSON.stringify(requestBody),
        signal: abortControllerRef.current?.signal
          });

          if (!response.ok) {
            const errorData = await response.json();
            
            // Handle subscription errors
            if (handleSubscriptionError(errorData)) {
              throw new Error('Subscription required');
            }
            
            throw new Error(errorData.error?.message || 'Generation failed');
          }

          // Handle streaming response
          if (streaming && response.body) {
            return await handleStreamingResponse(response, {
              requestId,
              onProgress: (progressValue) => {
                setProgress(progressValue);
                onProgress?.(progressValue);
              }
            });
          }

          // Handle regular response
          return await response.json();
        },
        (result) => {
          // Success callback - will be handled below
        },
        (error) => {
          throw error; // Re-throw to be caught by outer catch
        }
      );

      if (!data) {
        throw new Error('Generation cancelled due to trial expiration');
      }
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Generation failed');
      }

      const generatedImage: GeneratedImage = {
        id: data.data.id,
        url: data.data.imageUrl,
        prompt: data.data.prompt,
        revisedPrompt: data.data.revisedPrompt,
        timestamp: new Date(data.data.metadata.generatedAt),
        status: 'completed',
        metadata: {
          quality: data.data.metadata.quality,
          size: data.data.metadata.size,
          format: data.data.metadata.format,
          background: data.data.metadata.background,
          compression: data.data.metadata.compression,
          model: data.data.metadata.model,
          duration: data.data.metadata.duration
        },
        conversationId: data.data.conversationId
      };

      setProgress(100);
      
      logger.info('[useImageGeneration] Generation completed', { 
        requestId, 
        imageId: generatedImage.id 
      });

      // Call success callback
      onSuccess?.(generatedImage);

      // Show success toast
      toast.success("Image Generated!", {
        description: "Your image has been created successfully. Go to your gallery to view it.",
      });

      return generatedImage;

    } catch (err) {
      // Check if this is a subscription error that was already handled
      if (err instanceof Error && err.message === 'Subscription required') {
        // Don't show error toast or set error state for subscription errors
        // The modal is already shown by handleSubscriptionError
        logger.info('[useImageGeneration] Subscription error handled by modal', { requestId });
        throw err; // Re-throw to be handled by the caller
      }

      const hubError = createHubError(err, requestId);
      setError(hubError);
      
      logger.error('[useImageGeneration] Generation failed', { 
        requestId, 
        error: hubError.message 
      });

      // Call error callback
      onError?.(hubError);

      // Show error toast only for non-subscription errors
      toast.error("Generation Failed", {
        description: hubError.message,
      });

      throw hubError;

    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, onSuccess, onError, onProgress, streaming, onUpgradeRequired]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress(0);
      
      logger.info('[useImageGeneration] Generation cancelled');
      
      toast.info("Generation Cancelled", {
        description: "Image generation has been stopped.",
      });
    }
  }, []);

  return {
    generate,
    isGenerating,
    progress,
    error,
    cancel
  };
}

// Helper function to handle streaming responses
async function handleStreamingResponse(
  response: Response,
  options: {
    requestId: string;
    onProgress: (progress: number) => void;
  }
): Promise<GeneratedImage> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: GeneratedImage | null = null;

  if (!reader) {
    throw new Error('No response body available for streaming');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') break;
            
            const chunk = JSON.parse(jsonStr);
            
            if (chunk.type === 'progress') {
              options.onProgress(chunk.progress || 0);
            } else if (chunk.type === 'completed') {
              finalResult = {
                id: chunk.data.id,
                url: chunk.data.imageUrl,
                prompt: chunk.data.prompt,
                revisedPrompt: chunk.data.revisedPrompt,
                timestamp: new Date(chunk.data.metadata.generatedAt),
                status: 'completed',
                metadata: chunk.data.metadata,
                conversationId: chunk.data.conversationId
              };
            } else if (chunk.type === 'error') {
              throw new Error(chunk.error?.message || 'Streaming error');
            }
          }
        } catch (parseError) {
          logger.warn('[useImageGeneration] Failed to parse streaming chunk', { 
            parseError, 
            line 
          });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResult) {
    throw new Error('No final result received from streaming response');
  }

  return finalResult;
}

// Helper function to create standardized HubError
function createHubError(err: unknown, requestId: string): HubError {
  if (err instanceof Error) {
    // Check for specific error types
    if (err.name === 'AbortError') {
      return {
        code: 'GENERATION_FAILED',
        message: 'Generation was cancelled',
        retryable: false,
        timestamp: new Date()
      };
    }

    if (err.message.includes('rate limit') || err.message.includes('quota')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        retryable: true,
        timestamp: new Date()
      };
    }

    if (err.message.includes('content policy') || err.message.includes('inappropriate')) {
      return {
        code: 'INVALID_PROMPT',
        message: 'Content violates policy guidelines',
        retryable: false,
        timestamp: new Date()
      };
    }

    if (err.message.includes('network') || err.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred. Please check your connection.',
        retryable: true,
        timestamp: new Date()
      };
    }

    return {
      code: 'GENERATION_FAILED',
      message: err.message,
      retryable: true,
      timestamp: new Date()
    };
  }

  return {
    code: 'GENERATION_FAILED',
    message: 'An unknown error occurred',
    retryable: true,
    timestamp: new Date()
  };
} 