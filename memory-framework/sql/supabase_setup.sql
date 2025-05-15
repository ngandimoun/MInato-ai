-- ============================================================================
-- FILE: supabase_setup_unified.sql
-- DESC: Unified Supabase setup script for CompanionCoreMemory framework,
--       including core memory storage and external content caching.
-- ============================================================================
-- Run this script via the Supabase SQL Editor.

-- Phase 1: Extensions -------------------------------------------------------
-- Ensure necessary extensions are enabled.

-- 1. Enable pgvector extension for vector similarity search.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Phase 2: Tables ----------------------------------------------------------
-- Define the database tables.

-- 2. Create the 'memories' table.
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    content TEXT NOT NULL CHECK (length(content) > 0),
    embedding vector(1536) NOT NULL,                 -- Type vector sans préfixe
    run_id TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    language TEXT NULL,
    source_turn_ids TEXT[] NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NULL,
    content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED
);

-- Comments
COMMENT ON TABLE public.memories IS 'Stores user-specific memory units (facts, summaries, preferences, reminders) with vector embeddings.';
COMMENT ON COLUMN public.memories.id IS 'Unique identifier for this memory unit.';
COMMENT ON COLUMN public.memories.user_id IS 'Identifier of the user this memory belongs to (Should match auth.users.id type).';
COMMENT ON COLUMN public.memories.content IS 'The text content of the memory (fact, summary, preference, reminder, discovery interaction).';
COMMENT ON COLUMN public.memories.embedding IS 'Vector embedding generated from the content (e.g., using text-embedding-3-small, 1536 dimensions).';
COMMENT ON COLUMN public.memories.run_id IS 'Optional ID linking memory to a specific session/run.';
COMMENT ON COLUMN public.memories.metadata IS 'JSONB field for storing structured data extracted by LLM (entities, sentiment, reminder_details, etc.) or system metadata.';
COMMENT ON COLUMN public.memories.categories IS 'Array of assigned categories for filtering and organization.';
COMMENT ON COLUMN public.memories.language IS 'Detected language of the content (e.g., en, es, ja).';
COMMENT ON COLUMN public.memories.source_turn_ids IS 'Optional array of IDs linking this memory to specific conversation turns.';
COMMENT ON COLUMN public.memories.created_at IS 'Timestamp (UTC) when the memory was first created.';
COMMENT ON COLUMN public.memories.updated_at IS 'Timestamp (UTC) when the memory was last updated.';
COMMENT ON COLUMN public.memories.expires_at IS 'Optional timestamp (UTC) when the memory should be considered expired.';
COMMENT ON COLUMN public.memories.content_tsv IS 'Generated tsvector for Full-Text Search using the ''simple'' dictionary.';

-- 3. Create the 'external_content_cache' table.
CREATE TABLE IF NOT EXISTS public.external_content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_query_text TEXT NOT NULL,
    query_embedding vector(1536) NOT NULL,           -- Type vector sans préfixe
    result_type TEXT NOT NULL CHECK (result_type IN (
        'video', 'image', 'product', 'recipe', 'weather',
        'gif', 'place', 'web_snippet', 'general_answer',
        'calculation', 'fact', 'holiday', 'other'
    )),
    structured_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_api TEXT NOT NULL,
    language TEXT NULL,
    location TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Comments Cache
COMMENT ON TABLE public.external_content_cache IS 'Caches structured results from external API calls...';
COMMENT ON COLUMN public.external_content_cache.id IS 'Unique ID for this cache entry.';
COMMENT ON COLUMN public.external_content_cache.user_query_text IS 'The user query text that generated this cached result.';
COMMENT ON COLUMN public.external_content_cache.query_embedding IS 'Vector embedding of the user_query_text for semantic similarity search.';
COMMENT ON COLUMN public.external_content_cache.result_type IS 'Category of the cached result (e.g., video, image, product).';
COMMENT ON COLUMN public.external_content_cache.structured_result IS 'The structured data (JSONB) retrieved from the source API or filtered by LLM.';
COMMENT ON COLUMN public.external_content_cache.source_api IS 'Identifier of the external API source (e.g., youtube, serper_shopping).';
COMMENT ON COLUMN public.external_content_cache.language IS 'Language context of the query/result (ISO 639-1).';
COMMENT ON COLUMN public.external_content_cache.location IS 'Location context used for the query (e.g., country code).';
COMMENT ON COLUMN public.external_content_cache.created_at IS 'Timestamp (UTC) when the cache entry was created.';
COMMENT ON COLUMN public.external_content_cache.expires_at IS 'Timestamp (UTC) when this cache entry should be considered stale.';


-- Phase 3: Indexes ---------------------------------------------------------

