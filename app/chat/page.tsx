// FILE: app/chat/page.tsx
"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInterface } from "@/components/chat/chat-interface";
// CallInterface is removed
import { DocumentFile, SettingsPanel } from "@/components/settings/settings-panel";
import { MemoryPanel } from "@/components/memory/memory-panel";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider"; 
import { logger } from "@/memory-framework/config";
import { Loader2 } from "lucide-react"; 
import { toast } from "@/components/ui/use-toast"; 
// SplashCursor can be kept if desired

type View = "chat" | "settings" | "memory"; // "call" view is removed

export default function ChatPage() { 
  const [currentView, setCurrentView] = useState<View>("chat");
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentFile[]>([]);
  const { user, isLoading: isAuthLoading } = useAuth(); 

  useEffect(() => {
     if (!isAuthLoading && !user) {
        logger.info("[ChatPage] User logged out, resetting view to chat (will redirect via middleware).");
        setCurrentView("chat"); 
     }
  }, [user, isAuthLoading]);

  const handleDocumentsSubmit = (documents: DocumentFile[]) => {
    setUploadedDocuments((prevDocs) => [...prevDocs, ...documents]);
    logger.info("[ChatPage] Documents submitted (local state):", documents.map(d => d.name));
    toast({ title: "Documents Received", description: `${documents.length} document(s) ready for discussion.` });
  };

  const handleDeleteDocument = (idToDelete: string) => {
     setUploadedDocuments((prevDocs) => prevDocs.filter(doc => doc.id !== idToDelete));
     logger.info("[ChatPage] Document deleted (local state):", idToDelete);
     toast({ title: "Document Removed", description: "The document has been removed from this session's view." });
  };

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
      {/* <SplashCursor /> */}

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
              <ChatInterface onDocumentsSubmit={handleDocumentsSubmit} />
            </motion.div>
          )}

          {/* "call" view and CallInterface component are removed */}

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
                uploadedDocuments={uploadedDocuments}
                onDeleteDocument={handleDeleteDocument}
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
        </AnimatePresence>
      </div>
    </main>
  )
}