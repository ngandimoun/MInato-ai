-- ============================================================================
-- FILE: migrations/fix_ai_coach_database.sql
-- DESC: Fix AI Coach database issues - ensure tables exist and relationships work
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure game_types table exists (needed for foreign key references)
CREATE TABLE IF NOT EXISTS public.game_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    min_players INTEGER NOT NULL DEFAULT 1,
    max_players INTEGER NOT NULL DEFAULT 8,
    default_rounds INTEGER NOT NULL DEFAULT 10,
    difficulty_levels TEXT[] NOT NULL DEFAULT ARRAY['beginner', 'easy', 'medium', 'hard', 'expert'],
    estimated_duration_minutes INTEGER,
    icon_name VARCHAR(50),
    color_theme VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure game_sessions_history table exists
CREATE TABLE IF NOT EXISTS public.game_sessions_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    convex_game_id VARCHAR(100),
    game_type_id UUID REFERENCES public.game_types(id),
    host_user_id UUID NOT NULL,
    
    -- Game configuration
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'easy', 'medium', 'hard', 'expert')),
    max_players INTEGER NOT NULL DEFAULT 2,
    rounds INTEGER NOT NULL DEFAULT 10,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('solo', 'multiplayer')),
    
    -- Game state
    status VARCHAR(20) NOT NULL CHECK (status IN ('lobby', 'in_progress', 'completed', 'cancelled')) DEFAULT 'lobby',
    
    -- Results
    final_scores JSONB,
    winner_user_id UUID,
    total_duration_seconds INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Game settings
    settings JSONB DEFAULT '{}'::jsonb
);

-- Ensure game_participants table exists with proper foreign key
CREATE TABLE IF NOT EXISTS public.game_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_session_id UUID NOT NULL REFERENCES public.game_sessions_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Player stats
    score INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_answers INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    
    -- Timing
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    left_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(game_session_id, user_id)
);

-- Ensure user_game_stats table exists
CREATE TABLE IF NOT EXISTS public.user_game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Overall stats
    total_games_played INTEGER NOT NULL DEFAULT 0,
    total_games_won INTEGER NOT NULL DEFAULT 0,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- XP and leveling
    xp_points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    current_level INTEGER NOT NULL DEFAULT 1,
    
    -- Streaks
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    
    -- Game type specific stats
    game_type_stats JSONB DEFAULT '{}'::jsonb,
    
    -- Achievements and badges
    achievements JSONB DEFAULT '[]'::jsonb,
    
    -- Preferences
    favorite_game_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_difficulty VARCHAR(20) DEFAULT 'medium',
    
    -- Daily tracking
    daily_games_played INTEGER DEFAULT 0,
    daily_wins INTEGER DEFAULT 0,
    daily_score INTEGER DEFAULT 0,
    daily_reset_date DATE DEFAULT CURRENT_DATE,
    last_game_date TIMESTAMPTZ,
    team_wins INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create AI Coach insights table (THIS WAS MISSING!)
CREATE TABLE IF NOT EXISTS public.ai_coach_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    game_session_id UUID REFERENCES public.game_sessions_history(id),
    
    -- AI insights data
    insights JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    performance_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    focus_areas JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default game types if they don't exist
