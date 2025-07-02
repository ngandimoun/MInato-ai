-- ============================================================================
-- FILE: migrations/add_game_tables.sql
-- DESC: Add game-related tables for Minato AI Games feature
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game types/templates table
CREATE TABLE IF NOT EXISTS public.game_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'trivia', 'puzzle', 'strategy', etc.
    min_players INTEGER NOT NULL DEFAULT 1,
    max_players INTEGER NOT NULL DEFAULT 8,
    default_rounds INTEGER NOT NULL DEFAULT 10,
    difficulty_levels TEXT[] NOT NULL DEFAULT ARRAY['beginner', 'easy', 'medium', 'hard', 'expert'],
    estimated_duration_minutes INTEGER, -- estimated game duration
    icon_name VARCHAR(50), -- lucide icon name
    color_theme VARCHAR(50), -- theme color for UI
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Game sessions history table (permanent record in Supabase)
CREATE TABLE IF NOT EXISTS public.game_sessions_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    convex_game_id VARCHAR(100), -- Links to Convex live_games table
    game_type_id UUID NOT NULL REFERENCES public.game_types(id),
    host_user_id UUID NOT NULL, -- Should match auth.users.id
    
    -- Game configuration
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'easy', 'medium', 'hard', 'expert')),
    max_players INTEGER NOT NULL DEFAULT 2,
    rounds INTEGER NOT NULL DEFAULT 10,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('solo', 'multiplayer')),
    
    -- Game state
    status VARCHAR(20) NOT NULL CHECK (status IN ('lobby', 'in_progress', 'completed', 'cancelled')) DEFAULT 'lobby',
    
    -- Results (populated when game finishes)
    final_scores JSONB, -- Array of {user_id, score, rank, etc.}
    winner_user_id UUID, -- Winner's user ID
    total_duration_seconds INTEGER, -- Actual game duration
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Game settings
    settings JSONB DEFAULT '{}'::jsonb
);

-- Game participants table (who played in each game)
CREATE TABLE IF NOT EXISTS public.game_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_session_id UUID NOT NULL REFERENCES public.game_sessions_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Should match auth.users.id
    
    -- Player stats
    score INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_answers INTEGER NOT NULL DEFAULT 0,
    rank INTEGER, -- Final rank in the game (1st, 2nd, etc.)
    
    -- Timing
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    left_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(game_session_id, user_id)
);

-- User game statistics table
CREATE TABLE IF NOT EXISTS public.user_game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- Should match auth.users.id
    
    -- Overall stats
    total_games_played INTEGER NOT NULL DEFAULT 0,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- XP and leveling
    xp_points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    
    -- Game type specific stats (JSONB for flexibility)
    game_type_stats JSONB DEFAULT '{}'::jsonb, -- {game_type_name: {games_played, wins, best_score, etc.}}
    
    -- Achievements and badges
    achievements JSONB DEFAULT '[]'::jsonb, -- Array of achievement objects
    
    -- Preferences
    favorite_game_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_difficulty VARCHAR(20) DEFAULT 'medium',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Game invitations table (temporary invites)
CREATE TABLE IF NOT EXISTS public.game_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_session_id UUID NOT NULL REFERENCES public.game_sessions_history(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL, -- Should match auth.users.id
    invited_user_id UUID NOT NULL, -- Should match auth.users.id
    
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '24 hours'),
    
    UNIQUE(game_session_id, invited_user_id)
);

