import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionStatus {
  plan_type: 'FREE_TRIAL' | 'PRO' | 'EXPIRED';
  is_active: boolean;
  is_trial: boolean;
  is_pro: boolean;
  is_expired: boolean;
  days_remaining: number;
  trial_end_date: string | null;
  subscription_end_date: string | null;
  expires_at: string | null;
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
        const result = await response.json();
        console.log(`[useSubscription] API response:`, result);
        
        // Handle the new response structure
        const data = result.success ? result.data : result;
        console.log(`[useSubscription] Subscription data:`, data);
        
        setSubscriptionStatus(data);
        
        // Calculate permissions with detailed logging
        console.log(`[useSubscription] Calculating permissions for user ${user.id}:`, {
          plan_type: data.plan_type,
          is_active: data.is_active,
          is_trial: data.is_trial,
          is_pro: data.is_pro,
          is_expired: data.is_expired
        });
        
        const perms: FeaturePermissions = {
          chat: data.is_active,
          memory: data.is_active,
          leads: data.is_pro,
          listening: data.is_active, // With limit of 5 for FREE_TRIAL
          game_solo: data.is_active,
          game_multiplayer: data.is_pro,
          generate_image: data.is_pro,
          generate_video: data.is_pro,
        };
        
        console.log(`[useSubscription] Calculated permissions:`, perms);
        console.log(`[useSubscription] generate_image permission: ${perms.generate_image} (is_pro: ${data.is_pro})`);
        

        
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
      description: `This feature is only available with the Pro plan. Click on "Plan" in the header to upgrade to Pro.`,
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
      description: "Enjoy your 7-day free trial with access to all basic features.",
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