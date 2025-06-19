"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

// Progress status type
export type ProgressStatus = "idle" | "loading" | "success" | "error" | "paused";

// Progress indicator props
interface ProgressIndicatorProps {
  status: ProgressStatus;
  progress?: number; // 0-100
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  pulseEffect?: boolean;
  label?: string;
  estimatedTimeRemaining?: number; // in seconds
}

// Animated progress bar
export function AnimatedProgressBar({
  progress = 0,
  status = "loading",
  showLabel = true,
  className,
  pulseEffect = true,
  label,
  estimatedTimeRemaining,
}: ProgressIndicatorProps) {
  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.ceil(seconds)}s remaining`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m remaining`;
    return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m remaining`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {showLabel && (
          <div className="text-sm font-medium">
            {label || (status === "loading" ? "Processing..." : status === "success" ? "Complete" : status === "error" ? "Error" : "Ready")}
          </div>
        )}
        {showLabel && progress > 0 && (
          <div className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </div>
        )}
      </div>
      
      <div className="relative h-2 w-full bg-muted overflow-hidden rounded-full">
        <motion.div
          className={cn(
            "absolute top-0 left-0 h-full rounded-full",
            status === "loading" && pulseEffect && "animate-pulse",
            status === "success" ? "bg-green-500" : 
            status === "error" ? "bg-red-500" : 
            "bg-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        />
      </div>
      
      {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && status === "loading" && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTimeRemaining(estimatedTimeRemaining)}</span>
        </div>
      )}
    </div>
  );
}

// Circular progress indicator
export function CircularProgress({
  progress = 0,
  status = "loading",
  size = "md",
  className,
  pulseEffect = true,
  showLabel = true,
}: ProgressIndicatorProps) {
  // Calculate size in pixels
  const sizeInPx = size === "sm" ? 32 : size === "md" ? 48 : 64;
  const strokeWidth = size === "sm" ? 3 : size === "md" ? 4 : 5;
  
  // Calculate circle properties
  const radius = (sizeInPx - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={sizeInPx}
        height={sizeInPx}
        viewBox={`0 0 ${sizeInPx} ${sizeInPx}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle
          cx={sizeInPx / 2}
          cy={sizeInPx / 2}
          r={radius}
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={sizeInPx / 2}
          cy={sizeInPx / 2}
          r={radius}
          stroke={
            status === "success" ? "var(--success)" : 
            status === "error" ? "var(--destructive)" : 
            "var(--primary)"
          }
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
          transform={`rotate(-90 ${sizeInPx / 2} ${sizeInPx / 2})`}
          className={cn(status === "loading" && pulseEffect && "animate-pulse")}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {status === "loading" ? (
          showLabel ? (
            <span className="text-xs font-medium">{Math.round(progress)}%</span>
          ) : (
            <Loader2 className={cn(
              "animate-spin",
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
            )} />
          )
        ) : status === "success" ? (
          <CheckCircle2 className={cn(
            "text-success",
            size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
          )} />
        ) : status === "error" ? (
          <AlertCircle className={cn(
            "text-destructive",
            size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5"
          )} />
        ) : (
          <span className="text-xs font-medium">{Math.round(progress)}%</span>
        )}
      </div>
    </div>
  );
}

// Step progress indicator
export function StepProgress({
  steps,
  currentStep,
  className,
}: {
  steps: {
    id: string;
    label: string;
    status: ProgressStatus;
    description?: string;
  }[];
  currentStep: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -translate-y-1/2" />
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step indicator */}
                <div className="relative z-10 flex items-center justify-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.2 : 1,
                      backgroundColor: 
                        step.status === "success" ? "var(--success)" :
                        step.status === "error" ? "var(--destructive)" :
                        isActive ? "var(--primary)" :
                        isCompleted ? "var(--primary)" : "var(--muted)"
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                      isActive && "ring-4 ring-primary/20"
                    )}
                  >
                    {step.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : step.status === "error" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : step.status === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </motion.div>
                </div>
                
                {/* Step label */}
                <div className="mt-2 text-center">
                  <div className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-1 max-w-[120px]">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Skeleton screen loader
export function SkeletonLoader({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div 
              className="h-4 bg-muted rounded animate-pulse" 
              style={{ width: `${Math.max(50, Math.random() * 100)}%` }}
            />
            <div 
              className="h-4 bg-muted rounded animate-pulse" 
              style={{ width: `${Math.max(30, Math.random() * 80)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
