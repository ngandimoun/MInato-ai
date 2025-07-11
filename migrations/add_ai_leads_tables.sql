-- AI Leads Feature Database Schema
-- This migration adds tables for AI lead generation and management

-- AI Lead Searches table - stores search configurations
CREATE TABLE IF NOT EXISTS ai_lead_searches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    platforms TEXT[] NOT NULL DEFAULT '{}', -- Array of platforms: reddit, hackernews, websearch, etc.
    search_prompt TEXT NOT NULL,
    industry_focus VARCHAR(100),
    target_audience TEXT,
    message_tone VARCHAR(50) DEFAULT 'professional', -- professional, casual, friendly, etc.
    search_config JSONB DEFAULT '{}', -- Platform-specific configurations
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_search_at TIMESTAMP WITH TIME ZONE
);

-- AI Lead Results table - stores found leads
CREATE TABLE IF NOT EXISTS ai_lead_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    search_id UUID NOT NULL REFERENCES ai_lead_searches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_info JSONB DEFAULT '{}', -- Author details, profile info
    engagement_metrics JSONB DEFAULT '{}', -- Likes, comments, shares, etc.
    lead_score INTEGER DEFAULT 0, -- 0-100 confidence score
    urgency_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    tags TEXT[] DEFAULT '{}',
    platform_insights JSONB DEFAULT '{}', -- Platform-specific analysis
    is_contacted BOOLEAN DEFAULT FALSE,
    contact_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Lead Messages table - stores generated messages
