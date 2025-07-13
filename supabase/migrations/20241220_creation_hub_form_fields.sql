-- Creation Hub Form Fields Migration
-- This migration adds support for storing user form field inputs for the enhanced UX fields

-- ========== FORM SUBMISSIONS TABLE ==========

-- Table to store user form submissions with all the new UX fields
CREATE TABLE IF NOT EXISTS creation_form_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  form_values JSONB NOT NULL DEFAULT '{}',
  
  -- Standard fields that are common across all forms
  title TEXT,
  description TEXT,
  style TEXT,
  mood TEXT,
  color_preference TEXT,
  industry TEXT,
  
  -- Letterhead specific fields
  company_name TEXT,
  contact_details TEXT,
  logo_upload TEXT, -- URL to uploaded logo file
  letter_content TEXT,
  brand_colors TEXT,
  document_purpose TEXT,
  letterhead_style TEXT,
  correspondence_type TEXT,
  
  -- Illustrations specific fields
  illustration_type TEXT,
  illustration_purpose TEXT,
  target_audience TEXT,
  illustration_dimensions TEXT,
  specific_requirements TEXT,
  
  -- Product mockups specific fields
  product_type TEXT,
  design_upload TEXT, -- URL to uploaded design file
  brand_elements TEXT,
  usage_context TEXT,
  setting TEXT,
  angle TEXT,
  
  -- UI components specific fields
  component_type TEXT,
  component_dimensions TEXT,
  component_content TEXT,
  interaction_state TEXT[],
  platform TEXT,
  design_system TEXT,
  user_experience TEXT,
  functionality TEXT,
  
  -- Logo & brand specific fields
  logo_style TEXT,
  logo_usage_context TEXT,
  output_formats TEXT[],
  slogan TEXT,
  
  -- AI avatars specific fields
  subject_description TEXT,
  professional_role TEXT,
  platform_usage TEXT,
  personal_brand TEXT,
  expression TEXT,
  framing TEXT,
  
  -- Social media specific fields
  social_platform TEXT,
  post_type TEXT,
  campaign_type TEXT,
  call_to_action TEXT,
  
  -- Marketing specific fields
  material_type TEXT,
  
  -- Banners specific fields
  banner_size TEXT,
  banner_placement TEXT,
  
  -- Data visualization specific fields
  chart_type TEXT,
  data_source TEXT,
  
  -- File uploads and attachments
  uploaded_files JSONB DEFAULT '[]', -- Array of file URLs and metadata
  
  -- Generation metadata
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  generated_image_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
  generation_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== FILE UPLOADS TABLE ==========

-- Table to track uploaded files (logos, designs, etc.)
CREATE TABLE IF NOT EXISTS creation_file_uploads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_submission_id TEXT REFERENCES creation_form_submissions(id) ON DELETE CASCADE,
  
  -- File metadata
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_purpose TEXT NOT NULL, -- 'logo', 'design', 'reference', etc.
  
  -- Storage information
  bucket TEXT NOT NULL DEFAULT 'creation-hub',
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  
  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN ('uploading', 'uploaded', 'processing', 'processed', 'failed')),
  processing_error TEXT,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ========== USER FORM TEMPLATES ==========

-- Table to store user's saved form templates for reuse
CREATE TABLE IF NOT EXISTS creation_form_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Template metadata
  template_name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  description TEXT,
  
  -- Template data
  template_values JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== INDEXES ==========

-- Performance indexes for form submissions
CREATE INDEX IF NOT EXISTS idx_creation_form_submissions_user_id ON creation_form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_creation_form_submissions_category_id ON creation_form_submissions(category_id);
CREATE INDEX IF NOT EXISTS idx_creation_form_submissions_created_at ON creation_form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creation_form_submissions_status ON creation_form_submissions(generation_status);
CREATE INDEX IF NOT EXISTS idx_creation_form_submissions_user_category ON creation_form_submissions(user_id, category_id);

-- Performance indexes for file uploads
CREATE INDEX IF NOT EXISTS idx_creation_file_uploads_user_id ON creation_file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_creation_file_uploads_form_submission_id ON creation_file_uploads(form_submission_id);
CREATE INDEX IF NOT EXISTS idx_creation_file_uploads_purpose ON creation_file_uploads(file_purpose);
CREATE INDEX IF NOT EXISTS idx_creation_file_uploads_status ON creation_file_uploads(processing_status);

