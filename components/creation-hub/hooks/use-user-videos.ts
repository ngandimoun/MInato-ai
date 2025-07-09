import { useState, useEffect, useCallback } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { logger } from '@/memory-framework/config';

interface CreatedVideo {
  id: string;
  user_id: string;
  filename: string;
  video_url: string;
  original_text?: string;
  voice_character?: string;
  audio_duration?: number;
  duration_seconds?: number;
  status: string;
  media_files_count?: number;
  file_size?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface UseUserVideosOptions {
  autoLoad?: boolean;
  limit?: number;
}

interface UseUserVideosReturn {
  videos: CreatedVideo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addVideo: (video: CreatedVideo) => void;
  updateVideo: (video: CreatedVideo) => void;
  removeVideo: (videoId: string) => void;
}

export function useUserVideos(options: UseUserVideosOptions = {}): UseUserVideosReturn {
  const { autoLoad = true, limit = 50 } = options;
  
  const [videos, setVideos] = useState<CreatedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      logger.info('[useUserVideos] Loading user videos');
      const supabase = getBrowserSupabaseClient();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logger.error('[useUserVideos] Authentication failed', { authError });
        setError('Authentication required');
        return;
      }

      logger.info('[useUserVideos] User authenticated', { userId: user.id });

      const { data, error: dbError } = await supabase
        .from('created_videos')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbError) {
        logger.error('[useUserVideos] Database query failed', {
          error: dbError,
          userId: user.id
        });
        setError('Failed to load videos');
        return;
      }

      logger.info('[useUserVideos] Raw database response', {
        count: data?.length || 0,
        userId: user.id,
        data: data?.map((v: any) => ({
          id: v.id,
          filename: v.filename,
          status: v.status,
          created_at: v.created_at,
          video_url: v.video_url ? v.video_url.substring(0, 50) + '...' : 'no url'
        }))
      });

      const validVideos = (data || []).filter((video: any) => {
        const isValid = video.video_url && video.status === 'completed';
        if (!isValid) {
          logger.warn('[useUserVideos] Invalid video filtered out', {
            id: video.id,
            hasUrl: !!video.video_url,
            status: video.status
          });
        }
        return isValid;
      });

      setVideos(validVideos);
      logger.info('[useUserVideos] Videos loaded successfully', {
        totalCount: data?.length || 0,
        validCount: validVideos.length,
        userId: user.id
      });

    } catch (error: any) {
      logger.error('[useUserVideos] Failed to load videos', {
        error: error.message,
        stack: error.stack
      });
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Auto-load videos on mount
  useEffect(() => {
    if (autoLoad) {
      loadVideos();
    }
  }, [autoLoad, loadVideos]);

  // Add video to the local state
  const addVideo = useCallback((video: CreatedVideo) => {
    logger.info('[useUserVideos] addVideo called', {
      videoId: video.id,
      filename: video.filename,
      status: video.status,
      hasUrl: !!video.video_url
    });
    
    setVideos(prev => {
      // Check if video already exists
      const exists = prev.some(v => v.id === video.id);
      if (exists) {
        logger.warn('[useUserVideos] Video already exists, skipping add', {
          videoId: video.id
        });
        return prev;
      }
      
      logger.info('[useUserVideos] Video added to local state', {
        videoId: video.id,
        filename: video.filename,
        previousCount: prev.length,
        newCount: prev.length + 1
      });
      
      return [video, ...prev];
    });
  }, []);

  // Update video in the local state
  const updateVideo = useCallback((updatedVideo: CreatedVideo) => {
    setVideos(prev => {
      const updated = prev.map(video => 
        video.id === updatedVideo.id ? updatedVideo : video
      );
      
      logger.info('[useUserVideos] Video updated', {
        videoId: updatedVideo.id,
        filename: updatedVideo.filename
      });
      
      return updated;
    });
  }, []);

  // Remove video from the local state
  const removeVideo = useCallback((videoId: string) => {
    setVideos(prev => {
      const filtered = prev.filter(video => video.id !== videoId);
      
      logger.info('[useUserVideos] Video removed', {
        videoId,
        remainingCount: filtered.length
      });
      
      return filtered;
    });
  }, []);

  return {
    videos,
    loading,
    error,
    refresh: loadVideos,
    addVideo,
    updateVideo,
    removeVideo,
  };
}

export type { CreatedVideo }; 