'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-provider';

interface TrialAlertState {
  showTrialEndingBanner: boolean;
  showTrialExpiredModal: boolean;
  daysRemaining: number;
  hoursRemaining: number;
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

export function useTrialAlerts() {
  const { user } = useAuth();
  const [trialAlertState, setTrialAlertState] = useState<TrialAlertState>({
    showTrialEndingBanner: false,
    showTrialExpiredModal: false,
    daysRemaining: 0,
    hoursRemaining: 0
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

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
    
    if (!trial.endDate) return;

    const now = new Date();
    const trialEndDate = new Date(trial.endDate);
    const timeRemaining = trialEndDate.getTime() - now.getTime();
    const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    // Vérifier si l'essai a expiré
    if (timeRemaining <= 0) {
      setTrialAlertState(prev => ({
        ...prev,
        showTrialExpiredModal: true,
        showTrialEndingBanner: false
      }));
      return;
    }

    // Vérifier si l'essai se termine dans moins de 2 jours
    if (daysRemaining <= 2) {
      setTrialAlertState({
        showTrialEndingBanner: true,
        showTrialExpiredModal: false,
        daysRemaining,
        hoursRemaining
      });
    } else {
      setTrialAlertState({
        showTrialEndingBanner: false,
        showTrialExpiredModal: false,
        daysRemaining: 0,
        hoursRemaining: 0
      });
    }
  }, [subscriptionStatus]);

  const closeTrialEndingBanner = () => {
    setTrialAlertState(prev => ({
      ...prev,
      showTrialEndingBanner: false
    }));
  };

  const closeTrialExpiredModal = () => {
    setTrialAlertState(prev => ({
      ...prev,
      showTrialExpiredModal: false
    }));
  };

  return {
    ...trialAlertState,
    closeTrialEndingBanner,
    closeTrialExpiredModal
  };
} 