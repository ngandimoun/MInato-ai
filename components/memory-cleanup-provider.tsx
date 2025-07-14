"use client";

import { useEffect, useRef } from "react";
import { MemoryMonitor } from "@/utils/memory-utils";

interface MemoryCleanupProviderProps {
  children: React.ReactNode;
}

export function MemoryCleanupProvider({ children }: MemoryCleanupProviderProps) {
  const memoryMonitor = useRef<MemoryMonitor>(MemoryMonitor.getInstance());

  useEffect(() => {
    const monitor = memoryMonitor.current;
    
    // Log memory stats in development
    if (process.env.NODE_ENV === 'development') {
      const logInterval = setInterval(() => {
        monitor.logMemoryStats();
      }, 30000); // Log every 30 seconds
      
      // Clean up log interval
      return () => clearInterval(logInterval);
    }
  }, []);

  useEffect(() => {
    const monitor = memoryMonitor.current;
    
    // Global cleanup on unmount
    return () => {
      monitor.cleanup();
      console.log('🧹 Global memory cleanup completed');
    };
  }, []);

  // Handle page visibility change to trigger cleanup when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Trigger garbage collection hint if available
        if (typeof window !== 'undefined' && (window as any).gc) {
          (window as any).gc();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <>{children}</>;
} 