-- Add Evasion Video Transcripts
-- This migration adds support for storing video transcripts and AI analysis for evasion rooms

-- Table for video transcripts
CREATE TABLE IF NOT EXISTS public.evasion_video_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.evasion_rooms(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_id TEXT NOT NULL,
    
    -- Transcript data
    transcript_json JSONB,
    transcript_text TEXT,
    
    -- AI analysis cache
    analysis_cache JSONB,
    
    -- Processing status
    status VARCHAR(20) NOT NULL CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Add unique constraint to prevent duplicate transcripts for same room/video
    UNIQUE(room_id, video_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_evasion_video_transcripts_room_id ON public.evasion_video_transcripts(room_id);
CREATE INDEX IF NOT EXISTS idx_evasion_video_transcripts_video_id ON public.evasion_video_transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_evasion_video_transcripts_status ON public.evasion_video_transcripts(status);

-- Add RLS policies
ALTER TABLE public.evasion_video_transcripts ENABLE ROW LEVEL SECURITY;

-- Policy to allow room participants to view transcripts
CREATE POLICY "Room participants can view transcripts" ON public.evasion_video_transcripts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.evasion_room_participants
            WHERE room_id = evasion_video_transcripts.room_id
            AND user_id = auth.uid()
        )
    );

-- Policy to allow room hosts to manage transcripts
CREATE POLICY "Room hosts can manage transcripts" ON public.evasion_video_transcripts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.evasion_rooms
            WHERE id = evasion_video_transcripts.room_id
            AND host_user_id = auth.uid()
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_evasion_video_transcripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evasion_video_transcripts_updated_at
    BEFORE UPDATE ON public.evasion_video_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_evasion_video_transcripts_updated_at();

-- Add comments
COMMENT ON TABLE public.evasion_video_transcripts IS 'Video transcripts and AI analysis for evasion rooms';
COMMENT ON COLUMN public.evasion_video_transcripts.transcript_json IS 'Structured transcript data with timestamps';
COMMENT ON COLUMN public.evasion_video_transcripts.transcript_text IS 'Plain text transcript for quick searching';
COMMENT ON COLUMN public.evasion_video_transcripts.analysis_cache IS 'Cached AI analysis responses for common queries'; 