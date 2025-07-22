import React from 'react';
import { useAuth } from '@/context/auth-provider';
import { useUserQuotas } from '@/hooks/use-subscription';
import { Alert } from '@mui/material';

interface ListeningLimitGuardProps {
  children: React.ReactNode;
}

export function ListeningLimitGuard({ children }: ListeningLimitGuardProps) {
  const { profile, isFetchingProfile } = useAuth();
  // TODO: Strong typing for user profile (add plan_type and trial_recordings_remaining to UserProfile)
  const typedProfile = profile as any;
  const { recordings, images, videos, loading, recordingsLimit } = useUserQuotas();

  const renderRecordingInfo = () => {
    if (isFetchingProfile) {
      return <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><span className="loader h-3 w-3 animate-spin inline-block" /> Loading quota...</div>;
    }
    if (!typedProfile) return null;
    const isPro = typedProfile.plan_type === 'PRO';
    const trialRecordingsRemaining = typedProfile.trial_recordings_remaining ?? 0;

    if (isPro && recordings <= 0) {
      return (
        <div>
          <Alert severity="error">You have reached your monthly listening recordings limit for your Pro plan. Please wait until next month or upgrade your plan if available.</Alert>
          <div style={{marginTop:8}}>
            <b>Quotas left this month:</b><br/>
            Images: {images} / 30<br/>
            Videos: {videos} / 20<br/>
            Recordings: {recordings} / 20
          </div>
        </div>
      );
    }
    if (typedProfile.plan_type === 'PRO') {
      return <div className="text-xs text-green-600 mt-1">Recordings remaining: {recordings} / {recordingsLimit}</div>;
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