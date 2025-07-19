"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { logger } from '@/memory-framework/config';
import { User } from '@/lib/types';

interface WelcomeTrialBannerProps {
  className?: string;
}

export function WelcomeTrialBanner({ className = "" }: WelcomeTrialBannerProps) {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;

    // Vérifier si l'utilisateur a déjà vu cette bannière
    const hasSeenWelcomeBanner = localStorage.getItem(`welcome_banner_seen_${user.id}`);
    if (hasSeenWelcomeBanner) {
      return;
    }

    // Fetch subscription data from database
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data.user);
        }
      } catch (error) {
        logger.error('[WelcomeTrialBanner] Error fetching subscription data:', error);
      }
    };

    fetchSubscriptionData();
  }, [user]);

  useEffect(() => {
    if (!subscriptionData) return;

    // ✅ LOGIQUE: Afficher la bannière seulement pour les nouveaux utilisateurs en essai gratuit
    const shouldShowWelcomeBanner = () => {
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
        if (hoursSinceCreation <= 24) {
          setShowBanner(true);
          
          // ✅ TIMER: Disparaître automatiquement après 10 secondes
          const timer = setTimeout(() => {
            setShowBanner(false);
            // Marquer comme vue pour ne plus l'afficher
            if (user) {
              localStorage.setItem(`welcome_banner_seen_${user.id}`, new Date().toISOString());
            }
          }, 10000); // 10 secondes

          return () => clearTimeout(timer);
        }
      } catch (error) {
        logger.error('[WelcomeTrialBanner] Error checking welcome banner conditions:', error);
      }
    };

    shouldShowWelcomeBanner();
  }, [subscriptionData, user]);

  const handleDismiss = () => {
    setShowBanner(false);
    // Marquer comme vue pour ne plus l'afficher
    if (user) {
      localStorage.setItem(`welcome_banner_seen_${user.id}`, new Date().toISOString());
    }
  };

  const handleUpgradeClick = async () => {
    setIsLoading(true);
    
    try {
      // Redirect to new Stripe Elements checkout page
      window.location.href = '/subscription/checkout';
    } catch (error) {
      logger.error('[WelcomeTrialBanner] Error redirecting to checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Alert className={`border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 ${className}`}>
      <Sparkles className="h-4 w-4 text-green-500" />
      <AlertDescription className="flex items-center justify-between text-green-800 dark:text-green-400">
        <div className="flex items-center gap-2">
          {/* ✅ TEXTE: Message de bienvenue */}
          <span className="flex items-center gap-2">
            <span className="font-medium">Bienvenue sur Minato !</span>
            <span>Profitez de votre essai gratuit de 7 jours.</span>
            <Clock className="h-3 w-3" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* ✅ BOUTON: Upgrade to Pro */}
          <Button
            onClick={handleUpgradeClick}
            disabled={isLoading}
            size="sm"
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Upgrade to Pro
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
} 