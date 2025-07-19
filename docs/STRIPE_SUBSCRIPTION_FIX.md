# Stripe Subscription System Fix

## Problem Overview

We identified a critical issue with the Stripe subscription system where users were being charged for one-time payments instead of recurring subscriptions. This resulted in:

1. Users paying $1.00 instead of $25.00 due to an incorrect price configuration
2. Users getting PRO access but without a proper Stripe customer ID or subscription
3. Webhook processing not properly creating recurring subscriptions

## Webhook Errors Detected

The Stripe dashboard shows several webhook delivery failures:

1. **Failed Event Deliveries:**
   - `Event delivery: invoice.created` - Failed events
   - `Event delivery: customer.subscription.created` - Failed events

2. **API Errors:**
   - `parameter_invalid_empty - payment_method_data[billing_details]`
   - `resource_missing - customer`

These errors indicate that webhook events are not being properly received and processed by our application, which explains why subscription status isn't being updated correctly in the database.

## Implemented Fixes

### 1. Price Configuration Fix
- Updated `MINATO_PRO_PRICE_CENTS` from 100 ($1.00) to 2500 ($25.00) in `lib/constants.ts`
- Updated `MINATO_PRO_PRICE_DISPLAY` to '$25.00'

### 2. Webhook Processing Fix
- Enhanced the webhook handler in `app/api/stripe-webhooks/route.ts` to:
  - Create a Stripe customer if one doesn't exist
  - Create a proper recurring subscription instead of a one-time payment
  - Store the subscription details in the database
  - Update the user's plan type to PRO with the correct subscription end date

### 3. Checkout Process Fix
- Updated the checkout mode from `payment` to `subscription` in `app/api/payments/create-checkout-session/route.ts`
- Added recurring payment configuration to ensure subscriptions are created properly

### 4. Webhook Debugging Enhancement
- Created an enhanced debug webhook endpoint at `/api/stripe-webhooks/debug` to:
  - Log detailed information about incoming webhook events
  - Provide better error messages for webhook signature verification failures
  - Track event processing in the database

### 5. Webhook Configuration Tool
- Created a script at `scripts/fix-stripe-webhooks.js` to:
  - Diagnose webhook configuration issues
  - Create properly configured webhook endpoints
  - Test webhook delivery with Stripe CLI

### 6. Manual Fixes for Affected Users
- For user 2a581fe6-a710-4ed6-80aa-5503de894864 (renemakoule38@gmail.com):
  - Updated their plan type to PRO
  - Set subscription end date to 30 days from now
  - Note: This user still doesn't have a proper Stripe customer ID for renewals

- For user 4c7f219e-39e1-41a5-a204-f08be8c88d1b (renemakoule@gmail.com):
  - Cleared their incomplete payment attempts
  - Removed their Stripe customer ID to allow for a fresh payment attempt

## Required Environment Variables

For the webhook system to work properly, the following environment variables must be set in `.env.local`:

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_... # For main webhook endpoint
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_... # For subscription-specific endpoint
```

## Recommendations for Future

1. **Testing Procedure**:
   - Always test the subscription flow in a test environment before deploying to production
   - Use Stripe test mode to verify the entire subscription lifecycle
   - Verify webhook processing with Stripe CLI

2. **Monitoring**:
   - Implement regular audits of subscription statuses
   - Add alerts for failed webhook processing
   - Monitor for discrepancies between Stripe and database records

3. **Code Improvements**:
   - Use a dedicated subscription service class to centralize subscription logic
   - Implement retry mechanisms for failed webhook processing
   - Add comprehensive logging for all subscription-related events

4. **Documentation**:
   - Document the subscription flow for future developers
   - Create a troubleshooting guide for common subscription issues
   - Document the database schema for subscription-related tables

## How to Verify the Fix

1. Run the webhook configuration script:
   ```
   node scripts/fix-stripe-webhooks.js
   ```

2. Create a new test user and subscribe to the PRO plan

3. Verify in Stripe dashboard that:
   - A customer was created
   - A subscription was created with the correct price ($25.00)
   - The subscription is set to renew monthly
   - Webhook events are delivered successfully

4. Verify in the database that:
   - User's plan_type is set to PRO
   - User has a stripe_customer_id
   - User has a subscription_end_date set to 1 month from now
   - There's an entry in stripe_subscriptions table

## Contact

If you encounter any issues with the subscription system, please contact:
- Technical support: support@minato.ai
- Stripe integration specialist: stripe-admin@minato.ai 