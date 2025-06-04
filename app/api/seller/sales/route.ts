import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

interface Sale {
  id: string;
  minato_payment_link_id: string;
  stripe_payment_intent_id: string;
  amount_total_cents: number;
  currency: string;
  customer_email: string | null;
  sale_status: string;
  created_at: string;
  user_id: string;
  payment_link?: {
    name: string;
    description?: string;
  };
}

/**
 * GET /api/seller/sales
 * 
 * Retrieves sales data and statistics for the authenticated seller
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

  try {
    const userId = session.user.id;

    // Get user's Stripe account ID
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.stripe_account_id) {
      return NextResponse.json({
        sales: [],
        totalRevenue: 0,
        totalSales: 0,
        recentSales: [],
        thisMonthRevenue: 0,
        thisMonthSales: 0,
      });
    }

    // Fetch all sales for this user with payment link details
    const { data: sales, error: salesError } = await supabase
      .from('minato_sales')
      .select(`
        *,
        payment_link:minato_payment_links!minato_payment_link_id (
          name,
          settings
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (salesError) {
      logger.error('[GET sales] Error fetching sales:', salesError);
      return NextResponse.json(
        { error: 'Failed to fetch sales data' },
        { status: 500 }
      );
    }

    const salesData: Sale[] = sales || [];

    // Calculate statistics - convert cents to dollars for revenue calculations
    const successfulSales = salesData.filter((sale: Sale) => sale.sale_status === 'completed');
    const totalRevenue = successfulSales.reduce((sum: number, sale: Sale) => sum + sale.amount_total_cents, 0);
    const totalSales = successfulSales.length;

    // Calculate this month's statistics
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthSales = successfulSales.filter((sale: Sale) => 
      new Date(sale.created_at) >= firstDayOfMonth
    );
    const thisMonthRevenue = thisMonthSales.reduce((sum: number, sale: Sale) => sum + sale.amount_total_cents, 0);

    // Get recent sales (last 10)
    const recentSales = salesData.slice(0, 10);

    return NextResponse.json({
      sales: salesData,
      totalRevenue,
      totalSales,
      recentSales,
      thisMonthRevenue,
      thisMonthSales: thisMonthSales.length,
    });

  } catch (error: any) {
    logger.error('[GET sales] Error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 