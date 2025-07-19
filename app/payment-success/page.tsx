'use client';

import { Suspense } from 'react';
import { PaymentSuccess } from '@/components/subscription/PaymentSuccess';

function PaymentSuccessContent() {
  return <PaymentSuccess />;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-green-950 dark:via-emerald-950 dark:to-teal-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
} 