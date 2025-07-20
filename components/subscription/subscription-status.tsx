import React from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Clock, AlertTriangle } from 'lucide-react';

export function SubscriptionStatus() {
  const { subscriptionStatus, loading } = useSubscription();

  if (loading || !subscriptionStatus) {
    return null;
  }

  const getStatusInfo = () => {
    if (subscriptionStatus.is_expired) {
      return {
        label: 'Expired',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        action: 'Renew',
      };
    }

    if (subscriptionStatus.is_trial) {
      return {
        label: `Free`,
        variant: 'secondary' as const,
        icon: Clock,
        action: 'Upgrade to Pro',
      };
    }

    if (subscriptionStatus.is_pro) {
      return {
        label: `Pro`,
        variant: 'default' as const,
        icon: Crown,
        action: 'Renew',
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  const Icon = statusInfo.icon;

  const handleAction = () => {
    // Open Pro modal
    window.dispatchEvent(new CustomEvent('open-pro-modal'));
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
      
      {/* {(subscriptionStatus.is_trial || subscriptionStatus.is_expired) && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAction}
          className="text-[7px] h-7"
        >
        </Button>
      )} */}
    </div>
  );
} 