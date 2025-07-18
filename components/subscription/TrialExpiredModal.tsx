'use client';

import { useState } from 'react';
import { X, AlertTriangle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProPlanModal } from '@/components/ui/pro-plan-modal';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrialExpiredModal({ isOpen, onClose }: TrialExpiredModalProps) {
  const [showProPlanModal, setShowProPlanModal] = useState(false);

  const handleUpgradeClick = () => {
    setShowProPlanModal(true);
  };

  const handleProPlanClose = () => {
    setShowProPlanModal(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Votre essai gratuit a expiré
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Pour continuer à utiliser Minato et accéder à votre historique, veuillez passer au plan Pro.
            </p>
            
            <Button 
              onClick={handleUpgradeClick}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3"
            >
              <Crown className="w-4 h-4 mr-2" />
              S'abonner à Minato Pro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProPlanModal 
        isOpen={showProPlanModal} 
        onClose={handleProPlanClose}
      />
    </>
  );
} 