import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserSubscription, canUseFeature } from '@/lib/middleware/subscription-guards';
import { logger } from '@/memory-framework/config';

interface CheckPermissionRequest {
  feature: 'leads' | 'recordings' | 'images' | 'videos';
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckPermissionRequest = await request.json();
    const { feature } = body;

    // Validate feature
    if (!['leads', 'recordings', 'images', 'videos'].includes(feature)) {
      return NextResponse.json(
        { error: 'Invalid feature specified' },
        { status: 400 }
      );
    }

    // Get user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user subscription
    const subscription = await getUserSubscription(user.id);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription data unavailable' },
        { status: 500 }
      );
    }

    // Check if user can use the feature
    const permissionCheck = canUseFeature(subscription, feature);

    logger.info('[Permission Check API] Checking permission', {
      userId: user.id.substring(0, 8),
      feature,
      planType: subscription.planType,
      allowed: permissionCheck.canUse,
      reason: permissionCheck.reason,
      currentUsage: subscription.monthlyUsage[feature]
    });

    return NextResponse.json({
      allowed: permissionCheck.canUse,
      reason: permissionCheck.reason,
      currentUsage: subscription.monthlyUsage[feature],
      maxQuota: subscription.planType === 'FREE_TRIAL' ? 0 : 
                subscription.planType === 'PRO' ? 30 : 0,
      planType: subscription.planType
    });

  } catch (error) {
    logger.error('[Permission Check API] Unexpected error', { error });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 