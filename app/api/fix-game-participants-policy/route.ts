import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient({
      cookies: () => cookies(),
    })

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply the migration to fix the infinite recursion issue
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
    `

    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('Error applying migration:', error)
      return NextResponse.json({ error: 'Failed to apply migration' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Game participants policy fixed successfully' 
    })

  } catch (error) {
    console.error('Error fixing game participants policy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 