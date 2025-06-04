import Stripe from 'stripe';
import { logger } from '@/memory-framework/config';

// Ensure environment variables are set
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

if (!stripeSecretKey) {
  logger.error('[Stripe] STRIPE_SECRET_KEY is not configured.');
}

// Initialize Stripe client with API version that supports Connect Express
export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-05-28.basil',
      typescript: true,
      appInfo: {
        name: 'Minato AI Companion',
        version: '1.0.0',
      },
    })
  : null;

/**
 * Creates a new Stripe Connect Express account for a seller
 * @param email User's email address
 * @param userId Unique identifier for the user
 * @returns The created account object
 */
export async function createConnectAccount(email: string, userId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: {
        userId,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    logger.info(`[Stripe] Created Connect Express account for user ${userId}: ${account.id}`);
    return account;
  } catch (error) {
    logger.error('[Stripe] Error creating Connect account:', error);
    throw error;
  }
}

/**
 * Creates an account link for onboarding a Connect account
 * @param accountId Stripe account ID
 * @param refreshUrl URL to redirect to if onboarding is incomplete
 * @param returnUrl URL to redirect to when onboarding is complete
 * @returns The account link object
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    logger.info(`[Stripe] Created account link for account ${accountId}`);
    return accountLink;
  } catch (error) {
    logger.error('[Stripe] Error creating account link:', error);
    throw error;
  }
}

/**
 * Retrieves a Connect account to check its status
 * @param accountId Stripe account ID
 * @returns The account object
 */
