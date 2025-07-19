'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Crown, Sparkles, ArrowRight, Users, Video, Image, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MINATO_PRO_FEATURES } from '@/lib/constants';
import { logger } from '@/memory-framework/config';

export function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentIntentId = searchParams.get('payment_intent');
    const returnUrl = searchParams.get('return_url');
    
    if (sessionId || paymentIntentId) {
      // Simulate loading user data
      setTimeout(() => {
        setUserData({
          plan: 'PRO',
          features: [
            MINATO_PRO_FEATURES.core.title,
            MINATO_PRO_FEATURES.creation.title,
            MINATO_PRO_FEATURES.premium.title
          ]
        });
        setIsLoading(false);
      }, 1000);
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleContinue = () => {
    const returnUrl = searchParams.get('return_url');
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.push('/dashboard');
    }
  };

  const handleExploreFeatures = () => {
    const returnUrl = searchParams.get('return_url');
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.push('/creation-hub');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-green-950 dark:via-emerald-950 dark:to-teal-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-green-600">Setting up your Pro account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 dark:from-green-950 dark:via-emerald-950 dark:to-teal-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-green-900 dark:text-green-100 mb-4">
              Welcome to Minato Pro! 🎉
            </h1>
            <p className="text-xl text-green-700 dark:text-green-300">
              Your subscription has been activated successfully
            </p>
          </div>

          {/* Pro Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Unlimited AI Chat
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Chat without limits with advanced AI and persistent memory
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Creation Hub
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Generate leads, images, and videos with AI-powered tools
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-green-200 dark:border-green-800">
              <CardContent className="p-6 text-center">
                <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Premium Features
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Multiplayer games, recordings, and priority support
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold text-green-600">∞</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">AI Chats</div>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold text-purple-600">30</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Images/Month</div>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold text-blue-600">20</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Videos/Month</div>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold text-orange-600">24/7</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Support</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleContinue}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <Crown className="w-5 h-5 mr-2" />
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button
              onClick={handleExploreFeatures}
              variant="outline"
              className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-200"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Explore Features
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center mt-8">
            <p className="text-sm text-green-600 dark:text-green-400">
              You'll receive a confirmation email shortly. Need help? Contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 