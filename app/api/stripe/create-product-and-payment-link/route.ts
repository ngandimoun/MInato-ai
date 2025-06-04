import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

interface CreateProductAndPaymentLinkRequest {
  // Basic product information
  productName: string;
  description?: string;
  price: number; // in cents
  currency?: string;
  
  // Enhanced Phase 3 features
  imageUrls?: string[];
  inventoryQuantity?: number;
  enableStripeLimit?: boolean;
  inactiveMessage?: string;
  quantityAdjustable?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  shippingCountries?: string[];
  enableTaxCollection?: boolean;
  allowPromotionCodes?: boolean;
  enablePdfInvoices?: boolean;
  
  // Metadata
  paymentLinkName?: string;
  minatoUserId?: string;
}

interface CreateProductAndPaymentLinkResponse {
  success: boolean;
  paymentLinkUrl?: string;
  stripePaymentLinkId?: string;
  minatoProductId?: string;
  minatoPaymentLinkId?: string;
  error?: string;
}

/**
 * POST /api/stripe/create-product-and-payment-link
 * 
 * Creates a comprehensive Stripe product, price, and payment link with advanced Phase 3 features
 * Supports tax collection, shipping, inventory management, and more
 */
export async function POST(req: NextRequest): Promise<NextResponse<CreateProductAndPaymentLinkResponse>> {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Parse request body
    const body: CreateProductAndPaymentLinkRequest = await req.json();
    
    // Validate required fields
    if (!body.productName?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Product name is required'
      }, { status: 400 });
    }
    
    if (!body.price || body.price <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Valid price greater than 0 is required'
      }, { status: 400 });
    }
    
    // Get user's Stripe account ID
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();
    
    if (userError || !userData?.stripe_account_id) {
      logger.error(`[create-product-and-payment-link] Error fetching user profile: ${userError?.message || 'No Stripe account found'}`);
      return NextResponse.json({
        success: false,
        error: 'No Stripe account found for this user'
      }, { status: 404 });
    }
    
    // Check if Stripe onboarding is complete
    if (!userData.stripe_onboarding_complete) {
      return NextResponse.json({
        success: false,
        error: 'Stripe onboarding is not complete'
      }, { status: 400 });
    }
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[create-product-and-payment-link] Stripe secret key not configured');
      return NextResponse.json({
        success: false,
        error: 'Stripe integration not configured'
      }, { status: 500 });
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      typescript: true,
      appInfo: {
        name: 'Minato AI Companion',
        version: '2.0.0',
      },
    });
    
    // Step 1: Create Stripe Product
    const productData: Stripe.ProductCreateParams = {
      name: body.productName.trim(),
      description: body.description?.trim() || undefined,
      images: body.imageUrls || undefined,
      metadata: {
        minato_user_id: userId,
        created_via: 'minato_comprehensive_api',
        inventory_quantity: body.inventoryQuantity?.toString() || '',
        phase: '3'
      }
    };
    
    logger.info(`[create-product-and-payment-link] Creating Stripe product: ${body.productName}`);
    const product = await stripe.products.create(productData);
    
    // Step 2: Create Stripe Price
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: body.price,
      currency: (body.currency || 'usd').toLowerCase(),
      metadata: {
        minato_user_id: userId,
        created_via: 'minato_comprehensive_api'
      }
    };
    
    logger.info(`[create-product-and-payment-link] Creating Stripe price: ${body.price} ${body.currency || 'usd'}`);
    const price = await stripe.prices.create(priceData);
    
    // Step 3: Prepare Payment Link Configuration
    const paymentLinkParams: Stripe.PaymentLinkCreateParams = {
      line_items: [
        {
          price: price.id,
          quantity: 1,
          adjustable_quantity: body.quantityAdjustable 
            ? { 
                enabled: true, 
                minimum: body.minQuantity || 1, 
                maximum: body.maxQuantity || 99 
              } 
            : undefined,
        },
      ],
      metadata: {
        minato_user_id: userId,
        created_via: 'minato_comprehensive_api',
        product_name: body.productName,
        inventory_quantity: body.inventoryQuantity?.toString() || '',
        phase: '3'
      }
    };
    
    // Enhanced features configuration
    if (body.enableTaxCollection) {
      paymentLinkParams.automatic_tax = { enabled: true };
    }
    
    if (body.allowPromotionCodes) {
      paymentLinkParams.allow_promotion_codes = true;
    }
    
    if (body.shippingCountries && body.shippingCountries.length > 0) {
      // Validate and convert country codes
      const validCountries = body.shippingCountries
        .map(country => country.toUpperCase())
        .filter(code => /^[A-Z]{2}$/.test(code)); // Basic ISO code validation
      
      if (validCountries.length > 0) {
        paymentLinkParams.shipping_address_collection = {
          allowed_countries: validCountries as Stripe.PaymentLinkCreateParams.ShippingAddressCollection.AllowedCountry[]
        };
      }
    }
    
    if (body.enableStripeLimit && body.inventoryQuantity && body.inventoryQuantity > 0) {
      paymentLinkParams.restrictions = {
        completed_sessions: {
          limit: body.inventoryQuantity
        }
      };
    }
    
    if (body.inactiveMessage?.trim()) {
      paymentLinkParams.inactive_message = body.inactiveMessage.trim();
    }
    
    if (body.enablePdfInvoices) {
      paymentLinkParams.invoice_creation = { enabled: true };
    }
    
    // Set up redirect URL for Minato confirmation page
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://minato.ai'}/payment-success?session_id={CHECKOUT_SESSION_ID}&product_name=${encodeURIComponent(body.productName)}`;
    
    paymentLinkParams.after_completion = {
      type: 'redirect',
      redirect: {
        url: redirectUrl
      }
    };
    
    // Step 4: Create Payment Link
    logger.info(`[create-product-and-payment-link] Creating Stripe payment link with enhanced features`);
    const paymentLink = await stripe.paymentLinks.create(paymentLinkParams);
    
    // Step 5: Store in Minato Database
    
    // First, save to minato_products table
    const { data: minatoProduct, error: productInsertError } = await supabase
      .from('minato_products')
      .insert({
        user_id: userId,
        stripe_account_id: userData.stripe_account_id,
        stripe_product_id: product.id,
        current_stripe_price_id: price.id,
        name: body.productName.trim(),
        description: body.description?.trim() || null,
        price_cents: body.price,
        currency: (body.currency || 'usd').toLowerCase(),
        inventory_quantity: body.inventoryQuantity || null,
        image_urls: body.imageUrls || null,
        is_active: true,
        metadata: {
          phase: '3',
          features: {
            tax_collection: !!body.enableTaxCollection,
            promotion_codes: !!body.allowPromotionCodes,
            pdf_invoices: !!body.enablePdfInvoices,
            shipping_required: !!(body.shippingCountries && body.shippingCountries.length > 0),
            quantity_adjustable: !!body.quantityAdjustable,
            inventory_tracking: !!(body.inventoryQuantity && body.inventoryQuantity > 0)
          }
        }
      })
      .select()
      .single();
    
    if (productInsertError) {
      logger.error(`[create-product-and-payment-link] Error storing product: ${productInsertError.message}`);
      // Continue anyway - we don't want to fail the entire request
    }
    
    // Then, save to minato_payment_links table
    const { data: minatoPaymentLink, error: linkInsertError } = await supabase
      .from('minato_payment_links')
      .insert({
        user_id: userId,
        minato_product_id: minatoProduct?.id || null,
        stripe_account_id: userData.stripe_account_id,
        stripe_payment_link_id: paymentLink.id,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        url: paymentLink.url,
        name: body.paymentLinkName?.trim() || body.productName.trim(),
        is_active_on_stripe: paymentLink.active,
        is_archived: false,
        allowed_shipping_countries: body.shippingCountries || [],
        shipping_countries: body.shippingCountries || null,
        after_completion_redirect_url: redirectUrl,
        settings: {
          enable_tax_collection: !!body.enableTaxCollection,
          allow_promotion_codes: !!body.allowPromotionCodes,
          enable_pdf_invoices: !!body.enablePdfInvoices,
          quantity_adjustable: !!body.quantityAdjustable,
          min_quantity: body.minQuantity || null,
          max_quantity: body.maxQuantity || null,
          enable_stripe_limit: !!body.enableStripeLimit,
          inactive_message: body.inactiveMessage?.trim() || null
        }
      })
      .select()
      .single();
    
    if (linkInsertError) {
      logger.error(`[create-product-and-payment-link] Error storing payment link: ${linkInsertError.message}`);
      // Continue anyway - we don't want to fail the entire request
    }
    
    logger.info(`[create-product-and-payment-link] Successfully created comprehensive payment link: ${paymentLink.url}`);
    
    return NextResponse.json({
      success: true,
      paymentLinkUrl: paymentLink.url,
      stripePaymentLinkId: paymentLink.id,
      minatoProductId: minatoProduct?.id,
      minatoPaymentLinkId: minatoPaymentLink?.id
    });
    
  } catch (error: any) {
    logger.error(`[create-product-and-payment-link] Unexpected error: ${error.message}`, error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create payment link'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 