-- Migration: fix_price_to_one_dollar.sql
-- Description: Updates the Stripe subscription price from $25 to $1

-- Update any existing subscription metadata if needed
UPDATE stripe_subscriptions
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{price_amount}',
    '100'
);

-- Update user_profiles table to reflect the new price if needed
-- Store subscription price in monthly_usage since there's no metadata column
UPDATE user_profiles
SET monthly_usage = jsonb_set(
    COALESCE(monthly_usage, '{}'::jsonb),
    '{subscription_price_cents}',
    '100'
)
WHERE plan_type = 'PRO';

-- Log the migration in a table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'migrations_log') THEN
        INSERT INTO migrations_log (name, description, executed_at)
        VALUES ('fix_price_to_one_dollar', 'Updated subscription price from $25 to $1', NOW());
    END IF;
END $$; 