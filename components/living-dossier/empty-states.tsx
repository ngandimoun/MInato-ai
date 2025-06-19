"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: "default" | "compact";
}

// Base Empty State Component
export function EmptyState({
  title,
  description,
  action,
  children,
  className,
  variant = "default",
}: React.PropsWithChildren<EmptyStateProps>) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 rounded-lg border border-dashed",
        variant === "compact" ? "gap-3 py-4" : "gap-5 py-8",
        className
      )}
    >
      {children}
      <div className="space-y-2 max-w-md">
        <h3 className={cn("font-semibold", variant === "compact" ? "text-lg" : "text-xl")}>
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          size={variant === "compact" ? "sm" : "default"}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// No Dossiers Empty State
export function NoDossiersEmptyState({
  onCreateNew,
  className,
  variant = "default",
}: {
  onCreateNew: () => void;
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <EmptyState
      title="No Dossiers Found"
      description="Create your first living dossier to start exploring topics in depth."
      action={{
        label: "Create New Dossier",
        onClick: onCreateNew,
      }}
      className={className}
      variant={variant}
    >
      <NoDossiersIllustration className={variant === "compact" ? "h-32" : "h-48"} />
    </EmptyState>
  );
}

// Search No Results Empty State
export function SearchEmptyState({
  query,
  onReset,
  className,
  variant = "default",
}: {
  query: string;
  onReset: () => void;
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <EmptyState
      title="No Results Found"
      description={`No dossiers matching "${query}" were found. Try a different search term.`}
      action={{
        label: "Clear Search",
        onClick: onReset,
      }}
      className={className}
      variant={variant}
    >
      <SearchIllustration className={variant === "compact" ? "h-32" : "h-48"} />
    </EmptyState>
  );
}

// Error State
export function ErrorState({
  message,
  onRetry,
  className,
  variant = "default",
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <EmptyState
      title="Something Went Wrong"
      description={message || "An error occurred while loading your dossiers."}
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
      variant={variant}
    >
      <ErrorIllustration className={variant === "compact" ? "h-32" : "h-48"} />
    </EmptyState>
  );
}

// Offline State
export function OfflineState({
  onRetry,
  className,
  variant = "default",
}: {
  onRetry: () => void;
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <EmptyState
      title="You're Offline"
      description="Check your internet connection and try again."
      action={{
        label: "Retry Connection",
        onClick: onRetry,
      }}
      className={className}
      variant={variant}
    >
      <OfflineIllustration className={variant === "compact" ? "h-32" : "h-48"} />
    </EmptyState>
  );
}

// Illustrations
function NoDossiersIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <rect x="40" y="30" width="160" height="120" rx="8" fill="var(--muted)" />
        <rect x="60" y="50" width="120" height="16" rx="4" fill="var(--muted-foreground)" opacity="0.2" />
        <rect x="60" y="76" width="80" height="8" rx="4" fill="var(--muted-foreground)" opacity="0.2" />
        <rect x="60" y="92" width="100" height="8" rx="4" fill="var(--muted-foreground)" opacity="0.2" />
        <rect x="60" y="108" width="60" height="8" rx="4" fill="var(--muted-foreground)" opacity="0.2" />
        <circle cx="180" cy="140" r="10" fill="var(--primary)" opacity="0.8" />
        <path
          d="M180 135V145M175 140H185"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <motion.g
          initial={{ y: -5 }}
          animate={{ y: 5 }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 2,
            ease: "easeInOut",
          }}
        >
          <rect x="30" y="60" width="30" height="40" rx="4" fill="var(--primary)" opacity="0.2" transform="rotate(-10 30 60)" />
          <rect x="180" y="50" width="30" height="40" rx="4" fill="var(--primary)" opacity="0.2" transform="rotate(10 180 50)" />
        </motion.g>
      </motion.svg>
    </div>
  );
}

function SearchIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.circle
          cx="120"
          cy="90"
          r="40"
          stroke="var(--muted-foreground)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        <motion.line
          x1="148"
          y1="118"
          x2="170"
          y2="140"
          stroke="var(--muted-foreground)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 0.8 }}
        />
        <motion.g
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <path
            d="M120 70 L120 110 M100 90 L140 90"
            stroke="var(--muted-foreground)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.5"
          />
        </motion.g>
      </motion.svg>
    </div>
  );
}

function ErrorIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.circle
          cx="120"
          cy="90"
          r="50"
          fill="var(--destructive)"
          opacity="0.1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "backOut" }}
        />
        <motion.path
          d="M120 50 L120 100"
          stroke="var(--destructive)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
        <motion.circle
          cx="120"
          cy="120"
          r="3"
          fill="var(--destructive)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        />
      </motion.svg>
    </div>
  );
}

function OfflineIllustration({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.path
          d="M60 90 A60 60 0 0 1 180 90"
          stroke="var(--muted-foreground)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="transparent"
          opacity="0.2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />
        <motion.path
          d="M80 110 A40 40 0 0 1 160 110"
          stroke="var(--muted-foreground)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="transparent"
          opacity="0.4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.path
          d="M100 130 A20 20 0 0 1 140 130"
          stroke="var(--muted-foreground)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="transparent"
          opacity="0.6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <motion.circle
          cx="120"
          cy="150"
          r="6"
          fill="var(--muted-foreground)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
        />
        <motion.line
          x1="60"
          y1="60"
          x2="180"
          y2="180"
          stroke="var(--destructive)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 1.4 }}
        />
      </motion.svg>
    </div>
  );
}
