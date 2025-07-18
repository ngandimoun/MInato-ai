"use client";

import React from "react";
import { CreationHubPanel } from "@/components/creation-hub/creation-hub-panel";
import { Header } from "@/components/header";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TestCreationHubPage() {
  const handleViewChange = (view: string) => {
    console.log("View change requested:", view);
  };

  const handlePanelClose = () => {
    console.log("Panel close requested");
  };

  return (
    <main className="flex h-screen flex-col bg-background overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-blue-50/50 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-blue-900/20 z-[-1]" />
      
      <Header currentView="creation-hub" onViewChange={handleViewChange} />
      
      <ScrollArea className="flex-1">
        <div className="container max-w-5xl mx-auto px-4 py-6 pt-20">
          <div className="h-[800px]"> {/* Hauteur fixe pour tester le scroll */}
            <CreationHubPanel onClose={handlePanelClose} />
          </div>
        </div>
      </ScrollArea>
    </main>
  );
} 