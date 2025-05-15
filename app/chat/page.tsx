// FILE: app/chat/page.tsx
// (Content from finalcodebase.txt - verified and aligned)
"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInterface } from "@/components/chat/chat-interface";
import  CallInterface  from "@/components/call/call-interface";
import { DocumentFile, SettingsPanel } from "@/components/settings/settings-panel";
import { MemoryPanel } from "@/components/memory/memory-panel";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider"; // Import useAuth
import { logger } from "@/memory-framework/config";
import { Loader2 } from "lucide-react"; // For loading state
import { toast } from "@/components/ui/use-toast"; // For notifications

type View = "chat" | "call" | "settings" | "memory";

export default function ChatPage() { // Renamed component for clarity
  const [currentView, setCurrentView] = useState<View>("chat");
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentFile[]>([]);
  const { user, isLoading: isAuthLoading } = useAuth(); // Get user and auth loading state

  // Add effect to reset view if user logs out while on a specific view
  useEffect(() => {
     if (!isAuthLoading && !user) {
        logger.info("[ChatPage] User logged out, resetting view to chat (will redirect via middleware).");
        setCurrentView("chat"); // Reset to default, middleware handles redirect
     }
  }, [user, isAuthLoading]);

  const handleDocumentsSubmit = (documents: DocumentFile[]) => {
     // In a real app: Trigger API call to process/index these documents in the backend memory
     // For now, add to local state for SettingsPanel display
    setUploadedDocuments((prevDocs) => [...prevDocs, ...documents]);
    logger.info("[ChatPage] Documents submitted (local state):", documents.map(d => d.name));
    toast({ title: "Documents Received", description: `${documents.length} document(s) ready for discussion.` });
  };

  const handleDeleteDocument = (idToDelete: string) => {
     // In a real app: Trigger API call to delete the document from storage and memory index
     setUploadedDocuments((prevDocs) => prevDocs.filter(doc => doc.id !== idToDelete));
     logger.info("[ChatPage] Document deleted (local state):", idToDelete);
     toast({ title: "Document Removed", description: "The document has been removed from this session's view." });
  };

  // Show loading indicator while authentication is resolving
  //  if (isAuthLoading) {
  //    return (
  //       <div className="flex flex-col items-center justify-center min-h-screen bg-background">
  //           <Loader2 className="h-12 w-12 animate-spin text-primary/70 mb-4" />
  //           <p className="text-lg text-muted-foreground">Loading Minato...</p>
  //       </div>
  //    );
  // }

  // If auth is resolved but there's no user, this page shouldn't be rendered (middleware redirects)
  // But as a fallback:
  if (!user) {
     // This state should ideally not be reached due to middleware redirecting unauthenticated users
     logger.warn("[ChatPage] Reached ChatPage component without authenticated user (should have been redirected).");
     // Optional: could force redirect again client-side, but middleware is preferred
     // useRouter().replace('/');
     return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background text-destructive">
             <p>Authentication error or session expired. Redirecting...</p>
         </div>
     );
  }

  // Authenticated user - render the main layout
  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Optional Background Gradient/Texture */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />

      <Header currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area - Takes remaining height */}
      <div className="flex-1 container max-w-5xl mx-auto px-4 pb-4 pt-16 md:pt-20 relative overflow-hidden">
        {/* Apply flex-1 and overflow-hidden to ensure content area respects header height */}
        <AnimatePresence mode="wait">
          {currentView === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full" // Occupy full height of the flex-1 container
            >
              {/* Pass the submit handler to ChatInterface */}
              <ChatInterface onDocumentsSubmit={handleDocumentsSubmit} />
            </motion.div>
          )}

          {currentView === "call" && (
            <motion.div
              key="call"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full" // Occupy full height
            >
              {/* Pass callback to switch view on hangup */}
                 <CallInterface //onHangUp={() => setCurrentView("chat")} 
                  />
            </motion.div>
          )}

          {currentView === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full" // Occupy full height
            >
              {/* Pass documents and delete handler */}
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
              className="h-full" // Occupy full height
            >
              <MemoryPanel onClose={() => setCurrentView("chat")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}