# Subscription Price Update Documentation

## Overview
This document outlines the changes made to update the Minato Pro subscription price from $25.00 to $1.00 per month.

## Changes Made

### 1. Updated Constants
- Modified `lib/constants.ts` to update the price:
  - Changed `MINATO_PRO_PRICE_CENTS` from 2500 to 100
  - Changed `MINATO_PRO_PRICE_DISPLAY` from '$25.00' to '$1.00'

### 2. Database Updates
- Created migration file `migrations/fix_price_to_one_dollar.sql` to update prices in the database
- Applied migration to update:
  - Subscription metadata to reflect the new price
  - User profiles to store the updated price information

### 3. Component Updates
The following components were verified to ensure they use the updated price from constants.ts:
- `components/subscription/MinatoProCheckout.tsx`
- `components/subscription/UpgradeModal.tsx`
- `app/subscription/page.tsx`

### 4. API Updates
- Updated `app/api/subscription/create-checkout-session/route.ts` to use the new price
- Updated `app/api/stripe-webhooks/route.ts` to create subscriptions with the new price

## Testing
After applying these changes, the following should be tested:
1. Subscription checkout flow to ensure the $1.00 price is displayed correctly
2. Webhook handling for new subscriptions
3. Existing subscriptions to ensure they continue to work properly

## Rollback Plan
If issues are encountered, the following steps can be taken to roll back the changes:
1. Revert the changes to `lib/constants.ts`
2. Apply a rollback migration to restore the previous price in the database
3. Restart the application

## Additional Notes
- The price update was requested and approved by management
- This change affects all new subscriptions going forward
- Existing subscriptions will continue at their current price until renewal 