// FILE: components/subscription/SubscriptionManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

// Load Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SubscriptionStatus {
  planType: 'FREE_TRIAL' | 'PRO' | 'EXPIRED';
  trialEndDate?: string;
  subscriptionEndDate?: string;
  monthlyUsage: {
    leads: number;
    recordings: number;
    images: number;
    videos: number;
  };
  oneTimeCredits: {
    leads: number;
    recordings: number;
    images: number;
    videos: number;
  };
}

interface StripeSubscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

export function SubscriptionManager() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [stripeSubscription, setStripeSubscription] = useState<StripeSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  // Fetch subscription status
  const fetchSubscriptionStatus = async () => {
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

  // Fetch Stripe subscription details
  const fetchStripeSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-subscription');
      if (response.ok) {
        const data = await response.json();
        setStripeSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching Stripe subscription:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSubscriptionStatus(),
        fetchStripeSubscription()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Handle subscription creation
  const handleSubscribe = async () => {
    setProcessing(true);
    
    try {
      // Create upgrade session
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create upgrade session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create upgrade session',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    setCancelling(true);
    
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: true, // Cancel at period end (recommended)
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast({
        title: 'Subscription Cancelled',
        description: data.message || 'Your subscription has been cancelled.',
      });

      // Refresh data
      await fetchSubscriptionStatus();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  // Handle subscription reactivation
  const handleReactivateSubscription = async () => {
    setProcessing(true);
    
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: false, // Reactivate by removing cancellation
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      toast({
        title: 'Subscription Reactivated!',
        description: 'Your subscription has been reactivated successfully.',
      });

      // Refresh data
      await Promise.all([
        fetchSubscriptionStatus(),
        fetchStripeSubscription()
      ]);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading subscription details...</span>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load subscription details. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isPro = subscriptionStatus.planType === 'PRO';
  const isExpired = subscriptionStatus.planType === 'EXPIRED';
  const isTrial = subscriptionStatus.planType === 'FREE_TRIAL';
  const isCancelled = stripeSubscription?.cancelAtPeriodEnd;

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Plan</span>
            <Badge variant={isPro ? 'default' : isExpired ? 'destructive' : 'secondary'}>
              {isPro ? 'Pro' : isExpired ? 'Expired' : 'Free Trial'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isPro && 'You have access to all Minato Pro features'}
            {isExpired && 'Your Pro subscription has expired. Upgrade to continue enjoying premium features.'}
            {isTrial && 'You are currently on a free trial. Upgrade to Pro for unlimited access.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trial Status */}
          {isTrial && subscriptionStatus.trialEndDate && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your free trial ends on{' '}
                {new Date(subscriptionStatus.trialEndDate).toLocaleDateString()}
              </AlertDescription>
            </Alert>
          )}

          {/* Subscription End Date */}
          {isPro && subscriptionStatus.subscriptionEndDate && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Subscription active until{' '}
                {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Cancellation Notice */}
          {isCancelled && stripeSubscription && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will be cancelled on{' '}
                {new Date(stripeSubscription.currentPeriodEnd).toLocaleDateString()}.
                You can reactivate it anytime before then.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {!isPro && !isCancelled && (
              <Button 
                onClick={handleSubscribe} 
                disabled={processing}
                className="flex items-center space-x-2"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                <span>Upgrade to Pro</span>
              </Button>
            )}

            {isPro && !isCancelled && (
              <Button 
                variant="outline" 
                onClick={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="ml-2">Cancel Subscription</span>
              </Button>
            )}

            {isCancelled && (
              <Button 
                onClick={handleReactivateSubscription}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span className="ml-2">Reactivate Subscription</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Quotas */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
          <CardDescription>
            Track your usage for the current month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Leads</span>
                <span className="text-sm text-muted-foreground">
                  {subscriptionStatus.monthlyUsage.leads} / {isPro ? '50' : '5'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${isPro ? Math.min((subscriptionStatus.monthlyUsage.leads / 50) * 100, 100) : Math.min((subscriptionStatus.monthlyUsage.leads / 5) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Recordings</span>
                <span className="text-sm text-muted-foreground">
                  {subscriptionStatus.monthlyUsage.recordings} / {isPro ? '20' : '3'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${isPro ? Math.min((subscriptionStatus.monthlyUsage.recordings / 20) * 100, 100) : Math.min((subscriptionStatus.monthlyUsage.recordings / 3) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Images</span>
                <span className="text-sm text-muted-foreground">
                  {subscriptionStatus.monthlyUsage.images} / {isPro ? '30' : '2'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ 
                    width: `${isPro ? Math.min((subscriptionStatus.monthlyUsage.images / 30) * 100, 100) : Math.min((subscriptionStatus.monthlyUsage.images / 2) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Videos</span>
                <span className="text-sm text-muted-foreground">
                  {subscriptionStatus.monthlyUsage.videos} / {isPro ? '20' : '1'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ 
                    width: `${isPro ? Math.min((subscriptionStatus.monthlyUsage.videos / 20) * 100, 100) : Math.min((subscriptionStatus.monthlyUsage.videos / 1) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One-Time Credits */}
      <Card>
        <CardHeader>
          <CardTitle>One-Time Credits</CardTitle>
          <CardDescription>
            Credits that can be used for premium features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {subscriptionStatus.oneTimeCredits.leads}
              </div>
              <div className="text-sm text-muted-foreground">Lead Credits</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {subscriptionStatus.oneTimeCredits.recordings}
              </div>
              <div className="text-sm text-muted-foreground">Recording Credits</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {subscriptionStatus.oneTimeCredits.images}
              </div>
              <div className="text-sm text-muted-foreground">Image Credits</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {subscriptionStatus.oneTimeCredits.videos}
              </div>
              <div className="text-sm text-muted-foreground">Video Credits</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 