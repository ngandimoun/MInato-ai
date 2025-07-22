import React from 'react';
import { useAuth } from '@/context/auth-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { useUserQuotas } from '@/hooks/use-subscription';
import { MINATO_PLANS } from '@/lib/constants';

interface ListeningLimitGuardProps {
  children: React.ReactNode;
}

export function ListeningLimitGuard({ children }: ListeningLimitGuardProps) {
  const { profile, isFetchingProfile } = useAuth();
  // TODO: Strong typing for user profile (add plan_type and trial_recordings_remaining to UserProfile)
  const typedProfile = profile as any;
  const { quotas, hasReachedRecordingLimit } = useUserQuotas();
  
  // Add null checks before accessing plan_type
  const isFree = typedProfile?.plan_type === 'FREE';
  const isPro = typedProfile?.plan_type === 'PRO';
  
  // Calculate remaining quota based on plan
  const recordingsUsed = quotas.recordings.used;
  const recordingsLimit = quotas.recordings.limit;
  const recordingsRemaining = quotas.recordings.remaining;

  const renderRecordingInfo = () => {
    if (isFetchingProfile) {
      return <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><span className="loader h-3 w-3 animate-spin inline-block" /> Loading quota...</div>;
    }
    if (!typedProfile) return null;
    
    const isPro = typedProfile.plan_type === 'PRO';
    const isFree = typedProfile.plan_type === 'FREE';

    // Check if user has reached their recording limit
    if (recordingsRemaining <= 0) {
      if (isPro) {
        return (
          <div className="mt-2 space-y-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have reached your monthly listening recordings limit for your Pro plan (20 recordings). Please wait until next month or contact support for additional quota.
              </AlertDescription>
            </Alert>
            <div className="text-xs p-2 bg-muted rounded border">
              <b>Quotas left this month:</b><br/>
              Images: {quotas.images.remaining} / {MINATO_PLANS.PRO.limits.images}<br/>
              Videos: {quotas.videos.remaining} / {MINATO_PLANS.PRO.limits.videos}<br/>
              Recordings: {recordingsRemaining} / {MINATO_PLANS.PRO.limits.recordings}
            </div>
          </div>
        );
      } else if (isFree) {
        return (
          <div className="mt-2 space-y-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have reached your recording limit for the Free plan (5 recordings). Upgrade to Pro for 20 recordings per month plus unlimited image and video generation.
              </AlertDescription>
            </Alert>
            <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
              <b>🎉 Upgrade to Pro Plan ($25/month)</b><br/>
              ✅ 20 recordings per month<br/>
              ✅ 30 image generations<br/>
              ✅ 20 video generations<br/>
              ✅ Multiplayer AI games<br/>
              ✅ Everything from Free plan
            </div>
          </div>
        );
      }
    }

    // Display current quota status
    if (isPro) {
      return <div className="text-xs text-green-600 mt-1">Pro Plan - Recordings used: {recordingsUsed} / {MINATO_PLANS.PRO.limits.recordings}</div>;
    } else if (isFree) {
      return <div className="text-xs text-blue-600 mt-1">Free Plan - Recordings used: {recordingsUsed} / {MINATO_PLANS.FREE.limits.recordings}</div>;
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