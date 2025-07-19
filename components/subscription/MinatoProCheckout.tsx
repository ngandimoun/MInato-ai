'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Check, Crown, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/memory-framework/config';
import { STRIPE_CONFIG, MINATO_PRO_FEATURES } from '@/lib/constants';
import { useAuth } from '@/context/auth-provider';

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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to create checkout session');
  }

  return data.clientSecret;
};

function CheckoutForm({ onSuccess, onCancel, returnUrl }: MinatoProCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Calculate pricing - monthly only
  const monthlyPrice = STRIPE_CONFIG.MINATO_PRO_PRICE_CENTS / 100;

  useEffect(() => {
    // Pre-fill email from user context or localStorage
    const userEmail = user?.email || localStorage.getItem('userEmail') || '';
    setEmail(userEmail);
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error("Payment System Error", {
        description: "Payment system is not ready. Please refresh the page and try again.",
      });
      return;
    }

    if (!email.trim()) {
      toast.error("Email Required", {
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/payment-success?payment_intent={PAYMENT_INTENT_ID}&return_url=${encodeURIComponent(window.location.href)}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Handle specific error types
        if (error.type === 'card_error' || error.type === 'validation_error') {
          toast.error("Payment Error", {
            description: error.message || "Please check your payment information and try again.",
          });
        } else {
          toast.error("Payment Failed", {
            description: "An unexpected error occurred. Please try again or contact support.",
          });
        }
        logger.error('[MinatoProCheckout] Payment error:', error);
      } else {
        // Payment successful
        toast.success("Payment Successful!", {
          description: "Welcome to Minato Pro! You'll be redirected shortly.",
        });

        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = returnUrl || `${window.location.origin}/payment-success?return_url=${encodeURIComponent(window.location.href)}`;
        }, 2000);
      }
    } catch (error: any) {
      logger.error('[MinatoProCheckout] Payment error:', error);
      toast.error("Payment Error", {
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => {
              // Show cancellation toast
              toast.info("Payment Cancelled", {
                description: "You can upgrade to Minato Pro anytime from your account settings.",
              });

              // Get the return URL from the current page URL or use onCancel
              const urlParams = new URLSearchParams(window.location.search);
              const returnUrl = urlParams.get('return_url');

              if (returnUrl) {
                window.location.href = returnUrl;
              } else if (onCancel) {
                onCancel();
              } else {
                window.location.href = '/subscription';
              }
            }}
            className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Minato
          </button>
        </div>

        {/* Two Column Layout - Exactly like Stripe */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">

          {/* Left Column - Product Details (Stripe Style) */}
          <div className="space-y-6">
            {/* Company Logo and Name */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-900 via-red-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                湊
              </div>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">Minato ai</span>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Subscription Minato Pro</h3>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">${monthlyPrice.toFixed(2)}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">per month</p>
            </div>

            {/* Plan Features */}
            <div className="space-y-6">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Minato Pro includes:</h4>

              {/* Core Features */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{MINATO_PRO_FEATURES.core.title}</h5>
                <div className="space-y-2">
                  {MINATO_PRO_FEATURES.core.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Creation Hub */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{MINATO_PRO_FEATURES.creation.title}</h5>
                <div className="space-y-2">
                  {MINATO_PRO_FEATURES.creation.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Premium Features */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">{MINATO_PRO_FEATURES.premium.title}</h5>
                <div className="space-y-2">
                  {MINATO_PRO_FEATURES.premium.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p>• Cancel anytime from your account</p>
                <p>• Secure payment processing</p>
              </div>
            </div>
          </div>

          {/* Right Column - Payment Form (Stripe Style) */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Pay with card</h2>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>

                {/* Payment Method Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment method</h3>

                  {/* Stripe Elements Container */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Card information
                      </label>
                      <div className="border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 p-3">
                        <PaymentElement
                          options={{
                            layout: 'tabs',
                            fields: {
                              billingDetails: {
                                name: 'auto',
                                email: 'never',
                                phone: 'never',
                                address: 'never'
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pay Button - Stripe Style */}
                <Button
                  type="submit"
                  disabled={!stripe || isLoading || isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isProcessing ? 'Processing...' : 'Loading...'}
                    </div>
                  ) : (
                    'Pay'
                  )}
                </Button>
              </form>

              {/* Stripe Branding */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-6">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.831 3.47 1.426 3.47 2.338 0 .914-.796 1.431-2.127 1.431-1.72 0-4.516-.924-6.378-2.168l-.9 5.555C6.203 22.99 8.977 24 12.165 24c2.469 0 4.565-.624 6.041-1.708 1.564-1.146 2.348-2.95 2.348-5.158 0-4.162-2.554-5.898-6.578-6.984z" />
                  </svg>
                  <span>Powered by Stripe</span>
                </div>
                <div className="flex space-x-4">
                  <a 
                    href="https://stripe.com/legal/end-users" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Terms
                  </a>
                  <a 
                    href="https://stripe.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Privacy
                  </a>
                  <a 
                    href="https://support.stripe.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MinatoProCheckout(props: MinatoProCheckoutProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('[MinatoProCheckout] Component mounting...');

    // Pre-fill email from user context or localStorage
    const userEmail = user?.email || localStorage.getItem('userEmail') || '';
    console.log('[MinatoProCheckout] User email:', userEmail);
    setEmail(userEmail);

    // Fetch client secret
    if (userEmail) {
      fetchClientSecret(userEmail, props.returnUrl)
        .then(secret => {
          console.log('[MinatoProCheckout] Client secret fetched successfully');
          setClientSecret(secret);
          setIsLoading(false);
          setError(null);
        })
        .catch(error => {
          console.error('[MinatoProCheckout] Error fetching client secret:', error);
          setError(error instanceof Error ? error.message : 'Failed to fetch client secret');
          setIsLoading(false);
        });
    } else {
      setError('Email is required to proceed with checkout');
      setIsLoading(false);
    }
  }, [props.returnUrl, user]);

  console.log('[MinatoProCheckout] Rendering with email:', email, 'loading:', isLoading, 'error:', error, 'clientSecret:', !!clientSecret);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600 dark:text-slate-400">Loading Minato Pro checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-lg mx-auto p-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* Security Icon */}
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Secure Subscription Setup
            </h2>

            {/* Security Message */}
            <div className="space-y-4 mb-8">
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                You're about to set up a secure subscription with Minato Pro. Your payment information will be processed securely through Stripe, the world's leading payment platform.
              </p>

              {/* Security Features */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                  🔒 Your Security is Guaranteed
                </h3>
                <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                  <li>• Bank-level encryption (256-bit SSL)</li>
                  <li>• PCI DSS Level 1 compliance</li>
                  <li>• No card data stored on our servers</li>
                  <li>• Cancel anytime from your account</li>
                  <li>• 7-day free trial included</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setRetryCount(prev => prev + 1);
                  setIsLoading(true);
                  setError(null);
                  // Retry fetching client secret
                  if (email) {
                    fetchClientSecret(email, props.returnUrl)
                      .then(secret => {
                        setClientSecret(secret);
                        setIsLoading(false);
                      })
                      .catch(error => {
                        setError(error instanceof Error ? error.message : 'Failed to fetch client secret');
                        setIsLoading(false);
                      });
                  }
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 font-semibold transform hover:scale-105"
              >
                Continue Securely
              </button>

              <button
                onClick={() => {
                  // Show cancellation toast
                  toast.info("Returning to Previous Page", {
                    description: "Redirecting you back to where you came from.",
                  });

                  const urlParams = new URLSearchParams(window.location.search);
                  const returnUrl = urlParams.get('return_url');

                  if (returnUrl) {
                    window.location.href = returnUrl;
                  } else {
                    window.location.href = '/subscription';
                  }
                }}
                className="w-full px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-semibold"
              >
                Back to Previous Page
              </button>
            </div>

            {/* Stripe Badge */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.831 3.47 1.426 3.47 2.338 0 .914-.796 1.431-2.127 1.431-1.72 0-4.516-.924-6.378-2.168l-.9 5.555C6.203 22.99 8.977 24 12.165 24c2.469 0 4.565-.624 6.041-1.708 1.564-1.146 2.348-2.95 2.348-5.158 0-4.162-2.554-5.898-6.578-6.984z" />
                </svg>
                <span>Powered by Stripe • Secure Payment Processing</span>
              </div>
              <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
                <a 
                  href="https://stripe.com/legal/end-users" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Terms
                </a>
                <a 
                  href="https://stripe.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Privacy
                </a>
                <a 
                  href="https://stripe.com/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Docs
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Payment System Unavailable</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Unable to initialize payment system. Please check your Stripe configuration or try again later.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
              >
                Refresh Page
              </button>

              <button
                onClick={() => {
                  // Show cancellation toast
                  toast.info("Returning to Previous Page", {
                    description: "Redirecting you back to where you came from.",
                  });

                  const urlParams = new URLSearchParams(window.location.search);
                  const returnUrl = urlParams.get('return_url');

                  if (returnUrl) {
                    window.location.href = returnUrl;
                  } else {
                    window.location.href = '/subscription';
                  }
                }}
                className="w-full px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-semibold"
              >
                Back to Minato
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3b82f6',
          },
        },
      }}
    >
      <CheckoutForm {...props} />
    </Elements>
  );
} 