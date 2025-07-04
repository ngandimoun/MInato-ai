-- ============================================================================
-- FILE: migrations/create_insights_schema.sql  
-- DESC: Create database schema for Minato AI Insights feature
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for insights images
INSERT INTO storage.buckets (id, name, public)
VALUES ('insights-images', 'insights-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for insights documents  
INSERT INTO storage.buckets (id, name, public)
VALUES ('insights-documents', 'insights-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSIGHTS FEATURE TABLES
-- ============================================================================

-- Insights Documents: Store uploaded documents and files
CREATE TABLE IF NOT EXISTS public.insights_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Document metadata
    title VARCHAR(255) NOT NULL,
    description TEXT, -- User-provided description for context
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- pdf, csv, xlsx, txt, docx, etc.
    content_type VARCHAR(50) NOT NULL DEFAULT 'document' CHECK (
        content_type IN ('document', 'image', 'video', 'audio', 'other')
    ),
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    
    -- Batch upload context for correlation analysis
    batch_context JSONB DEFAULT NULL, -- { batch_title, batch_description, batch_index, batch_total }
    
    -- Storage information
    storage_path TEXT NOT NULL, -- Supabase storage path
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'insights-documents',
    
    -- Processing status
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'completed', 'failed', 'archived')
    ),
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        extraction_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
    ),
    
    -- Document content and metadata
    extracted_text TEXT, -- Full text content
    extracted_metadata JSONB DEFAULT '{}'::jsonb, -- Metadata from file (author, creation date, etc.)
    document_summary TEXT, -- AI-generated summary
    key_insights TEXT[], -- Array of key insights extracted by AI
    
    -- Vector embeddings for semantic search
    content_embedding vector(1536), -- Embedding of extracted text
    
    -- Document categorization
    categories TEXT[] DEFAULT ARRAY[]::TEXT[], -- User/AI assigned categories
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- User-defined tags
    
    -- Access and organization
    is_public BOOLEAN NOT NULL DEFAULT false,
    folder_path TEXT, -- Virtual folder organization
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- Insights Transactions: Store financial/business transaction data
CREATE TABLE IF NOT EXISTS public.insights_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Transaction identification
    external_transaction_id VARCHAR(255), -- ID from external system
    source_system VARCHAR(100), -- stripe, quickbooks, manual, csv_upload, etc.
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (
        transaction_type IN ('revenue', 'expense', 'refund', 'fee', 'tax', 'other')
    ),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Transaction metadata
    description TEXT NOT NULL,
    category VARCHAR(100), -- expense category, revenue stream, etc.
    subcategory VARCHAR(100),
    
    -- Parties involved
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    vendor_name VARCHAR(255),
    account_name VARCHAR(255), -- bank account, payment method
    
    -- Timing
    transaction_date DATE NOT NULL,
    posted_date DATE,
    
    -- Additional data
    reference_number VARCHAR(100),
    notes TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb, -- Original data from source system
    
    -- Analysis fields
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern VARCHAR(50), -- monthly, quarterly, annually, etc.
    analysis_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Document relationship
    source_document_id UUID REFERENCES public.insights_documents(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insights Analysis Results: Store AI analysis results and insights
CREATE TABLE IF NOT EXISTS public.insights_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Analysis metadata
    analysis_type VARCHAR(100) NOT NULL, -- financial_summary, trend_analysis, document_insights, etc.
    analysis_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Input data
    input_type VARCHAR(50) NOT NULL CHECK (
        input_type IN ('documents', 'transactions', 'mixed', 'user_query', 'scheduled')
    ),
    input_document_ids UUID[] DEFAULT ARRAY[]::UUID[],
    input_transaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
    input_filters JSONB DEFAULT '{}'::jsonb, -- Date ranges, categories, etc.
    user_query TEXT, -- User's original question/request
    
    -- Analysis configuration
    ai_model VARCHAR(100), -- gpt-4, claude-3, etc.
    analysis_parameters JSONB DEFAULT '{}'::jsonb,
    
    -- Results
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    
    -- Analysis output
    insights JSONB NOT NULL DEFAULT '{}'::jsonb, -- Structured insights
    summary TEXT, -- Executive summary
    recommendations TEXT[], -- Array of recommendations
    key_metrics JSONB DEFAULT '{}'::jsonb, -- Important numbers/KPIs
    trends JSONB DEFAULT '{}'::jsonb, -- Trend analysis data
    
    -- Visualizations and attachments
    chart_data JSONB DEFAULT '{}'::jsonb, -- Data for charts/graphs
    generated_files TEXT[], -- URLs to generated files (PDFs, charts, etc.)
    
    -- Quality and feedback
    confidence_score DECIMAL(3,2), -- 0.0 to 1.0
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    
    -- Processing info
    processing_time_ms INTEGER,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Insights Reports: Store generated reports and their metadata
CREATE TABLE IF NOT EXISTS public.insights_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Report metadata
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL, -- financial_dashboard, monthly_summary, custom_analysis, etc.
    description TEXT,
    
    -- Report generation
    template_id VARCHAR(100), -- Reference to report template
    generation_method VARCHAR(50) NOT NULL DEFAULT 'ai_generated' CHECK (
        generation_method IN ('ai_generated', 'user_created', 'scheduled', 'template_based')
    ),
    
    -- Report content
    content_type VARCHAR(50) NOT NULL DEFAULT 'mixed' CHECK (
        content_type IN ('text', 'json', 'pdf', 'html', 'mixed')
    ),
    report_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Structured report content
    summary TEXT, -- Executive summary
    
    -- Data sources
    source_analysis_ids UUID[] DEFAULT ARRAY[]::UUID[],
    source_document_ids UUID[] DEFAULT ARRAY[]::UUID[],
    source_transaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
    data_period_start DATE,
    data_period_end DATE,
    
    -- Report output
    pdf_url TEXT, -- URL to generated PDF
    html_content TEXT, -- HTML version of report
    generated_files TEXT[], -- Additional generated files
    
    -- Organization and sharing
    category VARCHAR(100),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_public BOOLEAN NOT NULL DEFAULT false,
    shared_with_users UUID[] DEFAULT ARRAY[]::UUID[],
    
    -- Scheduling and automation
    is_scheduled BOOLEAN NOT NULL DEFAULT false,
    schedule_config JSONB DEFAULT '{}'::jsonb, -- Cron-like scheduling
    next_generation_date TIMESTAMPTZ,
    
    -- Status and versioning
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'generating', 'completed', 'failed', 'archived', 'published')
    ),
    version INTEGER NOT NULL DEFAULT 1,
    parent_report_id UUID REFERENCES public.insights_reports(id),
    
    -- Quality metrics
    generation_time_ms INTEGER,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    view_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Insights Documents indexes
