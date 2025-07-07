-- Creation Hub Database Schema Migration
-- This migration creates the necessary tables and policies for the Creation Hub feature

-- ========== STORAGE BUCKET ==========

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creation-hub',
  'creation-hub',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ========== TABLES ==========

-- Generated Images Table
CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  revised_prompt TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  quality TEXT NOT NULL DEFAULT 'standard' CHECK (quality IN ('standard', 'hd')),
  size TEXT NOT NULL DEFAULT '1024x1024',
  style TEXT NOT NULL DEFAULT 'vivid' CHECK (style IN ('vivid', 'natural')),
  model TEXT NOT NULL DEFAULT 'dall-e-3',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'failed', 'streaming')),
  conversation_id TEXT,
  parent_image_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Image Conversations Table
CREATE TABLE IF NOT EXISTS image_conversations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  image_count INTEGER NOT NULL DEFAULT 0,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation Messages Table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES image_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('user', 'assistant', 'system', 'image_generation')),
  content TEXT NOT NULL,
  image_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Image Storage Metadata Table
CREATE TABLE IF NOT EXISTS image_storage_metadata (
  id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'creation-hub',
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generation Statistics Table (for analytics)
CREATE TABLE IF NOT EXISTS generation_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_generations INTEGER NOT NULL DEFAULT 0,
  successful_generations INTEGER NOT NULL DEFAULT 0,
  failed_generations INTEGER NOT NULL DEFAULT 0,
  total_duration_ms BIGINT NOT NULL DEFAULT 0,
  quality_breakdown JSONB DEFAULT '{}',
  size_breakdown JSONB DEFAULT '{}',
  style_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS hub_user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_quality TEXT NOT NULL DEFAULT 'standard' CHECK (default_quality IN ('standard', 'hd')),
  default_size TEXT NOT NULL DEFAULT '1024x1024',
  default_style TEXT NOT NULL DEFAULT 'vivid' CHECK (default_style IN ('vivid', 'natural')),
  auto_save BOOLEAN NOT NULL DEFAULT true,
  streaming_enabled BOOLEAN NOT NULL DEFAULT true,
  show_progress BOOLEAN NOT NULL DEFAULT true,
  max_history_items INTEGER NOT NULL DEFAULT 100,
  compression_enabled BOOLEAN NOT NULL DEFAULT false,
  watermark_enabled BOOLEAN NOT NULL DEFAULT false,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== INDEXES ==========

-- Performance indexes for generated_images
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON generated_images(status);
CREATE INDEX IF NOT EXISTS idx_generated_images_conversation_id ON generated_images(conversation_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created ON generated_images(user_id, created_at DESC);

-- Performance indexes for conversations
CREATE INDEX IF NOT EXISTS idx_image_conversations_user_id ON image_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_conversations_last_activity ON image_conversations(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_image_conversations_user_activity ON image_conversations(user_id, last_activity DESC);

-- Performance indexes for messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at DESC);

-- Performance indexes for storage metadata
CREATE INDEX IF NOT EXISTS idx_image_storage_metadata_image_id ON image_storage_metadata(image_id);
CREATE INDEX IF NOT EXISTS idx_image_storage_metadata_user_id ON image_storage_metadata(user_id);

-- Performance indexes for statistics
CREATE INDEX IF NOT EXISTS idx_generation_statistics_user_date ON generation_statistics(user_id, date DESC);

-- ========== FOREIGN KEY CONSTRAINTS ==========

-- Add foreign key for conversation_id in generated_images
ALTER TABLE generated_images 
ADD CONSTRAINT fk_generated_images_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES image_conversations(id) ON DELETE SET NULL;

-- ========== TRIGGERS ==========

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_generated_images_updated_at ON generated_images;
CREATE TRIGGER update_generated_images_updated_at
  BEFORE UPDATE ON generated_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_image_conversations_updated_at ON image_conversations;
CREATE TRIGGER update_image_conversations_updated_at
  BEFORE UPDATE ON image_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generation_statistics_updated_at ON generation_statistics;
CREATE TRIGGER update_generation_statistics_updated_at
  BEFORE UPDATE ON generation_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hub_user_preferences_updated_at ON hub_user_preferences;
CREATE TRIGGER update_hub_user_preferences_updated_at
  BEFORE UPDATE ON hub_user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversation image count trigger
CREATE OR REPLACE FUNCTION update_conversation_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.conversation_id IS NOT NULL THEN
      UPDATE image_conversations 
      SET image_count = image_count + 1,
          last_activity = NOW()
      WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.conversation_id IS NOT NULL THEN
      UPDATE image_conversations 
      SET image_count = GREATEST(image_count - 1, 0),
          last_activity = NOW()
      WHERE id = OLD.conversation_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle conversation_id changes
    IF OLD.conversation_id IS DISTINCT FROM NEW.conversation_id THEN
      -- Remove from old conversation
      IF OLD.conversation_id IS NOT NULL THEN
        UPDATE image_conversations 
        SET image_count = GREATEST(image_count - 1, 0)
        WHERE id = OLD.conversation_id;
      END IF;
      -- Add to new conversation
      IF NEW.conversation_id IS NOT NULL THEN
        UPDATE image_conversations 
        SET image_count = image_count + 1,
            last_activity = NOW()
        WHERE id = NEW.conversation_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_image_count_trigger ON generated_images;
CREATE TRIGGER update_conversation_image_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON generated_images
  FOR EACH ROW EXECUTE FUNCTION update_conversation_image_count();

-- ========== ROW LEVEL SECURITY (RLS) ==========

-- Enable RLS on all tables
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_storage_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_user_preferences ENABLE ROW LEVEL SECURITY;

-- Generated Images RLS Policies
DROP POLICY IF EXISTS "Users can view their own generated images" ON generated_images;
CREATE POLICY "Users can view their own generated images" ON generated_images
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own generated images" ON generated_images;
CREATE POLICY "Users can insert their own generated images" ON generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own generated images" ON generated_images;
CREATE POLICY "Users can update their own generated images" ON generated_images
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own generated images" ON generated_images;
CREATE POLICY "Users can delete their own generated images" ON generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- Image Conversations RLS Policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON image_conversations;
CREATE POLICY "Users can view their own conversations" ON image_conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON image_conversations;
CREATE POLICY "Users can insert their own conversations" ON image_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON image_conversations;
CREATE POLICY "Users can update their own conversations" ON image_conversations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON image_conversations;
CREATE POLICY "Users can delete their own conversations" ON image_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Conversation Messages RLS Policies
DROP POLICY IF EXISTS "Users can view their own conversation messages" ON conversation_messages;
CREATE POLICY "Users can view their own conversation messages" ON conversation_messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversation messages" ON conversation_messages;
CREATE POLICY "Users can insert their own conversation messages" ON conversation_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversation messages" ON conversation_messages;
CREATE POLICY "Users can update their own conversation messages" ON conversation_messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversation messages" ON conversation_messages;
CREATE POLICY "Users can delete their own conversation messages" ON conversation_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Image Storage Metadata RLS Policies
DROP POLICY IF EXISTS "Users can view their own storage metadata" ON image_storage_metadata;
CREATE POLICY "Users can view their own storage metadata" ON image_storage_metadata
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own storage metadata" ON image_storage_metadata;
CREATE POLICY "Users can insert their own storage metadata" ON image_storage_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own storage metadata" ON image_storage_metadata;
CREATE POLICY "Users can update their own storage metadata" ON image_storage_metadata
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own storage metadata" ON image_storage_metadata;
CREATE POLICY "Users can delete their own storage metadata" ON image_storage_metadata
  FOR DELETE USING (auth.uid() = user_id);

-- Generation Statistics RLS Policies
DROP POLICY IF EXISTS "Users can view their own statistics" ON generation_statistics;
CREATE POLICY "Users can view their own statistics" ON generation_statistics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own statistics" ON generation_statistics;
CREATE POLICY "Users can insert their own statistics" ON generation_statistics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own statistics" ON generation_statistics;
CREATE POLICY "Users can update their own statistics" ON generation_statistics
  FOR UPDATE USING (auth.uid() = user_id);

-- User Preferences RLS Policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON hub_user_preferences;
CREATE POLICY "Users can view their own preferences" ON hub_user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON hub_user_preferences;
CREATE POLICY "Users can insert their own preferences" ON hub_user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON hub_user_preferences;
CREATE POLICY "Users can update their own preferences" ON hub_user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== STORAGE POLICIES ==========

-- Storage bucket policies for creation-hub
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'creation-hub' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
CREATE POLICY "Users can view their own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'creation-hub' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'creation-hub' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'creation-hub' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========== FUNCTIONS ==========

-- Function to get user's generation statistics
CREATE OR REPLACE FUNCTION get_user_generation_stats(user_uuid UUID)
RETURNS TABLE (
  total_images BIGINT,
  successful_generations BIGINT,
  failed_generations BIGINT,
  average_generation_time NUMERIC,
  most_used_quality TEXT,
  most_used_size TEXT,
  most_used_style TEXT,
  total_storage_used BIGINT,
  last_generation TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_images,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_generations,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_generations,
    COALESCE(AVG((metadata->>'generation_duration_ms')::NUMERIC), 0) as average_generation_time,
    (
      SELECT quality 
      FROM generated_images gi2 
      WHERE gi2.user_id = user_uuid AND gi2.status = 'completed'
      GROUP BY quality 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_used_quality,
    (
      SELECT size 
      FROM generated_images gi3 
      WHERE gi3.user_id = user_uuid AND gi3.status = 'completed'
      GROUP BY size 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_used_size,
    (
      SELECT style 
      FROM generated_images gi4 
      WHERE gi4.user_id = user_uuid AND gi4.status = 'completed'
      GROUP BY style 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as most_used_style,
    COALESCE(SUM(ism.file_size), 0)::BIGINT as total_storage_used,
    MAX(gi.created_at) as last_generation
  FROM generated_images gi
  LEFT JOIN image_storage_metadata ism ON gi.id = ism.image_id
  WHERE gi.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old images (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_old_images(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete old images and related data
  WITH deleted_images AS (
    DELETE FROM generated_images 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND status IN ('failed', 'completed')
    RETURNING id, image_url
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_images;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== COMMENTS ==========

COMMENT ON TABLE generated_images IS 'Stores metadata for all generated images';
COMMENT ON TABLE image_conversations IS 'Stores multi-turn image generation conversations';
COMMENT ON TABLE conversation_messages IS 'Stores messages within image conversations';
COMMENT ON TABLE image_storage_metadata IS 'Stores file metadata for uploaded images';
COMMENT ON TABLE generation_statistics IS 'Stores aggregated generation statistics per user per day';
COMMENT ON TABLE hub_user_preferences IS 'Stores user preferences for the Creation Hub';

COMMENT ON FUNCTION get_user_generation_stats IS 'Returns comprehensive generation statistics for a user';
COMMENT ON FUNCTION cleanup_old_images IS 'Cleanup function to remove old images and free storage space'; 