export async function getConnectAccount(accountId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    logger.error(`[Stripe] Error retrieving Connect account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Checks if a Connect account has completed onboarding
 * @param accountId Stripe account ID
 * @returns Boolean indicating if onboarding is complete
 */
export async function isOnboardingComplete(accountId: string): Promise<boolean> {
  try {
    const account = await getConnectAccount(accountId);
    const chargesEnabled = account.charges_enabled;
    const detailsSubmitted = account.details_submitted;
    const payoutsEnabled = account.payouts_enabled;

    // An account is considered fully onboarded when it has details submitted
    // and both charges and payouts are enabled
    return !!(detailsSubmitted && chargesEnabled && payoutsEnabled);
  } catch (error) {
    logger.error(`[Stripe] Error checking onboarding status for account ${accountId}:`, error);
    return false;
  }
}

/**
 * Creates a login link for a Connect Express account dashboard
 * @param accountId Stripe account ID
 * @returns The login link object
 */
export async function createLoginLink(accountId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    logger.info(`[Stripe] Created login link for account ${accountId}`);
    return loginLink;
  } catch (error) {
    logger.error(`[Stripe] Error creating login link for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Creates a payment link for a product
 * @param accountId Stripe account ID (for Connect), or null to use the platform account
 * @param productName Name of the product
 * @param price Price in smallest currency unit (e.g., cents)
 * @param currency Currency code (e.g., 'usd')
 * @param options Additional options
 * @returns The payment link object
 */
export async function createPaymentLink(
  accountId: string | null,
  productName: string,
  price: number,
  currency: string = 'usd',
  options: {
    description?: string;
    imageUrl?: string;
    quantityAdjustable?: boolean;
    linkName?: string;
    // Enhanced options
    isSubscription?: boolean;
    intervalType?: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
    trialDays?: number;
    collectShipping?: boolean;
    collectBilling?: boolean;
    shippingCountries?: string[];
    collectPhoneNumber?: boolean;
    customFields?: Array<{
      key: string;
      label: string;
      type: 'text' | 'numeric' | 'dropdown' | 'checkbox';
      optional?: boolean;
      options?: string[]; // For dropdown type
    }>;
    enableTaxCollection?: boolean;
    allowPromotionCodes?: boolean;
    afterCompletionUrl?: string;
    afterCompletionType?: 'hosted_confirmation' | 'redirect';
    savePaymentMethod?: boolean;
  } = {}
) {
  if (!stripe) {
    logger.error('[Stripe] STRIPE_SECRET_KEY is not configured when attempting to create payment link.');
    throw new Error('Stripe is not configured');
  }

  try {
    logger.info(`[Stripe] Creating payment link for product "${productName}" with price ${price} ${currency}`);
    
    // Create the product
    const productParams = {
      name: productName,
      description: options.description,
      images: options.imageUrl && options.imageUrl.trim() !== "" ? [options.imageUrl] : undefined,
    };
    
    // Only pass stripeAccount param if accountId is provided
    const stripeAccountParam = accountId ? { stripeAccount: accountId } : undefined;
    
    const product = await stripe.products.create(
      productParams,
      stripeAccountParam
    );
    
    logger.info(`[Stripe] Created product ${product.id}${accountId ? ` for account ${accountId}` : ' on platform account'}`);

    // Create the price - handle both one-time and recurring
    let priceData: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: price,
      currency: currency.toLowerCase(),
    };
    
    // Set up recurring parameters for subscription
    if (options.isSubscription) {
      priceData.recurring = {
        interval: options.intervalType || 'month',
        interval_count: options.intervalCount || 1,
        trial_period_days: options.trialDays,
      };
    }
    
    const priceObj = await stripe.prices.create(
      priceData,
      stripeAccountParam
    );
    
    logger.info(`[Stripe] Created price ${priceObj.id} (${price} ${currency}) for product ${product.id}`);

    // Set up payment link parameters with all advanced options
    const paymentLinkParams: Stripe.PaymentLinkCreateParams = {
      line_items: [
        {
          price: priceObj.id,
          quantity: 1,
          adjustable_quantity: options.quantityAdjustable
            ? { enabled: true, minimum: 1, maximum: 99 }
            : undefined,
        },
      ],
      // Custom fields
      custom_fields: options.customFields?.map(field => ({
        key: field.key,
        label: { type: 'custom', custom: field.label },
        type: field.type as Stripe.PaymentLinkCreateParams.CustomField.Type,
        optional: field.optional || false,
        dropdown: field.type === 'dropdown' && field.options 
          ? { options: field.options.map(opt => ({ label: opt, value: opt })) }
          : undefined,
      })) || undefined,
      // After completion behavior
      after_completion: options.afterCompletionType === 'redirect' && options.afterCompletionUrl
        ? { 
            type: 'redirect', 
            redirect: { url: options.afterCompletionUrl } 
          }
        : { type: 'hosted_confirmation' },
      // Address collection
      billing_address_collection: options.collectBilling ? 'required' : 'auto',
      shipping_address_collection: options.collectShipping 
        ? { allowed_countries: (options.shippingCountries || ['US']) as Stripe.PaymentLinkCreateParams.ShippingAddressCollection.AllowedCountry[] }
        : undefined,
      // Phone collection
      phone_number_collection: options.collectPhoneNumber 
        ? { enabled: true }
        : { enabled: false },
      // Payment method options
      payment_method_collection: 'always',
      // Promotion codes
      allow_promotion_codes: options.allowPromotionCodes || false,
      // Tax collection
      automatic_tax: options.enableTaxCollection 
        ? { enabled: true }
        : { enabled: false },
      // Payment method saving
      payment_intent_data: options.savePaymentMethod 
        ? { setup_future_usage: 'on_session' }
        : undefined,
    };

    // Add custom name if provided
    if (options.linkName) {
      paymentLinkParams.metadata = {
        ...paymentLinkParams.metadata,
        link_name: options.linkName
      };
    }

    // Create the payment link with all options
    const paymentLink = await stripe.paymentLinks.create(
      paymentLinkParams,
      stripeAccountParam
    );

    logger.info(`[Stripe] Created payment link for product "${productName}" on account ${accountId || 'platform'}: ${paymentLink.url}`);
    return { product, price: priceObj, paymentLink };
  } catch (error) {
    logger.error(`[Stripe] Error creating payment link for ${accountId || 'platform account'}: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    throw error;
  }
}

/**
 * Lists all payment links for a Connect account
 * @param accountId Stripe account ID
 * @param limit Number of links to retrieve (max 100)
 * @returns Array of payment links
 */
export async function listPaymentLinks(accountId: string, limit: number = 100) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentLinks = await stripe.paymentLinks.list(
      { limit },
      { stripeAccount: accountId }
    );
    
    return paymentLinks.data;
  } catch (error) {
    logger.error(`[Stripe] Error listing payment links for account ${accountId}:`, error);
    throw error;
  }
} 