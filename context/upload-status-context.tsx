// FILE: context/upload-status-context.tsx
// (Content from finalcodebase.txt - verified)
"use client";

import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useRef } from "react";
import { logger } from "@/memory-framework/config";

interface UploadStatusContextType {
  fileJustUploaded: boolean;
  triggerUploadIndicator: () => void;
}
const UploadStatusContext = createContext<UploadStatusContextType | undefined>(undefined);

export const UploadStatusProvider = ({ children }: { children: ReactNode }) => {
  const [fileJustUploaded, setFileJustUploaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUploadIndicator = useCallback(() => {
    logger.debug("[UploadStatus] Triggering indicator.");
    setFileJustUploaded(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      logger.debug("[UploadStatus] Resetting indicator.");
      setFileJustUploaded(false);
    }, 3000); // Reset after 3 seconds
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => { return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);

  return (
    <UploadStatusContext.Provider value={{ fileJustUploaded, triggerUploadIndicator }}>
      {children}
    </UploadStatusContext.Provider>
  );
};

export const useUploadStatus = (): UploadStatusContextType => {
  const context = useContext(UploadStatusContext);
  if (context === undefined) throw new Error("useUploadStatus must be used within an UploadStatusProvider");
  return context;
};