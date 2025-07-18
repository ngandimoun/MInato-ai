"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { logger } from '@/memory-framework/config';
import { User } from '@/lib/types';
import { Sparkles, Clock, Crown } from 'lucide-react';

export function WelcomeTrialToast() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    if (!user || hasShownToast) return;

    // Vérifier si l'utilisateur a déjà vu ce toast
    const hasSeenWelcomeToast = localStorage.getItem(`welcome_toast_seen_${user.id}`);
    if (hasSeenWelcomeToast) {
      return;
    }

    // Fetch subscription data from database
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          const subscriptionData = data.user;

          // ✅ LOGIQUE: Afficher le toast seulement pour les nouveaux utilisateurs en essai gratuit
          if (shouldShowWelcomeToast(subscriptionData)) {
            showWelcomeToast();
            setHasShownToast(true);
          }
        }
      } catch (error) {
        logger.error('[WelcomeTrialToast] Error fetching subscription data:', error);
      }
    };

    fetchSubscriptionData();
  }, [user, hasShownToast, toast]);

  const shouldShowWelcomeToast = (subscriptionData: User): boolean => {
    try {
      // Vérifier si l'utilisateur est en essai gratuit
      if (subscriptionData.plan_type !== 'TRIAL') {
        return false;
      }

      // Vérifier si l'utilisateur s'est inscrit récemment (dans les dernières 24h)
      if (!subscriptionData.created_at) {
        return false;
      }

      const createdAt = new Date(subscriptionData.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Afficher seulement si l'utilisateur s'est inscrit dans les dernières 24h
      return hoursSinceCreation <= 24;
    } catch (error) {
      logger.error('[WelcomeTrialToast] Error checking welcome toast conditions:', error);
      return false;
    }
  };

  const showWelcomeToast = () => {
    // Marquer comme vue pour ne plus l'afficher
    if (user) {
      localStorage.setItem(`welcome_toast_seen_${user.id}`, new Date().toISOString());
    }

    toast({
      title: (
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-green-500" />
          <span>Bienvenue sur Minato !</span>
        </div>
      ) as ReactNode,
      description: (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            Profitez de votre essai gratuit de 7 jours
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleUpgradeClick}
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white text-xs rounded-md transition-colors"
            >
              <Crown className="h-3 w-3" />
              Upgrade to Pro
            </button>
          </div>
        </div>
      ) as ReactNode,
      duration: 8000, // 8 secondes au lieu de 10 pour un toast
      className: "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50",
    });
  };

  const handleUpgradeClick = async () => {
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create upgrade session');
      }

      const { checkoutUrl } = await response.json();
      
      if (checkoutUrl) {
        // Rediriger vers Stripe Checkout
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      logger.error('[WelcomeTrialToast] Error creating upgrade session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  return null; // Ce composant ne rend rien visuellement
} 