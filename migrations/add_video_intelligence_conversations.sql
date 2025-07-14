-- Create video intelligence conversations table
CREATE TABLE IF NOT EXISTS video_intelligence_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stream_id UUID NOT NULL REFERENCES video_intelligence_streams(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_intelligence_conversations_user_id ON video_intelligence_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_intelligence_conversations_stream_id ON video_intelligence_conversations(stream_id);
CREATE INDEX IF NOT EXISTS idx_video_intelligence_conversations_created_at ON video_intelligence_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_video_intelligence_conversations_user_stream ON video_intelligence_conversations(user_id, stream_id);

-- Enable RLS
ALTER TABLE video_intelligence_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own video intelligence conversations"
    ON video_intelligence_conversations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video intelligence conversations"
    ON video_intelligence_conversations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video intelligence conversations"
    ON video_intelligence_conversations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video intelligence conversations"
    ON video_intelligence_conversations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_video_intelligence_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_intelligence_conversations_updated_at
    BEFORE UPDATE ON video_intelligence_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_video_intelligence_conversations_updated_at(); 