-- Creation Hub Storage Setup
-- This script ensures the storage bucket and policies are properly configured

-- ========== STORAGE BUCKET SETUP ==========

-- Check if bucket exists and create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'creation-hub'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'creation-hub',
      'creation-hub',
      true,
      10485760, -- 10MB limit
      ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    );
    
    RAISE NOTICE 'Created creation-hub storage bucket';
  ELSE
    RAISE NOTICE 'creation-hub storage bucket already exists';
  END IF;
END $$;

-- ========== STORAGE POLICIES ==========

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for uploading images
CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'creation-hub' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Policy for viewing images
CREATE POLICY "Users can view their own images"
ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'creation-hub' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR bucket_id = 'creation-hub' -- Allow public read for creation-hub bucket
  )
);

-- Policy for updating images
CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'creation-hub' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'creation-hub' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Policy for deleting images
CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'creation-hub' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- ========== BUCKET CONFIGURATION ==========

-- Update bucket configuration if needed
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'creation-hub';

-- ========== HELPER FUNCTIONS ==========

-- Function to clean up old files in the creation-hub bucket
CREATE OR REPLACE FUNCTION cleanup_old_creation_hub_files(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
BEGIN
  -- Find old files to delete
  FOR file_record IN
    SELECT name, id
    FROM storage.objects
    WHERE bucket_id = 'creation-hub'
      AND created_at < NOW() - INTERVAL '1 day' * days_old
  LOOP
    -- Delete from storage
    DELETE FROM storage.objects 
    WHERE id = file_record.id;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Deleted % old files from creation-hub bucket', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get storage usage for a user
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS TABLE (
  total_files BIGINT,
  total_size BIGINT,
  average_size NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_files,
    COALESCE(SUM(
      CASE 
        WHEN metadata ? 'size' THEN (metadata->>'size')::BIGINT
        ELSE 0
      END
    ), 0)::BIGINT as total_size,
    COALESCE(AVG(
      CASE 
        WHEN metadata ? 'size' THEN (metadata->>'size')::NUMERIC
        ELSE 0
      END
    ), 0) as average_size
  FROM storage.objects
  WHERE bucket_id = 'creation-hub'
    AND (storage.foldername(name))[1] = user_uuid::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== VERIFICATION ==========

-- Verify bucket exists
DO $$
DECLARE
  bucket_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check bucket
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'creation-hub'
  ) INTO bucket_exists;
  
  IF bucket_exists THEN
    RAISE NOTICE '✓ creation-hub bucket exists and is configured';
  ELSE
    RAISE EXCEPTION '✗ creation-hub bucket was not created properly';
  END IF;
  
  -- Check policies
  SELECT COUNT(*) 
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname LIKE '%creation-hub%' OR policyname LIKE '%Users can%images%'
  INTO policy_count;
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✓ Storage policies are configured (% policies found)', policy_count;
  ELSE
    RAISE WARNING '⚠ Only % storage policies found, expected at least 4', policy_count;
  END IF;
  
  RAISE NOTICE '✓ Creation Hub storage setup completed successfully';
END $$; 