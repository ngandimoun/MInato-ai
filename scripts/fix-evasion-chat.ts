import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixEvasionChat() {
  try {
    const setupSQL = `
      -- Create evasion chat messages table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.evasion_chat_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          room_id UUID NOT NULL REFERENCES public.evasion_rooms(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'text',
          created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Enable RLS
      ALTER TABLE public.evasion_chat_messages ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies to avoid conflicts
      DROP POLICY IF EXISTS "Users can view evasion chat messages" ON public.evasion_chat_messages;
      DROP POLICY IF EXISTS "Users can insert evasion chat messages" ON public.evasion_chat_messages;

      -- Chat message policies
      CREATE POLICY "Users can view evasion chat messages" ON public.evasion_chat_messages
          FOR SELECT USING (
              EXISTS (
                  SELECT 1 FROM public.evasion_room_participants
                  WHERE room_id = evasion_chat_messages.room_id
                  AND user_id::text = auth.uid()::text
                  AND is_active = true
              )
          );

      CREATE POLICY "Users can insert evasion chat messages" ON public.evasion_chat_messages
          FOR INSERT WITH CHECK (
              EXISTS (
                  SELECT 1 FROM public.evasion_room_participants
                  WHERE room_id = evasion_chat_messages.room_id
                  AND user_id::text = auth.uid()::text
                  AND is_active = true
              )
          );

      -- Fix participant count query
      DROP VIEW IF EXISTS public.evasion_room_participant_counts;
      CREATE VIEW public.evasion_room_participant_counts AS
      SELECT room_id, COUNT(*) as count
      FROM public.evasion_room_participants
      WHERE is_active = true
      GROUP BY room_id;
    `;

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: setupSQL
    });

    if (error) {
      throw error;
    }

    console.log('✅ Successfully fixed evasion chat tables and policies');
  } catch (error) {
    console.error('❌ Error fixing evasion chat:', error);
    process.exit(1);
  }
}

fixEvasionChat(); 