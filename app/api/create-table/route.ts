import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    logger.info('[Create Table] Creating generated_images table');

    // Create the generated_images table with exact schema from migration
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS generated_images (
        id TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        enhanced_prompt TEXT,
        revised_prompt TEXT,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        quality TEXT NOT NULL DEFAULT 'standard' CHECK (quality IN ('standard', 'hd')),
        size TEXT NOT NULL DEFAULT '1024x1024',
        style TEXT NOT NULL DEFAULT 'vivid' CHECK (style IN ('vivid', 'natural')),
        model TEXT NOT NULL DEFAULT 'dall-e-3',
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'failed', 'streaming')),
        conversation_id TEXT,
        parent_image_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // Try to execute using a simple function call
    const { data, error } = await supabase.rpc('exec', { 
      sql: createTableSQL 
    });

    if (error) {
      // If RPC doesn't work, log the issue and continue
      logger.warn('[Create Table] RPC exec failed, table might already exist', { 
        error: error.message 
      });
      
      // Test if table exists by trying to select from it
      const { data: testData, error: testError } = await supabase
        .from('generated_images')
        .select('id')
        .limit(1);

      if (testError) {
        return NextResponse.json({
          success: false,
          error: 'Table creation failed and table does not exist',
          details: {
            rpcError: error.message,
            testError: testError.message
          }
        }, { status: 500 });
      } else {
        return NextResponse.json({
          success: true,
          message: 'Table already exists and is accessible',
          tableExists: true
        });
      }
    }

    // Also create indexes for performance
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
      CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_generated_images_status ON generated_images(status);
    `;

    const { error: indexError } = await supabase.rpc('exec', { 
      sql: createIndexSQL 
    });

    if (indexError) {
      logger.warn('[Create Table] Failed to create indexes', { error: indexError.message });
    }

    logger.info('[Create Table] Table created successfully');

    return NextResponse.json({
      success: true,
      message: 'generated_images table created successfully',
      tableExists: false,
      indexesCreated: !indexError
    });

  } catch (error: any) {
    logger.error('[Create Table] Failed to create table', { error: error.message });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create table: ' + error.message 
      },
      { status: 500 }
    );
  }
} 