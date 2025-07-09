-- Run this SQL in your Supabase Dashboard > SQL Editor to fix video storage policies

-- 1. Ensure the created-videos bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'created-videos',
    'created-videos',
    true,
    104857600, -- 100MB limit
    '{"video/mp4", "video/quicktime", "video/avi", "video/webm"}'
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = '{"video/mp4", "video/quicktime", "video/avi", "video/webm"}';

-- 2. Drop restrictive policies
DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;

-- 3. Create public access policy for video playback
CREATE POLICY "Public access to created videos" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'created-videos');

-- 4. Ensure upload policy exists for authenticated users
CREATE POLICY "Users can upload their own videos" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'created-videos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 5. Ensure delete policy exists for users' own videos
CREATE POLICY "Users can delete their own videos" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'created-videos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 6. Verify bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'created-videos';

-- 7. Show policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%created%video%';

-- Instructions:
-- 1. Copy and paste this entire script into Supabase Dashboard > SQL Editor
-- 2. Click "Run" to execute
-- 3. Verify the bucket shows as public=true in the results
-- 4. Test video creation and playback again 