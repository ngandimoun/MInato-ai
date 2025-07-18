"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { logger } from '@/memory-framework/config';
import { User } from '@/lib/types';

interface SubscriptionExpirationBannerProps {
  className?: string;
}

export function SubscriptionExpirationBanner({ className = "" }: SubscriptionExpirationBannerProps) {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch subscription data from database
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data.user);
        }
      } catch (error) {
        logger.error('[SubscriptionExpirationBanner] Error fetching subscription data:', error);
      }
    };

    fetchSubscriptionData();
  }, [user]);

  useEffect(() => {
    if (!subscriptionData) return;

    // ✅ LOGIQUE FRONTEND: Vérifier si l'abonnement se termine dans 5 jours
    const checkSubscriptionExpiration = () => {
      try {
        // Vérifier si l'utilisateur a un plan PRO
        if (subscriptionData.plan_type !== 'PRO') {
          setShowBanner(false);
          return;
        }

        // Vérifier si subscription_end_date existe
        if (!subscriptionData.subscription_end_date) {
          setShowBanner(false);
          return;
        }

        const now = new Date();
        const endDate = new Date(subscriptionData.subscription_end_date);
        const timeDiff = endDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // ✅ LOGIQUE: Si l'abonnement se termine dans 5 jours ou moins
        if (daysDiff <= 5 && daysDiff > 0) {
          setDaysRemaining(daysDiff);
          setShowBanner(true);
        } else {
          setShowBanner(false);
        }
      } catch (error) {
        logger.error('[SubscriptionExpirationBanner] Error checking subscription expiration:', error);
        setShowBanner(false);
      }
    };

    checkSubscriptionExpiration();

    // Vérifier toutes les heures
    const interval = setInterval(checkSubscriptionExpiration, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [subscriptionData]);

  const handleRenewSubscription = async () => {
    setIsLoading(true);
    
    try {
      // ✅ ACTION FRONTEND: Relancer le flux de paiement
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { checkoutUrl } = await response.json();
      
      if (checkoutUrl) {
        // Rediriger vers Stripe Checkout
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      logger.error('[SubscriptionExpirationBanner] Error creating checkout session:', error);
      // Vous pourriez afficher une notification d'erreur ici
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Optionnel: Sauvegarder dans localStorage pour ne pas réafficher pendant cette session
    localStorage.setItem('subscription_banner_dismissed', new Date().toISOString());
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between text-amber-800 dark:text-amber-400">
        <div className="flex items-center gap-2">
          {/* ✅ TEXTE: Message d'alerte */}
          <span>
            Votre abonnement se termine dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}. 
            Renouvelez pour garantir un accès ininterrompu.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* ✅ BOUTON: Renouveler mon abonnement */}
          <Button
            onClick={handleRenewSubscription}
            disabled={isLoading}
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            Renouveler mon abonnement
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
} 