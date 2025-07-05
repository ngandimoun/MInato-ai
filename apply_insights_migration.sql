-- Apply insights migration for image upload functionality
-- This creates the minimal required tables for insights to work

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create insights_documents table
CREATE TABLE IF NOT EXISTS public.insights_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Document metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'document' CHECK (
        content_type IN ('document', 'image', 'video', 'audio', 'other')
    ),
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    
    -- Batch upload context
    batch_context JSONB DEFAULT NULL,
    
    -- Storage information
    storage_path TEXT,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'insights-documents',
    
    -- Processing status
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'completed', 'failed', 'archived')
    ),
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        extraction_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
    ),
    
    -- Document content
    extracted_text TEXT,
    document_summary TEXT,
    key_insights TEXT[],
    
    -- Document categorization
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Access and organization
    is_public BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- Create insights_analysis_results table
CREATE TABLE IF NOT EXISTS public.insights_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Analysis metadata
    analysis_type VARCHAR(100) NOT NULL,
    analysis_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Input data
    input_type VARCHAR(50) NOT NULL DEFAULT 'documents' CHECK (
        input_type IN ('documents', 'transactions', 'mixed', 'user_query', 'scheduled')
    ),
    input_document_ids UUID[] DEFAULT ARRAY[]::UUID[],
    user_query TEXT,
    
    -- Analysis configuration
    ai_model VARCHAR(100),
    analysis_parameters JSONB DEFAULT '{}'::jsonb,
    
    -- Results
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    
    -- Analysis output
    insights JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary TEXT,
    recommendations TEXT[],
    key_metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Quality and feedback
    confidence_score DECIMAL(3,2),
    
    -- Processing info
    processing_time_ms INTEGER,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insights_documents_user ON public.insights_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_documents_status ON public.insights_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_insights_documents_created ON public.insights_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_insights_analysis_user ON public.insights_analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_status ON public.insights_analysis_results(status);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_created ON public.insights_analysis_results(created_at DESC);

-- Enable RLS on tables
ALTER TABLE public.insights_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for insights_documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.insights_documents;
CREATE POLICY "Users can view their own documents" ON public.insights_documents
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.insights_documents;
CREATE POLICY "Users can insert their own documents" ON public.insights_documents
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.insights_documents;
CREATE POLICY "Users can update their own documents" ON public.insights_documents
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.insights_documents;
CREATE POLICY "Users can delete their own documents" ON public.insights_documents
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for insights_analysis_results
DROP POLICY IF EXISTS "Users can view their own analysis results" ON public.insights_analysis_results;
CREATE POLICY "Users can view their own analysis results" ON public.insights_analysis_results
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own analysis results" ON public.insights_analysis_results;
CREATE POLICY "Users can insert their own analysis results" ON public.insights_analysis_results
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own analysis results" ON public.insights_analysis_results;
CREATE POLICY "Users can update their own analysis results" ON public.insights_analysis_results
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_insights_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_insights_documents_updated_at ON public.insights_documents;
CREATE TRIGGER update_insights_documents_updated_at
    BEFORE UPDATE ON public.insights_documents
    FOR EACH ROW EXECUTE FUNCTION update_insights_updated_at_column();

DROP TRIGGER IF EXISTS update_insights_analysis_updated_at ON public.insights_analysis_results;
CREATE TRIGGER update_insights_analysis_updated_at
    BEFORE UPDATE ON public.insights_analysis_results
    FOR EACH ROW EXECUTE FUNCTION update_insights_updated_at_column(); 