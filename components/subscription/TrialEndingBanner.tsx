'use client';

import { useState } from 'react';
import { X, AlertTriangle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProPlanModal } from '@/components/ui/pro-plan-modal';

interface TrialEndingBannerProps {
  daysRemaining: number;
  hoursRemaining?: number;
}

export function TrialEndingBanner({ daysRemaining, hoursRemaining }: TrialEndingBannerProps) {
  const [showProPlanModal, setShowProPlanModal] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleUpgradeClick = () => {
    setShowProPlanModal(true);
  };

  const handleProPlanClose = () => {
    setShowProPlanModal(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const formatTimeRemaining = () => {
    if (daysRemaining > 0) {
      return `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`;
    } else if (hoursRemaining && hoursRemaining > 0) {
      return `${hoursRemaining} heure${hoursRemaining > 1 ? 's' : ''}`;
    }
    return 'moins d\'une heure';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  ⚠️ Votre essai gratuit se termine dans {formatTimeRemaining()}. Passez à Pro pour ne pas perdre l'accès.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleUpgradeClick}
                size="sm"
                className="bg-white text-orange-600 hover:bg-gray-100 font-medium"
              >
                <Crown className="w-4 h-4 mr-1" />
                Passer à Pro
              </Button>
              
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProPlanModal 
        isOpen={showProPlanModal} 
        onClose={handleProPlanClose}
      />
    </>
  );
} 