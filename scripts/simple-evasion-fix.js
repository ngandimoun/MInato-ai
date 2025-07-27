const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function fixEvasionPolicy() {
  console.log('🔧 Fixing evasion_room_participants policy...')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // SQL to fix the infinite recursion issue
  const migrationSQL = `
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

    -- ============================================================================
    -- ENABLE ROW LEVEL SECURITY
    -- ============================================================================

    ALTER TABLE public.evasion_rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.evasion_room_participants ENABLE ROW LEVEL SECURITY;

    -- ============================================================================
    -- FIX RLS POLICIES (avoid infinite recursion)
    -- ============================================================================

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view evasion room participants" ON public.evasion_room_participants;
    DROP POLICY IF EXISTS "Users can insert evasion room participants" ON public.evasion_room_participants;
    DROP POLICY IF EXISTS "Users can update evasion room participants" ON public.evasion_room_participants;

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
  `
  
  // Execute the SQL directly
  const { error } = await supabase.rpc('exec_sql', { 
    sql: migrationSQL 
  })
  
  if (error) {
    console.error('❌ Error applying fix:', error)
    process.exit(1)
  }
  
  console.log('✅ Evasion policy fix applied successfully!')
}

fixEvasionPolicy() 