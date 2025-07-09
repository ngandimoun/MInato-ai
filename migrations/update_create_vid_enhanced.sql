-- Update created_videos table for enhanced Create Vid functionality
ALTER TABLE IF EXISTS created_videos 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 5;

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Users can view their own created videos" ON created_videos;
DROP POLICY IF EXISTS "Users can insert their own created videos" ON created_videos;

CREATE POLICY "Users can view their own created videos" ON created_videos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own created videos" ON created_videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure the storage bucket exists and has proper policies
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('created-videos', 'created-videos', true, 104857600)
    ON CONFLICT (id) DO UPDATE SET
        file_size_limit = 104857600,
        public = true;
END $$;

-- Storage policies for created-videos bucket
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Give authenticated users access to own folder" ON storage.objects;

CREATE POLICY "Users can upload their own videos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'created-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own videos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'created-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own videos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'created-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    ); 