CREATE INDEX IF NOT EXISTS idx_insights_documents_user ON public.insights_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_documents_status ON public.insights_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_insights_documents_type ON public.insights_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_insights_documents_created ON public.insights_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_documents_categories ON public.insights_documents USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_insights_documents_tags ON public.insights_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_insights_documents_embedding ON public.insights_documents USING ivfflat (content_embedding vector_cosine_ops);

-- Insights Transactions indexes
CREATE INDEX IF NOT EXISTS idx_insights_transactions_user ON public.insights_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_transactions_type ON public.insights_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_insights_transactions_date ON public.insights_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_transactions_amount ON public.insights_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_insights_transactions_category ON public.insights_transactions(category);
CREATE INDEX IF NOT EXISTS idx_insights_transactions_source ON public.insights_transactions(source_system);
CREATE INDEX IF NOT EXISTS idx_insights_transactions_customer ON public.insights_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_insights_transactions_document ON public.insights_transactions(source_document_id);

-- Insights Analysis Results indexes
CREATE INDEX IF NOT EXISTS idx_insights_analysis_user ON public.insights_analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_type ON public.insights_analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_status ON public.insights_analysis_results(status);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_created ON public.insights_analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_input_docs ON public.insights_analysis_results USING GIN(input_document_ids);
CREATE INDEX IF NOT EXISTS idx_insights_analysis_input_trans ON public.insights_analysis_results USING GIN(input_transaction_ids);

