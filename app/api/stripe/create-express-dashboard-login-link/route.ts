import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import Stripe from 'stripe';
import { appConfig } from '@/lib/config';

interface CreateExpressDashboardLoginLinkRequest {
  connectedAccountId: string;
}

interface CreateExpressDashboardLoginLinkResponse {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * POST /api/stripe/create-express-dashboard-login-link
 * 
 * Creates a login link for the Stripe Express Dashboard
 */
export async function POST(req: NextRequest): Promise<NextResponse<CreateExpressDashboardLoginLinkResponse>> {
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
    const body: CreateExpressDashboardLoginLinkRequest = await req.json();
    
    // Validate required fields
    if (!body.connectedAccountId) {
      return NextResponse.json({
        success: false,
        error: 'Connected account ID is required'
      }, { status: 400 });
    }
    
    // Verify that the connected account belongs to the authenticated user
    const { data: userData, error: dbError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();
    
    if (dbError || !userData?.stripe_account_id) {
      logger.error(`[create-express-dashboard-login-link] Stripe account not found or not owned by user: ${dbError?.message}`);
      return NextResponse.json({
        success: false,
        error: 'Stripe account not found or you do not have permission to access it'
      }, { status: 404 });
    }
    
    // Check if onboarding is complete
    if (!userData.stripe_onboarding_complete) {
      return NextResponse.json({
        success: false,
        error: 'Stripe onboarding must be completed before accessing the dashboard'
      }, { status: 400 });
    }
    
    // Initialize Stripe
    const stripeSecretKey = appConfig.toolApiKeys?.stripe;
    if (!stripeSecretKey) {
      logger.error('[create-express-dashboard-login-link] Stripe secret key not configured');
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
    
    // Create the login link for the Express Dashboard
    logger.info(`[create-express-dashboard-login-link] Creating login link for account ${body.connectedAccountId}`);
    
    const loginLink = await stripe.accounts.createLoginLink(body.connectedAccountId);
    
    logger.info(`[create-express-dashboard-login-link] Successfully created login link`);
    
    return NextResponse.json({
      success: true,
      url: loginLink.url
    });
    
  } catch (error: any) {
    logger.error(`[create-express-dashboard-login-link] Unexpected error: ${error.message}`, error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid Stripe account or account not accessible'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create Express Dashboard login link'
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