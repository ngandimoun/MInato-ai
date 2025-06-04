import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { createPaymentLink, listPaymentLinks, isOnboardingComplete } from '@/lib/stripe';

interface PaymentLinkFromDB {
  id: string;
  name: string;
  url: string;
  is_active_on_stripe: boolean;
  created_at: string;
  stripe_payment_link_id: string;
  collect_shipping_address: boolean;
  minato_product_id?: string;
  settings: {
    enable_tax_collection?: boolean;
    allow_promotion_codes?: boolean;
    enable_pdf_invoices?: boolean;
    quantity_adjustable?: boolean;
  } | null;
  minato_products?: {
    name: string;
    description: string | null;
    price_cents: number;
    currency: string;
    image_urls: string[] | null;
    inventory_quantity?: number | null;
  } | null;
}

interface BasicPaymentLink {
  id: string;
  name: string;
  url: string;
  is_active_on_stripe: boolean;
  created_at: string;
  stripe_payment_link_id: string;
  collect_shipping_address: boolean;
  minato_product_id?: string;
  settings: {
    enable_tax_collection?: boolean;
    allow_promotion_codes?: boolean;
    enable_pdf_invoices?: boolean;
    quantity_adjustable?: boolean;
  } | null;
}

/**
 * GET /api/seller/payment-links
 * 
 * Lists all payment links for the current authenticated user
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  const userId = session.user.id;
  
  try {
    // Get the user's Stripe account ID
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();
    
    if (userError || !userData?.stripe_account_id) {
      logger.error(`[payment-links] Error fetching user profile: ${userError?.message || 'No Stripe account found'}`);
      return NextResponse.json(
        { error: 'No Stripe account found for this user' }, 
        { status: 404 }
      );
    }
    
    // Check if onboarding is complete
    if (!userData.stripe_onboarding_complete) {
      const onboardingComplete = await isOnboardingComplete(userData.stripe_account_id);
      
      if (!onboardingComplete) {
        return NextResponse.json(
          { error: 'Stripe onboarding is not complete' }, 
          { status: 400 }
        );
      }
      
      // Update the user's profile with the onboarding status
      await supabase
        .from('user_profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('id', userId);
    }
    
    // Get payment links from our database with product information using raw SQL
    const { data: paymentLinks, error: linksError } = await supabase
      .rpc('get_payment_links_with_products', { 
        user_id_param: userId 
      });
    
    if (linksError) {
      // Fallback to basic query if RPC doesn't exist
      logger.warn(`[payment-links] RPC function not available, using basic query: ${linksError.message}`);
      
      const { data: basicLinks, error: basicError } = await supabase
        .from('minato_payment_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (basicError) {
        logger.error(`[payment-links] Error fetching payment links: ${basicError.message}`);
        return NextResponse.json(
          { error: 'Failed to fetch payment links' }, 
          { status: 500 }
        );
      }
      
      // For each payment link, get the product information separately
      const linksWithProducts = await Promise.all(
        (basicLinks || []).map(async (link: BasicPaymentLink) => {
          if (link.minato_product_id) {
            const { data: product } = await supabase
              .from('minato_products')
              .select('name, description, price_cents, currency, image_urls, inventory_quantity')
              .eq('id', link.minato_product_id)
              .single();
            
            return {
              ...link,
              minato_products: product
            };
          }
          return {
            ...link,
            minato_products: null
          };
        })
      );
      
      // Transform the data to match what the component expects
      const transformedLinks = linksWithProducts.map((link: PaymentLinkFromDB) => ({
        id: link.id,
        product_name: link.name || link.minato_products?.name || 'Unknown Product',
        description: link.minato_products?.description || null,
        price: link.minato_products?.price_cents || 0,
        currency: link.minato_products?.currency || 'usd',
        payment_link_url: link.url,
        active: link.is_active_on_stripe,
        created_at: link.created_at,
        stripe_payment_link_id: link.stripe_payment_link_id,
        image_urls: link.minato_products?.image_urls || [],
        features: {
          tax_collection: link.settings?.enable_tax_collection || false,
          promotion_codes: link.settings?.allow_promotion_codes || false,
          pdf_invoices: link.settings?.enable_pdf_invoices || false,
          shipping_required: link.collect_shipping_address || false,
          quantity_adjustable: link.settings?.quantity_adjustable || false,
          inventory_tracking: !!link.minato_products?.inventory_quantity,
        }
      }));
      
      return NextResponse.json({ paymentLinks: transformedLinks });
    }
    
    // Transform the data to match what the component expects
    const transformedLinks = paymentLinks?.map((link: PaymentLinkFromDB) => ({
      id: link.id,
      product_name: link.name || link.minato_products?.name || 'Unknown Product',
      description: link.minato_products?.description || null,
      price: link.minato_products?.price_cents || 0,
      currency: link.minato_products?.currency || 'usd',
      payment_link_url: link.url,
      active: link.is_active_on_stripe,
      created_at: link.created_at,
      stripe_payment_link_id: link.stripe_payment_link_id,
      image_urls: link.minato_products?.image_urls || [],
      features: {
        tax_collection: link.settings?.enable_tax_collection || false,
        promotion_codes: link.settings?.allow_promotion_codes || false,
        pdf_invoices: link.settings?.enable_pdf_invoices || false,
        shipping_required: link.collect_shipping_address || false,
        quantity_adjustable: link.settings?.quantity_adjustable || false,
        inventory_tracking: !!link.minato_products?.inventory_quantity,
      }
    })) || [];
    
    return NextResponse.json({ paymentLinks: transformedLinks });
    
  } catch (error: any) {
    logger.error(`[payment-links] Unexpected error: ${error.message}`);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/seller/payment-links
 * 
 * Creates a new payment link for the current authenticated user
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  const userId = session.user.id;
  
  try {
    // Get the request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.productName || !body.price) {
      return NextResponse.json(
        { error: 'Product name and price are required' }, 
        { status: 400 }
      );
    }
    
    // Get the user's Stripe account ID
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();
    
    if (userError || !userData?.stripe_account_id) {
      logger.error(`[payment-links] Error fetching user profile: ${userError?.message || 'No Stripe account found'}`);
      return NextResponse.json(
        { error: 'No Stripe account found for this user' }, 
        { status: 404 }
      );
    }
    
    // Check if onboarding is complete
    if (!userData.stripe_onboarding_complete) {
      const onboardingComplete = await isOnboardingComplete(userData.stripe_account_id);
      
      if (!onboardingComplete) {
        return NextResponse.json(
          { error: 'Stripe onboarding is not complete' }, 
          { status: 400 }
        );
      }
      
      // Update the user's profile with the onboarding status
      await supabase
        .from('user_profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('id', userId);
    }
    
    // Create the payment link
    const { product, price, paymentLink } = await createPaymentLink(
      userData.stripe_account_id,
      body.productName,
      body.price,
      body.currency || 'usd',
      {
        description: body.description,
        imageUrl: body.imageUrl,
        quantityAdjustable: body.quantityAdjustable || false,
        linkName: body.linkName,
      }
    );
    
    // Store the payment link in our database
    const { data: createdLink, error: insertError } = await supabase
      .from('minato_payment_links')
      .insert({
        user_id: userId,
        stripe_account_id: userData.stripe_account_id,
        stripe_payment_link_id: paymentLink.id,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        product_name: body.productName,
        description: body.description || null,
        price: body.price,
        currency: body.currency || 'usd',
        payment_link_url: paymentLink.url,
        active: true,
      })
      .select()
      .single();
    
    if (insertError) {
      logger.error(`[payment-links] Error inserting payment link: ${insertError.message}`);
      return NextResponse.json(
        { error: 'Failed to store payment link' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ paymentLink: createdLink });
    
  } catch (error: any) {
    logger.error(`[payment-links] Unexpected error: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to create payment link' }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/seller/payment-links
 * 
 * Updates an existing payment link for the current authenticated user
 */
