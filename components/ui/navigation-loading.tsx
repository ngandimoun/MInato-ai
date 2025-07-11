import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface NavigationLoadingProps {
  isLoading: boolean;
  message?: string;
}

export function NavigationLoading({ isLoading, message = "Loading..." }: NavigationLoadingProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
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