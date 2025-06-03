"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { logger } from "@/memory-framework/config";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from '@stripe/react-connect-js';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';

interface StripeEmbeddedOnboardingProps {
  stripeAccountId: string | null;
  onComplete: () => void;
}

export function StripeEmbeddedOnboarding({ stripeAccountId, onComplete }: StripeEmbeddedOnboardingProps) {
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const fetchClientSecretForConnectJS = useCallback(async () => {
    if (!stripeAccountId) {
      logger.error('[StripeEmbeddedOnboarding] No stripe account ID available');
      return null;
    }

    logger.debug(`[StripeEmbeddedOnboarding] ConnectJS requesting client secret for account: ${stripeAccountId}`);
    try {
      const response = await fetch('/api/stripe/create-onboarding-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: stripeAccountId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        logger.error('[StripeEmbeddedOnboarding] Failed to fetch client secret:', response.status, errData.error);
        setError(`Error fetching Stripe session: ${errData.error || response.statusText}`);
        return null;
      }

      const data = await response.json();
      if (!data.clientSecret) {
        logger.error('[StripeEmbeddedOnboarding] Client secret was not returned from backend.');
        setError('Stripe session could not be established.');
        return null;
      }
      
      setClientSecret(data.clientSecret);
      return data.clientSecret;
    } catch (error: any) {
      logger.error('[StripeEmbeddedOnboarding] Error initializing session:', error);
      setError(error.message || 'Failed to initialize onboarding');
      return null;
    }
  }, [stripeAccountId]);

  useEffect(() => {
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!stripePublishableKey) {
      logger.error("[StripeEmbeddedOnboarding] Stripe publishable key is not set.");
      setError("Stripe configuration error (publishable key missing).");
      setIsLoading(false);
      return;
    }
    
    if (!stripeAccountId) {
      logger.info("[StripeEmbeddedOnboarding] No stripe account ID yet, waiting...");
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setError(null); // Clear previous errors
      try {
        logger.info(`[StripeEmbeddedOnboarding] Initializing Stripe Connect for account: ${stripeAccountId}`);
        
        const instance = await loadConnectAndInitialize({
          publishableKey: stripePublishableKey,
          fetchClientSecret: fetchClientSecretForConnectJS,
          appearance: {
            variables: {
              colorPrimary: '#0F172A',
              colorBackground: '#ffffff',
              colorText: '#0F172A',
              colorDanger: '#ef4444',
              fontFamily: '-apple-system, system-ui, sans-serif',
              borderRadius: '0.5rem',
            },
          },
        });
        
        setConnectInstance(instance);
        logger.info(`[StripeEmbeddedOnboarding] Stripe Connect initialized successfully`);
      } catch (e: any) {
        logger.error("[StripeEmbeddedOnboarding] Failed to load or initialize Stripe Connect JS:", e);
        setError(`Stripe initialization error: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [fetchClientSecretForConnectJS, stripeAccountId]);

  const handleOnboardingComplete = async () => {
    try {
      // Verify onboarding completion with backend
      const response = await fetch('/api/stripe/check-onboarding-status', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to verify onboarding status');
      }

      const data = await response.json();
      
      if (data.isComplete) {
        onComplete();
      }
    } catch (error: any) {
      logger.error('[StripeEmbeddedOnboarding] Error verifying completion:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Stripe Onboarding Error:</strong> {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!stripeAccountId || !connectInstance) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>Unable to initialize onboarding. Please try again.</p>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      <div className="border rounded-lg bg-card">
        <ConnectAccountOnboarding
          onExit={() => {
            logger.info('[StripeEmbeddedOnboarding] User exited Stripe onboarding component.');
            handleOnboardingComplete();
          }}
          // Collect all required fields for complete onboarding
          collectionOptions={{ 
            fields: 'eventually_due',
            futureRequirements: 'include'
          }}
        />
      </div>
    </ConnectComponentsProvider>
  );
} 