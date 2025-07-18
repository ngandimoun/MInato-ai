// FILE: components/examples/MultiplayerExample.tsx
'use client'
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Gamepad2 } from 'lucide-react';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

export const MultiplayerExample: React.FC = () => {
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const { handleSubscriptionError, isUpgradeModalOpen, subscriptionError, handleUpgrade, closeUpgradeModal } = useSubscriptionGuard();

  const handleCreateMultiplayerRoom = async () => {
    setIsCreatingRoom(true);
    
    try {
      // Simuler un appel API pour créer une salle multijoueur
      const response = await fetch('/api/games/create-multiplayer-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameType: 'quiz',
          maxPlayers: 4,
          isPrivate: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Gérer les erreurs d'abonnement automatiquement
        if (handleSubscriptionError(error)) {
          return; // L'erreur a été gérée par le modal
        }
        
        throw new Error(error.message || 'Failed to create multiplayer room');
      }

      const result = await response.json();
      console.log('Multiplayer room created:', result);
      
    } catch (error: any) {
      console.error('Error creating multiplayer room:', error);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinMultiplayerRoom = async (roomId: string) => {
    try {
      // Simuler un appel API pour rejoindre une salle multijoueur
      const response = await fetch(`/api/games/join-multiplayer-room/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Gérer les erreurs d'abonnement automatiquement
        if (handleSubscriptionError(error)) {
          return; // L'erreur a été gérée par le modal
        }
        
        throw new Error(error.message || 'Failed to join multiplayer room');
      }

      const result = await response.json();
      console.log('Joined multiplayer room:', result);
      
    } catch (error: any) {
      console.error('Error joining multiplayer room:', error);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Mode Multijoueur</h3>
        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white flex items-center gap-1">
          <Crown className="w-3 h-3" />
          PRO
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Débloquez le Multijoueur avec Minato Pro 👑</h4>
              <p className="text-sm text-blue-700">
                Invitez vos amis et défiez-les. Le mode multijoueur est une exclusivité du plan Pro.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleCreateMultiplayerRoom}
            disabled={isCreatingRoom}
            className="w-full"
            variant="outline"
          >
            <Gamepad2 className="w-4 h-4 mr-2" />
            {isCreatingRoom ? 'Création...' : 'Créer une Salle'}
          </Button>

          <Button 
            onClick={() => handleJoinMultiplayerRoom('demo-room-123')}
            className="w-full"
            variant="outline"
          >
            <Users className="w-4 h-4 mr-2" />
            Rejoindre une Salle
          </Button>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            💡 <strong>Conseil :</strong> Pendant l'essai gratuit, vous pouvez jouer en solo. 
            Passez à Pro pour débloquer le mode multijoueur et défier vos amis !
          </p>
        </div>

        <Button 
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
        >
          <Crown className="w-4 h-4 mr-2" />
          Passer à Minato Pro
        </Button>
      </div>

      {/* Modal de mise à niveau */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        onUpgrade={handleUpgrade}
        feature={subscriptionError?.feature || 'Multiplayer Mode'}
        reason={subscriptionError?.code}
        currentUsage={subscriptionError?.currentUsage}
        maxQuota={subscriptionError?.maxQuota}
      />
    </div>
  );
}; 