# Stripe Payment Link Tool Setup for Minato AI

This document explains how to set up and configure the Stripe Payment Link Tool for Minato AI Companion.

## Prerequisites

1. A Stripe account (you can create one at [stripe.com](https://stripe.com))
2. Your Stripe API keys (available in your Stripe Dashboard)

## Configuration Steps

### 1. Obtain Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/dashboard)
2. Navigate to Developers > API keys
3. Make note of your Secret Key (starts with `sk_test_` for test mode or `sk_live_` for live mode)

### 2. Add Stripe API Key to Environment Variables

Add the following to your `.env.local` file:

```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

Replace `sk_test_your_stripe_secret_key_here` with your actual Stripe Secret Key.

### 3. Register as a Connect Platform (Optional - For Advanced Use Cases)

If you plan to handle payments on behalf of other users (i.e., using Stripe Connect), follow these additional steps:

1. In the Stripe Dashboard, go to Settings (gear icon) > Product settings > Connect settings
2. Complete the platform profile information
3. Configure branding settings:
   - Upload Minato's square logo (min 128x128px, JPG/PNG, <512KB)
   - Set brand color (hex code)
   - Set accent color if needed

### 4. Webhook Configuration (For Production Use)

For production use, set up webhooks to handle Stripe events:

1. In the Stripe Dashboard, go to Developers > Webhooks
2. Add an endpoint with URL: `https://your-minato-domain.com/api/stripe-webhooks`
3. Select these essential events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_link.created`
   - `payment_link.updated`
4. Add the endpoint and copy the Signing Secret
5. Add the Signing Secret to your environment variables:
   ```
   STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_webhook_signing_secret_here
   ```

## Using the Stripe Payment Link Tool

The Stripe Payment Link Tool is accessible through the following commands or aliases in chat:

- `stripe`
- `payment`
- `paymentlink`
- `sellproduct`
- `sell`
- `checkout`
- `createpayment`

### Example Usage

```
Create a payment link for my photography session priced at $150
```

## Security Considerations

- Never expose your Stripe Secret Key in client-side code
- For production use, always verify webhook signatures
- Consider using Stripe's test mode until your integration is fully tested 