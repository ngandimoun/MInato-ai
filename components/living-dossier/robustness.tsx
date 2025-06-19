import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { ErrorBoundary } from 'react-error-boundary';
import { 
  dossierColors as colors, 
  spacing, 
  typography, 
  borderRadius 
} from './design-system';

// Design system object for easier reference
const designSystem = {
  colors: {
    ...colors,
    error: colors.error,
    errorLight: 'hsla(0, 91%, 63%, 0.1)',
    warning: colors.warning,
    warningLight: 'hsla(45, 93%, 47%, 0.1)',
    success: colors.success,
    primary: colors.primary,
    white: '#ffffff',
    textDark: 'hsl(220, 20%, 20%)',
    textLight: 'hsl(220, 15%, 40%)',
    disabled: 'hsl(220, 10%, 70%)',
    borderLight: 'hsl(220, 15%, 90%)'
  },
  spacing,
  typography: {
    ...typography,
    sizes: typography.fontSize
  },
  borderRadius
};

/**
 * ErrorFallback - Component displayed when an error occurs
 */
export const ErrorFallback = ({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        padding: designSystem.spacing.lg,
        backgroundColor: designSystem.colors.errorLight,
        borderRadius: designSystem.borderRadius.md,
        border: `1px solid ${designSystem.colors.error}`,
        marginBottom: designSystem.spacing.md,
      }}
    >
      <h3 style={{ color: designSystem.colors.error, marginTop: 0 }}>
        Something went wrong
      </h3>
      <p style={{ color: designSystem.colors.textDark }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetErrorBoundary}
        style={{
          backgroundColor: designSystem.colors.error,
          color: designSystem.colors.white,
          border: 'none',
          padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
          borderRadius: designSystem.borderRadius.sm,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </motion.div>
  );
};

/**
 * OfflineIndicator - Shows when the user is offline
 */
