-- Migration for Create Vid functionality

-- Create created_videos table for storing video creation records
CREATE TABLE IF NOT EXISTS created_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    original_text TEXT,
    voice_character TEXT,
    audio_duration INTEGER DEFAULT 5,
    media_files_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    video_url TEXT,
    file_size BIGINT,
    duration_seconds INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_created_videos_user_id ON created_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_created_videos_status ON created_videos(status);
CREATE INDEX IF NOT EXISTS idx_created_videos_created_at ON created_videos(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE created_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view and manage their own videos
CREATE POLICY "Users can view their own created videos" ON created_videos
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own created videos" ON created_videos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own created videos" ON created_videos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own created videos" ON created_videos
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_created_videos_updated_at 
    BEFORE UPDATE ON created_videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for created videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'created-videos',
    'created-videos',
    true,
    104857600, -- 100MB limit
    '{"video/mp4", "video/quicktime", "video/avi", "video/webm"}'
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy for created videos bucket
-- Users can upload their own videos
CREATE POLICY "Users can upload their own videos" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'created-videos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view their own videos
CREATE POLICY "Users can view their own videos" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'created-videos' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            bucket_id = 'created-videos' -- Allow public access for created videos
        )
    );

-- Users can delete their own videos
CREATE POLICY "Users can delete their own videos" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'created-videos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Add comments for documentation
COMMENT ON TABLE created_videos IS 'Stores records of videos created using the Create Vid feature';
COMMENT ON COLUMN created_videos.filename IS 'Filename of the created video file';
COMMENT ON COLUMN created_videos.original_text IS 'Original text input for TTS generation';
COMMENT ON COLUMN created_videos.voice_character IS 'Selected voice character for TTS';
COMMENT ON COLUMN created_videos.audio_duration IS 'Duration of the audio/video in seconds';
COMMENT ON COLUMN created_videos.media_files_count IS 'Number of media files used in creation';
COMMENT ON COLUMN created_videos.status IS 'Current status of the video creation process';
COMMENT ON COLUMN created_videos.video_url IS 'Public URL of the created video';
COMMENT ON COLUMN created_videos.file_size IS 'Size of the created video file in bytes';
COMMENT ON COLUMN created_videos.duration_seconds IS 'Actual duration of the created video';
COMMENT ON COLUMN created_videos.error_message IS 'Error message if creation failed';
COMMENT ON COLUMN created_videos.metadata IS 'Additional metadata like resolution, codec, etc.'; 