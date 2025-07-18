import { useCallback } from 'react';
import { logger } from '@/memory-framework/config';

interface PermissionResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  maxQuota: number;
  planType?: string;
}

export const usePermissionCheck = () => {
  const checkPermission = useCallback(async (feature: 'leads' | 'recordings' | 'images' | 'videos'): Promise<PermissionResult> => {
    try {
      const response = await fetch('/api/subscription/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature })
      });

      if (!response.ok) {
        logger.warn(`[Permission Check] Failed to check permission for ${feature}`, { status: response.status });
        return {
          allowed: false,
          reason: 'feature_blocked',
          currentUsage: 0,
          maxQuota: 0
        };
      }

      const data = await response.json();
      logger.info(`[Permission Check] Permission check result for ${feature}`, {
        allowed: data.allowed,
        reason: data.reason,
        currentUsage: data.currentUsage,
        maxQuota: data.maxQuota,
        planType: data.planType
      });

      return {
        allowed: data.allowed,
        reason: data.reason,
        currentUsage: data.currentUsage || 0,
        maxQuota: data.maxQuota || 0,
        planType: data.planType
      };
    } catch (error) {
      logger.error(`[Permission Check] Error checking permission for ${feature}`, { error });
      return {
        allowed: false,
        reason: 'feature_blocked',
        currentUsage: 0,
        maxQuota: 0
      };
    }
  }, []);

  return {
    checkPermission
  };
}; 