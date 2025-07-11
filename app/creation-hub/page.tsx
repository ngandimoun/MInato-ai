"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { CreationHubPanel } from "@/components/creation-hub/creation-hub-panel";
import { CreationHubLoading } from "@/components/creation-hub/creation-hub-loading";
import { logger } from '@/memory-framework/config';
import { useNavigation } from "@/context/navigation-context";

// Define view type to match Header component
type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub";

export default function CreationHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigateWithLoading } = useNavigation();
  const [isClient, setIsClient] = useState(false);

  // Set up client-side rendering check
  useEffect(() => {
    setIsClient(true);
    logger.info('[Creation Hub Page] Page mounted');
  }, []);

  // Handle view changes from header navigation
  const handleViewChange = (view: View) => {
    logger.info('[Creation Hub Page] View change requested', { view });
    
    switch (view) {
      case "chat":
        navigateWithLoading("/chat", "Loading chat...");
        break;
      case "memory":
        navigateWithLoading("/chat?view=memory", "Loading memory...");
        break;
      case "settings":
        navigateWithLoading("/chat?view=settings", "Loading settings...");
        break;
      case "dashboard":
        navigateWithLoading("/dashboard", "Loading dashboard...");
        break;
      case "games":
        navigateWithLoading("/games", "Loading games...");
        break;
      case "listening":
        navigateWithLoading("/listening", "Loading listening...");
        break;
      case "insights":
        navigateWithLoading("/insights", "Loading insights...");
        break;
      case "creation-hub":
        // Already on creation hub, no navigation needed
        break;
      default:
        logger.warn('[Creation Hub Page] Unknown view requested', { view });
        break;
    }
  };

  // Handle panel close - navigate back to chat
  const handlePanelClose = () => {
    logger.info('[Creation Hub Page] Panel close requested');
    navigateWithLoading("/chat", "Loading chat...");
  };

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return <CreationHubLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentView="creation-hub" onViewChange={handleViewChange} />
      
      <main className="pt-14">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="relative">
            <CreationHubPanel onClose={handlePanelClose} />
          </div>
        </div>
      </main>
    </div>
  );
} 