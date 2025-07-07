import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    logger.info('[Setup Database] Setting up creation-hub storage bucket');

    // Use admin client to create the bucket
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Supabase admin client not available' 
      }, { status: 500 });
    }

    // Create the creation-hub bucket using admin client
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
      .createBucket('creation-hub', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      });

    if (bucketError && !bucketError.message.includes('already exists')) {
      logger.error('[Setup Database] Failed to create bucket', bucketError);
      return NextResponse.json({ 
        error: `Failed to create storage bucket: ${bucketError.message}` 
      }, { status: 500 });
    }

    // Also run the SQL setup if bucket creation was successful
    try {
      const supabase = await createServerSupabaseClient();
      
      // Execute the storage setup SQL
      const setupSQL = `
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

        -- Enable RLS on storage.objects if not already enabled
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist (safer cleanup)
        DROP POLICY IF EXISTS "Users can upload creation hub images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can view creation hub images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update creation hub images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete creation hub images" ON storage.objects;

        -- Create storage policies
        CREATE POLICY "Users can upload creation hub images"
        ON storage.objects
        FOR INSERT 
        WITH CHECK (
          bucket_id = 'creation-hub' 
          AND auth.uid()::text = (storage.foldername(name))[1]
          AND auth.role() = 'authenticated'
        );

        CREATE POLICY "Users can view creation hub images"
        ON storage.objects
        FOR SELECT 
        USING (
          bucket_id = 'creation-hub' 
          AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR bucket_id = 'creation-hub' -- Allow public read for creation-hub bucket
          )
        );

        CREATE POLICY "Users can update creation hub images"
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

        CREATE POLICY "Users can delete creation hub images"
        ON storage.objects
        FOR DELETE 
        USING (
          bucket_id = 'creation-hub' 
          AND auth.uid()::text = (storage.foldername(name))[1]
          AND auth.role() = 'authenticated'
        );
      `;

      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: setupSQL });
      if (sqlError) {
        logger.warn('[Setup Database] SQL setup had warnings', sqlError);
      }
    } catch (sqlError) {
      logger.warn('[Setup Database] SQL setup failed, but bucket creation succeeded', sqlError);
    }

    logger.info('[Setup Database] Storage bucket setup completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Creation Hub storage bucket setup completed',
      bucket: bucketData || 'Already exists'
    });

  } catch (error: any) {
    logger.error('[Setup Database] Setup failed', error);
    return NextResponse.json({ 
      error: `Setup failed: ${error.message}` 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'POST to this endpoint to set up the creation-hub storage bucket' 
  });
} 