# Stripe Seller Dashboard Integration for Minato AI

This guide explains how to set up and configure the Stripe Seller Dashboard integration for Minato AI Companion.

## Overview

The Stripe Seller Dashboard allows Minato users to:

1. Create their own Stripe Connect Express account directly within Minato
2. Create payment links for their products or services
3. Track sales and manage their Stripe account

## Prerequisites

1. A Stripe account with Connect capabilities enabled
2. Stripe API keys (available in your Stripe Dashboard)
3. A running Minato AI instance

## Configuration Steps

### 1. Register as a Connect Platform on Stripe

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/dashboard)
2. Navigate to Settings (gear icon) > Product settings > Connect settings
3. Complete the platform profile information as requested by Stripe
4. Configure branding settings:
   - Upload Minato's square logo (min 128x128px, JPG/PNG, <512KB)
   - Set brand color (hex code)
   - Set accent color if needed

### 2. Add Stripe API Keys to Environment Variables

Add the following to your `.env.local` file:

```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_webhook_signing_secret_here
```

Replace the values with your actual Stripe keys.

### 3. Run the Database Migrations

The Seller Dashboard requires new database tables and fields in your Supabase database. Run the following SQL migration:

```sql
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
```

### 4. Configure Stripe Webhooks

For production use, set up webhooks to handle Stripe events:

1. In the Stripe Dashboard, go to Developers > Webhooks
2. Add an endpoint with URL: `https://your-minato-domain.com/api/stripe-webhooks`
3. Select these essential events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_link.created`
   - `payment_link.updated`
   - `account.updated` (for Connect accounts)
4. Add the endpoint and copy the Signing Secret
5. Add the Signing Secret to your environment variables as shown in step 2

## User Workflow

### For New Sellers

1. User navigates to the Dashboard tab in Minato
2. User clicks "Become a Seller" button
3. User is redirected to Stripe Express onboarding
4. After completing onboarding, user is redirected back to Minato's Dashboard
5. User can now create payment links and manage their sales

### For Existing Sellers

1. User navigates to the Dashboard tab in Minato
2. User sees their sales overview, payment links, and account management options
3. User can create new payment links, view existing ones, and track sales

## Technical Implementation

The Seller Dashboard integration consists of:

1. **Frontend Components**:
   - Dashboard navigation tab in header
   - Seller Dashboard page with conditional rendering based on user's seller status
   - UI for creating and managing payment links

2. **API Routes**:
   - `/api/user/stripe-status`: Get user's Stripe seller status
   - `/api/seller/onboarding`: Start the Stripe Connect Express onboarding
   - `/api/seller/onboarding/continue`: Continue an in-progress onboarding
   - `/api/stripe-webhooks`: Webhook handler for Stripe events

3. **Database Schema**:
   - `users` table extended with Stripe Connect fields
   - `payment_links` table for storing created payment links
   - `payments` table for tracking payments received

## Testing

To test the Stripe Seller Dashboard:

1. Use Stripe test mode API keys
2. Create a test seller account and complete onboarding
3. Create test payment links
4. Use [Stripe test cards](https://stripe.com/docs/testing) to simulate payments

## Troubleshooting

- Check browser console and server logs for errors
- Verify Stripe API keys are correctly configured
- Ensure webhook endpoints are accessible and properly configured
- Check Stripe dashboard for event logs and payment status 