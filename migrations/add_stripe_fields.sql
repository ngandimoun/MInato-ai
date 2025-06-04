-- Add Stripe fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_account_id ON users (stripe_account_id);

-- Create payment_links table to store links created by users
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL,
    stripe_payment_link_id TEXT NOT NULL,
    stripe_product_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    price BIGINT NOT NULL, -- Amount in smallest currency unit (e.g., cents)
    currency TEXT NOT NULL DEFAULT 'usd',
    payment_link_url TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_stripe_payment_link_id ON payment_links (stripe_payment_link_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payment_links_updated_at
BEFORE UPDATE ON payment_links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create payments table to track payments received
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
    stripe_account_id TEXT NOT NULL,
    stripe_payment_intent_id TEXT NOT NULL,
    stripe_charge_id TEXT,
    amount BIGINT NOT NULL, -- Amount in smallest currency unit (e.g., cents)
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL,
    customer_email TEXT,
    customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_link_id ON payments (payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments (stripe_payment_intent_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 