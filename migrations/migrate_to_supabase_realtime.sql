-- ============================================================================
-- FILE: migrations/migrate_to_supabase_realtime.sql
-- DESC: Migrate from Convex to Supabase Realtime for multiplayer games
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- REALTIME MULTIPLAYER GAME TABLES
-- ============================================================================

-- Live game rooms for real-time multiplayer gameplay
CREATE TABLE IF NOT EXISTS public.live_game_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(20) UNIQUE NOT NULL,
    topic VARCHAR(100) UNIQUE NOT NULL, -- For realtime channel
    
    -- Game configuration
    game_type_id UUID REFERENCES public.game_types(id),
    host_user_id UUID NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'easy', 'medium', 'hard', 'expert')),
    max_players INTEGER NOT NULL DEFAULT 4,
    rounds INTEGER NOT NULL DEFAULT 10,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('solo', 'multiplayer')),
    
    -- Room state
    status VARCHAR(20) NOT NULL CHECK (status IN ('lobby', 'in_progress', 'finished', 'cancelled')) DEFAULT 'lobby',
    current_round INTEGER NOT NULL DEFAULT 0,
    current_question_index INTEGER DEFAULT 0,
    
    -- Game content
    questions JSONB DEFAULT '[]'::jsonb,
    current_question JSONB,
    
    -- Game settings with user preferences
    settings JSONB DEFAULT '{
        "auto_advance": true,
        "show_explanations": true,
        "time_per_question": 30,
        "language": "en",
        "ai_personality": "friendly",
        "topic_focus": "general",
        "user_interests": [],
        "user_news_categories": []
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Live game players for presence tracking
CREATE TABLE IF NOT EXISTS public.live_game_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.live_game_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    
    -- Player state
    score INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    is_online BOOLEAN NOT NULL DEFAULT true,
    connection_id TEXT, -- For tracking websocket connections
    
    -- Current answer tracking
    current_answer_index INTEGER,
    answer_submitted_at TIMESTAMPTZ,
    answer_time_taken INTEGER, -- milliseconds
    
    -- Metadata
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(room_id, user_id)
);

-- Game invitations for multiplayer
CREATE TABLE IF NOT EXISTS public.game_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.live_game_rooms(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL,
    invited_user_id UUID NOT NULL,
    invited_username VARCHAR(100) NOT NULL,
    
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '1 hour')
);

-- Real-time game events for broadcast
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.live_game_rooms(id) ON DELETE CASCADE,
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User preferences for games (enhanced from existing user_states)
CREATE TABLE IF NOT EXISTS public.user_game_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Game preferences
    preferred_difficulty VARCHAR(20) DEFAULT 'medium',
    preferred_time_per_question INTEGER DEFAULT 30,
    auto_advance_questions BOOLEAN DEFAULT true,
    show_explanations BOOLEAN DEFAULT true,
    
    -- AI personalization
    ai_personality VARCHAR(50) DEFAULT 'friendly',
    topic_focus VARCHAR(100) DEFAULT 'general',
    interest_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    news_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Display preferences
    theme VARCHAR(20) DEFAULT 'auto',
    sound_effects BOOLEAN DEFAULT true,
    animations BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_live_game_rooms_host ON public.live_game_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_live_game_rooms_status ON public.live_game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_live_game_rooms_topic ON public.live_game_rooms(topic);
CREATE INDEX IF NOT EXISTS idx_live_game_rooms_room_code ON public.live_game_rooms(room_code);

CREATE INDEX IF NOT EXISTS idx_live_game_players_room ON public.live_game_players(room_id);
CREATE INDEX IF NOT EXISTS idx_live_game_players_user ON public.live_game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_live_game_players_online ON public.live_game_players(is_online);

CREATE INDEX IF NOT EXISTS idx_game_invitations_invited_user ON public.game_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_status ON public.game_invitations(status);

