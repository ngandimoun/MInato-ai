// FILE: app/chat/page.tsx
"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInterface } from "@/components/chat/chat-interface";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { MemoryPanel } from "@/components/memory/memory-panel";
import { LivingDossierPanel } from "@/components/living-dossier/living-dossier-panel";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider"; 
import { logger } from "@/memory-framework/config";
import { useRouter, useSearchParams } from "next/navigation";

type View = "chat" | "settings" | "memory" | "dashboard" | "living-dossier"; // Added living-dossier view

export default function ChatPage() { 
  const [currentView, setCurrentView] = useState<View>("chat");
  const { user, isLoading: isAuthLoading } = useAuth(); 
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle initial view based on query parameters
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['chat', 'settings', 'memory', 'living-dossier'].includes(viewParam)) {
      setCurrentView(viewParam as View);
    }
  }, [searchParams]);

  useEffect(() => {
     if (!isAuthLoading && !user) {
        logger.info("[ChatPage] User logged out, resetting view to chat (will redirect via middleware).");
        setCurrentView("chat"); 
     }
  }, [user, isAuthLoading]);

  // Handle navigation to dashboard page when the dashboard view is selected
  useEffect(() => {
     if (currentView === "dashboard") {
        router.push("/dashboard");
     }
  }, [currentView, router]);

  if (!user) { // This check is more of a fallback; middleware should handle unauth access
     logger.warn("[ChatPage] Reached ChatPage component without authenticated user (should have been redirected).");
     return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background text-destructive">
             <p>Authentication error or session expired. Redirecting...</p>
         </div>
     );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />

      <Header currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 container max-w-5xl mx-auto px-4 pb-4 pt-16 md:pt-20 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full" 
            >
              <ChatInterface />
            </motion.div>
          )}

          {currentView === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full" 
            >
              <SettingsPanel
                onClose={() => setCurrentView("chat")}
              />
            </motion.div>
          )}

          {currentView === "memory" && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <MemoryPanel onClose={() => setCurrentView("chat")} />
            </motion.div>
          )}

          {currentView === "living-dossier" && (
            <motion.div
              key="living-dossier"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <LivingDossierPanel onClose={() => setCurrentView("chat")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}