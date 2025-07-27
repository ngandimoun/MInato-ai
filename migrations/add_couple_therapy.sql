-- Add Couple Therapy Category
INSERT INTO public.therapy_categories (id, name, description, icon_name, color_theme, sort_order) VALUES
    (uuid_generate_v4(), 'Couple Therapy', 'Create couple conversations and invite partners to participate', 'users', 'rose', 9)
ON CONFLICT (name) DO NOTHING;

-- Create couple therapy sessions table
CREATE TABLE IF NOT EXISTS public.couple_therapy_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.therapy_categories(id),
    title VARCHAR(200),
    session_type VARCHAR(50) DEFAULT 'couple',
    status VARCHAR(20) CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'waiting_for_partner')) DEFAULT 'waiting_for_partner',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    
    -- Session metadata
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    message_count INTEGER DEFAULT 0,
    voice_message_count INTEGER DEFAULT 0,
    
    -- AI personality and approach
    ai_personality VARCHAR(50) DEFAULT 'empathetic',
    therapy_approach VARCHAR(50) DEFAULT 'couple-focused',
    
    -- Session settings
    settings JSONB DEFAULT '{
        "voice_enabled": true,
        "auto_save": true,
        "background_sounds": false,
        "session_reminders": true,
        "partner_notifications": true
    }'::jsonb,
    
    -- Session summary and insights
    session_summary TEXT,
    key_insights TEXT[],
    mood_start_creator VARCHAR(20),
    mood_start_partner VARCHAR(20),
    mood_end_creator VARCHAR(20),
    mood_end_partner VARCHAR(20),
    progress_notes TEXT,
    
    -- Partner invitation
    invitation_code VARCHAR(20) UNIQUE,
    invitation_expires_at TIMESTAMPTZ,
    partner_joined_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create couple therapy messages table
CREATE TABLE IF NOT EXISTS public.couple_therapy_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.couple_therapy_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    message_type VARCHAR(20) CHECK (message_type IN ('user', 'ai', 'system', 'partner')) NOT NULL,
    content_type VARCHAR(20) CHECK (content_type IN ('text', 'voice', 'exercise', 'insight')) DEFAULT 'text',
    
    -- Voice message support
    audio_url TEXT,
    audio_duration_seconds INTEGER,
    transcript TEXT,
    
    -- Message metadata
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    sentiment_score DECIMAL(3,2),
    emotions_detected TEXT[],
    
    -- Therapeutic context
    therapeutic_technique VARCHAR(50),
    intervention_type VARCHAR(50),
    
    -- AI processing
    ai_model_used VARCHAR(50),
    processing_time_ms INTEGER,
    
    -- Message threading and responses
    parent_message_id UUID REFERENCES public.couple_therapy_messages(id),
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    
    -- Partner visibility
    is_visible_to_partner BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create couple therapy progress table
CREATE TABLE IF NOT EXISTS public.couple_therapy_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.couple_therapy_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Progress tracking
    progress_type VARCHAR(50) CHECK (progress_type IN ('mood', 'communication', 'understanding', 'connection', 'conflict_resolution')),
    progress_value DECIMAL(3,2),
    progress_notes TEXT,
    
    -- Session context
    session_phase VARCHAR(50),
    exercise_completed VARCHAR(100),
    
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_couple_therapy_sessions_creator_id ON public.couple_therapy_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_sessions_partner_id ON public.couple_therapy_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_sessions_status ON public.couple_therapy_sessions(status);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_sessions_invitation_code ON public.couple_therapy_sessions(invitation_code);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_sessions_started_at ON public.couple_therapy_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_couple_therapy_messages_session_id ON public.couple_therapy_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_messages_user_id ON public.couple_therapy_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_messages_created_at ON public.couple_therapy_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_messages_message_type ON public.couple_therapy_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_couple_therapy_progress_session_id ON public.couple_therapy_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_progress_user_id ON public.couple_therapy_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_couple_therapy_progress_recorded_at ON public.couple_therapy_progress(recorded_at);

-- Enable Row Level Security
ALTER TABLE public.couple_therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_therapy_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_therapy_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couple therapy sessions
CREATE POLICY "Users can view couple therapy sessions they created" ON public.couple_therapy_sessions
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can view couple therapy sessions they are invited to" ON public.couple_therapy_sessions
    FOR SELECT USING (auth.uid() = partner_id);

CREATE POLICY "Users can insert own couple therapy sessions" ON public.couple_therapy_sessions
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own couple therapy sessions" ON public.couple_therapy_sessions
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Partners can update couple therapy sessions they are part of" ON public.couple_therapy_sessions
    FOR UPDATE USING (auth.uid() = partner_id);

-- RLS Policies for couple therapy messages
CREATE POLICY "Users can view couple therapy messages in their sessions" ON public.couple_therapy_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.couple_therapy_sessions 
            WHERE id = session_id 
            AND (creator_id = auth.uid() OR partner_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert couple therapy messages in their sessions" ON public.couple_therapy_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.couple_therapy_sessions 
            WHERE id = session_id 
            AND (creator_id = auth.uid() OR partner_id = auth.uid())
        )
    );

-- RLS Policies for couple therapy progress
CREATE POLICY "Users can view couple therapy progress in their sessions" ON public.couple_therapy_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.couple_therapy_sessions 
            WHERE id = session_id 
            AND (creator_id = auth.uid() OR partner_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert couple therapy progress in their sessions" ON public.couple_therapy_progress
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.couple_therapy_sessions 
            WHERE id = session_id 
            AND (creator_id = auth.uid() OR partner_id = auth.uid())
        )
    );

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE public.couple_therapy_sessions;
ALTER publication supabase_realtime ADD TABLE public.couple_therapy_messages;
ALTER publication supabase_realtime ADD TABLE public.couple_therapy_progress;

-- Add triggers for updated_at
CREATE TRIGGER update_couple_therapy_sessions_updated_at BEFORE UPDATE ON public.couple_therapy_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_couple_therapy_messages_updated_at BEFORE UPDATE ON public.couple_therapy_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_couple_therapy_progress_updated_at BEFORE UPDATE ON public.couple_therapy_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_code BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.couple_therapy_sessions WHERE invitation_code = code) INTO exists_code;
        
        -- If code doesn't exist, return it
        IF NOT exists_code THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql; 