export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  const userId = session.user.id;
  
  try {
    // Get the request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.productName || !body.price) {
      return NextResponse.json(
        { error: 'Product name and price are required' }, 
        { status: 400 }
      );
    }
    
    // Get user's Stripe account ID for verification
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();
    
    if (userError || !userData?.stripe_account_id) {
      logger.error(`[payment-links] Error fetching user profile: ${userError?.message || 'No Stripe account found'}`);
      return NextResponse.json(
        { error: 'No Stripe account found for this user' }, 
        { status: 404 }
      );
    }
    
    // Check if onboarding is complete
    if (!userData.stripe_onboarding_complete) {
      const onboardingComplete = await isOnboardingComplete(userData.stripe_account_id);
      
      if (!onboardingComplete) {
        return NextResponse.json(
          { error: 'Stripe onboarding is not complete' }, 
          { status: 400 }
        );
      }
      
      // Update the user's profile with the onboarding status
      await supabase
        .from('user_profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('id', userId);
    }
    
    // Get payment links from our database
    const { data: paymentLinks, error: linksError } = await supabase
      .from('minato_payment_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (linksError) {
      logger.error(`[payment-links] Error fetching payment links: ${linksError.message}`);
      return NextResponse.json(
        { error: 'Failed to fetch payment links' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ paymentLinks });
    
  } catch (error: any) {
    logger.error(`[payment-links] Unexpected error: ${error.message}`);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/seller/payment-links
 * 
 * Deletes an existing payment link for the current authenticated user
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  const userId = session.user.id;
  
  try {
    // Get user's Stripe account ID for verification
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();
    
    if (userError || !userData?.stripe_account_id) {
      logger.error(`[payment-links] Error fetching user profile: ${userError?.message || 'No Stripe account found'}`);
      return NextResponse.json(
        { error: 'No Stripe account found for this user' }, 
        { status: 404 }
      );
    }
    
    // Get payment links from our database
    const { data: paymentLinks, error: linksError } = await supabase
      .from('minato_payment_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (linksError) {
      logger.error(`[payment-links] Error fetching payment links: ${linksError.message}`);
      return NextResponse.json(
        { error: 'Failed to fetch payment links' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ paymentLinks });
    
  } catch (error: any) {
    logger.error(`[payment-links] Unexpected error: ${error.message}`);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 