-- Insights Reports indexes
CREATE INDEX IF NOT EXISTS idx_insights_reports_user ON public.insights_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_reports_type ON public.insights_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_insights_reports_status ON public.insights_reports(status);
CREATE INDEX IF NOT EXISTS idx_insights_reports_created ON public.insights_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_reports_category ON public.insights_reports(category);
CREATE INDEX IF NOT EXISTS idx_insights_reports_tags ON public.insights_reports USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_insights_reports_scheduled ON public.insights_reports(is_scheduled, next_generation_date);
CREATE INDEX IF NOT EXISTS idx_insights_reports_public ON public.insights_reports(is_public) WHERE is_public = true;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.insights_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_reports ENABLE ROW LEVEL SECURITY;

-- Insights Documents policies
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

-- Insights Transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.insights_transactions;
CREATE POLICY "Users can view their own transactions" ON public.insights_transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.insights_transactions;
CREATE POLICY "Users can insert their own transactions" ON public.insights_transactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.insights_transactions;
CREATE POLICY "Users can update their own transactions" ON public.insights_transactions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.insights_transactions;
CREATE POLICY "Users can delete their own transactions" ON public.insights_transactions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Insights Analysis Results policies
DROP POLICY IF EXISTS "Users can view their own analysis results" ON public.insights_analysis_results;
CREATE POLICY "Users can view their own analysis results" ON public.insights_analysis_results
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert their own analysis results" ON public.insights_analysis_results;
CREATE POLICY "Users can insert their own analysis results" ON public.insights_analysis_results
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own analysis results" ON public.insights_analysis_results;
CREATE POLICY "Users can update their own analysis results" ON public.insights_analysis_results
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Insights Reports policies
DROP POLICY IF EXISTS "Users can view accessible reports" ON public.insights_reports;
CREATE POLICY "Users can view accessible reports" ON public.insights_reports
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR 
        is_public = true OR
        auth.uid()::text = ANY(shared_with_users::text[])
    );

DROP POLICY IF EXISTS "Users can insert their own reports" ON public.insights_reports;
CREATE POLICY "Users can insert their own reports" ON public.insights_reports
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own reports" ON public.insights_reports;
CREATE POLICY "Users can update their own reports" ON public.insights_reports
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete their own reports" ON public.insights_reports;
CREATE POLICY "Users can delete their own reports" ON public.insights_reports
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_insights_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
DROP TRIGGER IF EXISTS update_insights_documents_updated_at ON public.insights_documents;
CREATE TRIGGER update_insights_documents_updated_at
    BEFORE UPDATE ON public.insights_documents
    FOR EACH ROW EXECUTE FUNCTION update_insights_updated_at_column();

DROP TRIGGER IF EXISTS update_insights_transactions_updated_at ON public.insights_transactions;
CREATE TRIGGER update_insights_transactions_updated_at
    BEFORE UPDATE ON public.insights_transactions
    FOR EACH ROW EXECUTE FUNCTION update_insights_updated_at_column();

DROP TRIGGER IF EXISTS update_insights_analysis_updated_at ON public.insights_analysis_results;
CREATE TRIGGER update_insights_analysis_updated_at
    BEFORE UPDATE ON public.insights_analysis_results
    FOR EACH ROW EXECUTE FUNCTION update_insights_updated_at_column();

DROP TRIGGER IF EXISTS update_insights_reports_updated_at ON public.insights_reports;
CREATE TRIGGER update_insights_reports_updated_at
    BEFORE UPDATE ON public.insights_reports
    FOR EACH ROW EXECUTE FUNCTION update_insights_updated_at_column();

