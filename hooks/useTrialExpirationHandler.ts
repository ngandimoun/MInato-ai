'use client';

import { useState, useCallback } from 'react';
import { useTrialAlerts } from './useTrialAlerts';

export const useTrialExpirationHandler = () => {
  const { closeTrialExpiredModal } = useTrialAlerts();
  const [isHandlingTrialExpiration, setIsHandlingTrialExpiration] = useState(false);

  const handleTrialExpirationError = useCallback((error: any) => {
    // Vérifier si c'est une erreur d'expiration d'essai
    if (error?.code === 'trial_expired' || 
        error?.message?.includes('trial expired') ||
        error?.error?.includes('trial expired')) {
      
      setIsHandlingTrialExpiration(true);
      
      // La modale d'expiration sera affichée automatiquement par useTrialAlerts
      // quand l'API retourne une erreur trial_expired
      return true; // Indique que l'erreur a été gérée
    }
    return false; // Indique que l'erreur n'a pas été gérée
  }, []);

  const handleTrialExpirationModalClose = useCallback(() => {
    closeTrialExpiredModal();
    setIsHandlingTrialExpiration(false);
  }, [closeTrialExpiredModal]);

  return {
    handleTrialExpirationError,
    handleTrialExpirationModalClose,
    isHandlingTrialExpiration
  };
};

// Hook pour gérer les appels API avec gestion d'expiration d'essai
export const useTrialProtectedApiCall = () => {
  const { handleTrialExpirationError } = useTrialExpirationHandler();

  const callTrialProtectedApi = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: any) => void
  ): Promise<T | null> => {
    try {
      const result = await apiCall();
      onSuccess?.(result);
      return result;
    } catch (error: any) {
      // Vérifier si c'est une erreur d'expiration d'essai
      if (handleTrialExpirationError(error)) {
        // L'erreur a été gérée par la modale d'expiration
        return null;
      }
      
      // Sinon, laisser l'erreur être gérée normalement
      onError?.(error);
      throw error;
    }
  }, [handleTrialExpirationError]);

  return {
    callTrialProtectedApi
  };
}; 