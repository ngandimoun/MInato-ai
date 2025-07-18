// FILE: components/examples/SubscriptionExample.tsx
'use client'
import React from 'react';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Users, Mic, Image, Video, Zap } from 'lucide-react';

export const SubscriptionExample: React.FC = () => {
  const { 
    handleSubscriptionError, 
    isUpgradeModalOpen, 
    subscriptionError, 
    handleUpgrade, 
    closeUpgradeModal 
  } = useSubscriptionGuard();

  const handleFeatureClick = async (feature: string, apiEndpoint: string) => {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw error;
      }

      const data = await response.json();
      console.log('Feature accessed successfully:', data);
    } catch (error: any) {
      // Gérer les erreurs d'abonnement automatiquement
      if (!handleSubscriptionError(error)) {
        // Si ce n'est pas une erreur d'abonnement, gérer normalement
        console.error('API Error:', error);
      }
    }
  };

  const features = [
    {
      name: 'Multiplayer Mode',
      description: 'Play with friends in real-time',
      icon: <Users className="w-5 h-5" />,
      endpoint: '/api/games/multiplayer',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'Create Recording',
      description: 'Record and analyze audio',
      icon: <Mic className="w-5 h-5" />,
      endpoint: '/api/recordings',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'Generate Image',
      description: 'Create AI-generated images',
      icon: <Image className="w-5 h-5" />,
      endpoint: '/api/images/generate',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      name: 'Analyze Video',
      description: 'Process videos with AI',
      icon: <Video className="w-5 h-5" />,
      endpoint: '/api/video/analyze',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      name: 'Custom Persona',
      description: 'Create personalized AI personas',
      icon: <Zap className="w-5 h-5" />,
      endpoint: '/api/personas/custom',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Minato Pro Features</h1>
        <p className="text-gray-600">
          Test the subscription protection system. Try accessing these features to see the upgrade modal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold">{feature.name}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>
            
            <Button
              onClick={() => handleFeatureClick(feature.name, feature.endpoint)}
              className={`w-full text-white ${feature.color}`}
            >
              Try {feature.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Modal d'upgrade */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onUpgrade={handleUpgrade}
        feature={subscriptionError?.feature || 'Premium Feature'}
        reason={subscriptionError?.code}
        currentUsage={subscriptionError?.currentUsage}
        maxQuota={subscriptionError?.maxQuota}
      />

      {/* Section d'information */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Click on any feature to test the subscription protection</li>
          <li>• If you don't have Pro access, the upgrade modal will appear</li>
          <li>• The modal shows different content based on the error type</li>
          <li>• Quota exceeded errors show current usage vs limits</li>
          <li>• Trial expired errors prompt for upgrade</li>
        </ul>
      </div>
    </div>
  );
}; 