-- === Indexes for 'memories' table ===
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_memories_run_id ON public.memories USING btree (run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_language ON public.memories USING btree (language) WHERE language IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON public.memories USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON public.memories USING btree (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memories_categories ON public.memories USING gin (categories);
CREATE INDEX IF NOT EXISTS idx_memories_metadata ON public.memories USING gin (metadata jsonb_path_ops);

-- HNSW Index - sans préfixe schema pour l'opérateur
CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw ON public.memories USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN Index FTS
CREATE INDEX IF NOT EXISTS idx_memories_content_tsv ON public.memories USING gin (content_tsv);

-- === Indexes for 'external_content_cache' table ===
-- HNSW Index - sans préfixe schema pour l'opérateur
CREATE INDEX IF NOT EXISTS idx_external_cache_embedding_hnsw ON public.external_content_cache USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_external_cache_expires_at ON public.external_content_cache USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_external_cache_result_type ON public.external_content_cache USING btree (result_type);
CREATE INDEX IF NOT EXISTS idx_external_cache_language ON public.external_content_cache USING btree (language) WHERE language IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_cache_location ON public.external_content_cache USING btree (location) WHERE location IS NOT NULL;


-- Phase 4: Functions -------------------------------------------------------

-- 4.1 Trigger function
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.trigger_set_updated_at() IS 'Generic trigger function to set the updated_at timestamp to current UTC time on row update.';

-- Apply the update trigger to the 'memories' table.
-- <<< BLOC DO $$ ... END $$; RESTAURÉ CORRECTEMENT >>>
DO $$
BEGIN
    -- Check if the trigger already exists for the 'memories' table.
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_memories_updated_at' AND tgrelid = 'public.memories'::regclass) THEN
        -- Create the trigger if it doesn't exist.
        CREATE TRIGGER set_memories_updated_at
        BEFORE UPDATE ON public.memories -- Trigger fires before an UPDATE operation.
        FOR EACH ROW                    -- Trigger executes once for each modified row.
        EXECUTE FUNCTION public.trigger_set_updated_at(); -- Call the function defined above.
        COMMENT ON TRIGGER set_memories_updated_at ON public.memories IS 'Automatically sets the updated_at timestamp on memory row updates.';
    END IF;
END $$;
-- <<< FIN DU BLOC RESTAURÉ >>>

-- 4.2 Hybrid Search Function for 'memories'
CREATE OR REPLACE FUNCTION public.match_memories_v2(
    query_embedding vector(1536), -- Utilise 'vector' sans préfixe schema
    query_text TEXT,
    match_limit INTEGER,
    match_offset INTEGER DEFAULT 0,
    filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id UUID, user_id TEXT, run_id TEXT, content TEXT, metadata JSONB, categories TEXT[],
    language TEXT, source_turn_ids TEXT[], created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, vector_score FLOAT, keyword_score FLOAT
)
LANGUAGE plpgsql AS $$
#variable_conflict use_variable
DECLARE
    v_user_id TEXT := filter->>'user_id_filter';
    v_run_id TEXT := filter->>'run_id_filter';
    v_metadata_filter JSONB := filter->'metadata_filter';
    v_categories_filter TEXT[];
    v_language_filter TEXT := filter->>'language_filter';
    v_created_at_gte_filter TIMESTAMPTZ := (filter->>'created_at_gte_filter')::TIMESTAMPTZ;
    v_created_at_lte_filter TIMESTAMPTZ := (filter->>'created_at_lte_filter')::TIMESTAMPTZ;
    v_updated_at_gte_filter TIMESTAMPTZ := (filter->>'updated_at_gte_filter')::TIMESTAMPTZ;
    v_updated_at_lte_filter TIMESTAMPTZ := (filter->>'updated_at_lte_filter')::TIMESTAMPTZ;
    v_exclude_expired_filter BOOLEAN := COALESCE((filter->>'exclude_expired_filter')::BOOLEAN, true);
    v_tsquery TSQUERY;
    v_vector_weight FLOAT := COALESCE((filter->>'vector_weight')::FLOAT, 0.7);
    v_keyword_weight FLOAT := COALESCE((filter->>'keyword_weight')::FLOAT, 0.3);
BEGIN
    -- Validation user_id
    IF v_user_id IS NULL OR v_user_id = '' THEN RAISE WARNING '...'; RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::JSONB, NULL::TEXT[], NULL::TEXT, NULL::TEXT[], NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::FLOAT, NULL::FLOAT WHERE FALSE; RETURN; END IF;
    -- Extraction catégories
    IF filter ? 'categories_filter' AND jsonb_typeof(filter->'categories_filter') = 'array' THEN SELECT ARRAY(SELECT jsonb_array_elements_text(filter->'categories_filter')) INTO v_categories_filter; ELSE v_categories_filter := NULL; END IF;
    -- Création tsquery avec to_tsquery(text)
    IF query_text IS NOT NULL AND query_text != '' THEN v_tsquery := to_tsquery(query_text); ELSE v_tsquery := NULL; END IF;
    -- Requête principale
    RETURN QUERY WITH candidate_memories AS ( SELECT mem.id FROM public.memories mem WHERE mem.user_id = v_user_id AND (v_run_id IS NULL OR mem.run_id = v_run_id) AND (v_metadata_filter IS NULL OR mem.metadata @> v_metadata_filter) AND (v_categories_filter IS NULL OR mem.categories @> v_categories_filter) AND (v_language_filter IS NULL OR mem.language = v_language_filter) AND (v_created_at_gte_filter IS NULL OR mem.created_at >= v_created_at_gte_filter) AND (v_created_at_lte_filter IS NULL OR mem.created_at <= v_created_at_lte_filter) AND (v_updated_at_gte_filter IS NULL OR mem.updated_at >= v_updated_at_gte_filter) AND (v_updated_at_lte_filter IS NULL OR mem.updated_at <= v_updated_at_lte_filter) AND (NOT v_exclude_expired_filter OR (mem.expires_at IS NULL OR mem.expires_at > timezone('utc', now()))) AND (v_tsquery IS NULL OR mem.content_tsv @@ v_tsquery OR mem.embedding IS NOT NULL) ) SELECT m.id, m.user_id, m.run_id, m.content, m.metadata, m.categories, m.language, m.source_turn_ids, m.created_at, m.updated_at, m.expires_at, COALESCE((1 - (m.embedding <=> query_embedding))::FLOAT, 0.0) AS vector_score, COALESCE((CASE WHEN v_tsquery IS NULL THEN 0.0 ELSE ts_rank_cd(m.content_tsv, v_tsquery)::FLOAT END), 0.0) AS keyword_score FROM public.memories m JOIN candidate_memories cm ON m.id = cm.id ORDER BY (v_vector_weight * COALESCE((1 - (m.embedding <=> query_embedding))::FLOAT, 0.0)) + (v_keyword_weight * COALESCE((CASE WHEN v_tsquery IS NULL THEN 0.0 ELSE ts_rank_cd(m.content_tsv, v_tsquery)::FLOAT END), 0.0)) DESC, m.updated_at DESC LIMIT match_limit OFFSET match_offset;
END;
$$;
COMMENT ON FUNCTION public.match_memories_v2(vector, text, integer, integer, jsonb) IS 'Performs hybrid search (vector + FTS using default ts_config) on memories table. Requires user_id_filter. Returns memories ranked by combined score.'; -- Signature SANS extensions.

-- 4.3 Function for Semantic Cache Lookup
CREATE OR REPLACE FUNCTION public.match_external_content_cache(
    query_embedding vector(1536),    -- Utilise 'vector' sans préfixe schema
    match_threshold FLOAT DEFAULT 0.85,
    match_limit INTEGER DEFAULT 5,
    filter_result_type TEXT DEFAULT NULL,
    filter_language TEXT DEFAULT NULL,
    filter_location TEXT DEFAULT NULL
)
RETURNS SETOF public.external_content_cache
LANGUAGE sql STABLE PARALLEL SAFE AS $$
    SELECT ecc.* FROM public.external_content_cache ecc WHERE (1 - (ecc.query_embedding <=> query_embedding)) >= match_threshold AND ecc.expires_at > timezone('utc', now()) AND (filter_result_type IS NULL OR ecc.result_type = filter_result_type) AND (filter_language IS NULL OR ecc.language = filter_language) AND (filter_location IS NULL OR ecc.location = filter_location) ORDER BY (ecc.query_embedding <=> query_embedding) ASC LIMIT match_limit;
$$;
COMMENT ON FUNCTION public.match_external_content_cache(vector, float, integer, text, text, text) IS 'Searches the external_content_cache for semantically similar entries... Returns best matches.'; -- Signature SANS extensions.

-- Phase 5: Grant Permissions -----------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.trigger_set_updated_at() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_memories_v2(vector, text, integer, integer, jsonb) TO authenticated, service_role; -- Signature SANS extensions.
GRANT EXECUTE ON FUNCTION public.match_external_content_cache(vector, float, integer, text, text, text) TO authenticated, service_role; -- Signature SANS extensions.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.memories TO authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.external_content_cache TO authenticated, service_role;
GRANT UPDATE, DELETE ON TABLE public.external_content_cache TO service_role;

-- Phase 6: Row Level Security (RLS) ----------------------------------------
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User can manage their own memories" ON public.memories;
CREATE POLICY "User can manage their own memories" ON public.memories FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Allow service_role full access to memories" ON public.memories;
CREATE POLICY "Allow service_role full access to memories" ON public.memories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.external_content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_content_cache FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read access to cache" ON public.external_content_cache;
CREATE POLICY "Allow authenticated read access to cache" ON public.external_content_cache FOR SELECT TO authenticated, service_role USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert access to cache" ON public.external_content_cache;
CREATE POLICY "Allow authenticated insert access to cache" ON public.external_content_cache FOR INSERT TO authenticated, service_role WITH CHECK (true);
DROP POLICY IF EXISTS "Allow service role update access to cache" ON public.external_content_cache;
CREATE POLICY "Allow service role update access to cache" ON public.external_content_cache FOR UPDATE TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow service role delete access to cache" ON public.external_content_cache;
CREATE POLICY "Allow service role delete access to cache" ON public.external_content_cache FOR DELETE TO service_role USING (true);

-- ============================================================================
-- END OF FILE: supabase_setup_unified.sql
-- ============================================================================