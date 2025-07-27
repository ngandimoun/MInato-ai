// FILE: context/navigation-context.tsx

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
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
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setNavigating = useCallback((loading: boolean, message?: string) => {
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    setIsNavigating(loading);
    if (message) {
      setLoadingMessage(message);
    }
  }, []);

  const navigateWithLoading = useCallback((path: string, message?: string) => {
    // Only trigger navigation if we're going to a different path
    if (window.location.pathname !== path) {
      // Show loading for all navigation clicks
      setNavigating(true, message || "Navigating...");
      
      // Navigate to the new path
      router.push(path);
    }
  }, [router, setNavigating]);

  // Enhanced route change detection with better timing
  useEffect(() => {
    const handleRouteChange = () => {
      // Clear any existing timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      
      // Set a timeout that matches the loading bar duration
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        navigationTimeoutRef.current = null;
      }, 1500); // Match the duration of the loading bar animation
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
          navigationTimeoutRef.current = null;
        }
        setIsNavigating(false);
      }
    };

    // Listen for route changes and visibility changes
    window.addEventListener('popstate', handleRouteChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for Next.js navigation events
    const handleNavigationStart = () => {
      // Navigation started, ensure loading is visible
      setIsNavigating(true);
    };

    const handleNavigationComplete = () => {
      // Navigation completed, hide loading bar after animation
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        navigationTimeoutRef.current = null;
      }, 1500);
    };

    // Add event listeners for Next.js navigation events
    window.addEventListener('beforeunload', handleNavigationStart);
    
    // Listen for DOM changes that indicate page load completion
    const observer = new MutationObserver(() => {
      // If we're navigating and the DOM has changed significantly, 
      // it might indicate the page has loaded
      if (isNavigating) {
        handleNavigationComplete();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleNavigationStart);
      observer.disconnect();
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [isNavigating]);

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