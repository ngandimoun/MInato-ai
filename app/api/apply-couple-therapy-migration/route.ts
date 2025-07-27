import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    console.log('[Apply Migration] Applying couple therapy migration');

    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_couple_therapy.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({
        success: false,
        error: 'Migration file not found'
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

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
          results.push({
            statement: statement.substring(0, 100) + '...',
            success: false,
            error: error.message
          });
          
          // Don't stop on certain expected errors (like policy already exists)
          if (!error.message?.includes('already exists') && !error.message?.includes('does not exist')) {
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
        
        if (!execError.message?.includes('already exists') && !execError.message?.includes('does not exist')) {
          hasError = true;
        }
      }
    }

    console.log('[Apply Migration] Couple therapy migration completed', { 
      totalStatements: statements.length,
      hasError,
      successCount: results.filter(r => r.success).length
    });

    return NextResponse.json({
      success: !hasError,
      message: hasError ? 'Migration completed with some errors' : 'Couple therapy migration applied successfully',
      results,
      totalStatements: statements.length,
      successCount: results.filter(r => r.success).length
    });

  } catch (error: any) {
    console.error('[Apply Migration] Failed to apply couple therapy migration', { error: error.message });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to apply migration: ' + error.message 
      },
      { status: 500 }
    );
  }
} 