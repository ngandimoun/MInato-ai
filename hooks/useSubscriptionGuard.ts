// FILE: hooks/useSubscriptionGuard.ts
import { useState, useCallback } from 'react';

interface SubscriptionError {
  code: 'trial_expired' | 'subscription_expired' | 'quota_exceeded' | 'feature_blocked' | 'pro_feature';
  feature: string;
  currentUsage?: number;
  maxQuota?: number;
}

export const useSubscriptionGuard = () => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<SubscriptionError | null>(null);

  const handleSubscriptionError = useCallback((error: any) => {
    // Vérifier si c'est une erreur d'abonnement
    if (error?.code && ['trial_expired', 'subscription_expired', 'quota_exceeded', 'feature_blocked', 'pro_feature'].includes(error.code)) {
      setSubscriptionError({
        code: error.code,
        feature: error.feature || 'Premium Feature',
        currentUsage: error.currentUsage,
        maxQuota: error.maxQuota
      });
      setIsUpgradeModalOpen(true);
      return true; // Indique que l'erreur a été gérée
    }
    return false; // Indique que l'erreur n'a pas été gérée
  }, []);

  const handleUpgrade = useCallback(async () => {
    try {
      // Create upgrade session
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create upgrade session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Error creating upgrade session:', error);
      // L'erreur sera gérée par le modal
    } finally {
      setIsUpgradeModalOpen(false);
    }
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setSubscriptionError(null);
  }, []);

  return {
    handleSubscriptionError,
    handleUpgrade,
    closeUpgradeModal,
    isUpgradeModalOpen,
    subscriptionError
  };
};

// Hook pour gérer les appels API avec protection d'abonnement
export const useProtectedApiCall = () => {
  const { handleSubscriptionError } = useSubscriptionGuard();

  const callProtectedApi = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: any) => void
  ): Promise<T | null> => {
    try {
      const result = await apiCall();
      onSuccess?.(result);
      return result;
    } catch (error: any) {
      // Vérifier si c'est une erreur d'abonnement
      if (handleSubscriptionError(error)) {
        // L'erreur a été gérée par le modal d'upgrade
        return null;
      }
      
      // Sinon, laisser l'erreur être gérée normalement
      onError?.(error);
      throw error;
    }
  }, [handleSubscriptionError]);

  return {
    callProtectedApi
  };
}; 