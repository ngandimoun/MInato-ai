import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if generated_images table exists
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_table_info', { table_name: 'generated_images' })
      .select();

    // If RPC doesn't exist, try a simple query
    const { data: testData, error: testError } = await supabase
      .from('generated_images')
      .select('id')
      .limit(1);

    // Also check what tables exist in public schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    return NextResponse.json({
      generated_images_exists: !testError,
      test_error: testError ? {
        message: testError.message,
        details: testError.details,
        hint: testError.hint,
        code: testError.code
      } : null,
      available_tables: schemaData || [],
      schema_error: schemaError
    });

  } catch (error) {
    logger.error('[Debug Tables API] Error checking tables', { error });
    return NextResponse.json(
      { error: 'Failed to check tables' },
      { status: 500 }
    );
  }
} 