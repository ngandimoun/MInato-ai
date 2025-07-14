-- Create storage bucket for video intelligence files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-intelligence',
  'video-intelligence',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
);

-- Create RLS policies for video intelligence bucket
CREATE POLICY "Users can upload their own video intelligence files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'video-intelligence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own video intelligence files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'video-intelligence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own video intelligence files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'video-intelligence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own video intelligence files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'video-intelligence' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to video intelligence files (for analysis)
CREATE POLICY "Public access to video intelligence files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-intelligence'); 