"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavigationLoading } from "@/components/ui/navigation-loading";

interface NavigationContextType {
  isNavigating: boolean;
  setNavigating: (loading: boolean, message?: string) => void;
  navigateWithLoading: (path: string, message?: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const router = useRouter();

  const setNavigating = useCallback((loading: boolean, message?: string) => {
    setIsNavigating(loading);
    if (message) {
      setLoadingMessage(message);
    }
  }, []);

  const navigateWithLoading = useCallback((path: string, message?: string) => {
    setNavigating(true, message);
    router.push(path);
    
    // Auto-hide loading after a reasonable timeout
    setTimeout(() => {
      setNavigating(false);
    }, 2000);
  }, [router, setNavigating]);

  // Hide loading when the component unmounts or path changes
  useEffect(() => {
    const handleRouteChange = () => {
      setNavigating(false);
    };

    // Listen for route changes (Next.js 13+ app router)
    window.addEventListener('beforeunload', handleRouteChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
    };
  }, [setNavigating]);

  // Hide loading when page becomes visible (handles navigation completion)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
          setNavigating(false);
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setNavigating]);

  return (
    <NavigationContext.Provider value={{ isNavigating, setNavigating, navigateWithLoading }}>
      {children}
      <NavigationLoading isLoading={isNavigating} message={loadingMessage} />
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
} 