CREATE INDEX IF NOT EXISTS idx_game_events_room ON public.game_events(room_id);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON public.game_events(event_type);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.live_game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_preferences ENABLE ROW LEVEL SECURITY;

-- Live game rooms: Users can see rooms they host or participate in
DROP POLICY IF EXISTS "Users can view accessible game rooms" ON public.live_game_rooms;
CREATE POLICY "Users can view accessible game rooms" ON public.live_game_rooms
    FOR SELECT USING (
        auth.uid()::text = host_user_id::text OR
        EXISTS (
            SELECT 1 FROM public.live_game_players 
            WHERE room_id = public.live_game_rooms.id 
            AND user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can create game rooms" ON public.live_game_rooms;
CREATE POLICY "Users can create game rooms" ON public.live_game_rooms
    FOR INSERT WITH CHECK (auth.uid()::text = host_user_id::text);

DROP POLICY IF EXISTS "Hosts can update their game rooms" ON public.live_game_rooms;
CREATE POLICY "Hosts can update their game rooms" ON public.live_game_rooms
    FOR UPDATE USING (auth.uid()::text = host_user_id::text);

-- Live game players: Users can see players in their rooms
DROP POLICY IF EXISTS "Users can view players in their rooms" ON public.live_game_players;
CREATE POLICY "Users can view players in their rooms" ON public.live_game_players
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.live_game_rooms r
            WHERE r.id = public.live_game_players.room_id
            AND (r.host_user_id::text = auth.uid()::text OR
                 EXISTS (SELECT 1 FROM public.live_game_players p2 
                        WHERE p2.room_id = r.id AND p2.user_id::text = auth.uid()::text))
        )
    );

DROP POLICY IF EXISTS "Users can join game rooms" ON public.live_game_players;
CREATE POLICY "Users can join game rooms" ON public.live_game_players
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own player data" ON public.live_game_players;
CREATE POLICY "Users can update their own player data" ON public.live_game_players
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Game invitations: Users can see their own invitations
DROP POLICY IF EXISTS "Users can view their invitations" ON public.game_invitations;
CREATE POLICY "Users can view their invitations" ON public.game_invitations
    FOR SELECT USING (
        auth.uid()::text = invited_user_id::text OR 
        auth.uid()::text = host_user_id::text
    );

DROP POLICY IF EXISTS "Users can create invitations for their rooms" ON public.game_invitations;
CREATE POLICY "Users can create invitations for their rooms" ON public.game_invitations
    FOR INSERT WITH CHECK (
        auth.uid()::text = host_user_id::text AND
        EXISTS (SELECT 1 FROM public.live_game_rooms WHERE id = room_id AND host_user_id::text = auth.uid()::text)
    );

-- Game events: Users can see events in their rooms
DROP POLICY IF EXISTS "Users can view events in their rooms" ON public.game_events;
CREATE POLICY "Users can view events in their rooms" ON public.game_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.live_game_rooms r
            WHERE r.id = public.game_events.room_id
            AND (r.host_user_id::text = auth.uid()::text OR
                 EXISTS (SELECT 1 FROM public.live_game_players p 
                        WHERE p.room_id = r.id AND p.user_id::text = auth.uid()::text))
        )
    );

-- User preferences: Users can only access their own preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_game_preferences;
CREATE POLICY "Users can view their own preferences" ON public.user_game_preferences
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- REALTIME PUBLICATION FOR POSTGRES CHANGES
-- ============================================================================

-- Create publication for realtime
DROP PUBLICATION IF EXISTS supabase_realtime_games;
CREATE PUBLICATION supabase_realtime_games FOR TABLE
    public.live_game_rooms,
    public.live_game_players,
    public.game_events,
    public.game_invitations;

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_live_game_rooms_updated_at ON public.live_game_rooms;
CREATE TRIGGER update_live_game_rooms_updated_at 
    BEFORE UPDATE ON public.live_game_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_game_preferences_updated_at ON public.user_game_preferences;
CREATE TRIGGER update_user_game_preferences_updated_at 
    BEFORE UPDATE ON public.user_game_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to broadcast game state changes
