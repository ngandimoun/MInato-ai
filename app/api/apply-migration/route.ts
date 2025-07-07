import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20241217_creation_hub_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    logger.info('[Apply Migration] Applying creation hub migration');

    // Split the SQL into individual statements (rough split by semicolon + newline)
    const statements = migrationSQL.split(';\n').filter(stmt => stmt.trim().length > 0);

    const results = [];
    let hasError = false;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      
      if (statement.trim() === ';') continue; // Skip empty statements
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });

        if (error) {
          // Try direct execution if RPC doesn't exist
          const { data: directData, error: directError } = await supabase
            .from('_placeholder_') // This will fail but might give better error info
            .select();

          results.push({
            statement: statement.substring(0, 100) + '...',
            success: false,
            error: error.message || directError?.message
          });
          
          // Don't stop on certain expected errors (like table already exists)
          if (!error.message?.includes('already exists')) {
            hasError = true;
          }
        } else {
          results.push({
            statement: statement.substring(0, 100) + '...',
            success: true
          });
        }
      } catch (execError: any) {
        results.push({
          statement: statement.substring(0, 100) + '...',
          success: false,
          error: execError.message
        });
        
        if (!execError.message?.includes('already exists')) {
          hasError = true;
        }
      }
    }

    logger.info('[Apply Migration] Migration completed', { 
      totalStatements: statements.length,
      hasError,
      successCount: results.filter(r => r.success).length
    });

    return NextResponse.json({
      success: !hasError,
      message: hasError ? 'Migration completed with some errors' : 'Migration applied successfully',
      results,
      totalStatements: statements.length,
      successCount: results.filter(r => r.success).length
    });

  } catch (error: any) {
    logger.error('[Apply Migration] Failed to apply migration', { error: error.message });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to apply migration: ' + error.message 
      },
      { status: 500 }
    );
  }
} 