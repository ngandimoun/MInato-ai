import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    console.log('[Apply Escape Migration] Starting Escape therapy migration');

    // SQL to create the Escape therapy tables
    const migrationSQL = `
      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Therapy session types/categories
      CREATE TABLE IF NOT EXISTS public.therapy_categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          icon_name VARCHAR(50),
          color_theme VARCHAR(20),
          is_active BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- User therapy preferences and profiles
      CREATE TABLE IF NOT EXISTS public.user_therapy_profiles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          preferred_name VARCHAR(100) NOT NULL,
          gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say')),
          preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
          therapy_goals TEXT[],
          communication_style VARCHAR(20) CHECK (communication_style IN ('supportive', 'direct', 'exploratory', 'solution-focused')) DEFAULT 'supportive',
          session_preferences JSONB DEFAULT '{
              "session_duration": 30,
              "reminder_enabled": true,
              "voice_enabled": true,
              "background_sounds": false
          }'::jsonb,
          privacy_settings JSONB DEFAULT '{
              "save_conversations": true,
              "anonymous_mode": false,
              "data_retention_days": 365
          }'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          UNIQUE(user_id)
      );

      -- Therapy sessions
      CREATE TABLE IF NOT EXISTS public.therapy_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          category_id UUID REFERENCES public.therapy_categories(id),
          title VARCHAR(200),
          session_type VARCHAR(50) DEFAULT 'general',
          status VARCHAR(20) CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
          language VARCHAR(10) NOT NULL DEFAULT 'en',
          
          -- Session metadata
          started_at TIMESTAMPTZ DEFAULT NOW(),
          ended_at TIMESTAMPTZ,
          duration_minutes INTEGER,
          message_count INTEGER DEFAULT 0,
          voice_message_count INTEGER DEFAULT 0,
          
          -- AI personality and approach
          ai_personality VARCHAR(50) DEFAULT 'empathetic',
          therapy_approach VARCHAR(50) DEFAULT 'cognitive-behavioral',
          
          -- Session settings
          settings JSONB DEFAULT '{
              "voice_enabled": true,
              "auto_save": true,
              "background_sounds": false,
              "session_reminders": true
          }'::jsonb,
          
          -- Session summary and insights
          session_summary TEXT,
          key_insights TEXT[],
          mood_start VARCHAR(20),
          mood_end VARCHAR(20),
          progress_notes TEXT,
          
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Therapy conversation messages
      CREATE TABLE IF NOT EXISTS public.therapy_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          session_id UUID NOT NULL REFERENCES public.therapy_sessions(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          
          -- Message content
          content TEXT NOT NULL,
          message_type VARCHAR(20) CHECK (message_type IN ('user', 'ai', 'system')) NOT NULL,
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
          parent_message_id UUID REFERENCES public.therapy_messages(id),
          is_flagged BOOLEAN DEFAULT false,
          flag_reason TEXT,
          
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Therapy session templates and exercises
      CREATE TABLE IF NOT EXISTS public.therapy_exercises (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          category_id UUID REFERENCES public.therapy_categories(id),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          exercise_type VARCHAR(50) CHECK (exercise_type IN ('breathing', 'grounding', 'cognitive-reframing', 'mindfulness', 'journal-prompt')),
          instructions JSONB NOT NULL,
          estimated_duration_minutes INTEGER DEFAULT 5,
          difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
          languages_supported TEXT[] DEFAULT ARRAY['en'],
          tags TEXT[],
          is_active BOOLEAN DEFAULT true,
          usage_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- User progress tracking
      CREATE TABLE IF NOT EXISTS public.therapy_progress (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          session_id UUID REFERENCES public.therapy_sessions(id),
          
          -- Progress metrics
          metric_type VARCHAR(50) NOT NULL,
          metric_value DECIMAL(10,2),
          metric_data JSONB,
          
          -- Progress context
          notes TEXT,
          milestone_reached BOOLEAN DEFAULT false,
          milestone_description TEXT,
          
          -- Mood and wellness tracking
          mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
          anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
          stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
          energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
          
          recorded_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Performance indexes for therapy sessions
      CREATE INDEX IF NOT EXISTS idx_therapy_sessions_user_id ON public.therapy_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_therapy_sessions_status ON public.therapy_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_therapy_sessions_started_at ON public.therapy_sessions(started_at);

      -- Performance indexes for therapy messages
      CREATE INDEX IF NOT EXISTS idx_therapy_messages_session_id ON public.therapy_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_therapy_messages_user_id ON public.therapy_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_therapy_messages_created_at ON public.therapy_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_therapy_messages_message_type ON public.therapy_messages(message_type);

      -- Performance indexes for therapy progress
      CREATE INDEX IF NOT EXISTS idx_therapy_progress_user_id ON public.therapy_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_therapy_progress_session_id ON public.therapy_progress(session_id);
      CREATE INDEX IF NOT EXISTS idx_therapy_progress_recorded_at ON public.therapy_progress(recorded_at);

      -- Enable RLS on all tables
      ALTER TABLE public.therapy_categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_therapy_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.therapy_messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.therapy_exercises ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.therapy_progress ENABLE ROW LEVEL SECURITY;

      -- Therapy categories - public read access
      CREATE POLICY "Therapy categories are viewable by authenticated users" ON public.therapy_categories
          FOR SELECT USING (auth.role() = 'authenticated');

      -- User therapy profiles - users can only access their own
      CREATE POLICY "Users can view own therapy profile" ON public.user_therapy_profiles
          FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert own therapy profile" ON public.user_therapy_profiles
          FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update own therapy profile" ON public.user_therapy_profiles
          FOR UPDATE USING (auth.uid() = user_id);

      -- Therapy sessions - users can only access their own
      CREATE POLICY "Users can view own therapy sessions" ON public.therapy_sessions
          FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert own therapy sessions" ON public.therapy_sessions
          FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update own therapy sessions" ON public.therapy_sessions
          FOR UPDATE USING (auth.uid() = user_id);

      -- Therapy messages - users can only access their own
      CREATE POLICY "Users can view own therapy messages" ON public.therapy_messages
          FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert own therapy messages" ON public.therapy_messages
          FOR INSERT WITH CHECK (auth.uid() = user_id);

      -- Therapy exercises - public read access for authenticated users
      CREATE POLICY "Therapy exercises are viewable by authenticated users" ON public.therapy_exercises
          FOR SELECT USING (auth.role() = 'authenticated');

      -- Therapy progress - users can only access their own
      CREATE POLICY "Users can view own therapy progress" ON public.therapy_progress
          FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert own therapy progress" ON public.therapy_progress
          FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update own therapy progress" ON public.therapy_progress
          FOR UPDATE USING (auth.uid() = user_id);

      -- Enable realtime for therapy sessions and messages
      ALTER publication supabase_realtime ADD TABLE public.therapy_sessions;
      ALTER publication supabase_realtime ADD TABLE public.therapy_messages;
      ALTER publication supabase_realtime ADD TABLE public.therapy_progress;

      -- Insert default therapy categories
      INSERT INTO public.therapy_categories (id, name, description, icon_name, color_theme, sort_order) VALUES
          (uuid_generate_v4(), 'General Therapy', 'Open conversation and emotional support', 'heart', 'blue', 1),
          (uuid_generate_v4(), 'Anxiety Support', 'Managing anxiety and stress', 'shield', 'green', 2),
          (uuid_generate_v4(), 'Depression Support', 'Coping with depression and low mood', 'sun', 'yellow', 3),
          (uuid_generate_v4(), 'Relationship Guidance', 'Improving relationships and communication', 'users', 'pink', 4),
          (uuid_generate_v4(), 'Work Stress', 'Managing workplace stress and burnout', 'briefcase', 'purple', 5),
          (uuid_generate_v4(), 'Self-Esteem', 'Building confidence and self-worth', 'star', 'orange', 6),
          (uuid_generate_v4(), 'Grief Support', 'Processing loss and grief', 'cloud', 'gray', 7),
          (uuid_generate_v4(), 'Sleep Issues', 'Improving sleep and rest', 'moon', 'indigo', 8)
      ON CONFLICT (name) DO NOTHING;

      -- Insert default therapy exercises
      INSERT INTO public.therapy_exercises (category_id, name, description, exercise_type, instructions, estimated_duration_minutes, difficulty_level) VALUES
          (
              (SELECT id FROM public.therapy_categories WHERE name = 'Anxiety Support' LIMIT 1),
              '4-7-8 Breathing',
              'A calming breathing technique to reduce anxiety',
              'breathing',
              '{"steps": ["Inhale for 4 counts", "Hold for 7 counts", "Exhale for 8 counts", "Repeat 4 times"]}'::jsonb,
              5,
              'beginner'
          ),
          (
              (SELECT id FROM public.therapy_categories WHERE name = 'General Therapy' LIMIT 1),
              '5-4-3-2-1 Grounding',
              'Grounding technique using your senses',
              'grounding',
              '{"steps": ["Name 5 things you can see", "Name 4 things you can touch", "Name 3 things you can hear", "Name 2 things you can smell", "Name 1 thing you can taste"]}'::jsonb,
              5,
              'beginner'
          ),
          (
              (SELECT id FROM public.therapy_categories WHERE name = 'Self-Esteem' LIMIT 1),
              'Thought Reframing',
              'Challenge negative thoughts with balanced perspectives',
              'cognitive-reframing',
              '{"steps": ["Identify the negative thought", "Question the evidence", "Consider alternative perspectives", "Create a balanced thought"]}'::jsonb,
              10,
              'intermediate'
          )
      ON CONFLICT DO NOTHING;

      -- Create trigger to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Add triggers for updated_at
      CREATE TRIGGER update_therapy_categories_updated_at BEFORE UPDATE ON public.therapy_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_user_therapy_profiles_updated_at BEFORE UPDATE ON public.user_therapy_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_therapy_sessions_updated_at BEFORE UPDATE ON public.therapy_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_therapy_messages_updated_at BEFORE UPDATE ON public.therapy_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_therapy_exercises_updated_at BEFORE UPDATE ON public.therapy_exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('[Apply Escape Migration] Error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to apply Escape therapy migration: ' + error.message 
        },
        { status: 500 }
      );
    }

    console.log('[Apply Escape Migration] Successfully applied Escape therapy migration');

    return NextResponse.json({
      success: true,
      message: 'Escape therapy migration applied successfully'
    });

  } catch (error: any) {
    console.error('[Apply Escape Migration] Failed to apply migration', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to apply migration: ' + error.message 
      },
      { status: 500 }
    );
  }
} 