CREATE TABLE IF NOT EXISTS ai_lead_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_result_id UUID NOT NULL REFERENCES ai_lead_results(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL, -- initial_outreach, follow_up, custom
    message_content TEXT NOT NULL,
    personalization_data JSONB DEFAULT '{}', -- Data used for personalization
    tone VARCHAR(50) DEFAULT 'professional',
    platform_optimized BOOLEAN DEFAULT TRUE,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    response_received BOOLEAN DEFAULT FALSE,
    response_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Lead Prompts table - stores prompt templates
CREATE TABLE IF NOT EXISTS ai_lead_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system prompts
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt_type VARCHAR(50) NOT NULL, -- search, message_generation, analysis
    platform VARCHAR(50), -- Specific platform or NULL for general
    industry VARCHAR(100), -- Target industry or NULL for general
    prompt_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Template variables and their descriptions
    is_system_prompt BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_lead_searches_user_id ON ai_lead_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_searches_status ON ai_lead_searches(status);
CREATE INDEX IF NOT EXISTS idx_ai_lead_searches_created_at ON ai_lead_searches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_lead_results_search_id ON ai_lead_results(search_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_results_user_id ON ai_lead_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_results_platform ON ai_lead_results(platform);
CREATE INDEX IF NOT EXISTS idx_ai_lead_results_lead_score ON ai_lead_results(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_lead_results_urgency ON ai_lead_results(urgency_level);
CREATE INDEX IF NOT EXISTS idx_ai_lead_results_created_at ON ai_lead_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_lead_messages_lead_result_id ON ai_lead_messages(lead_result_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_messages_user_id ON ai_lead_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_messages_message_type ON ai_lead_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_ai_lead_prompts_user_id ON ai_lead_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_prompts_prompt_type ON ai_lead_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_ai_lead_prompts_platform ON ai_lead_prompts(platform);
CREATE INDEX IF NOT EXISTS idx_ai_lead_prompts_industry ON ai_lead_prompts(industry);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_lead_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_lead_searches
CREATE POLICY "Users can view their own lead searches" ON ai_lead_searches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead searches" ON ai_lead_searches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead searches" ON ai_lead_searches
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead searches" ON ai_lead_searches
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_lead_results
CREATE POLICY "Users can view their own lead results" ON ai_lead_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead results" ON ai_lead_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead results" ON ai_lead_results
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead results" ON ai_lead_results
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_lead_messages
CREATE POLICY "Users can view their own lead messages" ON ai_lead_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead messages" ON ai_lead_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead messages" ON ai_lead_messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead messages" ON ai_lead_messages
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_lead_prompts
CREATE POLICY "Users can view system prompts and their own prompts" ON ai_lead_prompts
    FOR SELECT USING (is_system_prompt = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own prompts" ON ai_lead_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system_prompt = false);

CREATE POLICY "Users can update their own prompts" ON ai_lead_prompts
    FOR UPDATE USING (auth.uid() = user_id AND is_system_prompt = false);

CREATE POLICY "Users can delete their own prompts" ON ai_lead_prompts
    FOR DELETE USING (auth.uid() = user_id AND is_system_prompt = false);

-- Insert default system prompts
INSERT INTO ai_lead_prompts (name, description, prompt_type, platform, industry, prompt_template, is_system_prompt, variables) VALUES
-- Search prompts
('Reddit Tech Lead Search', 'Find potential leads in tech-related subreddits', 'search', 'reddit', 'technology', 'Search for posts in tech subreddits where users are discussing: {{search_topic}}. Focus on posts where users express frustration, ask for solutions, or mention specific pain points related to {{industry_focus}}.', true, '{"search_topic": "Main search topic", "industry_focus": "Industry or domain focus"}'),

('HackerNews Startup Search', 'Find startup founders and entrepreneurs on HackerNews', 'search', 'hackernews', 'startup', 'Look for HackerNews posts and comments where users discuss: {{search_topic}}. Prioritize posts from users who mention being founders, CTOs, or decision-makers at companies.', true, '{"search_topic": "Main search topic"}'),

('General Web Search', 'General web search for leads across platforms', 'search', 'websearch', null, 'Search for recent discussions, articles, or posts about: {{search_topic}}. Focus on finding decision-makers, business owners, or people expressing specific needs in {{industry_focus}}.', true, '{"search_topic": "Main search topic", "industry_focus": "Industry focus"}'),

-- Message generation prompts
('Professional Outreach - Tech', 'Professional outreach message for tech leads', 'message_generation', 'reddit', 'technology', 'Write a professional, personalized outreach message for a Reddit user who posted about {{lead_context}}. 

Key details:
- User: {{author_name}}
- Post: {{post_title}}
- Their situation: {{user_situation}}
- Our solution: {{our_solution}}

The message should:
1. Reference their specific post naturally
2. Show genuine understanding of their problem
3. Offer helpful value upfront
4. Be conversational and not salesy
5. Include a soft call-to-action

Keep it under 200 words and maintain a helpful, expert tone.', true, '{"lead_context": "Context of the lead", "author_name": "Lead author name", "post_title": "Original post title", "user_situation": "User''s current situation", "our_solution": "How we can help"}'),

('Casual Outreach - General', 'Casual, friendly outreach message', 'message_generation', null, null, 'Write a casual, friendly message to someone who posted about {{lead_context}}.

Details:
- Platform: {{platform}}
- User: {{author_name}}
- Their post: {{post_title}}
- Key pain point: {{pain_point}}

Make it:
- Conversational and approachable
- Show you actually read their post
- Offer genuine help
- Not pushy or sales-heavy
- Include a question to start dialogue

Keep it brief and authentic.', true, '{"lead_context": "Lead context", "platform": "Platform name", "author_name": "Author name", "post_title": "Post title", "pain_point": "Main pain point"}'),

('Follow-up Message', 'Follow-up message template', 'message_generation', null, null, 'Write a follow-up message for someone we previously contacted about {{original_topic}}.

Context:
- Original conversation: {{original_context}}
- Time since last contact: {{time_elapsed}}
- New value to offer: {{new_value}}
- Their situation update: {{situation_update}}

The follow-up should:
- Reference our previous conversation
- Provide new value or insights
- Be brief and respectful
- Include a clear next step

Tone: {{tone}}', true, '{"original_topic": "Original topic", "original_context": "Previous conversation context", "time_elapsed": "Time since last contact", "new_value": "New value proposition", "situation_update": "Any updates to their situation", "tone": "Message tone"}');

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_lead_searches_updated_at BEFORE UPDATE ON ai_lead_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_lead_results_updated_at BEFORE UPDATE ON ai_lead_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_lead_messages_updated_at BEFORE UPDATE ON ai_lead_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_lead_prompts_updated_at BEFORE UPDATE ON ai_lead_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 