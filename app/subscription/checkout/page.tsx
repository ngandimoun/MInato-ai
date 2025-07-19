'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MinatoProCheckout } from '@/components/subscription/MinatoProCheckout';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/memory-framework/config';

function SubscriptionCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[SubscriptionCheckoutPage] Page loading...');
    
    // Temporarily skip auth check for debugging
    console.log('[SubscriptionCheckoutPage] Skipping auth check for debugging...');
    setIsLoading(false);
    
    // TODO: Re-enable auth check after debugging
    /*
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        console.log('[SubscriptionCheckoutPage] Checking authentication...');
        const response = await fetch('/api/auth/check');
        console.log('[SubscriptionCheckoutPage] Auth response status:', response.status);
        
        if (!response.ok) {
          console.log('[SubscriptionCheckoutPage] Auth failed, redirecting...');
          router.push('/auth?redirect=/subscription/checkout');
          return;
        }
        
        console.log('[SubscriptionCheckoutPage] Auth successful, loading checkout...');
        setIsLoading(false);
      } catch (error) {
        console.error('[SubscriptionCheckoutPage] Auth check failed:', error);
        logger.error('[SubscriptionCheckoutPage] Auth check failed:', error);
        router.push('/auth?redirect=/subscription/checkout');
      }
    };

    checkAuth();
    */
  }, [router]);

  const handleSuccess = (sessionId: string) => {
    toast({
      title: "Welcome to Minato Pro!",
      description: "Your subscription has been activated successfully.",
    });
    
    // Redirect to dashboard or success page
    router.push('/dashboard?upgraded=true');
  };

  const handleCancel = () => {
    router.push('/subscription');
  };

  if (isLoading) {
    console.log('[SubscriptionCheckoutPage] Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  console.log('[SubscriptionCheckoutPage] Rendering MinatoProCheckout component...');
  return (
    <MinatoProCheckout
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      returnUrl={`${window.location.origin}/dashboard?upgraded=true`}
    />
  );
}

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <SubscriptionCheckoutContent />
    </Suspense>
  );
} 