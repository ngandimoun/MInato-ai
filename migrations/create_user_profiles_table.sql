-- ============================================================================
-- FILE: migrations/create_user_profiles_table.sql
-- DESC: Create the user_profiles table that is referenced throughout the codebase
-- ============================================================================

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    first_name TEXT,
    avatar_url TEXT,
    stripe_account_id TEXT,
    stripe_onboarding_complete BOOLEAN DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_account_id ON public.user_profiles(stripe_account_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view and manage their own profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role policies for full access
CREATE POLICY "Service role full access to user_profiles" ON public.user_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Comments
COMMENT ON TABLE public.user_profiles IS 'User profile information linked to Supabase Auth users';
COMMENT ON COLUMN public.user_profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.user_profiles.email IS 'User email address';
COMMENT ON COLUMN public.user_profiles.full_name IS 'User full name';
COMMENT ON COLUMN public.user_profiles.first_name IS 'User first name';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'User avatar image URL';
COMMENT ON COLUMN public.user_profiles.stripe_account_id IS 'Stripe Connect Express account ID';
COMMENT ON COLUMN public.user_profiles.stripe_onboarding_complete IS 'Whether user completed Stripe onboarding'; 