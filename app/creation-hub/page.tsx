"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { CreationHubPanel } from "@/components/creation-hub/creation-hub-panel";
import { logger } from '@/memory-framework/config';

// Define view type to match Header component
type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub";

export default function CreationHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        router.push("/chat");
        break;
      case "memory":
        router.push("/memory");
        break;
      case "settings":
        router.push("/settings");
        break;
      case "dashboard":
        router.push("/dashboard");
        break;
      case "games":
        router.push("/games");
        break;
      case "listening":
        router.push("/listening");
        break;
      case "insights":
        router.push("/insights");
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
    router.push("/chat");
  };

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md bg-background/80 border-b border-border h-14" />
        <div className="pt-14">
          <div className="container max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-96">
              <div className="text-muted-foreground">Loading Creation Hub...</div>
            </div>
          </div>
        </div>
      </div>
    );
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