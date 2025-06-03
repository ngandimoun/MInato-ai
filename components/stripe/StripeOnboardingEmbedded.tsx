"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from '@stripe/react-connect-js';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import { logger } from '@/memory-framework/config';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StripeOnboardingEmbeddedProps {
  connectedAccountId: string; // Must be passed to know which account to fetch session for
  onOnboardingExited: () => void; // Callback to Minato core logic
}

const StripeOnboardingEmbedded: React.FC<StripeOnboardingEmbeddedProps> = ({
  connectedAccountId,
  onOnboardingExited,
}) => {
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This function will be called by ConnectJS to get client secrets
  const fetchClientSecretForConnectJS = useCallback(async () => {
    logger.debug(`[StripeOnboardingEmbedded] ConnectJS requesting client secret for account: ${connectedAccountId}`);
    try {
      const response = await fetch('/api/stripe/refresh-account-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectedAccountId }),
      });
      
      if (!response.ok) {
        const errData = await response.json();
        logger.error('[StripeOnboardingEmbedded] Failed to fetch client secret:', response.status, errData.error);
        setErrorLoading(`Error fetching Stripe session: ${errData.error || response.statusText}`);
        return null;
      }
      
      const { clientSecret } = await response.json();
      if (!clientSecret) {
        logger.error('[StripeOnboardingEmbedded] Client secret was not returned from backend.');
        setErrorLoading('Stripe session could not be established.');
        return null;
      }
      
      return clientSecret;
    } catch (e: any) {
      logger.error('[StripeOnboardingEmbedded] Network or other error fetching client secret:', e);
      setErrorLoading(`Network error: ${e.message}`);
      return null;
    }
  }, [connectedAccountId]);

  useEffect(() => {
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!stripePublishableKey) {
      logger.error("[StripeOnboardingEmbedded] Stripe publishable key is not set.");
      setErrorLoading("Stripe configuration error (publishable key missing).");
      setIsLoading(false);
      return;
    }
    
    if (!connectedAccountId) {
      logger.error("[StripeOnboardingEmbedded] Connected Account ID is missing for onboarding.");
      setErrorLoading("Internal error: Connected account ID not provided.");
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setErrorLoading(null); // Clear previous errors
      try {
        logger.info(`[StripeOnboardingEmbedded] Initializing Stripe Connect for account: ${connectedAccountId}`);
        
        const instance = await loadConnectAndInitialize({
          publishableKey: stripePublishableKey,
          fetchClientSecret: fetchClientSecretForConnectJS,
          appearance: {
            variables: {
              colorPrimary: '#6366f1', // Indigo primary color to match modern design
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
          },
        });
        
        setConnectInstance(instance);
        logger.info(`[StripeOnboardingEmbedded] Stripe Connect initialized successfully`);
      } catch (e: any) {
        logger.error("[StripeOnboardingEmbedded] Failed to load or initialize Stripe Connect JS:", e);
        setErrorLoading(`Stripe initialization error: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [fetchClientSecretForConnectJS, connectedAccountId]);

  if (errorLoading) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Stripe Onboarding Error:</strong> {errorLoading}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !connectInstance) {
    return (
      <div className="flex items-center justify-center py-8 my-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading Secure Stripe Onboarding Form...</p>
          <p className="text-xs text-muted-foreground mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <div className="border rounded-lg bg-card">
          <ConnectAccountOnboarding
            onExit={() => {
              logger.info('[StripeOnboardingEmbedded] User exited Stripe onboarding component via onExit.');
              onOnboardingExited();
            }}
            // Collect all required fields for complete onboarding
            collectionOptions={{ 
              fields: 'eventually_due',
              futureRequirements: 'include'
            }}
          />
        </div>
      </ConnectComponentsProvider>
    </div>
  );
};

export default StripeOnboardingEmbedded; 