INSERT INTO public.game_types (name, display_name, description, category, min_players, max_players, default_rounds, icon_name, color_theme) VALUES
('history_trivia', 'History Trivia', 'Test your knowledge of world history', 'trivia', 1, 8, 10, 'BookOpen', 'blue'),
('science_quiz', 'Science Quiz', 'Explore the wonders of science', 'trivia', 1, 8, 10, 'Atom', 'green'),
('geography_challenge', 'Geography Challenge', 'Navigate the world with geography', 'trivia', 1, 8, 15, 'Globe', 'purple'),
('literature_quiz', 'Literature Quiz', 'Dive into books and authors', 'trivia', 1, 8, 12, 'Library', 'pink'),
('movie_trivia', 'Movie Trivia', 'Test your cinema knowledge', 'trivia', 1, 8, 15, 'Film', 'red'),
('music_challenge', 'Music Challenge', 'Explore music and artists', 'trivia', 1, 8, 12, 'Music', 'orange'),
('sports_trivia', 'Sports Trivia', 'Challenge yourself with sports facts', 'trivia', 1, 8, 15, 'Trophy', 'teal'),
('general_knowledge', 'General Knowledge', 'Test your overall knowledge', 'trivia', 1, 8, 10, 'Brain', 'indigo')
ON CONFLICT (name) DO NOTHING;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_host_user ON public.game_sessions_history(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_status ON public.game_sessions_history(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_game_type ON public.game_sessions_history(game_type_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_history_created_at ON public.game_sessions_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_participants_user ON public.game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_game_session ON public.game_participants(game_session_id);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user ON public.user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_level ON public.user_game_stats(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_xp ON public.user_game_stats(xp_points DESC);

CREATE INDEX IF NOT EXISTS idx_ai_coach_insights_user ON public.ai_coach_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_insights_game_session ON public.ai_coach_insights(game_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_insights_generated_at ON public.ai_coach_insights(generated_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Game types: Public read access
DROP POLICY IF EXISTS "Game types are publicly readable" ON public.game_types;
CREATE POLICY "Game types are publicly readable" ON public.game_types
    FOR SELECT USING (is_active = true);

-- Game sessions: Users can see their own games and games they've participated in
DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions_history;
CREATE POLICY "Users can view their own game sessions" ON public.game_sessions_history
    FOR SELECT USING (
        auth.uid()::text = host_user_id::text OR
        EXISTS (
            SELECT 1 FROM public.game_participants 
            WHERE game_session_id = public.game_sessions_history.id 
            AND user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can create game sessions" ON public.game_sessions_history;
CREATE POLICY "Users can create game sessions" ON public.game_sessions_history
    FOR INSERT WITH CHECK (auth.uid()::text = host_user_id::text);

DROP POLICY IF EXISTS "Hosts can update their game sessions" ON public.game_sessions_history;
CREATE POLICY "Hosts can update their game sessions" ON public.game_sessions_history
    FOR UPDATE USING (auth.uid()::text = host_user_id::text);

-- Game participants: Users can see participants of games they're in
DROP POLICY IF EXISTS "Users can view game participants" ON public.game_participants;
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

DROP POLICY IF EXISTS "Users can insert game participants" ON public.game_participants;
CREATE POLICY "Users can insert game participants" ON public.game_participants
    FOR INSERT WITH CHECK (
        user_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.game_sessions_history 
            WHERE id = game_session_id AND host_user_id::text = auth.uid()::text
        )
    );

-- User game stats: Users can only see and modify their own stats
DROP POLICY IF EXISTS "Users can manage their own game stats" ON public.user_game_stats;
CREATE POLICY "Users can manage their own game stats" ON public.user_game_stats
    FOR ALL USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- AI Coach insights: Users can only see their own insights
DROP POLICY IF EXISTS "Users can view their own ai coach insights" ON public.ai_coach_insights;
CREATE POLICY "Users can view their own ai coach insights" ON public.ai_coach_insights
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own ai coach insights" ON public.ai_coach_insights;
CREATE POLICY "Users can insert their own ai coach insights" ON public.ai_coach_insights
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own ai coach insights" ON public.ai_coach_insights;
CREATE POLICY "Users can update their own ai coach insights" ON public.ai_coach_insights
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_game_sessions_history_updated_at ON public.game_sessions_history;
CREATE TRIGGER update_game_sessions_history_updated_at 
    BEFORE UPDATE ON public.game_sessions_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_game_stats_updated_at ON public.user_game_stats;
CREATE TRIGGER update_user_game_stats_updated_at 
    BEFORE UPDATE ON public.user_game_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_coach_insights_updated_at ON public.ai_coach_insights;
CREATE TRIGGER update_ai_coach_insights_updated_at 
    BEFORE UPDATE ON public.ai_coach_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.game_types IS 'Available game types and templates for Minato AI Games';
COMMENT ON TABLE public.game_sessions_history IS 'Permanent record of all game sessions';
COMMENT ON TABLE public.game_participants IS 'Record of who participated in each game session';
COMMENT ON TABLE public.user_game_stats IS 'User gaming statistics and achievements';
COMMENT ON TABLE public.ai_coach_insights IS 'AI-generated coaching insights and recommendations for users';

-- ============================================================================
-- Data Validation and Cleanup
-- ============================================================================

-- Ensure user_game_stats has required columns that may be missing
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_stats' AND column_name = 'total_games_won') THEN
        ALTER TABLE public.user_game_stats ADD COLUMN total_games_won INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_stats' AND column_name = 'current_level') THEN
        ALTER TABLE public.user_game_stats ADD COLUMN current_level INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_stats' AND column_name = 'current_streak') THEN
        ALTER TABLE public.user_game_stats ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_stats' AND column_name = 'best_streak') THEN
        ALTER TABLE public.user_game_stats ADD COLUMN best_streak INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Sync total_games_won with total_wins if they exist
UPDATE public.user_game_stats 
SET total_games_won = total_wins 
WHERE total_games_won = 0 AND total_wins > 0;

-- Sync current_level with level if they exist  
UPDATE public.user_game_stats 
SET current_level = level 
WHERE current_level = 1 AND level > 1; 