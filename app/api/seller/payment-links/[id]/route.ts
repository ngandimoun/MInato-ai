import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
}) : null;

/**
 * GET /api/seller/payment-links/[id]
 * Retrieve a specific payment link
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;

    // Get the payment link from database
    const { data: paymentLink, error: dbError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (dbError || !paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    // Get fresh data from Stripe
    const stripePaymentLink = await stripe.paymentLinks.retrieve(paymentLink.stripe_payment_link_id);

    return NextResponse.json({
      paymentLink: {
        ...paymentLink,
        stripe_data: stripePaymentLink,
      }
    });

  } catch (error: any) {
    logger.error('[GET payment-links/[id]] Error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/seller/payment-links/[id]
 * Update a payment link (primarily to activate/deactivate)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;
    const { active } = await req.json();

    // Get the payment link from database
    const { data: paymentLink, error: dbError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (dbError || !paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    // Update the payment link in Stripe
    const stripePaymentLink = await stripe.paymentLinks.update(
      paymentLink.stripe_payment_link_id,
      { active }
    );

    // Update in database
    const { data: updatedPaymentLink, error: updateError } = await supabase
      .from('payment_links')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('[PUT payment-links/[id]] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paymentLink: {
        ...updatedPaymentLink,
        stripe_data: stripePaymentLink,
      }
    });

  } catch (error: any) {
    logger.error('[PUT payment-links/[id]] Error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/seller/payment-links/[id]
 * Deactivate a payment link
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;

    // Get the payment link from database
    const { data: paymentLink, error: dbError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (dbError || !paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    // Deactivate the payment link in Stripe
    await stripe.paymentLinks.update(
      paymentLink.stripe_payment_link_id,
      { active: false }
    );

    // Update in database
    const { error: updateError } = await supabase
      .from('payment_links')
      .update({ active: false })
      .eq('id', id);

    if (updateError) {
      logger.error('[DELETE payment-links/[id]] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate payment link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Payment link deactivated successfully'
    });

  } catch (error: any) {
    logger.error('[DELETE payment-links/[id]] Error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 