-- ============================================================================
-- PHASE 3: Daily Quests and Enhanced Progression Tables
-- Run this in your Supabase SQL Editor to apply Phase 3 migration
-- ============================================================================

-- Daily quests table for engagement and progression
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Should match auth.users.id
    quest_id VARCHAR(255) NOT NULL UNIQUE, -- Format: YYYY-MM-DD_template_id_difficulty
    template_id VARCHAR(100) NOT NULL,
    
    -- Quest details
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL, -- play_count, win_count, score_total, etc.
    
    -- Progress tracking
    target_value INTEGER NOT NULL,
    current_progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Rewards
    xp_reward INTEGER NOT NULL,
    
    -- Quest configuration
    date DATE NOT NULL,
    difficulty VARCHAR(10) NOT NULL, -- easy, medium, hard
    game_types TEXT[], -- Specific game types if applicable
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, date, template_id),
    CHECK (current_progress >= 0),
    CHECK (target_value > 0),
    CHECK (xp_reward > 0)
);

-- Add RLS policies for daily_quests
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own quests
CREATE POLICY "Users can view own daily quests" ON public.daily_quests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily quests" ON public.daily_quests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily quests" ON public.daily_quests
    FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_daily_quests_user_date ON public.daily_quests(user_id, date);
CREATE INDEX idx_daily_quests_completed ON public.daily_quests(completed, date);
CREATE INDEX idx_daily_quests_type ON public.daily_quests(type, date);

-- ============================================================================
-- Enhanced user_game_stats table for better progression tracking
-- ============================================================================

-- Add missing columns to user_game_stats for Phase 3 features
ALTER TABLE public.user_game_stats 
ADD COLUMN IF NOT EXISTS current_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_game_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_games_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_reset_date DATE DEFAULT CURRENT_DATE;

-- Function to reset daily stats
CREATE OR REPLACE FUNCTION reset_daily_stats()
RETURNS void AS $$
BEGIN
    UPDATE public.user_game_stats 
    SET 
        daily_games_played = 0,
        daily_wins = 0,
        daily_score = 0,
        daily_reset_date = CURRENT_DATE
    WHERE daily_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Game types table for better categorization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.game_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- creative, trivia, strategy, etc.
    description TEXT,
    icon VARCHAR(10),
    difficulty_rating INTEGER DEFAULT 3, -- 1-5 scale
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default game types
INSERT INTO public.game_types (name, display_name, category, description, icon, difficulty_rating) VALUES
('haiku_battle', 'Haiku Battle', 'creative', 'Create beautiful haiku poems judged by AI', '🌸', 3),
('story_chain', 'Story Chain', 'creative', 'Build collaborative stories with other players', '📚', 2),
('classic_academia_quiz', 'Academia Quiz', 'trivia', 'Test your knowledge across academic subjects', '🎓', 3),
('escape_room', 'Escape Room', 'puzzle', 'Solve puzzles and riddles to escape', '🗝️', 4),
('courtroom_drama', 'Courtroom Drama', 'roleplay', 'Argue cases and debate with AI judges', '⚖️', 4),
('solo_adventure', 'Solo Adventure', 'adventure', 'Embark on single-player text adventures', '🗺️', 5),
('quick_fire_trivia', 'Quick Fire Trivia', 'trivia', 'Fast-paced trivia questions', '⚡', 2),
('mystery_detective', 'Mystery Detective', 'puzzle', 'Solve mysterious cases with clues', '🔍', 4),
('time_travel_tales', 'Time Travel Tales', 'creative', 'Create stories across different time periods', '⏰', 3),
('would_you_rather', 'Would You Rather', 'social', 'Choose between difficult dilemmas', '🤔', 1)
ON CONFLICT (name) DO NOTHING;

-- RLS for game_types (read-only for authenticated users)
ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game types" ON public.game_types
    FOR SELECT USING (TRUE);

-- ============================================================================
-- Update game_sessions_history to reference game_types
-- ============================================================================

-- Add game_type_id foreign key if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_sessions_history' 
        AND column_name = 'game_type_id'
    ) THEN
        ALTER TABLE public.game_sessions_history 
        ADD COLUMN game_type_id UUID REFERENCES public.game_types(id);
        
        -- Update existing records to match game type names
        UPDATE public.game_sessions_history gs
        SET game_type_id = gt.id
        FROM public.game_types gt
        WHERE gs.game_type_name = gt.name;
    END IF;
END $$;

-- ============================================================================
-- Leaderboard materialized view for performance
-- ============================================================================

-- Create materialized view for global leaderboard
CREATE MATERIALIZED VIEW IF NOT EXISTS public.global_leaderboard AS
SELECT 
    ugs.user_id,
    ugs.level,
    ugs.xp_points,
    ugs.total_games_played,
    ugs.total_wins,
    ugs.total_score,
    CASE 
        WHEN ugs.total_games_played > 0 
        THEN ROUND((ugs.total_wins::decimal / ugs.total_games_played * 100), 1)
        ELSE 0
    END as win_rate,
    up.full_name,
    up.first_name,
    up.avatar_url,
    ROW_NUMBER() OVER (ORDER BY ugs.xp_points DESC, ugs.total_score DESC) as rank
