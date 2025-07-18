// FILE: components/examples/LeadsGenerationExample.tsx
'use client'
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Crown } from 'lucide-react';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

interface UsageInfo {
  current: number;
  max: number;
}

export const LeadsGenerationExample: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [usage, setUsage] = useState<UsageInfo>({ current: 3, max: 5 }); // Exemple: 3/5 utilisés (limite Free Trial)
  const { handleSubscriptionError, isUpgradeModalOpen, subscriptionError, handleUpgrade, closeUpgradeModal } = useSubscriptionGuard();

  const handleGenerateLeads = async () => {
    setIsGenerating(true);
    
    try {
      // Simuler un appel API pour générer des leads
      const response = await fetch('/api/generate-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: 'technology',
          location: 'United States',
          count: 5
        })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Gérer les erreurs d'abonnement automatiquement
        if (handleSubscriptionError(error)) {
          return; // L'erreur a été gérée par le modal
        }
        
        throw new Error(error.message || 'Failed to generate leads');
      }

      const result = await response.json();
      console.log('Leads generated:', result);
      
      // Mettre à jour l'utilisation (simulation)
      setUsage(prev => ({ ...prev, current: prev.current + 1 }));
      
    } catch (error: any) {
      console.error('Error generating leads:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const usagePercentage = (usage.current / usage.max) * 100;
  const isQuotaExceeded = usage.current >= usage.max;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Génération de Leads</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {usage.current}/{usage.max}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-3">
            Pendant l'essai gratuit de 7 jours, vous avez accès à {usage.max} requêtes de leads.
            Passez à Minato Pro pour 50 leads par mois.
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Utilisation ce mois</span>
              <span className="font-medium">{usage.current} / {usage.max}</span>
            </div>
            <Progress 
              value={usagePercentage} 
              className="h-2"
              style={{
                '--progress-background': usagePercentage > 80 ? '#ef4444' : '#3b82f6'
              } as React.CSSProperties}
            />
            {usagePercentage > 80 && (
              <p className="text-xs text-red-600">
                ⚠️ Vous approchez de votre limite
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={handleGenerateLeads}
          disabled={isGenerating || isQuotaExceeded}
          className="w-full"
          variant={isQuotaExceeded ? "outline" : "default"}
        >
          <Zap className="w-4 h-4 mr-2" />
          {isGenerating ? 'Génération...' : 
           isQuotaExceeded ? 'Limite atteinte' : 'Générer des Leads'}
        </Button>

        {isQuotaExceeded && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Vous avez atteint votre limite de {usage.max} leads. 
              <Button 
                variant="link" 
                className="p-0 h-auto text-yellow-800 underline"
                onClick={handleUpgrade}
              >
                Passez à Pro pour un accès illimité
              </Button>
            </p>
          </div>
        )}
      </div>

      {/* Modal de mise à niveau */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onUpgrade={handleUpgrade}
        feature={subscriptionError?.feature || 'leads'}
        reason={subscriptionError?.code}
        currentUsage={subscriptionError?.currentUsage}
        maxQuota={subscriptionError?.maxQuota}
      />
    </div>
  );
}; 