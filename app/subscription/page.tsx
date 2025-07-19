// FILE: app/subscription/page.tsx
'use client';

import { Metadata } from 'next';
import { SubscriptionManager } from '@/components/subscription/SubscriptionManager';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { STRIPE_CONFIG } from '@/lib/constants';

// Composant séparé pour gérer les paramètres de recherche
function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Calculate price from constants
  const priceDisplay = STRIPE_CONFIG.MINATO_PRO_PRICE_DISPLAY;

  useEffect(() => {
    // Gérer les retours de Stripe
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      toast({
        title: "🎉 Welcome to Minato Pro!",
        description: "Your subscription has been successfully activated. You now have access to all premium features.",
        variant: "default",
      });
    } else if (canceled === 'true') {
      toast({
        title: "Payment canceled",
        description: "You can try again at any time to access Pro features.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your Minato Pro subscription, view your usage quotas and one-time credits.
          </p>
        </div>

        {/* Subscription Manager */}
        <SubscriptionManager />

        {/* Additional Information */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Plan Comparison
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Leads per month</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">5</span>
                  <span className="text-sm font-medium text-green-600">50</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Recordings per month</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">3</span>
                  <span className="text-sm font-medium text-green-600">20</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Images per month</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">2</span>
                  <span className="text-sm font-medium text-green-600">30</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Videos per month</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium">1</span>
                  <span className="text-sm font-medium text-green-600">20</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Multiplayer mode</span>
                <div className="flex space-x-4">
                  <span className="text-sm text-red-500">✗</span>
                  <span className="text-sm text-green-600">✓</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Priority support</span>
                <div className="flex space-x-4">
                  <span className="text-sm text-red-500">✗</span>
                  <span className="text-sm text-green-600">✓</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Monthly price</span>
                <div className="flex space-x-4">
                  <span className="text-sm font-medium text-green-600">Free</span>
                  <span className="text-sm font-medium">{priceDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  How does the free trial work?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You get a 7-day free trial with access to all Pro features. No credit card required.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Can I cancel at any time?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Yes, you can cancel your subscription at any time. You will retain Pro access until the end of the billing period.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  What are one-time credits?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  One-time credits allow you to use premium features even after exceeding your monthly quotas.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  How are quotas reset?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Monthly quotas are automatically reset on the first day of each month.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Need help?
          </h3>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            If you have questions about your subscription or encounter issues, our team is here to help.
          </p>
          <div className="flex space-x-4">
            <a
              href="/support"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </a>
            <a
              href="/docs/subscription"
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-md border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant de fallback pour le Suspense
function SubscriptionPageFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<SubscriptionPageFallback />}>
      <SubscriptionPageContent />
    </Suspense>
  );
} 