// FILE: hooks/use-credits-purchase.tsx
import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-provider';
import { CreditsPurchaseModal } from '@/components/subscription/CreditsPurchaseModal';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/memory-framework/config';
import { User } from '@/lib/types';

interface UseCreditsPurchaseProps {
  feature: 'images' | 'videos' | 'recordings' | 'leads';
  currentUsage: number;
  limit: number;
  subscriptionEndDate?: string;
}

export function useCreditsPurchase({ 
  feature, 
  currentUsage, 
  limit, 
  subscriptionEndDate 
}: UseCreditsPurchaseProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openPurchaseModal = useCallback(() => {
    if (!user || !profile) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase credits.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que l'utilisateur a un abonnement Pro
    // Note: plan_type peut être dans le profile ou dans user selon la structure
    const planType = (profile as any).plan_type || (user as any).plan_type;
    if (planType !== 'PRO') {
      toast({
        title: "Pro Subscription Required",
        description: "You need a Pro subscription to purchase additional credits.",
        variant: "destructive",
      });
      return;
    }

    setIsModalOpen(true);
  }, [user, toast]);

  const closePurchaseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const CreditsPurchaseModalComponent = useCallback(() => {
    return (
      <CreditsPurchaseModal
        isOpen={isModalOpen}
        onClose={closePurchaseModal}
        feature={feature}
        currentUsage={currentUsage}
        limit={limit}
        subscriptionEndDate={subscriptionEndDate}
      />
    );
  }, [isModalOpen, closePurchaseModal, feature, currentUsage, limit, subscriptionEndDate]);

  return {
    openPurchaseModal,
    closePurchaseModal,
    CreditsPurchaseModalComponent,
    isModalOpen
  };
} 