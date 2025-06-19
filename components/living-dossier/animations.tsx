"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Fade transition component
export function FadeTransition({
  children,
  show = true,
  duration = 0.3,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  show?: boolean;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, delay }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Slide transition component
export function SlideTransition({
  children,
  show = true,
  direction = "right",
  duration = 0.3,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  show?: boolean;
  direction?: "up" | "down" | "left" | "right";
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const directionMap = {
    up: { y: -20 },
    down: { y: 20 },
    left: { x: -20 },
    right: { x: 20 },
  };

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0, ...directionMap[direction] }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...directionMap[direction] }}
          transition={{ duration, delay }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Staggered children animation
export function StaggeredChildren({
  children,
  staggerDelay = 0.05,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * staggerDelay }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

// Pulse animation component
export function PulseAnimation({
  children,
  pulse = true,
  duration = 2,
  className,
}: {
  children: React.ReactNode;
  pulse?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      animate={pulse ? {
        scale: [1, 1.03, 1],
        opacity: [1, 0.9, 1],
      } : {}}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Success animation
export function SuccessAnimation({
  show,
  onComplete,
  className,
}: {
  show: boolean;
  onComplete?: () => void;
  className?: string;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={cn("flex items-center justify-center", className)}
          onAnimationComplete={() => {
            // Animation has completed
          }}
        >
          <div className="relative">
            {/* Success checkmark */}
            <svg
              className="w-24 h-24"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke="var(--primary)"
                strokeWidth="8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
              <motion.path
                d="M30 50L45 65L70 35"
                stroke="var(--primary)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut", delay: 0.5 }}
              />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Loading spinner with animation
export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = 
    size === "sm" ? "w-5 h-5" : 
    size === "md" ? "w-8 h-8" : 
    "w-12 h-12";
  
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.div
        className={cn("border-4 border-muted rounded-full", sizeClass)}
        style={{ borderTopColor: "var(--primary)" }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

// Haptic feedback function (for mobile devices)
export function triggerHapticFeedback(type: "selection" | "success" | "warning" | "error") {
  if (!window.navigator.vibrate) return;
  
  switch (type) {
    case "selection":
      window.navigator.vibrate(10);
      break;
    case "success":
      window.navigator.vibrate([10, 30, 10]);
      break;
    case "warning":
      window.navigator.vibrate([30, 50, 30]);
      break;
    case "error":
      window.navigator.vibrate([50, 100, 50]);
      break;
  }
}

// Animation classes for common use
export const animationClasses = {
  fadeIn: "animate-fadeIn",
  fadeOut: "animate-fadeOut",
  slideIn: "animate-slideIn",
  slideOut: "animate-slideOut",
  pulse: "animate-pulse",
  spin: "animate-spin",
  bounce: "animate-bounce",
  scale: "animate-scale",
};

// Skeleton loading animation
export function SkeletonLoader({
  width,
  height,
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted animate-pulse rounded",
        className
      )}
      style={{
        width: width || "100%",
        height: height || "1rem",
      }}
    />
  );
}
