import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    logger.info('[Apply Migration] Applying game_participants policy fix');

    // SQL to fix the infinite recursion issue in game_participants RLS policy
    const migrationSQL = `
      -- Fix infinite recursion in game_participants RLS policy
      -- The issue is caused by the policy querying the same table it's protecting

      -- Drop the problematic policy
      DROP POLICY IF EXISTS "Users can view game participants" ON public.game_participants;

      -- Create a simplified policy that avoids circular references
      -- Users can see participants if:
      -- 1. They are the participant themselves, OR
      -- 2. They are the host of the game session
      CREATE POLICY "Users can view game participants" ON public.game_participants
          FOR SELECT USING (
              user_id::text = auth.uid()::text OR
              EXISTS (
                  SELECT 1 FROM public.game_sessions_history 
                  WHERE id = game_session_id 
                  AND host_user_id::text = auth.uid()::text
              )
          );

      -- Also update the insert policy to be consistent
      DROP POLICY IF EXISTS "Users can insert game participants" ON public.game_participants;
      CREATE POLICY "Users can insert game participants" ON public.game_participants
          FOR INSERT WITH CHECK (
              user_id::text = auth.uid()::text OR
              EXISTS (
                  SELECT 1 FROM public.game_sessions_history 
                  WHERE id = game_session_id AND host_user_id::text = auth.uid()::text
              )
          );

      -- Add an update policy for completeness
      DROP POLICY IF EXISTS "Users can update game participants" ON public.game_participants;
      CREATE POLICY "Users can update game participants" ON public.game_participants
          FOR UPDATE USING (
              user_id::text = auth.uid()::text OR
              EXISTS (
                  SELECT 1 FROM public.game_sessions_history 
                  WHERE id = game_session_id AND host_user_id::text = auth.uid()::text
              )
          );
    `;

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

    logger.info('[Apply Migration] Game participants policy fix completed', { 
      totalStatements: statements.length,
      hasError,
      successCount: results.filter(r => r.success).length
    });

    return NextResponse.json({
      success: !hasError,
      message: hasError ? 'Migration completed with some errors' : 'Game participants policy fixed successfully',
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