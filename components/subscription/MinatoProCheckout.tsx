'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutProvider, PaymentElement, useCheckout } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, Video, Image, MessageSquare, ArrowLeft, Star, Shield, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/memory-framework/config';
import { STRIPE_CONFIG, MINATO_PRO_FEATURES } from '@/lib/constants';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface MinatoProCheckoutProps {
  onSuccess?: (sessionId: string) => void;
  onCancel?: () => void;
  returnUrl?: string;
}

// Fetch client secret function
const fetchClientSecret = async (email: string, returnUrl?: string) => {
  const response = await fetch('/api/subscription/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      annualBilling: false, // Monthly billing only
      returnUrl,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  const data = await response.json();
  return data.clientSecret;
};

function CheckoutForm({ onSuccess, onCancel, returnUrl }: MinatoProCheckoutProps) {
  const checkout = useCheckout();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  // Calculate pricing - monthly only
  const monthlyPrice = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS / 100;

  useEffect(() => {
    // Pre-fill email if available
    const userEmail = localStorage.getItem('userEmail') || '';
    setEmail(userEmail);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!checkout) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await checkout.confirm();

      if (result.type === 'error') {
        toast({
          title: "Payment Failed",
          description: result.error.message || "An error occurred during payment",
          variant: "destructive",
        });
      } else {
        // Payment successful - will be handled by webhook
        toast({
          title: "Payment Processing!",
          description: "Your payment is being processed. You'll be redirected shortly.",
        });
        
        if (onSuccess) {
          onSuccess(result.session?.id || '');
        }
      }
    } catch (error: any) {
      logger.error('[MinatoProCheckout] Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const featureCategories = [
    {
      title: MINATO_PRO_FEATURES.core.title,
      icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
      gradient: "from-blue-500 to-cyan-500",
      features: MINATO_PRO_FEATURES.core.features.map(feature => ({
        ...feature,
        icon: feature.title.includes("Chat") ? <Sparkles className="w-4 h-4" /> : <Clock className="w-4 h-4" />
      }))
    },
    {
      title: MINATO_PRO_FEATURES.creation.title,
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      gradient: "from-purple-500 to-pink-500",
      features: MINATO_PRO_FEATURES.creation.features.map(feature => ({
        ...feature,
        icon: feature.title.includes("Lead") ? <Users className="w-4 h-4" /> : 
              feature.title.includes("Images") ? <Image className="w-4 h-4" /> : 
              <Video className="w-4 h-4" />
      }))
    },
    {
      title: MINATO_PRO_FEATURES.premium.title,
      icon: <Crown className="w-5 h-5 text-yellow-500" />,
      gradient: "from-yellow-500 to-orange-500",
      features: MINATO_PRO_FEATURES.premium.features.map(feature => ({
        ...feature,
        icon: feature.title.includes("Games") ? <Users className="w-4 h-4" /> : 
              feature.title.includes("Recording") ? <Video className="w-4 h-4" /> : 
              <Shield className="w-4 h-4" />
      }))
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* Left Section - Subscription Details */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center mb-8">
              <button
                onClick={onCancel}
                className="mr-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Subscribe to Minato Pro
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Unlock the full Minato experience
                </p>
              </div>
            </div>

            {/* Pricing Card */}
            <Card className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 border-0 shadow-lg mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      ${monthlyPrice.toFixed(2)}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      per month
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1">
                    Monthly
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="space-y-8">
              <h3 className="font-bold text-2xl text-slate-900 dark:text-white">
                What's included:
              </h3>
              <div className="space-y-8">
                {featureCategories.map((category, index) => (
                  <div key={index} className="space-y-4">
                    {/* Category Header */}
                    <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-600">
                      <div className={`w-10 h-10 bg-gradient-to-r ${category.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        {category.icon}
                      </div>
                      <h4 className="font-bold text-xl text-slate-900 dark:text-white">{category.title}</h4>
                    </div>
                    
                    {/* Category Features */}
                    <div className="space-y-4 pl-4">
                      {category.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-semibold text-slate-900 dark:text-white">{feature.title}</p>
                              <div className="text-slate-400">
                                {feature.icon}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-600">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${monthlyPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Tax</span>
                  <span className="text-slate-900 dark:text-white">$0.00</span>
                </div>
                <div className="flex justify-between font-bold text-xl pt-3 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-slate-900 dark:text-white">Total due today</span>
                  <span className="text-slate-900 dark:text-white">
                    ${monthlyPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Payment Form */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Contact Information */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Contact information</h3>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-200"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Payment method</h3>
                <div className="border border-slate-300 dark:border-slate-600 rounded-xl p-4 bg-white dark:bg-slate-700">
                  <PaymentElement 
                    options={{
                      layout: 'tabs',
                      defaultValues: {
                        billingDetails: {
                          email: email
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Subscribe Button */}
              <Button
                type="submit"
                disabled={!checkout || isLoading}
                className="w-full bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white py-4 text-lg font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Crown className="w-5 h-5 mr-2" />
                    Subscribe to Minato Pro
                  </div>
                )}
              </Button>

              {/* Security & Trust */}
              <div className="flex items-center justify-center space-x-6 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Secure payment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Cancel anytime</span>
                </div>
              </div>

              {/* Terms */}
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                By subscribing, you authorize Minato to charge you according to the terms until you cancel.
              </p>

              {/* Stripe Branding */}
              <div className="flex items-center justify-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                <span>Powered by Stripe</span>
                <a href="#" className="hover:underline hover:text-slate-700 dark:hover:text-slate-300">Terms</a>
                <a href="#" className="hover:underline hover:text-slate-700 dark:hover:text-slate-300">Privacy</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MinatoProCheckout(props: MinatoProCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Pre-fill email if available
    const userEmail = localStorage.getItem('userEmail') || '';
    setEmail(userEmail);
  }, []);

  const fetchClientSecretFunction = async () => {
    if (!email) return null;
    return await fetchClientSecret(email, props.returnUrl);
  };

  return (
    <CheckoutProvider 
      stripe={stripePromise} 
      options={{ 
        fetchClientSecret: fetchClientSecretFunction
      }}
    >
      <CheckoutForm {...props} />
    </CheckoutProvider>
  );
} 