-- ============================================================================
-- FILE: migrations/add_game_reports_table.sql
-- DESC: Add game reports table for Phase 2 moderation system
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game reports table for moderation
CREATE TABLE IF NOT EXISTS public.game_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_user_id UUID NOT NULL, -- User who made the report
    reported_user_id UUID NOT NULL, -- User being reported
    game_id VARCHAR(100) NOT NULL, -- Can be Convex game ID or session ID
    
    -- Report content
    content TEXT NOT NULL, -- The content being reported
    reason TEXT NOT NULL, -- Reason for the report
    category VARCHAR(50) NOT NULL CHECK (category IN ('inappropriate_content', 'harassment', 'spam', 'hate_speech', 'other')),
    additional_details TEXT DEFAULT '',
    
    -- Report status
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')) DEFAULT 'pending',
    
    -- Review information
    reviewed_by UUID, -- Moderator who reviewed
    reviewed_at TIMESTAMPTZ,
    moderator_notes TEXT,
    action_taken VARCHAR(100), -- What action was taken
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Team assignments table (for team mode)
CREATE TABLE IF NOT EXISTS public.game_team_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_session_id UUID NOT NULL REFERENCES public.game_sessions_history(id) ON DELETE CASCADE,
    team_id VARCHAR(50) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    team_color VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(game_session_id, user_id) -- Each user can only be on one team per game
);

-- Creative game submissions table (for judging)
CREATE TABLE IF NOT EXISTS public.game_creative_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_session_id UUID NOT NULL REFERENCES public.game_sessions_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    round_number INTEGER NOT NULL,
    
    -- Submission content
    content TEXT NOT NULL,
    submission_type VARCHAR(50) NOT NULL, -- 'haiku', 'story', 'movie_pitch', etc.
    theme VARCHAR(200), -- The theme/prompt for this submission
    
    -- AI judging results
    ai_score DECIMAL(3,1), -- Score out of 10
    ai_feedback TEXT,
    rank_in_round INTEGER,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_categories TEXT[], -- Array of flagged categories
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    judged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_reports_reporter ON public.game_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_game_reports_reported ON public.game_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_game_reports_status ON public.game_reports(status);
CREATE INDEX IF NOT EXISTS idx_game_reports_category ON public.game_reports(category);
CREATE INDEX IF NOT EXISTS idx_game_reports_created_at ON public.game_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_assignments_game ON public.game_team_assignments(game_session_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_user ON public.game_team_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_creative_submissions_game ON public.game_creative_submissions(game_session_id);
CREATE INDEX IF NOT EXISTS idx_creative_submissions_user ON public.game_creative_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_submissions_round ON public.game_creative_submissions(round_number);
CREATE INDEX IF NOT EXISTS idx_creative_submissions_flagged ON public.game_creative_submissions(is_flagged);

-- Row Level Security (RLS)
ALTER TABLE public.game_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_creative_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_reports
CREATE POLICY "Users can read their own reports" ON public.game_reports
    FOR SELECT USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can create reports" ON public.game_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Service role full access to reports" ON public.game_reports
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for team assignments
CREATE POLICY "Users can read team assignments for their games" ON public.game_team_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.game_participants gp 
            WHERE gp.game_session_id = game_team_assignments.game_session_id 
            AND gp.user_id = auth.uid()
        )
    );

CREATE POLICY "Game hosts can manage team assignments" ON public.game_team_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.game_sessions_history gsh 
            WHERE gsh.id = game_team_assignments.game_session_id 
            AND gsh.host_user_id = auth.uid()
        )
    );

-- RLS Policies for creative submissions
CREATE POLICY "Users can read submissions from their games" ON public.game_creative_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.game_participants gp 
            WHERE gp.game_session_id = game_creative_submissions.game_session_id 
            AND gp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own submissions" ON public.game_creative_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions" ON public.game_creative_submissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.game_reports IS 'Reports submitted by users for inappropriate game content or behavior';
COMMENT ON TABLE public.game_team_assignments IS 'Team assignments for multiplayer games in team mode';
COMMENT ON TABLE public.game_creative_submissions IS 'Creative submissions for games like Haiku Battle with AI judging';

COMMENT ON COLUMN public.game_reports.category IS 'Type of violation: inappropriate_content, harassment, spam, hate_speech, other';
COMMENT ON COLUMN public.game_reports.status IS 'Report status: pending, reviewed, resolved, dismissed';
COMMENT ON COLUMN public.game_creative_submissions.ai_score IS 'AI judge score out of 10.0';
COMMENT ON COLUMN public.game_creative_submissions.rank_in_round IS 'Ranking within the round (1st, 2nd, 3rd, etc.)';

-- ============================================================================
-- END OF FILE: add_game_reports_table.sql
-- ============================================================================ 