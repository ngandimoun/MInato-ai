-- Add generated_videos table for video generation
CREATE TABLE IF NOT EXISTS generated_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    runway_task_id TEXT UNIQUE NOT NULL,
    original_image_url TEXT,
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'cancelled')),
    video_url TEXT,
    thumbnail_url TEXT,
    duration INTEGER DEFAULT 5 NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_status ON generated_videos(status);
CREATE INDEX IF NOT EXISTS idx_generated_videos_created_at ON generated_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_videos_runway_task_id ON generated_videos(runway_task_id);

-- Enable Row Level Security (RLS)
ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view and manage their own videos
CREATE POLICY "Users can view their own videos" ON generated_videos
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON generated_videos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON generated_videos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" ON generated_videos
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

CREATE TRIGGER update_generated_videos_updated_at 
    BEFORE UPDATE ON generated_videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE generated_videos IS 'Stores video generation records and their status';
COMMENT ON COLUMN generated_videos.runway_task_id IS 'Unique task ID from Runway API';
COMMENT ON COLUMN generated_videos.original_image_url IS 'URL of the source image used for video generation';
COMMENT ON COLUMN generated_videos.prompt IS 'Original user prompt for video generation';
COMMENT ON COLUMN generated_videos.enhanced_prompt IS 'Enhanced prompt sent to Runway API';
COMMENT ON COLUMN generated_videos.status IS 'Current status of the video generation process';
COMMENT ON COLUMN generated_videos.video_url IS 'URL of the generated video file';
COMMENT ON COLUMN generated_videos.thumbnail_url IS 'URL of the video thumbnail';
COMMENT ON COLUMN generated_videos.duration IS 'Duration of the video in seconds';
COMMENT ON COLUMN generated_videos.error_message IS 'Error message if generation failed';
COMMENT ON COLUMN generated_videos.metadata IS 'Additional metadata like file size, dimensions, etc.'; 