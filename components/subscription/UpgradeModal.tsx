// FILE: components/subscription/UpgradeModal.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, Video, Image, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/memory-framework/config';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature?: string;
  reason?: 'quota_exceeded' | 'feature_blocked' | 'manual';
}

export function UpgradeModal({ isOpen, onClose, onUpgrade, feature, reason }: UpgradeModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    // Get current page URL to redirect back after payment
    const currentUrl = window.location.href;
    const returnUrl = encodeURIComponent(currentUrl);
    
    // Redirect to custom checkout page with return URL
    window.location.href = `/subscription/checkout?return_url=${returnUrl}`;
  };

  const getFeatureIcon = (featureName: string) => {
    switch (featureName?.toLowerCase()) {
      case 'multiplayer':
        return <Users className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'leads':
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getFeatureMessage = () => {
    if (reason === 'quota_exceeded' && feature) {
      return `You've reached your ${feature} limit for this month.`;
    }
    if (reason === 'feature_blocked' && feature) {
      return `${feature} is only available for Minato Pro subscribers.`;
    }
    return "Unlock unlimited access to all Minato features.";
  };

  const features = [
    {
      icon: <Users className="w-5 h-5 text-blue-500" />,
      title: "Multiplayer Games",
      description: "Create and join multiplayer gaming sessions"
    },
    {
      icon: <Image className="w-5 h-5 text-purple-500" />,
      title: "30 Images/Month",
      description: "Generate high-quality AI images"
    },
    {
      icon: <Video className="w-5 h-5 text-green-500" />,
      title: "20 Videos/Month",
      description: "Create stunning AI videos"
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-orange-500" />,
      title: "50 Leads/Month",
      description: "Generate business leads with AI"
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: "20 Recordings/Month",
      description: "Record and analyze conversations"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Upgrade to Minato Pro
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {getFeatureMessage()}
          </p>
          {feature && (
            <Badge variant="secondary" className="mb-4">
              {getFeatureIcon(feature)}
              <span className="ml-2">{feature}</span>
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="border-2 border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Free Trial</CardTitle>
              <CardDescription>7-day trial period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>2 Images</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>1 Video</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>5 Leads</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>3 Recordings</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Check className="w-4 h-4 text-gray-400 mr-2" />
                  <span>No Multiplayer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Minato Pro</CardTitle>
                <Badge className="bg-yellow-500 text-white">$25/month</Badge>
              </div>
              <CardDescription>Unlimited access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>30 Images</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>20 Videos</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>50 Leads</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>20 Recordings</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>Multiplayer Games</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white">What's included:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {feature.icon}
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{feature.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <div className="flex items-center">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro - $25/month
              </div>
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Maybe Later
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cancel anytime. No commitment required.
          </p>
        </div>
      </div>
    </div>
  );
} 