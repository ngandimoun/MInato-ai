'use client';

import { useTrialAlerts } from '@/hooks/useTrialAlerts';
import { TrialEndingBanner } from './TrialEndingBanner';
import { TrialExpiredModal } from './TrialExpiredModal';
import { TrialExpiredOverlay } from './TrialExpiredOverlay';

interface TrialAlertsProviderProps {
  children: React.ReactNode;
}

export function TrialAlertsProvider({ children }: TrialAlertsProviderProps) {
  const {
    showTrialEndingBanner,
    showTrialExpiredModal,
    daysRemaining,
    hoursRemaining,
    closeTrialEndingBanner,
    closeTrialExpiredModal
  } = useTrialAlerts();

  return (
    <>
      {/* Bannière d'alerte de fin d'essai */}
      {showTrialEndingBanner && (
        <TrialEndingBanner
          daysRemaining={daysRemaining}
          hoursRemaining={hoursRemaining}
        />
      )}

      {/* Modale d'expiration d'essai */}
      <TrialExpiredModal
        isOpen={showTrialExpiredModal}
        onClose={closeTrialExpiredModal}
      />

      {/* Overlay de blocage quand l'essai a expiré */}
      <TrialExpiredOverlay>
        {children}
      </TrialExpiredOverlay>
    </>
  );
} 