CREATE OR REPLACE FUNCTION broadcast_game_state_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast to the room topic for realtime updates
    PERFORM realtime.broadcast_changes(
        'game_room:' || COALESCE(NEW.topic, OLD.topic),
        TG_OP,
        'game_state_change',
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- Function to broadcast player changes
CREATE OR REPLACE FUNCTION broadcast_player_change()
RETURNS TRIGGER AS $$
DECLARE
    room_topic TEXT;
BEGIN
    -- Get the room topic
    SELECT topic INTO room_topic 
    FROM public.live_game_rooms 
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    
    -- Broadcast player changes to the room
    PERFORM realtime.broadcast_changes(
        'game_room:' || room_topic,
        TG_OP,
        'player_change',
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- Function to broadcast game events
CREATE OR REPLACE FUNCTION broadcast_game_event()
RETURNS TRIGGER AS $$
DECLARE
    room_topic TEXT;
BEGIN
    -- Get the room topic
    SELECT topic INTO room_topic 
    FROM public.live_game_rooms 
    WHERE id = NEW.room_id;
    
    -- Broadcast game events to the room
    PERFORM realtime.broadcast_changes(
        'game_room:' || room_topic,
        TG_OP,
        'game_event',
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- Apply broadcast triggers
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

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate a 6-character alphanumeric code
        code := UPPER(substring(md5(random()::text) from 1 for 6));
        
        -- Check if it already exists
        SELECT COUNT(*) INTO exists_count 
        FROM public.live_game_rooms 
        WHERE room_code = code;
        
        -- If unique, break the loop
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired rooms and inactive players
CREATE OR REPLACE FUNCTION cleanup_game_data()
RETURNS void AS $$
BEGIN
    -- Mark players as offline if last_seen > 5 minutes ago
    UPDATE public.live_game_players 
    SET is_online = false 
    WHERE is_online = true 
    AND last_seen < (NOW() - INTERVAL '5 minutes');
    
    -- Cancel games with no online players after 30 minutes
    UPDATE public.live_game_rooms 
    SET status = 'cancelled'
    WHERE status IN ('lobby', 'in_progress')
    AND created_at < (NOW() - INTERVAL '30 minutes')
    AND NOT EXISTS (
        SELECT 1 FROM public.live_game_players 
        WHERE room_id = public.live_game_rooms.id 
        AND is_online = true
    );
    
    -- Delete finished/cancelled games older than 24 hours
    DELETE FROM public.live_game_rooms 
    WHERE status IN ('finished', 'cancelled')
    AND updated_at < (NOW() - INTERVAL '24 hours');
    
    -- Expire old invitations
    UPDATE public.game_invitations 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert some sample game preferences for existing users
INSERT INTO public.user_game_preferences (user_id, preferred_difficulty, interest_categories)
SELECT DISTINCT user_id, 'medium', ARRAY['general']
FROM public.user_game_stats
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_game_preferences ugp 
    WHERE ugp.user_id = public.user_game_stats.user_id
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.live_game_rooms IS 'Real-time multiplayer game rooms with Supabase Realtime integration';
COMMENT ON TABLE public.live_game_players IS 'Live player presence and state tracking';
COMMENT ON TABLE public.game_invitations IS 'Game invitations for multiplayer sessions';
COMMENT ON TABLE public.game_events IS 'Real-time game events for broadcast';
COMMENT ON TABLE public.user_game_preferences IS 'Enhanced user preferences for game personalization';

COMMENT ON COLUMN public.live_game_rooms.topic IS 'Realtime channel topic for this game room';
COMMENT ON COLUMN public.live_game_rooms.room_code IS 'Human-readable room code for joining games';
COMMENT ON COLUMN public.live_game_players.connection_id IS 'WebSocket connection identifier for presence tracking';
COMMENT ON COLUMN public.live_game_players.is_online IS 'Real-time online status for presence';
