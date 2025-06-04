-- Add Stripe fields to user_profiles table (the table that actually exists)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_account_id ON user_profiles (stripe_account_id);

-- Update UserProfile type to include Stripe fields
COMMENT ON COLUMN user_profiles.stripe_account_id IS 'Stripe Connect Express account ID for this user';
COMMENT ON COLUMN user_profiles.stripe_onboarding_complete IS 'Whether the user has completed Stripe onboarding'; 