-- Insert default game types
INSERT INTO public.game_types (name, display_name, description, category, min_players, max_players, default_rounds, icon_name, color_theme) VALUES
('history_trivia', 'History Trivia', 'Test your knowledge of world history with AI-generated questions', 'trivia', 1, 8, 10, 'BookOpen', 'palette-aki-no-mori'),
('science_quiz', 'Science Quiz', 'Explore the wonders of science through challenging questions', 'trivia', 1, 8, 10, 'Atom', 'palette-shinkai-depths'),
('geography_challenge', 'Geography Challenge', 'Navigate the world with geography questions', 'trivia', 1, 8, 15, 'Globe', 'palette-komorebi-path'),
('literature_quiz', 'Literature Quiz', 'Dive into the world of books and authors', 'trivia', 1, 8, 12, 'Library', 'palette-sakura-blossom'),
('movie_trivia', 'Movie Trivia', 'Test your knowledge of cinema and entertainment', 'trivia', 1, 8, 15, 'Film', 'palette-neo-kyoto-glow'),
('music_challenge', 'Music Challenge', 'Explore music history, genres, and artists', 'trivia', 1, 8, 12, 'Music', 'palette-yugure-sky'),
('sports_trivia', 'Sports Trivia', 'Challenge yourself with sports facts and statistics', 'trivia', 1, 8, 15, 'Trophy', 'palette-kitsune-fire'),
('tech_quiz', 'Tech Quiz', 'Test your knowledge of technology and innovation', 'trivia', 1, 8, 12, 'Cpu', 'palette-midori-neon'),
('art_history', 'Art History', 'Explore famous artworks and artists throughout history', 'trivia', 1, 8, 10, 'Palette', 'palette-kaguya-moon'),
('nature_quiz', 'Nature Quiz', 'Discover facts about wildlife, plants, and ecosystems', 'trivia', 1, 8, 12, 'Leaf', 'palette-ghibli-meadow'),
('mythology_challenge', 'Mythology Challenge', 'Journey through ancient myths and legends', 'trivia', 1, 8, 15, 'Crown', 'palette-tanabata-wish'),
('food_trivia', 'Food Trivia', 'Explore cuisines, ingredients, and culinary traditions', 'trivia', 1, 8, 10, 'ChefHat', 'palette-mitsu-amber'),
('space_exploration', 'Space Exploration', 'Navigate the cosmos with astronomy questions', 'trivia', 1, 8, 12, 'Rocket', 'palette-hoshi-cosmos'),
('language_challenge', 'Language Challenge', 'Test your knowledge of world languages and linguistics', 'trivia', 1, 8, 15, 'Languages', 'palette-murasaki-silk'),
('philosophy_quiz', 'Philosophy Quiz', 'Explore deep thoughts and philosophical concepts', 'trivia', 1, 8, 10, 'Brain', 'palette-setsugen-whisper'),
('economics_challenge', 'Economics Challenge', 'Understand markets, trade, and economic principles', 'trivia', 1, 8, 12, 'TrendingUp', 'palette-kiniro-hour'),
('psychology_quiz', 'Psychology Quiz', 'Explore the human mind and behavior', 'trivia', 1, 8, 10, 'Brain', 'palette-onmyoji-violet'),
('biology_challenge', 'Biology Challenge', 'Discover the secrets of life and living organisms', 'trivia', 1, 8, 15, 'Dna', 'palette-ocha-green'),
('chemistry_quiz', 'Chemistry Quiz', 'Explore elements, compounds, and chemical reactions', 'trivia', 1, 8, 12, 'TestTube', 'palette-raijin-spark'),
('physics_challenge', 'Physics Challenge', 'Understand the fundamental laws of the universe', 'trivia', 1, 8, 10, 'Zap', 'palette-akane-crimson'),
('mathematics_quiz', 'Mathematics Quiz', 'Challenge yourself with mathematical concepts and problems', 'trivia', 1, 8, 15, 'Calculator', 'palette-hagane-steel'),
('world_cultures', 'World Cultures', 'Explore traditions, customs, and cultures globally', 'trivia', 1, 8, 12, 'Globe2', 'palette-sango-reef'),
('architecture_quiz', 'Architecture Quiz', 'Discover famous buildings and architectural styles', 'trivia', 1, 8, 10, 'Building', 'palette-tsuchi-earth'),
('fashion_history', 'Fashion History', 'Explore the evolution of style and fashion', 'trivia', 1, 8, 12, 'Shirt', 'palette-tsuru-pink'),
('automotive_trivia', 'Automotive Trivia', 'Test your knowledge of cars, racing, and automotive history', 'trivia', 1, 8, 15, 'Car', 'palette-take-bamboo'),
('aviation_challenge', 'Aviation Challenge', 'Soar through aviation history and aircraft knowledge', 'trivia', 1, 8, 10, 'Plane', 'palette-mizu-aqua'),
('medical_quiz', 'Medical Quiz', 'Explore anatomy, diseases, and medical breakthroughs', 'trivia', 1, 8, 12, 'Heart', 'palette-momo-cream'),
('environmental_quiz', 'Environmental Quiz', 'Learn about climate, conservation, and sustainability', 'trivia', 1, 8, 15, 'TreePine', 'palette-wakaba-mint'),
('mythology_ancient', 'Ancient Mythology', 'Dive deep into Greek, Roman, and ancient mythologies', 'trivia', 1, 8, 10, 'Scroll', 'palette-hanami-bloom'),
('pop_culture', 'Pop Culture', 'Stay current with trends, memes, and popular culture', 'trivia', 1, 8, 12, 'Star', 'palette-ichigo-punch'),
('board_games', 'Board Games', 'Test your knowledge of classic and modern board games', 'trivia', 1, 8, 15, 'Gamepad2', 'palette-kohi-mocha'),
('video_games', 'Video Games', 'Challenge yourself with gaming history and trivia', 'trivia', 1, 8, 12, 'Gamepad', 'palette-yuzu-citrus'),
('anime_manga', 'Anime & Manga', 'Explore the world of Japanese animation and comics', 'trivia', 1, 8, 15, 'Sparkles', 'palette-tasogare-haze'),
('random_facts', 'Random Facts', 'Discover surprising and interesting facts from all categories', 'trivia', 1, 8, 10, 'Shuffle', 'palette-asagiri-mist')
ON CONFLICT (name) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_host_user ON public.game_sessions_history(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_status ON public.game_sessions_history(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_game_type ON public.game_sessions_history(game_type_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_created_at ON public.game_sessions_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_participants_user ON public.game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_session ON public.game_participants(game_session_id);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user ON public.user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_level ON public.user_game_stats(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_xp ON public.user_game_stats(xp_points DESC);

CREATE INDEX IF NOT EXISTS idx_game_invitations_invited_user ON public.game_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_status ON public.game_invitations(status);
CREATE INDEX IF NOT EXISTS idx_game_invitations_expires_at ON public.game_invitations(expires_at);

-- Row Level Security (RLS)
ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Game types: Public read access
CREATE POLICY "Game types are publicly readable" ON public.game_types
    FOR SELECT USING (is_active = true);

-- Game sessions: Users can see their own games and games they've participated in
CREATE POLICY "Users can view their own game sessions" ON public.game_sessions_history
    FOR SELECT USING (
        auth.uid()::text = host_user_id::text OR
        EXISTS (
            SELECT 1 FROM public.game_participants 
            WHERE game_session_id = public.game_sessions_history.id 
            AND user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can create game sessions" ON public.game_sessions_history
    FOR INSERT WITH CHECK (auth.uid()::text = host_user_id::text);

CREATE POLICY "Hosts can update their game sessions" ON public.game_sessions_history
    FOR UPDATE USING (auth.uid()::text = host_user_id::text);

-- Game participants: Users can see participants of games they're in
CREATE POLICY "Users can view game participants" ON public.game_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.game_sessions_history 
            WHERE id = game_session_id 
            AND (host_user_id::text = auth.uid()::text OR
                 EXISTS (SELECT 1 FROM public.game_participants p2 
                        WHERE p2.game_session_id = id AND p2.user_id::text = auth.uid()::text))
        )
    );

CREATE POLICY "Users can insert game participants" ON public.game_participants
    FOR INSERT WITH CHECK (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.game_sessions_history 
            WHERE id = game_session_id AND host_user_id::text = auth.uid()::text
        )
    );

-- User game stats: Users can only see and modify their own stats
CREATE POLICY "Users can manage their own game stats" ON public.user_game_stats
    FOR ALL USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Game invitations: Users can see invitations they sent or received
CREATE POLICY "Users can view relevant game invitations" ON public.game_invitations
    FOR SELECT USING (
        auth.uid()::text = host_user_id::text OR 
        auth.uid()::text = invited_user_id::text
    );

CREATE POLICY "Users can create game invitations" ON public.game_invitations
    FOR INSERT WITH CHECK (auth.uid()::text = host_user_id::text);

CREATE POLICY "Users can respond to their invitations" ON public.game_invitations
    FOR UPDATE USING (auth.uid()::text = invited_user_id::text);

-- Service role policies for full access
CREATE POLICY "Service role full access to game_types" ON public.game_types
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to game_sessions_history" ON public.game_sessions_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to game_participants" ON public.game_participants
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to user_game_stats" ON public.user_game_stats
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to game_invitations" ON public.game_invitations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_types_updated_at BEFORE UPDATE ON public.game_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_history_updated_at BEFORE UPDATE ON public.game_sessions_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_game_stats_updated_at BEFORE UPDATE ON public.user_game_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.game_types IS 'Available game types and templates for Minato AI Games';
COMMENT ON TABLE public.game_sessions_history IS 'Permanent record of all game sessions';
COMMENT ON TABLE public.game_participants IS 'Record of who participated in each game session';
COMMENT ON TABLE public.user_game_stats IS 'User gaming statistics and achievements';
COMMENT ON TABLE public.game_invitations IS 'Game invitations between users';
