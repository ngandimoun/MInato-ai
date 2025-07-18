// FILE: components/subscription/CreditsPurchaseModal.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Users, Video, Image, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/memory-framework/config';

interface CreditsPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'images' | 'videos' | 'recordings' | 'leads';
  currentUsage: number;
  limit: number;
  subscriptionEndDate?: string | null;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceId: string;
  popular?: boolean;
  savings?: string;
}

const CREDIT_PACKS: Record<string, CreditPack[]> = {
  images: [
    {
      id: 'images-15',
      name: 'Pack Images',
      credits: 15,
      price: 15,
      priceId: 'price_images_15',
      popular: true
    },
    {
      id: 'images-30',
      name: 'Pack Images Plus',
      credits: 30,
      price: 25,
      priceId: 'price_images_30',
      savings: '17%'
    },
    {
      id: 'images-50',
      name: 'Pack Images Pro',
      credits: 50,
      price: 35,
      priceId: 'price_images_50',
      savings: '30%'
    }
  ],
  videos: [
    {
      id: 'videos-10',
      name: 'Pack Vidéos',
      credits: 10,
      price: 15,
      priceId: 'price_videos_10',
      popular: true
    },
    {
      id: 'videos-20',
      name: 'Pack Vidéos Plus',
      credits: 20,
      price: 25,
      priceId: 'price_videos_20',
      savings: '17%'
    },
    {
      id: 'videos-35',
      name: 'Pack Vidéos Pro',
      credits: 35,
      price: 35,
      priceId: 'price_videos_35',
      savings: '30%'
    }
  ],
  recordings: [
    {
      id: 'recordings-10',
      name: 'Pack Recordings',
      credits: 10,
      price: 15,
      priceId: 'price_recordings_10',
      popular: true
    },
    {
      id: 'recordings-20',
      name: 'Pack Recordings Plus',
      credits: 20,
      price: 25,
      priceId: 'price_recordings_20',
      savings: '17%'
    },
    {
      id: 'recordings-35',
      name: 'Pack Recordings Pro',
      credits: 35,
      price: 35,
      priceId: 'price_recordings_35',
      savings: '30%'
    }
  ],
  leads: [
    {
      id: 'leads-10',
      name: 'Pack Leads',
      credits: 10,
      price: 15,
      priceId: 'price_leads_10',
      popular: true
    },
    {
      id: 'leads-20',
      name: 'Pack Leads Plus',
      credits: 20,
      price: 25,
      priceId: 'price_leads_20',
      savings: '17%'
    },
    {
      id: 'leads-35',
      name: 'Pack Leads Pro',
      credits: 35,
      price: 35,
      priceId: 'price_leads_35',
      savings: '30%'
    }
  ],
};

export function CreditsPurchaseModal({ 
  isOpen, 
  onClose, 
  feature, 
  currentUsage, 
  limit,
  subscriptionEndDate 
}: CreditsPurchaseModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);

  if (!isOpen) return null;

  const availablePacks = CREDIT_PACKS[feature] || [];
  const featureName = {
    images: 'Images',
    videos: 'Vidéos',
    recordings: 'Recordings',
    leads: 'Leads'
  }[feature];

  const getFeatureIcon = () => {
    switch (feature) {
      case 'images':
        return <Image className="w-5 h-5" />;
      case 'videos':
        return <Video className="w-5 h-5" />;
      case 'recordings':
        return <MessageSquare className="w-5 h-5" />;
      case 'leads':
        return <Users className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const handlePurchase = async (pack: CreditPack) => {
    setIsLoading(true);
    setSelectedPack(pack);
    
    try {
      const response = await fetch('/api/subscription/purchase-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creditType: feature,
          packId: pack.id,
          priceId: pack.priceId,
          credits: pack.credits,
          amount: pack.price
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create purchase session');
      }

      const data = await response.json();
      
      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
      
    } catch (error: any) {
      logger.error('[CreditsPurchaseModal] Error creating purchase session:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to start purchase process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedPack(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {getFeatureIcon()}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Acheter des crédits {featureName}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Vous avez utilisé {currentUsage}/{limit} {featureName} ce mois-ci
          </p>
          {subscriptionEndDate && (
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-4">
              <Clock className="w-4 h-4" />
              <span>Crédits valides jusqu'au {formatDate(subscriptionEndDate)}</span>
            </div>
          )}
          <Badge variant="secondary" className="mb-4">
            {getFeatureIcon()}
            <span className="ml-2">{featureName}</span>
          </Badge>
        </div>

        {/* Warning about subscription expiration */}
        {subscriptionEndDate && new Date(subscriptionEndDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                  Attention : Abonnement expirant bientôt
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Votre abonnement Pro expire le {formatDate(subscriptionEndDate)}. 
                  Les crédits achetés ne seront valides que jusqu'à cette date.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Credit Packs */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {availablePacks.map((pack) => (
            <Card 
              key={pack.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedPack?.id === pack.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'hover:border-blue-300 dark:hover:border-blue-600'
              }`}
              onClick={() => setSelectedPack(pack)}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                    Populaire
                  </Badge>
                </div>
              )}
              {pack.savings && (
                <div className="absolute -top-2 -right-2">
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    -{pack.savings}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{pack.name}</CardTitle>
                <CardDescription>{pack.credits} crédits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    ${pack.price}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    ${(pack.price / pack.credits).toFixed(2)} par crédit
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span>{pack.credits} {featureName} supplémentaires</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span>Valide jusqu'à l'expiration de l'abonnement</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span>Paiement unique</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Purchase Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => selectedPack && handlePurchase(selectedPack)}
            disabled={isLoading || !selectedPack}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Traitement...
              </div>
            ) : (
              <div className="flex items-center">
                <Crown className="w-4 h-4 mr-2" />
                {selectedPack 
                  ? `Acheter ${selectedPack.name} - $${selectedPack.price}`
                  : 'Sélectionnez un pack'
                }
              </div>
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Annuler
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paiement sécurisé via Stripe. Annulation possible à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
} 