-- Performance indexes for templates
CREATE INDEX IF NOT EXISTS idx_creation_form_templates_user_id ON creation_form_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_creation_form_templates_category_id ON creation_form_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_creation_form_templates_public ON creation_form_templates(is_public) WHERE is_public = true;

-- ========== TRIGGERS ==========

-- Updated at triggers for new tables
DROP TRIGGER IF EXISTS update_creation_form_submissions_updated_at ON creation_form_submissions;
CREATE TRIGGER update_creation_form_submissions_updated_at
  BEFORE UPDATE ON creation_form_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_creation_form_templates_updated_at ON creation_form_templates;
CREATE TRIGGER update_creation_form_templates_updated_at
  BEFORE UPDATE ON creation_form_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Template usage count trigger
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- When a form submission references a template, increment usage count
  IF NEW.form_values ? 'template_id' THEN
    UPDATE creation_form_templates 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = (NEW.form_values->>'template_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_template_usage_trigger ON creation_form_submissions;
CREATE TRIGGER increment_template_usage_trigger
  AFTER INSERT ON creation_form_submissions
  FOR EACH ROW EXECUTE FUNCTION increment_template_usage();

-- ========== ROW LEVEL SECURITY ==========

-- Enable RLS on all new tables
ALTER TABLE creation_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_form_templates ENABLE ROW LEVEL SECURITY;

-- Policies for form submissions
CREATE POLICY "Users can view their own form submissions"
  ON creation_form_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own form submissions"
  ON creation_form_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form submissions"
  ON creation_form_submissions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form submissions"
  ON creation_form_submissions FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for file uploads
CREATE POLICY "Users can view their own file uploads"
  ON creation_file_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own file uploads"
  ON creation_file_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file uploads"
  ON creation_file_uploads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file uploads"
  ON creation_file_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for form templates
CREATE POLICY "Users can view their own templates and public templates"
  ON creation_form_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates"
  ON creation_form_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON creation_form_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON creation_form_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ========== HELPER FUNCTIONS ==========

-- Function to get user's form submission history
CREATE OR REPLACE FUNCTION get_user_form_submissions(
  user_uuid UUID,
  category_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  category_id TEXT,
  title TEXT,
  generation_status TEXT,
  created_at TIMESTAMPTZ,
  has_files BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cfs.id,
    cfs.category_id,
    cfs.title,
    cfs.generation_status,
    cfs.created_at,
    EXISTS(
      SELECT 1 FROM creation_file_uploads cfu 
      WHERE cfu.form_submission_id = cfs.id
    ) as has_files
  FROM creation_form_submissions cfs
  WHERE cfs.user_id = user_uuid
    AND (category_filter IS NULL OR cfs.category_id = category_filter)
  ORDER BY cfs.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old form submissions
CREATE OR REPLACE FUNCTION cleanup_old_form_submissions(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete old form submissions and their associated files
  WITH deleted_submissions AS (
    DELETE FROM creation_form_submissions
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
      AND generation_status IN ('failed', 'completed')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_submissions;
  
  RAISE NOTICE 'Deleted % old form submissions', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== VERIFICATION ==========

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check tables
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('creation_form_submissions', 'creation_file_uploads', 'creation_form_templates')
  INTO table_count;
  
  IF table_count = 3 THEN
    RAISE NOTICE '✓ All creation hub form tables created successfully';
  ELSE
    RAISE EXCEPTION '✗ Expected 3 tables, found %', table_count;
  END IF;
  
  -- Check policies
  SELECT COUNT(*) 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename LIKE 'creation_%'
  INTO policy_count;
  
  IF policy_count >= 12 THEN
    RAISE NOTICE '✓ Creation hub RLS policies configured (% policies)', policy_count;
  ELSE
    RAISE WARNING '⚠ Only % RLS policies found for creation hub tables', policy_count;
  END IF;
  
  RAISE NOTICE '✓ Creation Hub form fields migration completed successfully';
END $$; 