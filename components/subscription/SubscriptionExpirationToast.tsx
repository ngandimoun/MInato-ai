"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { logger } from '@/memory-framework/config';
import { User } from '@/lib/types';
import { AlertTriangle, Zap, Clock } from 'lucide-react';

export function SubscriptionExpirationToast() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    // Vérifier toutes les heures
    const checkSubscriptionExpiration = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          const subscriptionData = data.user;

          if (shouldShowExpirationToast(subscriptionData)) {
            showExpirationToast(subscriptionData);
          }
        }
      } catch (error) {
        logger.error('[SubscriptionExpirationToast] Error fetching subscription data:', error);
      }
    };

    // Vérifier immédiatement
    checkSubscriptionExpiration();

    // Vérifier toutes les heures
    const interval = setInterval(checkSubscriptionExpiration, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, toast]);

  const shouldShowExpirationToast = (subscriptionData: User): boolean => {
    try {
      // Vérifier si l'utilisateur a un plan PRO
      if (subscriptionData.plan_type !== 'PRO') {
        return false;
      }

      // Vérifier si subscription_end_date existe
      if (!subscriptionData.subscription_end_date) {
        return false;
      }

      const now = new Date();
      const endDate = new Date(subscriptionData.subscription_end_date);
      const timeDiff = endDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      // ✅ LOGIQUE: Si l'abonnement se termine dans 5 jours ou moins
      return daysDiff <= 5 && daysDiff > 0;
    } catch (error) {
      logger.error('[SubscriptionExpirationToast] Error checking subscription expiration:', error);
      return false;
    }
  };

  const showExpirationToast = (subscriptionData: User) => {
    const endDate = new Date(subscriptionData.subscription_end_date!);
    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Vérifier si on a déjà affiché ce toast aujourd'hui
    const today = new Date().toDateString();
    const lastToastDate = localStorage.getItem(`expiration_toast_date_${user?.id}`);
    
    if (lastToastDate === today) {
      return; // Ne pas afficher plusieurs fois le même jour
    }

    // Marquer comme affiché aujourd'hui
    if (user) {
      localStorage.setItem(`expiration_toast_date_${user.id}`, today);
    }

    toast({
      title: (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>Abonnement se termine bientôt</span>
        </div>
      ) as ReactNode,
      description: (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            Votre abonnement se termine dans {daysDiff} jour{daysDiff > 1 ? 's' : ''}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleRenewSubscription}
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs rounded-md transition-colors"
            >
              <Zap className="h-3 w-3" />
              Renouveler
            </button>
          </div>
        </div>
      ) as ReactNode,
      duration: 10000, // 10 secondes
      className: "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50",
    });
  };

  const handleRenewSubscription = async () => {
    try {
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
      logger.error('[SubscriptionExpirationToast] Error creating checkout session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  return null; // Ce composant ne rend rien visuellement
} 