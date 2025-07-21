import React from 'react';
import { useAuth } from '@/context/auth-provider';

interface ListeningLimitGuardProps {
  children: React.ReactNode;
}

export function ListeningLimitGuard({ children }: ListeningLimitGuardProps) {
  const { profile, isFetchingProfile } = useAuth();
  // TODO: Strong typing for user profile (add plan_type and trial_recordings_remaining to UserProfile)
  const typedProfile = profile as any;

  const renderRecordingInfo = () => {
    if (isFetchingProfile) {
      return <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><span className="loader h-3 w-3 animate-spin inline-block" /> Loading quota...</div>;
    }
    if (!typedProfile) return null;
    if (typedProfile.plan_type === 'PRO') {
      return <div className="text-xs text-green-600 mt-1">Recordings remaining: unlimited</div>;
    }
    if (typedProfile.plan_type === 'FREE_TRIAL') {
      return <div className="text-xs text-orange-600 mt-1">Recordings remaining: {typedProfile.trial_recordings_remaining ?? 0} / 5</div>;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center">
      {children}
      {renderRecordingInfo()}
    </div>
  );
} 