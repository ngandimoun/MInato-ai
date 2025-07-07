import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/memory-framework/config';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import type { GeneratedImage, HubError } from '../hub-types';

interface UseUserImagesOptions {
  autoLoad?: boolean;
  limit?: number;
}

interface UseUserImagesReturn {
  images: GeneratedImage[];
  loading: boolean;
  error: HubError | null;
  loadImages: () => Promise<void>;
  addImage: (image: GeneratedImage) => void;
  updateImage: (imageId: string, updates: Partial<GeneratedImage>) => void;
  refetch: () => Promise<void>;
}

export function useUserImages(options: UseUserImagesOptions = {}): UseUserImagesReturn {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HubError | null>(null);

  const { autoLoad = true, limit = 100 } = options;

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      logger.info('[useUserImages] Loading user images');

      const supabase = getBrowserSupabaseClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logger.error('[useUserImages] Authentication failed', { authError });
        throw new Error('User not authenticated');
      }

      logger.info('[useUserImages] User authenticated', { userId: user.id });

      // Load all images for this user
      const { data: imagesData, error: imagesError } = await supabase
        .from('generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (imagesError) {
        logger.error('[useUserImages] Database query failed', { 
          error: imagesError,
          userId: user.id 
        });
        throw new Error(`Failed to load images: ${imagesError.message}`);
      }

      logger.info('[useUserImages] Raw database response', { 
        count: imagesData?.length || 0,
        userId: user.id,
        firstImage: imagesData?.[0] ? {
          id: imagesData[0].id,
          image_url: imagesData[0].image_url,
          created_at: imagesData[0].created_at
        } : null
      });

      // Transform data to match our types
      const transformedImages: GeneratedImage[] = (imagesData || []).map(transformImageRecord);

      setImages(transformedImages);

      logger.info('[useUserImages] Images loaded successfully', { 
        count: transformedImages.length,
        transformedImages: transformedImages.map(img => ({
          id: img.id,
          url: img.url,
          status: img.status
        }))
      });

    } catch (err) {
      const hubError = createImageError(err, 'STORAGE_ERROR');
      setError(hubError);
      
      logger.error('[useUserImages] Failed to load images', { 
        error: hubError.message 
      });

      toast({
        title: "Failed to Load Images",
        description: hubError.message,
        variant: "destructive",
      });

    } finally {
      setLoading(false);
    }
  }, [limit]);

  const addImage = useCallback((image: GeneratedImage) => {
    setImages(prev => [image, ...prev]);
    
    logger.info('[useUserImages] Image added', { 
      imageId: image.id 
    });
  }, []);

  const updateImage = useCallback((imageId: string, updates: Partial<GeneratedImage>) => {
    setImages(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, ...updates } : img
      )
    );

    logger.info('[useUserImages] Image updated', { 
      imageId,
      updates: Object.keys(updates)
    });
  }, []);

  const refetch = useCallback(async () => {
    await loadImages();
  }, [loadImages]);

  // Auto-load images on mount
  useEffect(() => {
    if (autoLoad) {
      loadImages();
    }
  }, [autoLoad, loadImages]);

  return {
    images,
    loading,
    error,
    loadImages,
    addImage,
    updateImage,
    refetch
  };
}

// Helper function to transform database image record to our type
function transformImageRecord(record: any): GeneratedImage {
  return {
    id: record.id,
    url: record.image_url,
    prompt: record.prompt,
    revisedPrompt: record.revised_prompt,
    timestamp: new Date(record.created_at),
    status: record.status,
    metadata: {
      quality: record.quality,
      size: record.size,
      style: record.style,
      model: record.model,
      ...(record.metadata || {})
    },
    conversationId: record.conversation_id,
    parentImageId: record.parent_image_id
  };
}

// Helper function to create standardized HubError for image operations
function createImageError(err: unknown, defaultCode: HubError['code']): HubError {
  if (err instanceof Error) {
    return {
      code: defaultCode,
      message: err.message,
      retryable: true,
      timestamp: new Date()
    };
  }

  return {
    code: defaultCode,
    message: 'An unknown error occurred',
    retryable: true,
    timestamp: new Date()
  };
} 