-- Function to increment report view count
CREATE OR REPLACE FUNCTION increment_report_view_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment on actual reads, not updates
    IF TG_OP = 'SELECT' THEN
        UPDATE public.insights_reports 
        SET view_count = view_count + 1 
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to search documents by content similarity
CREATE OR REPLACE FUNCTION search_insights_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title varchar(255),
    file_type varchar(50),
    content_summary text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.file_type,
        COALESCE(d.document_summary, LEFT(d.extracted_text, 200)) as content_summary,
        (d.content_embedding <=> query_embedding) * -1 + 1 as similarity
    FROM public.insights_documents d
    WHERE 
        d.content_embedding IS NOT NULL
        AND (target_user_id IS NULL OR d.user_id = target_user_id)
        AND (d.content_embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY d.content_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get transaction summary for a user and date range
CREATE OR REPLACE FUNCTION get_transaction_summary(
    target_user_id uuid,
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL
)
RETURNS TABLE (
    total_revenue decimal(15,2),
    total_expenses decimal(15,2),
    net_income decimal(15,2),
    transaction_count bigint,
    top_expense_category varchar(100),
    avg_transaction_amount decimal(15,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN transaction_type = 'revenue' THEN amount 
                          WHEN transaction_type = 'expense' THEN -amount 
                          ELSE 0 END), 0) as net_income,
        COUNT(*) as transaction_count,
        (SELECT category FROM public.insights_transactions t2 
         WHERE t2.user_id = target_user_id 
           AND t2.transaction_type = 'expense' 
           AND (start_date IS NULL OR t2.transaction_date >= start_date)
           AND (end_date IS NULL OR t2.transaction_date <= end_date)
         GROUP BY category 
         ORDER BY SUM(amount) DESC 
         LIMIT 1) as top_expense_category,
        COALESCE(AVG(amount), 0) as avg_transaction_amount
    FROM public.insights_transactions t
    WHERE 
        t.user_id = target_user_id
        AND (start_date IS NULL OR t.transaction_date >= start_date)
        AND (end_date IS NULL OR t.transaction_date <= end_date);
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.insights_documents IS 'Stores uploaded documents and files for the insights feature with full-text search and AI processing capabilities';
COMMENT ON TABLE public.insights_transactions IS 'Stores financial and business transaction data for analysis and reporting';
COMMENT ON TABLE public.insights_analysis_results IS 'Stores AI-generated analysis results and insights from documents and transactions';
COMMENT ON TABLE public.insights_reports IS 'Stores generated reports with scheduling, sharing, and versioning capabilities';

-- Column comments for insights_documents
COMMENT ON COLUMN public.insights_documents.processing_status IS 'Overall processing status: pending, processing, completed, failed, archived';
COMMENT ON COLUMN public.insights_documents.extraction_status IS 'Text extraction status: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN public.insights_documents.content_embedding IS 'Vector embedding of extracted text for semantic search (1536 dimensions)';
COMMENT ON COLUMN public.insights_documents.key_insights IS 'AI-extracted key insights and important points from the document';

-- Column comments for insights_transactions
COMMENT ON COLUMN public.insights_transactions.transaction_type IS 'Type of transaction: revenue, expense, refund, fee, tax, other';
COMMENT ON COLUMN public.insights_transactions.source_system IS 'Source system: stripe, quickbooks, manual, csv_upload, etc.';
COMMENT ON COLUMN public.insights_transactions.recurring_pattern IS 'Recurring pattern if applicable: monthly, quarterly, annually, etc.';

-- Column comments for insights_analysis_results
COMMENT ON COLUMN public.insights_analysis_results.analysis_type IS 'Type of analysis: financial_summary, trend_analysis, document_insights, etc.';
COMMENT ON COLUMN public.insights_analysis_results.input_type IS 'Input data type: documents, transactions, mixed, user_query, scheduled';
COMMENT ON COLUMN public.insights_analysis_results.insights IS 'Structured insights data in JSON format';
COMMENT ON COLUMN public.insights_analysis_results.confidence_score IS 'AI confidence score from 0.0 to 1.0';

-- Column comments for insights_reports
COMMENT ON COLUMN public.insights_reports.generation_method IS 'How report was created: ai_generated, user_created, scheduled, template_based';
COMMENT ON COLUMN public.insights_reports.content_type IS 'Report content format: text, json, pdf, html, mixed';
COMMENT ON COLUMN public.insights_reports.schedule_config IS 'Cron-like scheduling configuration for automated report generation';

-- ============================================================================
-- END OF FILE
-- ============================================================================