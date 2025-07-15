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
    // Only trigger navigation if we're going to a different path
    if (window.location.pathname !== path) {
      // Skip loading for specific paths: chat, memory, creation-hub, listening, games, settings
      const skipLoadingPaths = [
        "/chat", 
        "/chat?view=chat", 
        "/chat?view=memory", 
        "/chat?view=settings", 
        "/creation-hub", 
        "/listening", 
        "/games"
      ];
      
      const shouldShowLoading = !skipLoadingPaths.some(skipPath => 
        path === skipPath || path.startsWith(skipPath + "?")
      );
      
      if (shouldShowLoading) {
        setNavigating(true, message);
      }
      
      router.push(path);
    }
  }, [router, setNavigating]);

  // Enhanced route change detection
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const handleRouteChange = () => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set a shorter timeout for hiding loading state
      timeoutId = setTimeout(() => {
        setNavigating(false);
      }, 500);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setNavigating(false);
      }
    };

    // Listen for route changes and visibility changes
    window.addEventListener('popstate', handleRouteChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

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