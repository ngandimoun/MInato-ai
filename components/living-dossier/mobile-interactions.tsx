"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import { triggerHapticFeedback } from "./animations";

// Swipeable card component with actions
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActionLabel = "Archive",
  rightActionLabel = "Favorite",
  leftActionColor = "bg-amber-500",
  rightActionColor = "bg-blue-500",
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftActionLabel?: string;
  rightActionLabel?: string;
  leftActionColor?: string;
  rightActionColor?: string;
  className?: string;
  disabled?: boolean;
}) {
  const controls = useAnimation();
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const isMobile = useMobile();
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (disabled) return;
    
    if (info.offset.x < -threshold && onSwipeLeft) {
      controls.start({ x: "-100%", transition: { duration: 0.2 } });
      setDirection("left");
      triggerHapticFeedback("selection");
      setTimeout(() => {
        onSwipeLeft();
        controls.start({ x: 0 });
        setDirection(null);
      }, 200);
    } else if (info.offset.x > threshold && onSwipeRight) {
      controls.start({ x: "100%", transition: { duration: 0.2 } });
      setDirection("right");
      triggerHapticFeedback("selection");
      setTimeout(() => {
        onSwipeRight();
        controls.start({ x: 0 });
        setDirection(null);
      }, 200);
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } });
      setDirection(null);
    }
  };

  // Only enable swipe on mobile
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden touch-pan-y", className)}>
      {/* Background action indicators */}
      <div className="absolute inset-0 flex justify-between items-center px-4">
        <div className={cn("flex items-center justify-start h-full", leftActionColor)}>
          <span className="text-white font-medium px-4">{leftActionLabel}</span>
        </div>
        <div className={cn("flex items-center justify-end h-full", rightActionColor)}>
          <span className="text-white font-medium px-4">{rightActionLabel}</span>
        </div>
      </div>
      
      {/* Swipeable content */}
      <motion.div
        drag={!disabled ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative bg-background z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Touch-optimized button with haptic feedback
export function TouchButton({
  children,
  onClick,
  className,
  hapticType = "selection",
  disabled = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  hapticType?: "success" | "error" | "warning" | "selection";
}) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && onClick) {
      triggerHapticFeedback(hapticType);
      onClick(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// Pull to refresh component
export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const pullMoveY = useRef(0);
  const distanceThreshold = 80;
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only enable pull to refresh at the top of the page
    if (window.scrollY > 5) return;
    
    pullStartY.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    pullMoveY.current = e.touches[0].clientY - pullStartY.current;
    
    // Only allow pulling down, not up
    if (pullMoveY.current < 0) {
      setIsPulling(false);
      return;
    }
    
    // Apply resistance to the pull
    const pullDistance = Math.min(distanceThreshold, pullMoveY.current * 0.4);
    
    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${pullDistance}px)`;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullMoveY.current > distanceThreshold) {
      // Trigger refresh
      setIsRefreshing(true);
      
      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(${distanceThreshold * 0.5}px)`;
      }
      
      try {
        triggerHapticFeedback("success");
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
        triggerHapticFeedback("error");
      } finally {
        setIsRefreshing(false);
        if (containerRef.current) {
          containerRef.current.style.transform = "";
        }
      }
    } else {
      // Reset position with animation
      if (containerRef.current) {
        containerRef.current.style.transition = "transform 0.3s ease";
        containerRef.current.style.transform = "";
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.transition = "";
          }
        }, 300);
      }
    }
  };

  // Only enable on mobile
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("transition-transform", className)}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 w-full flex justify-center transform -translate-y-full transition-opacity",
          (isPulling || isRefreshing) ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          {isRefreshing ? (
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>
      
      {children}
    </div>
  );
}

// Bottom sheet component for mobile
export function BottomSheet({
  isOpen,
  onClose,
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const isMobile = useMobile();

  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } });
      document.body.style.overflow = "hidden";
    } else {
      controls.start({ y: "100%", transition: { type: "spring", stiffness: 500, damping: 30 } });
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, controls]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    } else {
      controls.start({ y: 0, transition: { type: "spring", stiffness: 500, damping: 30 } });
    }
  };

  // Only use bottom sheet on mobile
  if (!isMobile) {
    if (!isOpen) return null;
    return (
      <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50", className)}>
        <div className="bg-background rounded-lg p-4 max-w-md w-full max-h-[80vh] overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      )}
      <motion.div
        ref={sheetRef}
        initial={{ y: "100%" }}
        animate={controls}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-xl shadow-xl",
          "touch-manipulation",
          className
        )}
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto my-2" />
        <div className="max-h-[75vh] overflow-auto p-4">
          {children}
        </div>
      </motion.div>
    </>
  );
}
