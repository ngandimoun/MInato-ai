-- Living Dossier Tables

-- Main Living Dossier table
CREATE TABLE IF NOT EXISTS living_dossiers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  query TEXT NOT NULL,
  refined_query TEXT,
  domain TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error TEXT,
  executive_summary JSONB,
  supporting_evidence JSONB,
  simulator JSONB,
  data_appendix JSONB,
  visualizations JSONB,
  tags TEXT[],
  collaborators UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dossier Annotations
CREATE TABLE IF NOT EXISTS dossier_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES living_dossiers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position JSONB NOT NULL,
  type TEXT NOT NULL DEFAULT 'comment' CHECK (type IN ('comment', 'highlight', 'insight')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Items for Dossiers
CREATE TABLE IF NOT EXISTS dossier_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES living_dossiers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('web', 'api', 'llm', 'user', 'tool')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_living_dossiers_user_id ON living_dossiers(user_id);
CREATE INDEX IF NOT EXISTS idx_living_dossiers_domain ON living_dossiers(domain);
CREATE INDEX IF NOT EXISTS idx_dossier_annotations_dossier_id ON dossier_annotations(dossier_id);
CREATE INDEX IF NOT EXISTS idx_dossier_knowledge_items_dossier_id ON dossier_knowledge_items(dossier_id);

-- RLS Policies
ALTER TABLE living_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_knowledge_items ENABLE ROW LEVEL SECURITY;

-- Owner can see and modify their own dossiers
CREATE POLICY "Users can view own dossiers" 
  ON living_dossiers FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dossiers" 
  ON living_dossiers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dossiers" 
  ON living_dossiers FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dossiers" 
  ON living_dossiers FOR DELETE USING (auth.uid() = user_id);

-- Collaborators can view dossiers they're added to
CREATE POLICY "Collaborators can view dossiers" 
  ON living_dossiers FOR SELECT USING (auth.uid() = ANY(collaborators));

-- Annotation policies
CREATE POLICY "Users can view annotations on their dossiers" 
  ON dossier_annotations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM living_dossiers 
      WHERE id = dossier_annotations.dossier_id 
      AND (user_id = auth.uid() OR auth.uid() = ANY(collaborators))
    )
  );

CREATE POLICY "Users can insert annotations on their dossiers" 
  ON dossier_annotations FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM living_dossiers 
      WHERE id = dossier_annotations.dossier_id 
      AND (user_id = auth.uid() OR auth.uid() = ANY(collaborators))
    )
  );

-- Knowledge item policies
CREATE POLICY "Users can view knowledge items on their dossiers" 
  ON dossier_knowledge_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM living_dossiers 
      WHERE id = dossier_knowledge_items.dossier_id 
      AND (user_id = auth.uid() OR auth.uid() = ANY(collaborators))
    )
  ); 