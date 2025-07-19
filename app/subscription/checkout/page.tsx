'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProSubscriptionCheckout } from '@/components/subscription/ProSubscriptionCheckout';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/memory-framework/config';

function SubscriptionCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (!response.ok) {
          router.push('/auth?redirect=/subscription/checkout');
          return;
        }
        setIsLoading(false);
      } catch (error) {
        logger.error('[SubscriptionCheckoutPage] Auth check failed:', error);
        router.push('/auth?redirect=/subscription/checkout');
      }
    };

    checkAuth();
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <ProSubscriptionCheckout
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