FROM public.user_game_stats ugs
LEFT JOIN public.user_profiles up ON ugs.user_id = up.id
WHERE ugs.xp_points > 0
ORDER BY ugs.xp_points DESC, ugs.total_score DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_leaderboard_user 
ON public.global_leaderboard (user_id);

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_global_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.global_leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Weekly leaderboard view
-- ============================================================================

CREATE OR REPLACE VIEW public.weekly_leaderboard AS
SELECT 
    gsh.winner_user_id as user_id,
    COUNT(*) as weekly_wins,
    up.full_name,
    up.first_name,
    up.avatar_url,
    ugs.level,
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
FROM public.game_sessions_history gsh
LEFT JOIN public.user_profiles up ON gsh.winner_user_id = up.id
LEFT JOIN public.user_game_stats ugs ON gsh.winner_user_id = ugs.user_id
WHERE gsh.finished_at >= (CURRENT_DATE - INTERVAL '7 days')
    AND gsh.winner_user_id IS NOT NULL
    AND gsh.status = 'completed'
GROUP BY gsh.winner_user_id, up.full_name, up.first_name, up.avatar_url, ugs.level
ORDER BY weekly_wins DESC;

-- ============================================================================
-- Triggers for automatic daily quest progress updates
-- ============================================================================

-- Function to update quest progress when games are completed
CREATE OR REPLACE FUNCTION update_quest_progress()
RETURNS TRIGGER AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    user_quest RECORD;
BEGIN
    -- Only process completed games
    IF NEW.status != 'completed' OR NEW.winner_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update quests for the winner and all participants
    FOR user_quest IN 
        SELECT DISTINCT unnest(ARRAY[NEW.winner_user_id] || 
            COALESCE((
                SELECT ARRAY_AGG(gp.user_id) 
                FROM public.game_participants gp 
                WHERE gp.game_session_id = NEW.id
            ), ARRAY[]::UUID[])
        ) as participant_id
    LOOP
        -- Update play_count quests
        UPDATE public.daily_quests 
        SET current_progress = current_progress + 1
        WHERE user_id = user_quest.participant_id 
            AND date = today_date 
            AND type = 'play_count'
            AND NOT completed;

        -- Update win_count quests (only for winner)
        IF user_quest.participant_id = NEW.winner_user_id THEN
            UPDATE public.daily_quests 
            SET current_progress = current_progress + 1
            WHERE user_id = user_quest.participant_id 
                AND date = today_date 
                AND type = 'win_count'
                AND NOT completed;
        END IF;

        -- Update creative game quests if applicable
        IF NEW.game_type_name IN ('haiku_battle', 'story_chain', 'courtroom_drama') THEN
            UPDATE public.daily_quests 
            SET current_progress = current_progress + 1
            WHERE user_id = user_quest.participant_id 
                AND date = today_date 
                AND type = 'creative_count'
                AND NOT completed;
        END IF;

        -- Update team game quests if applicable
        IF NEW.mode = 'team' THEN
            UPDATE public.daily_quests 
            SET current_progress = current_progress + 1
            WHERE user_id = user_quest.participant_id 
                AND date = today_date 
                AND type = 'team_count'
                AND NOT completed;
        END IF;

        -- Mark completed quests
        UPDATE public.daily_quests 
        SET completed = TRUE, completed_at = NOW()
        WHERE user_id = user_quest.participant_id 
            AND date = today_date 
            AND current_progress >= target_value
            AND NOT completed;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for quest progress updates
DROP TRIGGER IF EXISTS trigger_update_quest_progress ON public.game_sessions_history;
CREATE TRIGGER trigger_update_quest_progress
    AFTER INSERT OR UPDATE ON public.game_sessions_history
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_progress();

-- ============================================================================
-- Scheduled functions (to be called by external cron or Convex scheduler)
-- ============================================================================

-- Function to generate daily quests for all active users
CREATE OR REPLACE FUNCTION generate_daily_quests_for_all_users()
RETURNS INTEGER AS $$
DECLARE
    user_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- This would be called by Convex scheduler daily
    -- For now, it's a placeholder that returns the count of active users
    
    SELECT COUNT(*) INTO user_count
    FROM public.user_game_stats 
    WHERE last_game_date >= (CURRENT_DATE - INTERVAL '7 days');
    
    RETURN user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Performance indexes
-- ============================================================================

-- Additional indexes for leaderboard performance
CREATE INDEX IF NOT EXISTS idx_user_game_stats_xp_desc ON public.user_game_stats(xp_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_score_desc ON public.user_game_stats(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_winner_finished ON public.game_sessions_history(winner_user_id, finished_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_finished_week ON public.game_sessions_history(finished_at) 
    WHERE finished_at >= (CURRENT_DATE - INTERVAL '7 days');

-- Comment for documentation
COMMENT ON TABLE public.daily_quests IS 'Daily challenges for users to complete for XP rewards and engagement';
COMMENT ON TABLE public.game_types IS 'Master list of available game types with metadata';
COMMENT ON MATERIALIZED VIEW public.global_leaderboard IS 'Cached global leaderboard for performance';
COMMENT ON VIEW public.weekly_leaderboard IS 'Weekly winners leaderboard based on recent game results';

-- ============================================================================
-- Migration Complete! 
-- This creates all Phase 3 tables, functions, triggers, and indexes.
-- ============================================================================ 