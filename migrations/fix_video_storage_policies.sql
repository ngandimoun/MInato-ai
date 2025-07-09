-- Fix video storage policies for better public access

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;

-- Create more permissive policy for public access to created videos
CREATE POLICY "Public access to created videos" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'created-videos');

-- Keep user-specific upload and delete policies
-- (These should already exist, but we ensure they're correct)

-- Ensure bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'created-videos';

-- Add CORS policy for video playback
-- Note: This might need to be done through the Supabase dashboard
-- INSERT INTO storage.cors (bucket_id, allowed_origins, allowed_methods, allowed_headers)
-- VALUES ('created-videos', ARRAY['*'], ARRAY['GET', 'HEAD'], ARRAY['*'])
-- ON CONFLICT (bucket_id) DO UPDATE SET
--   allowed_origins = ARRAY['*'],
--   allowed_methods = ARRAY['GET', 'HEAD'],
--   allowed_headers = ARRAY['*'];

COMMENT ON POLICY "Public access to created videos" ON storage.objects IS 'Allows public access to all files in the created-videos bucket for video playback'; 