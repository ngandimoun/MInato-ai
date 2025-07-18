'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-provider';

interface TrialExpiredOverlayProps {
  children: React.ReactNode;
}

interface SubscriptionStatus {
  plan: {
    type: string;
    name: string;
    isActive: boolean;
  };
  trial: {
    isActive: boolean;
    endDate: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
  };
}

export function TrialExpiredOverlay({ children }: TrialExpiredOverlayProps) {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  // Fonction pour récupérer le statut d'abonnement
  const fetchSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchSubscriptionStatus();
  }, [user]);

  useEffect(() => {
    if (!subscriptionStatus) return;

    const { trial } = subscriptionStatus;
    
    // Vérifier si l'essai a expiré
    if (trial.isExpired && subscriptionStatus.plan.type === 'FREE_TRIAL') {
      setIsTrialExpired(true);
    } else {
      setIsTrialExpired(false);
    }
  }, [subscriptionStatus]);

  if (!isTrialExpired) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Interface normale */}
      {children}
      
      {/* Overlay qui bloque les interactions */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm pointer-events-auto"
        style={{ 
          top: '60px', // Laisser de l'espace pour le header
          left: 0,
          right: 0,
          bottom: 0
        }}
      >
        {/* Message d'information */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Essai expiré
            </h3>
            <p className="text-gray-600 text-sm">
              Votre essai gratuit a expiré. Cliquez sur "Plan" dans le header pour continuer à utiliser Minato.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 