// FILE: components/creation-hub/CreditsPurchaseButton.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditsPurchaseModal } from '@/components/subscription/CreditsPurchaseModal';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Zap, Crown } from 'lucide-react';
import { User } from '@/lib/types';
import { logger } from '@/memory-framework/config';

interface CreditsPurchaseButtonProps {
  feature: 'images' | 'videos' | 'recordings' | 'leads';
  currentUsage: number;
  limit: number;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function CreditsPurchaseButton({
  feature,
  currentUsage,
  limit,
  variant = 'default',
  size = 'default',
  className = '',
  children
}: CreditsPurchaseButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch subscription data from database
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data.user);
        }
      } catch (error) {
        logger.error('[CreditsPurchaseButton] Error fetching subscription data:', error);
      }
    };

    fetchSubscriptionData();
  }, [user]);

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase credits.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que l'utilisateur a un abonnement Pro
    if (subscriptionData?.plan_type !== 'PRO') {
      toast({
        title: "Pro Subscription Required",
        description: "You need a Pro subscription to purchase additional credits.",
        variant: "destructive",
      });
      return;
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const getFeatureName = () => {
    switch (feature) {
      case 'images':
        return 'Images';
      case 'videos':
        return 'Vidéos';
      case 'recordings':
        return 'Recordings';
      case 'leads':
        return 'Leads';
      default:
        return 'Crédits';
    }
  };

  const getFeatureIcon = () => {
    switch (feature) {
      case 'images':
        return '🖼️';
      case 'videos':
        return '🎥';
      case 'recordings':
        return '🎤';
      case 'leads':
        return '👥';
      default:
        return '⚡';
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`${className} bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white`}
      >
        {children || (
          <>
            <Crown className="w-4 h-4 mr-2" />
            Acheter des crédits {getFeatureName()}
          </>
        )}
      </Button>

      <CreditsPurchaseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        feature={feature}
        currentUsage={currentUsage}
        limit={limit}
        subscriptionEndDate={subscriptionData?.subscription_end_date}
      />
    </>
  );
} 