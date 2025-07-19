'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, Video, Image, MessageSquare, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/memory-framework/config';
import { STRIPE_CONFIG, MINATO_PRO_FEATURES } from '@/lib/constants';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface ProSubscriptionCheckoutProps {
  onSuccess?: (sessionId: string) => void;
  onCancel?: () => void;
  returnUrl?: string;
}

// Custom card element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      iconColor: '#6772e5',
    },
    invalid: {
      iconColor: '#ef4444',
      color: '#ef4444',
    },
  },
};

function CheckoutForm({ onSuccess, onCancel, returnUrl }: ProSubscriptionCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [saveInfo, setSaveInfo] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);

  // Calculate pricing
  const monthlyPrice = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS / 100;
  const annualPrice = monthlyPrice * 12 * 0.8; // 20% discount
  const savings = (monthlyPrice * 12) - annualPrice;

  useEffect(() => {
    // Pre-fill email if available
    const userEmail = localStorage.getItem('userEmail') || '';
    setEmail(userEmail);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // Create payment intent
      const response = await fetch('/api/subscription/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          annualBilling,
          returnUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm payment
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/subscription?success=true`,
          payment_method_data: {
            billing_details: {
              email,
            },
          },
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment",
          variant: "destructive",
        });
      } else {
        // Payment successful - will be handled by webhook
        toast({
          title: "Payment Processing!",
          description: "Your payment is being processed. You'll be redirected shortly.",
        });
      }
    } catch (error: any) {
      logger.error('[ProSubscriptionCheckout] Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use features from constants for better maintainability
  const featureCategories = [
    {
      title: MINATO_PRO_FEATURES.core.title,
      icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
      features: MINATO_PRO_FEATURES.core.features
    },
    {
      title: MINATO_PRO_FEATURES.creation.title,
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      features: MINATO_PRO_FEATURES.creation.features
    },
    {
      title: MINATO_PRO_FEATURES.premium.title,
      icon: <Crown className="w-5 h-5 text-yellow-500" />,
      features: MINATO_PRO_FEATURES.premium.features
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Left Section - Subscription Details */}
          <div className="bg-gray-900 text-white rounded-2xl p-8">
            {/* Header */}
            <div className="flex items-center mb-8">
              <button
                onClick={onCancel}
                className="mr-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Subscribe to Minato Pro</h1>
            </div>

            {/* Pricing */}
            <div className="mb-8">
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold">
                  ${annualBilling ? (annualPrice / 12).toFixed(2) : monthlyPrice.toFixed(2)}
                </span>
                <span className="text-gray-400 ml-2">per month</span>
              </div>
              
              {/* Annual Billing Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-6">
                <div>
                  <div className="font-medium">Annual billing</div>
                  <div className="text-sm text-gray-400">
                    Save ${savings.toFixed(0)} with annual billing
                  </div>
                </div>
                <button
                  onClick={() => setAnnualBilling(!annualBilling)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    annualBilling ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      annualBilling ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Plan Card */}
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Minato Pro</CardTitle>
                      <CardDescription className="text-gray-400">
                        Unlock the full Minato experience
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      ${annualBilling ? (annualPrice / 12).toFixed(2) : monthlyPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {annualBilling ? 'billed annually' : 'billed monthly'}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Features */}
            <div className="space-y-6">
              <h3 className="font-semibold text-xl">What's included:</h3>
              <div className="space-y-6">
                {featureCategories.map((category, index) => (
                  <div key={index} className="space-y-3">
                    {/* Category Header */}
                    <div className="flex items-center space-x-3 pb-2 border-b border-gray-700">
                      {category.icon}
                      <h4 className="font-semibold text-lg text-white">{category.title}</h4>
                    </div>
                    
                    {/* Category Features */}
                    <div className="space-y-3 pl-8">
                      {category.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <p className="font-medium text-sm text-white">{feature.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span>${annualBilling ? annualPrice.toFixed(2) : monthlyPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-700">
                  <span>Total due today</span>
                  <span>${annualBilling ? annualPrice.toFixed(2) : monthlyPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Payment Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact information</h3>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment method</h3>
                <div className="border border-gray-300 rounded-lg p-4">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>

              {/* Save Information */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="saveInfo"
                  checked={saveInfo}
                  onChange={(e) => setSaveInfo(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="saveInfo" className="font-medium">
                    Save my information for faster checkout
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Pay faster on Minato and everywhere Link is accepted.
                  </p>
                </div>
              </div>

              {/* Subscribe Button */}
              <Button
                type="submit"
                disabled={!stripe || isLoading}
                className="w-full bg-black hover:bg-gray-800 text-white py-4 text-lg font-semibold rounded-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Subscribe'
                )}
              </Button>

              {/* Terms */}
              <p className="text-xs text-gray-600 text-center">
                By subscribing, you authorize Minato to charge you according to the terms until you cancel.
              </p>

              {/* Stripe Branding */}
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                <span>Powered by Stripe</span>
                <a href="#" className="hover:underline">Terms</a>
                <a href="#" className="hover:underline">Privacy</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProSubscriptionCheckout(props: ProSubscriptionCheckoutProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
} 