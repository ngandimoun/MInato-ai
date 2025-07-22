import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { MINATO_PLANS } from '@/lib/constants';

export interface SubscriptionStatus {
  plan_type: 'FREE' | 'PRO' | 'EXPIRED';
  is_active: boolean;
  is_trial: boolean;
  is_pro: boolean;
  is_expired: boolean;
  days_remaining: number;
  trial_end_date: string | null;
  subscription_end_date: string | null;
  expires_at: string | null;
  monthly_usage?: {
    images?: number;
    videos?: number;
    recordings?: number;
  };
  quota_limits?: {
    images?: number;
    videos?: number;
    recordings?: number;
  };
  currentUsage?: {
    recordings: number;
    images: number;
    videos: number;
  };
}

export interface FeaturePermissions {
  chat: boolean;
  memory: boolean;
  leads: boolean;
  listening: boolean;
  game_solo: boolean;
  game_multiplayer: boolean;
  generate_image: boolean;
  generate_video: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [permissions, setPermissions] = useState<FeaturePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  // Load shown notifications from localStorage
  const loadShownNotifications = useCallback(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const stored = localStorage.getItem(`notifications_${user.id}`);
        if (stored) {
          const notifications = JSON.parse(stored);
          setShownNotifications(new Set(notifications));
          console.log(`[useSubscription] Loaded ${notifications.length} shown notifications for user ${user.id}`);
        }
      } catch (error) {
        console.error('[useSubscription] Error loading shown notifications:', error);
      }
    }
  }, [user?.id]);

  // Save shown notifications to localStorage
  const saveShownNotifications = useCallback((notifications: Set<string>) => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify([...notifications]));
      } catch (error) {
        console.error('[useSubscription] Error saving shown notifications:', error);
      }
    }
  }, [user?.id]);

  // Clear shown notifications (for testing or reset)
  const clearShownNotifications = useCallback(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        localStorage.removeItem(`notifications_${user.id}`);
        setShownNotifications(new Set());
        console.log(`[useSubscription] Cleared shown notifications for user ${user.id}`);
      } catch (error) {
        console.error('[useSubscription] Error clearing shown notifications:', error);
      }
    }
  }, [user?.id]);

  // Fetch subscription status
  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log(`[useSubscription] Fetching subscription status for user: ${user.id}`);
      const response = await fetch(`/api/subscription/status?userId=${user.id}`);
      
      if (response.ok) {
        const data: SubscriptionStatus = await response.json();
        
        // Add monthly usage data as currentUsage
        const statusWithUsage: SubscriptionStatus = {
          ...data,
          currentUsage: {
            recordings: data.monthly_usage?.recordings ?? 0,
            images: data.monthly_usage?.images ?? 0,
            videos: data.monthly_usage?.videos ?? 0
          }
        };
        
        setSubscriptionStatus(statusWithUsage);

        // Calculate permissions based on Minato pricing plans
        const perms: FeaturePermissions = {
          // FREE and PRO features
          chat: data.is_active,
          memory: data.is_active,
          listening: data.is_active,
          game_solo: data.is_active,
          leads: data.is_active,
          
          // PRO-only features
          generate_image: data.is_pro,
          generate_video: data.is_pro,
          game_multiplayer: data.is_pro,
        };

        console.log(`[useSubscription] Calculated permissions based on Minato pricing:`, perms);
        console.log(`[useSubscription] Plan type: ${data.plan_type} - Pro features enabled: ${data.is_pro}`);
        
        setPermissions(perms);
      } else {
        console.error(`[useSubscription] API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[useSubscription] Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check access to a feature
  const checkFeatureAccess = useCallback(async (feature: keyof FeaturePermissions): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch('/api/subscription/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, feature }),
      });
      
      if (response.ok) {
        const { hasAccess } = await response.json();
        return hasAccess;
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
    }
    
    return false;
  }, [user?.id]);

  // Display limitation toast for PRO features
  const showProFeatureToast = useCallback((featureName: string) => {
    toast({
      title: "Pro Feature Required",
      description: `This feature is only available with the Pro plan ($25/month). Click on "Plan" in the header to upgrade to Pro.`,
      duration: 10000, // 10 seconds
    });
  }, [toast]);

  // Display expiration toast
  const showExpirationToast = useCallback((daysRemaining: number, isTrial: boolean) => {
    const planName = isTrial ? "free trial" : "Pro subscription";
    
    toast({
      title: `Expiration ${isTrial ? 'of trial' : 'of subscription'} in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
      description: `Your ${planName} expires soon. Click on "Plan" in the header to continue.`,
      duration: 15000, // 15 seconds
    });
  }, [toast]);

  // Display welcome toast for new users
  const showWelcomeToast = useCallback(() => {
    toast({
      title: "Welcome to Minato! 🎉",
      description: "Enjoy your free plan with unlimited chat, unlimited leads, 5 recordings, and solo AI games.",
      duration: 8000, // 8 seconds
    });
  }, [toast]);

  // Check notifications to display
  const checkNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/subscription/notifications?userId=${user.id}`);
      if (response.ok) {
        const { notifications } = await response.json();
        
        notifications.forEach((notification: any) => {
          // Créer une clé unique pour chaque notification avec l'ID utilisateur
          const notificationKey = `${user.id}_${notification.type}_${notification.daysRemaining || ''}_${notification.isTrial || ''}`;
          
          // Vérifier si cette notification a déjà été affichée
          if (shownNotifications.has(notificationKey)) {
            console.log(`[useSubscription] Notification already shown: ${notificationKey}`);
            return; // Skip if already shown
          }
          
          console.log(`[useSubscription] Showing notification: ${notificationKey}`);
          
          switch (notification.type) {
            case 'welcome':
              showWelcomeToast();
              break;
            case 'trial_expiring':
            case 'subscription_expiring':
              showExpirationToast(notification.daysRemaining, notification.type === 'trial_expiring');
              break;
            case 'expired':
              toast({
                title: "Subscription expired",
                description: "Your subscription has expired. Click on 'Plan' in the header to renew.",
                duration: 0, // Don't close automatically
              });
              break;
          }
          
          // Marquer cette notification comme affichée
          setShownNotifications(prev => {
            const newSet = new Set([...prev, notificationKey]);
            saveShownNotifications(newSet);
            return newSet;
          });
        });
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }, [user?.id, showWelcomeToast, showExpirationToast, toast, shownNotifications, saveShownNotifications]);

  // Initialize data
  useEffect(() => {
    console.log(`[useSubscription] User changed to: ${user?.id}`);
    fetchSubscriptionStatus();
    // Load shown notifications when user changes
    loadShownNotifications();
  }, [fetchSubscriptionStatus, user?.id, loadShownNotifications]);

  // Check notifications periodically
  useEffect(() => {
    if (user?.id) {
      // Check notifications immediately
      checkNotifications();
      
      // Check every 10 minutes instead of 5 minutes
      const interval = setInterval(checkNotifications, 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.id, checkNotifications]);

  return {
    subscriptionStatus,
    permissions,
    loading,
    checkFeatureAccess,
    showProFeatureToast,
    fetchSubscriptionStatus,
    clearShownNotifications,
  };
} 

// Updated hook for quotas based on new Minato pricing
export const useUserQuotas = () => {
  const { subscriptionStatus, permissions, fetchSubscriptionStatus } = useSubscription();
  
  // Get current usage from subscription status
  const currentUsage = subscriptionStatus?.currentUsage || {
    recordings: 0,
    images: 0,
    videos: 0
  };

  // Calculate quotas based on plan type
  const quotas = useMemo(() => {
    if (!subscriptionStatus) {
      return {
        recordings: { used: 0, limit: 0, remaining: 0 },
        images: { used: 0, limit: 0, remaining: 0 },
        videos: { used: 0, limit: 0, remaining: 0 },
      };
    }

    // Get limits based on plan type using MINATO_PLANS constants
    const limits = subscriptionStatus.is_pro 
      ? MINATO_PLANS.PRO.limits
      : MINATO_PLANS.FREE.limits;

    const recordings = {
      used: currentUsage.recordings,
      limit: limits.recordings,
      remaining: Math.max(0, limits.recordings - currentUsage.recordings)
    };

    const images = {
      used: currentUsage.images,
      limit: limits.images,
      remaining: Math.max(0, limits.images - currentUsage.images)
    };

    const videos = {
      used: currentUsage.videos,
      limit: limits.videos,
      remaining: Math.max(0, limits.videos - currentUsage.videos)
    };

    return { recordings, images, videos };
  }, [subscriptionStatus, currentUsage]);

  // Check if user has reached recording limit
  const hasReachedRecordingLimit = quotas.recordings.remaining <= 0;
  
  // Check if user has reached image limit
  const hasReachedImageLimit = quotas.images.remaining <= 0;
  
  // Check if user has reached video limit
  const hasReachedVideoLimit = quotas.videos.remaining <= 0;

  // Manual refresh function
  const refreshQuotas = useCallback(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return {
    quotas,
    hasReachedRecordingLimit,
    hasReachedImageLimit,
    hasReachedVideoLimit,
    currentUsage,
    planLimits: subscriptionStatus?.is_pro ? MINATO_PLANS.PRO.limits : MINATO_PLANS.FREE.limits,
    // Individual quota values for easier destructuring
    images: quotas.images.remaining,
    videos: quotas.videos.remaining,
    recordings: quotas.recordings.remaining,
    imagesLimit: quotas.images.limit,
    videosLimit: quotas.videos.limit,
    recordingsLimit: quotas.recordings.limit,
    // Loading state
    loading: !subscriptionStatus,
    // Manual refresh function
    refreshQuotas
  };
}; 