// FILE: components/examples/ImageGenerationExample.tsx
'use client'
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image, Crown } from 'lucide-react';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

export const ImageGenerationExample: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { handleSubscriptionError, isUpgradeModalOpen, subscriptionError, handleUpgrade, closeUpgradeModal } = useSubscriptionGuard();

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    
    try {
      // Simuler un appel API pour générer une image
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A beautiful landscape',
          style: 'realistic'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Gérer les erreurs d'abonnement automatiquement
        if (handleSubscriptionError(error)) {
          return; // L'erreur a été gérée par le modal
        }
        
        throw new Error(error.message || 'Failed to generate image');
      }

      const result = await response.json();
      console.log('Image generated:', result);
      
    } catch (error: any) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Génération d'Images</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Crown className="w-3 h-3" />
          PRO
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Pendant l'essai gratuit de 7 jours, la génération d'images est bloquée.
            Passez à Minato Pro pour créer des images illimités.
          </p>
        </div>

        <Button 
          onClick={handleGenerateImage}
          disabled={isGenerating}
          className="w-full"
        >
          <Image className="w-4 h-4 mr-2" />
          {isGenerating ? 'Génération...' : 'Générer une Image'}
        </Button>
      </div>

      {/* Modal de mise à niveau */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onUpgrade={handleUpgrade}
        feature={subscriptionError?.feature || 'images'}
        reason={subscriptionError?.code}
        currentUsage={subscriptionError?.currentUsage}
        maxQuota={subscriptionError?.maxQuota}
      />
    </div>
  );
}; 