-- ============================================================================
-- FILE: migrations/fix_realtime_broadcast_triggers.sql
-- DESC: Fix realtime broadcast triggers by removing incorrect broadcast_changes calls
-- ============================================================================

-- Drop the existing incorrect broadcast functions
DROP FUNCTION IF EXISTS broadcast_game_state_change() CASCADE;
DROP FUNCTION IF EXISTS broadcast_player_change() CASCADE;
DROP FUNCTION IF EXISTS broadcast_game_event() CASCADE;

-- Create simplified functions that don't use the non-existent realtime.broadcast_changes
-- These functions will be no-ops since we're handling broadcasts in the application layer
CREATE OR REPLACE FUNCTION broadcast_game_state_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Application-level broadcasts are handled in the service layer
    -- This trigger is kept for potential future use
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY definer;

CREATE OR REPLACE FUNCTION broadcast_player_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Application-level broadcasts are handled in the service layer
    -- This trigger is kept for potential future use
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY definer;

CREATE OR REPLACE FUNCTION broadcast_game_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Application-level broadcasts are handled in the service layer
    -- This trigger is kept for potential future use
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- Re-apply the triggers (they were dropped when we dropped the functions)
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

-- Comment explaining the change
COMMENT ON FUNCTION broadcast_game_state_change() IS 'Simplified trigger function - real-time broadcasts are handled in the application layer';
COMMENT ON FUNCTION broadcast_player_change() IS 'Simplified trigger function - real-time broadcasts are handled in the application layer';
COMMENT ON FUNCTION broadcast_game_event() IS 'Simplified trigger function - real-time broadcasts are handled in the application layer'; 