export const OfflineIndicator = () => {
  const { online } = useNetworkStatus();
  
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          style={{
            backgroundColor: designSystem.colors.warningLight,
            borderBottom: `1px solid ${designSystem.colors.warning}`,
            padding: designSystem.spacing.sm,
            textAlign: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <span style={{ color: designSystem.colors.warning, fontWeight: 500 }}>
            You are currently offline. Some features may be limited.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * RetryMechanism - Component for retrying failed operations
 */
export const RetryMechanism = ({ 
  onRetry, 
  maxRetries = 3, 
  initialDelay = 1000 
}: { 
  onRetry: () => Promise<void>; 
  maxRetries?: number; 
  initialDelay?: number;
}) => {
  const [retries, setRetries] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleRetry = async () => {
    if (retries >= maxRetries || isRetrying) return;
    
    setIsRetrying(true);
    const delay = initialDelay * Math.pow(2, retries); // Exponential backoff
    
    // Show countdown
    for (let i = Math.floor(delay / 1000); i >= 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    try {
      await onRetry();
      // Reset on successful retry
      setRetries(0);
    } catch (error) {
      setRetries(prev => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div style={{ margin: designSystem.spacing.md }}>
      {retries < maxRetries ? (
        <div>
          <p style={{ color: designSystem.colors.textDark }}>
            {isRetrying 
              ? `Retrying in ${countdown} seconds...` 
              : 'Unable to complete the operation.'}
          </p>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            style={{
              backgroundColor: isRetrying ? designSystem.colors.disabled : designSystem.colors.primary,
              color: designSystem.colors.white,
              border: 'none',
              padding: `${designSystem.spacing.xs} ${designSystem.spacing.md}`,
              borderRadius: designSystem.borderRadius.sm,
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              opacity: isRetrying ? 0.7 : 1,
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry Now'}
          </button>
        </div>
      ) : (
        <div style={{ color: designSystem.colors.error }}>
          <p>Maximum retry attempts reached. Please try again later.</p>
        </div>
      )}
    </div>
  );
};

/**
 * DataSyncStatus - Shows the sync status of offline data
 */
export const DataSyncStatus = ({ 
  pendingSyncs = 0, 
  lastSyncTime = null 
}: { 
  pendingSyncs?: number; 
  lastSyncTime?: string | null;
}) => {
  return (
    <div 
      style={{ 
        display: 'flex',
        alignItems: 'center',
        padding: designSystem.spacing.xs,
        fontSize: designSystem.typography.sizes.sm,
        color: pendingSyncs > 0 ? designSystem.colors.warning : designSystem.colors.success,
      }}
    >
      <div 
        style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          backgroundColor: pendingSyncs > 0 ? designSystem.colors.warning : designSystem.colors.success,
          marginRight: designSystem.spacing.xs,
        }} 
      />
      {pendingSyncs > 0 ? (
        <span>{pendingSyncs} update{pendingSyncs !== 1 ? 's' : ''} pending sync</span>
      ) : (
        <span>
          {lastSyncTime 
            ? `All data synced (${new Date(lastSyncTime).toLocaleTimeString()})` 
            : 'All data synced'}
        </span>
      )}
    </div>
  );
};

/**
 * AutosaveIndicator - Shows autosave status
 */
export const AutosaveIndicator = ({ 
  status = 'saved', 
  lastSaved = null 
}: { 
  status?: 'saving' | 'saved' | 'error'; 
  lastSaved?: string | null;
}) => {
  return (
    <div 
      style={{ 
        fontSize: designSystem.typography.sizes.sm,
        color: status === 'saving' 
          ? designSystem.colors.textLight 
          : status === 'error' 
            ? designSystem.colors.error 
            : designSystem.colors.textLight,
        display: 'flex',
        alignItems: 'center',
        gap: designSystem.spacing.xs,
      }}
    >
      {status === 'saving' && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: 12,
            height: 12,
            border: `2px solid ${designSystem.colors.borderLight}`,
            borderTopColor: designSystem.colors.primary,
            borderRadius: '50%',
          }}
        />
      )}
      {status === 'saved' && lastSaved && (
        <>
          <span style={{ color: designSystem.colors.success }}>✓</span>
          <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <span>!</span>
          <span>Failed to save</span>
        </>
      )}
    </div>
  );
};

/**
 * ConnectionQualityIndicator - Shows network connection quality
 */
export const ConnectionQualityIndicator = () => {
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [latency, setLatency] = useState<number | null>(null);
  
  // Simulate checking connection quality
  useEffect(() => {
    const checkConnection = async () => {
      const start = Date.now();
      try {
        // This would be replaced with a real ping to your server
        await fetch('/api/ping', { cache: 'no-store' });
        const end = Date.now();
        const pingTime = end - start;
        setLatency(pingTime);
        
        if (pingTime < 200) {
          setQuality('good');
        } else if (pingTime < 500) {
          setQuality('fair');
        } else {
          setQuality('poor');
        }
      } catch (error) {
        setQuality('poor');
        setLatency(null);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const getColor = () => {
    switch (quality) {
      case 'good': return designSystem.colors.success;
      case 'fair': return designSystem.colors.warning;
      case 'poor': return designSystem.colors.error;
      default: return designSystem.colors.textLight;
    }
  };
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: designSystem.spacing.xs }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        <div style={{ 
          width: 3, 
          height: 6, 
          backgroundColor: quality !== 'poor' ? getColor() : designSystem.colors.borderLight,
          borderRadius: 1 
        }} />
        <div style={{ 
          width: 3, 
          height: 9, 
          backgroundColor: quality === 'good' ? getColor() : designSystem.colors.borderLight,
          borderRadius: 1 
        }} />
        <div style={{ 
          width: 3, 
          height: 12, 
          backgroundColor: quality === 'good' ? getColor() : designSystem.colors.borderLight,
          borderRadius: 1 
        }} />
      </div>
      {latency && <span style={{ fontSize: designSystem.typography.sizes.xs, color: designSystem.colors.textLight }}>{latency}ms</span>}
    </div>
  );
};

/**
 * Create a hook for offline data management
 */
export const useOfflineData = <T,>(key: string, initialData: T = [] as unknown as T) => {
  const [data, setData] = useState<T>(initialData);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const { online } = useNetworkStatus();
  
  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(`offline_${key}`);
      if (storedData) {
        setData(JSON.parse(storedData));
      }
      
      const pendingActions = localStorage.getItem(`pending_${key}`);
      if (pendingActions) {
        setPendingSyncs(JSON.parse(pendingActions).length);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  }, [key]);
  
  // Sync data when online
  useEffect(() => {
    if (online && pendingSyncs > 0) {
      const syncData = async () => {
        try {
          const pendingActions = JSON.parse(localStorage.getItem(`pending_${key}`) || '[]');
          
          // Process each pending action
          for (const action of pendingActions) {
            // This would be replaced with actual API calls
            // await fetch(`/api/${key}`, {
            //   method: action.method,
            //   body: JSON.stringify(action.data),
            // });
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Clear pending actions
          localStorage.removeItem(`pending_${key}`);
          setPendingSyncs(0);
          setLastSyncTime(new Date().toISOString());
        } catch (error) {
          console.error('Error syncing data:', error);
        }
      };
      
      syncData();
    }
  }, [online, pendingSyncs, key]);
  
  const updateData = (newData: T, method = 'POST') => {
    setData(newData);
    localStorage.setItem(`offline_${key}`, JSON.stringify(newData));
    
    // If offline, store the action to sync later
    if (!online) {
      const pendingActions = JSON.parse(localStorage.getItem(`pending_${key}`) || '[]');
      pendingActions.push({
        method,
        data: newData,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(`pending_${key}`, JSON.stringify(pendingActions));
      setPendingSyncs(pendingActions.length);
    } else {
      // If online, update the sync time
      setLastSyncTime(new Date().toISOString());
    }
  };
  
  return { data, updateData, pendingSyncs, lastSyncTime };
};
