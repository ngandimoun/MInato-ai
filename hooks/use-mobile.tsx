//hooks/use-mobile.tsx

"use client";

import { useState, useEffect } from "react";
import { useMediaQuery } from './use-media-query';

/**
 * Hook to detect if the current device is a mobile device
 * @returns boolean indicating if the device is mobile
 */
export function useMobile(): boolean {
  // Use media query to detect mobile viewport
  const isMobileViewport = useMediaQuery('(max-width: 768px)');
  
  // State to track touch capability
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  
  // Effect to detect touch capability on client side
  useEffect(() => {
    const hasTouchCapability = 
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 || 
      (navigator as any).msMaxTouchPoints > 0;
    
    setIsTouchDevice(hasTouchCapability);
  }, []);
  
  // Consider a device mobile if it has a mobile viewport OR touch capability
  return isMobileViewport || isTouchDevice;
}
