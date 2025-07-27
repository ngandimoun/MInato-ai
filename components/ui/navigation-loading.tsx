import React from "react";
import { motion } from "framer-motion";

interface NavigationLoadingProps {
  isLoading: boolean;
  message?: string;
}

export function NavigationLoading({ isLoading, message = "Loading..." }: NavigationLoadingProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 4 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary via-blue-500 to-purple-500 shadow-lg"
    >
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ 
          duration: 1.5, 
          ease: [0.4, 0.0, 0.2, 1] // Custom easing for smooth progression
        }}
        className="h-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
        style={{
          boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)"
        }}
      />
    </motion.div>
  );
}

// Simple loading skeleton for page content
export function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </div>
      <div className="h-32 bg-muted rounded"></div>
    </div>
  );
} 