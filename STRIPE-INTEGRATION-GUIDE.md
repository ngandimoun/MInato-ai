# Stripe Payment Links Integration Guide for Minato AI

This guide provides a comprehensive overview of the Stripe Payment Links integration with Minato AI Companion.

## Implementation Status

✅ **Completed**:
- Stripe Payment Link Tool implementation
- Tool registration in the tools registry
- Tool aliases configuration
- Configuration framework for Stripe API keys
- Basic webhook handler for Stripe events
- Documentation on setup and configuration

🔄 **Next Steps**:
- Add Stripe environment variables to your `.env.local` file
- Test the payment link creation functionality
- Enhance webhook handling with database integration
- Add UI components for displaying payment links (optional)

## Files Created/Modified

1. **StripePaymentLinkTool** (`lib/tools/StripePaymentLinkTool.ts`)
   - Core functionality for creating Stripe payment links
   - Parameter extraction from natural language
   - Error handling and structured output

2. **Tools Registry** (`lib/tools/index.ts`)
   - Added import for StripePaymentLinkTool
   - Registered the tool with appropriate rate limits
   - Added tool aliases for natural language interaction

3. **Configuration** (`lib/config.ts`)
   - Added Stripe API key configuration
   - Updated AppConfig interface with Stripe types

4. **Webhook Handler** (`app/api/stripe-webhooks/route.ts`)
   - Next.js API route for handling Stripe webhook events
   - Signature verification for security
   - Event-specific handlers for different webhook types

5. **Documentation** (`README-STRIPE-SETUP.md`)
   - Setup instructions for Stripe API keys
   - Webhook configuration guide
   - Usage examples and security considerations

## Required API Keys and Configuration

To use the Stripe Payment Link Tool, you need:

1. **Stripe Secret Key**
   - Format: `sk_test_123...` (test mode) or `sk_live_123...` (live mode)
   - Add to `.env.local`: `STRIPE_SECRET_KEY=sk_test_your_key_here`

2. **Stripe Webhook Signing Secret** (for production)
   - Format: `whsec_123...`
   - Add to `.env.local`: `STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your_secret_here`

## Using the Tool

The Stripe Payment Link Tool can be invoked through natural language using commands like:

```
Create a payment link for my photography session priced at $150
```

Or more explicitly:

```
/stripe Create a digital product called "Website Template" for $29.99 with quantity adjustment enabled
```

## Webhook Events

The webhook handler supports these Stripe events:

- `checkout.session.completed` - Payment successful
- `checkout.session.async_payment_succeeded` - Async payment successful
- `checkout.session.async_payment_failed` - Async payment failed
- `payment_link.created` - New payment link created
- `payment_link.updated` - Existing payment link updated

## Technical Implementation Details

### Parameter Extraction

The tool uses LLM-based parameter extraction to convert natural language requests into structured parameters:

- `product_name` - Name of the product/service
- `price` - Price in smallest currency unit (cents for USD)
- `currency` - Three-letter ISO currency code (default: USD)
- `description` - Product/service description
- `image_url` - URL for product image
- `quantity_adjustable` - Whether quantity can be adjusted
- `payment_link_name` - Optional name for the payment link

### Stripe API Flow

1. Create a product in Stripe
2. Create a price for the product
3. Create a payment link with the price
4. Return the payment link URL to the user

## Future Enhancements

Possible future enhancements include:

1. **Subscription Support** - Add recurring billing options
2. **Product Management** - List, update, and delete products
3. **Customer Portal** - Manage subscriptions and payment methods
4. **Invoicing** - Generate and manage invoices
5. **Payment Dashboard** - View payment analytics and history
6. **Multiple Currencies** - Support for additional currencies with conversion
7. **Tax Configuration** - Automatic tax calculation based on location

## Security Considerations

- Store API keys securely in environment variables
- Use webhook signature verification in production
- Start with test mode (`sk_test_`) until ready for production
- Regularly rotate API keys for enhanced security

## Testing the Integration

To test the Stripe Payment Link Tool:

1. Set up your Stripe account and API keys
2. Add the required environment variables
3. Restart your Minato AI development server
4. Create a payment link using natural language
5. Verify the payment link works by opening it in a browser
6. Test the checkout process with Stripe test cards

## Troubleshooting

If you encounter issues:

1. Check if the Stripe API key is correctly configured
2. Verify Stripe is properly initialized in the tool
3. Check logs for any error messages
4. Ensure your Stripe account is in good standing
5. Verify webhook URL is accessible from the internet for production use 