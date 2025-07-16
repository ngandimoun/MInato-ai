import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRealtimeFix() {
  try {
    console.log('🔧 Applying realtime broadcast triggers fix...');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', 'fix_realtime_broadcast_triggers.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Realtime broadcast triggers fix applied successfully!');
    console.log('📡 Real-time broadcasts are now handled in the application layer');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function applyRealtimeFixDirect() {
  try {
    console.log('🔧 Applying realtime broadcast triggers fix (direct method)...');
    
    const migrationSQL = `
-- Drop the existing incorrect broadcast functions
DROP FUNCTION IF EXISTS broadcast_game_state_change() CASCADE;
DROP FUNCTION IF EXISTS broadcast_player_change() CASCADE;
DROP FUNCTION IF EXISTS broadcast_game_event() CASCADE;

-- Create simplified functions that don't use the non-existent realtime.broadcast_changes
CREATE OR REPLACE FUNCTION broadcast_game_state_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Application-level broadcasts are handled in the service layer
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY definer;

CREATE OR REPLACE FUNCTION broadcast_player_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Application-level broadcasts are handled in the service layer
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY definer;

CREATE OR REPLACE FUNCTION broadcast_game_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Application-level broadcasts are handled in the service layer
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- Re-apply the triggers
DROP TRIGGER IF EXISTS trigger_broadcast_game_state ON public.live_game_rooms;
CREATE TRIGGER trigger_broadcast_game_state
    AFTER INSERT OR UPDATE OR DELETE ON public.live_game_rooms
    FOR EACH ROW EXECUTE FUNCTION broadcast_game_state_change();

DROP TRIGGER IF EXISTS trigger_broadcast_player_change ON public.live_game_players;
CREATE TRIGGER trigger_broadcast_player_change
    AFTER INSERT OR UPDATE OR DELETE ON public.live_game_players
    FOR EACH ROW EXECUTE FUNCTION broadcast_player_change();

DROP TRIGGER IF EXISTS trigger_broadcast_game_event ON public.game_events;
CREATE TRIGGER trigger_broadcast_game_event
    AFTER INSERT ON public.game_events
    FOR EACH ROW EXECUTE FUNCTION broadcast_game_event();
`;
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error('❌ Statement failed:', error);
          console.error('Statement:', statement);
          process.exit(1);
        }
      }
    }
    
    console.log('✅ Realtime broadcast triggers fix applied successfully!');
    console.log('📡 Real-time broadcasts are now handled in the application layer');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  applyRealtimeFixDirect();
} 