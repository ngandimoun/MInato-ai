-- Add Minato AI Listening feature tables
-- This migration adds tables for audio recording, transcription, and analysis

-- Table for storing audio recording metadata
CREATE TABLE IF NOT EXISTS audio_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Recording',
  description TEXT,
  duration_seconds INTEGER,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  size_bytes BIGINT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'meeting', 'call')),
  
  -- Create an index on user_id for faster lookups
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for storing AI analysis results
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
  summary_text TEXT,
  key_themes_json JSONB,
  structured_notes_json JSONB,
  action_items_json JSONB,
  sentiment_analysis_json JSONB,
  transcript_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Create an index on recording_id for faster lookups
  CONSTRAINT fk_recording FOREIGN KEY (recording_id) REFERENCES audio_recordings(id) ON DELETE CASCADE
);

-- Table for shared recordings
CREATE TABLE IF NOT EXISTS shared_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  shared_with UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_recording FOREIGN KEY (recording_id) REFERENCES audio_recordings(id) ON DELETE CASCADE,
  CONSTRAINT fk_shared_by FOREIGN KEY (shared_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_shared_with FOREIGN KEY (shared_with) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_share UNIQUE (recording_id, shared_with)
);

-- Add RLS Policies
ALTER TABLE audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_recordings ENABLE ROW LEVEL SECURITY;

-- Policy for audio_recordings - users can only see their own recordings
CREATE POLICY "Users can CRUD their own recordings" 
  ON audio_recordings 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Policy for analysis_results - users can only see analysis for their own recordings
CREATE POLICY "Users can read analysis for their own recordings" 
  ON analysis_results 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM audio_recordings 
      WHERE audio_recordings.id = analysis_results.recording_id 
      AND audio_recordings.user_id = auth.uid()
    )
  );

-- Policy for shared_recordings - users can see recordings shared with them
CREATE POLICY "Users can see recordings shared with them" 
  ON shared_recordings 
  FOR SELECT 
  USING (
    auth.uid() = shared_with
  );

-- Policy for audio_recordings - users can see recordings shared with them
CREATE POLICY "Users can see recordings shared with them" 
  ON audio_recordings 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM shared_recordings 
      WHERE shared_recordings.recording_id = audio_recordings.id 
      AND shared_recordings.shared_with = auth.uid()
    )
  ); 