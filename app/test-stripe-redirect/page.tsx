'use client';

import React from 'react';
import { MinatoProCheckout } from '@/components/subscription/MinatoProCheckout';

export default function TestStripeRedirectPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Test Stripe Redirect
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          This page tests the Stripe redirect system with return URL handling.
        </p>
        
        <MinatoProCheckout 
          returnUrl={window.location.href}
          onSuccess={(sessionId) => {
            console.log('Payment successful:', sessionId);
          }}
          onCancel={() => {
            console.log('Payment cancelled');
          }}
        />
      </div>
    </div>
  );
} 