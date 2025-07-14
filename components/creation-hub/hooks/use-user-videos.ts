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
  // Add fields to distinguish video types
  video_type?: 'created' | 'generated';
  prompt?: string; // For generated videos
  runway_task_id?: string; // For generated videos
  thumbnail_url?: string; // For generated videos
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
      logger.info('[useUserVideos] Loading user videos from both tables');
      const supabase = getBrowserSupabaseClient();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logger.error('[useUserVideos] Authentication failed', { authError });
        setError('Authentication required');
        return;
      }

      logger.info('[useUserVideos] User authenticated', { userId: user.id });

      // Query both tables in parallel
      const [createdVideosResult, generatedVideosResult] = await Promise.all([
        // Query created_videos table (text-to-video/CreateVid videos)
        supabase
          .from('created_videos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / 2)), // Split limit between tables
        
        // Query generated_videos table (Runway API videos)
        supabase
          .from('generated_videos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / 2))
      ]);

      if (createdVideosResult.error) {
        logger.error('[useUserVideos] Created videos query failed', {
          error: createdVideosResult.error,
          userId: user.id
        });
      }

      if (generatedVideosResult.error) {
        if (generatedVideosResult.error.code === '42P01' || generatedVideosResult.error.message.includes('does not exist')) {
          logger.warn('[useUserVideos] Generated videos table does not exist, skipping generated videos');
        } else {
          logger.error('[useUserVideos] Generated videos query failed', {
            error: generatedVideosResult.error,
            userId: user.id
          });
        }
      }

      // Transform created videos to unified format
      const createdVideos: CreatedVideo[] = (createdVideosResult.data || [])
        .filter((video: any) => video.video_url && video.status === 'completed')
        .map((video: any) => ({
          ...video,
          video_type: 'created' as const,
          duration_seconds: video.duration_seconds || video.audio_duration
        }));

      // Transform generated videos to unified format
      const generatedVideos: CreatedVideo[] = (generatedVideosResult.data || [])
        .filter((video: any) => video.video_url) // Remove status filter to include all videos with URL
        .map((video: any) => ({
          id: video.id,
          user_id: video.user_id,
          filename: video.runway_task_id || `runway_${video.id}`,
          video_url: video.video_url,
          original_text: video.prompt,
          prompt: video.prompt,
          duration_seconds: video.duration,
          status: video.status || 'completed',
          media_files_count: 1,
          file_size: video.metadata?.fileSize,
          metadata: video.metadata,
          created_at: video.created_at,
          updated_at: video.updated_at,
          completed_at: video.completed_at,
          video_type: 'generated' as const,
          runway_task_id: video.runway_task_id,
          thumbnail_url: video.thumbnail_url
        }));

      // Merge and sort by creation date
      const allVideos = [...createdVideos, ...generatedVideos]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

      logger.info('[useUserVideos] Videos loaded successfully', {
        createdCount: createdVideos.length,
        generatedCount: generatedVideos.length,
        totalCount: allVideos.length,
        userId: user.id,
        videos: allVideos.map(v => ({
          id: v.id,
          type: v.video_type,
          filename: v.filename,
          hasUrl: !!v.video_url,
          status: v.status
        }))
      });

      setVideos(allVideos);

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

  // Add video to local state
  const addVideo = useCallback((video: CreatedVideo) => {
    setVideos(prev => {
      // Check if video already exists
      const exists = prev.some(v => v.id === video.id);
      if (exists) {
        logger.info('[useUserVideos] Video already exists, updating', { videoId: video.id });
        return prev.map(v => v.id === video.id ? video : v);
      }
      
      logger.info('[useUserVideos] Adding new video to local state', { 
        videoId: video.id, 
        type: video.video_type || 'unknown'
      });
      
      // Add to beginning and maintain limit
      const newVideos = [video, ...prev].slice(0, 50);
      return newVideos;
    });
  }, []);

  // Update video in local state
  const updateVideo = useCallback((video: CreatedVideo) => {
    setVideos(prev => {
      const updated = prev.map(v => v.id === video.id ? video : v);
      logger.info('[useUserVideos] Updated video in local state', { videoId: video.id });
      return updated;
    });
  }, []);

  // Remove video from local state
  const removeVideo = useCallback((videoId: string) => {
    setVideos(prev => {
      const filtered = prev.filter(v => v.id !== videoId);
      logger.info('[useUserVideos] Removed video from local state', { videoId });
      return filtered;
    });
  }, []);

  // Refresh function (alias for loadVideos)
  const refresh = useCallback(async () => {
    await loadVideos();
  }, [loadVideos]);

  return {
    videos,
    loading,
    error,
    refresh,
    addVideo,
    updateVideo,
    removeVideo
  };
}

export type { CreatedVideo }; 