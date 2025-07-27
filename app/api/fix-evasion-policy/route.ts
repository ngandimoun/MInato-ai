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
      -- ============================================================================
      -- FILE: migrations/fix_evasion_tables_policy.sql
      -- DESC: Fix infinite recursion in evasion_room_participants RLS policy
      -- ============================================================================

      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- ============================================================================
      -- CREATE EVASION TABLES (if they don't exist)
      -- ============================================================================

      -- Evasion rooms table
      CREATE TABLE IF NOT EXISTS public.evasion_rooms (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          host_user_id UUID NOT NULL,
          current_video_url TEXT,
          current_video_position INTEGER DEFAULT 0,
          is_playing BOOLEAN DEFAULT false,
          max_participants INTEGER DEFAULT 10,
          is_private BOOLEAN DEFAULT false,
          room_code VARCHAR(20) UNIQUE NOT NULL DEFAULT UPPER(substring(md5(random()::text) from 1 for 6)),
          created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Evasion room participants table
      CREATE TABLE IF NOT EXISTS public.evasion_room_participants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id UUID NOT NULL REFERENCES public.evasion_rooms(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
          last_seen TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          
          UNIQUE(room_id, user_id)
      );

      -- Evasion chat messages table
      CREATE TABLE IF NOT EXISTS public.evasion_chat_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id UUID NOT NULL REFERENCES public.evasion_rooms(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'video_action')),
          created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- ============================================================================
      -- CREATE INDEXES
      -- ============================================================================

      CREATE INDEX IF NOT EXISTS idx_evasion_rooms_host_user ON public.evasion_rooms(host_user_id);
      CREATE INDEX IF NOT EXISTS idx_evasion_rooms_room_code ON public.evasion_rooms(room_code);
      CREATE INDEX IF NOT EXISTS idx_evasion_rooms_created_at ON public.evasion_rooms(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_evasion_room_participants_room ON public.evasion_room_participants(room_id);
      CREATE INDEX IF NOT EXISTS idx_evasion_room_participants_user ON public.evasion_room_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_evasion_room_participants_active ON public.evasion_room_participants(is_active);

      CREATE INDEX IF NOT EXISTS idx_evasion_chat_messages_room ON public.evasion_chat_messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_evasion_chat_messages_created_at ON public.evasion_chat_messages(created_at DESC);

      -- ============================================================================
      -- ENABLE ROW LEVEL SECURITY
      -- ============================================================================

      ALTER TABLE public.evasion_rooms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.evasion_room_participants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.evasion_chat_messages ENABLE ROW LEVEL SECURITY;

      -- ============================================================================
      -- FIX RLS POLICIES (avoid infinite recursion)
      -- ============================================================================

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view evasion rooms" ON public.evasion_rooms;
      DROP POLICY IF EXISTS "Users can create evasion rooms" ON public.evasion_rooms;
      DROP POLICY IF EXISTS "Users can update evasion rooms" ON public.evasion_rooms;

      DROP POLICY IF EXISTS "Users can view evasion room participants" ON public.evasion_room_participants;
      DROP POLICY IF EXISTS "Users can insert evasion room participants" ON public.evasion_room_participants;
      DROP POLICY IF EXISTS "Users can update evasion room participants" ON public.evasion_room_participants;

      DROP POLICY IF EXISTS "Users can view evasion chat messages" ON public.evasion_chat_messages;
      DROP POLICY IF EXISTS "Users can insert evasion chat messages" ON public.evasion_chat_messages;

      -- Evasion rooms policies
      CREATE POLICY "Users can view evasion rooms" ON public.evasion_rooms
          FOR SELECT USING (
              is_private = false OR 
              auth.uid()::text = host_user_id::text OR
              EXISTS (
                  SELECT 1 FROM public.evasion_room_participants 
                  WHERE room_id = public.evasion_rooms.id 
                  AND user_id::text = auth.uid()::text
              )
          );

      CREATE POLICY "Users can create evasion rooms" ON public.evasion_rooms
          FOR INSERT WITH CHECK (auth.uid()::text = host_user_id::text);

      CREATE POLICY "Users can update evasion rooms" ON public.evasion_rooms
          FOR UPDATE USING (auth.uid()::text = host_user_id::text);

      -- Evasion room participants policies (FIXED - no infinite recursion)
      CREATE POLICY "Users can view evasion room participants" ON public.evasion_room_participants
          FOR SELECT USING (
              user_id::text = auth.uid()::text OR
              EXISTS (
                  SELECT 1 FROM public.evasion_rooms 
                  WHERE id = room_id 
                  AND host_user_id::text = auth.uid()::text
              )
          );

      CREATE POLICY "Users can insert evasion room participants" ON public.evasion_room_participants
          FOR INSERT WITH CHECK (
              user_id::text = auth.uid()::text OR
              EXISTS (
                  SELECT 1 FROM public.evasion_rooms 
                  WHERE id = room_id AND host_user_id::text = auth.uid()::text
              )
          );

      CREATE POLICY "Users can update evasion room participants" ON public.evasion_room_participants
          FOR UPDATE USING (
              user_id::text = auth.uid()::text OR
              EXISTS (
                  SELECT 1 FROM public.evasion_rooms 
                  WHERE id = room_id AND host_user_id::text = auth.uid()::text
              )
          );

      -- Evasion chat messages policies
      CREATE POLICY "Users can view evasion chat messages" ON public.evasion_chat_messages
          FOR SELECT USING (
              EXISTS (
                  SELECT 1 FROM public.evasion_rooms 
                  WHERE id = room_id 
                  AND (host_user_id::text = auth.uid()::text OR
                       EXISTS (SELECT 1 FROM public.evasion_room_participants p 
                              WHERE p.room_id = id AND p.user_id::text = auth.uid()::text))
              )
          );

      CREATE POLICY "Users can insert evasion chat messages" ON public.evasion_chat_messages
          FOR INSERT WITH CHECK (
              user_id::text = auth.uid()::text AND
              EXISTS (
                  SELECT 1 FROM public.evasion_rooms 
                  WHERE id = room_id 
                  AND (host_user_id::text = auth.uid()::text OR
                       EXISTS (SELECT 1 FROM public.evasion_room_participants p 
                              WHERE p.room_id = id AND p.user_id::text = auth.uid()::text))
              )
          );

      -- ============================================================================
      -- SERVICE ROLE POLICIES
      -- ============================================================================

      CREATE POLICY "Service role full access to evasion_rooms" ON public.evasion_rooms
          FOR ALL TO service_role USING (true) WITH CHECK (true);

      CREATE POLICY "Service role full access to evasion_room_participants" ON public.evasion_room_participants
          FOR ALL TO service_role USING (true) WITH CHECK (true);

      CREATE POLICY "Service role full access to evasion_chat_messages" ON public.evasion_chat_messages
          FOR ALL TO service_role USING (true) WITH CHECK (true);

      -- ============================================================================
      -- TRIGGERS
      -- ============================================================================

      -- Create trigger to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_evasion_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = timezone('utc'::text, now());
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_evasion_rooms_updated_at BEFORE UPDATE ON public.evasion_rooms
          FOR EACH ROW EXECUTE FUNCTION update_evasion_updated_at_column();

      -- ============================================================================
      -- COMMENTS
      -- ============================================================================

      COMMENT ON TABLE public.evasion_rooms IS 'Evasion therapy video rooms for synchronized video watching';
      COMMENT ON TABLE public.evasion_room_participants IS 'Participants in evasion therapy rooms';
      COMMENT ON TABLE public.evasion_chat_messages IS 'Chat messages in evasion therapy rooms';
    `

    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('Error applying migration:', error)
      return NextResponse.json({ error: 'Failed to apply migration' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Evasion tables policy fixed successfully' 
    })

  } catch (error) {
    console.error('Error fixing evasion policy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 