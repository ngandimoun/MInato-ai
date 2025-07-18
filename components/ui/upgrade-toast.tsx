"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeToastProps {
  isVisible: boolean;
  onUpgrade: () => void;
  onClose: () => void;
  message?: string;
  className?: string;
}

export function UpgradeToast({ 
  isVisible, 
  onUpgrade, 
  onClose, 
  message = "This feature requires a Pro plan",
  className 
}: UpgradeToastProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm",
        className
      )}
    >
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-lg p-4 shadow-2xl border border-purple-500/30 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Pro Feature Unlocked
            </h4>
            <p className="text-xs text-white/90 mb-3 leading-relaxed">
              {message}
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={onUpgrade}
                size="sm"
                className="bg-white text-purple-600 hover:bg-white/90 text-xs font-medium px-3 py-1.5 h-auto shadow-lg"
              >
                <Zap className="w-3 h-3 mr-1" />
                Upgrade Now
              </Button>
              
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10 text-xs px-3 py-1.5 h-auto"
              >
                Maybe Later
              </Button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
} 