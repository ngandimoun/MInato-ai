"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecordingButton } from "@/components/listening/recording-button";
import { RecordingList } from "@/components/listening/recording-list";
import { RecordingAnalysis } from "@/components/listening/recording-analysis";
import { useListening, Recording } from "@/context/listening-context";
import { Header } from "@/components/header";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, List, BarChart3 } from "lucide-react";

// Define view type to match Header component
type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub";

export default function ListeningPage() {
  const {
    recordings,
    isLoading,
    currentRecordingId,
    currentAnalysis,
    fetchRecordings,
    deleteRecording,
    setCurrentRecordingId,
  } = useListening();
  
  const [currentView, setCurrentView] = useState<View>("listening");
  const [activeTab, setActiveTab] = useState<"record" | "analyze">("record");
  const router = useRouter();

  // Handle view changes
  const handleViewChange = (view: View) => {
    if (view === "listening") {
      // Already on listening page, do nothing
      return;
    } else if (view === "dashboard") {
      router.push("/dashboard");
    } else if (view === "games") {
      router.push("/games");
    } else if (view === "insights") {
      router.push("/insights");
    } else if (view === "creation-hub") {
      router.push("/creation-hub");
    } else {
      // Navigate to chat page with the specified view
      router.push(`/chat?view=${view}`);
    }
  };

  // Handle recording selection
  const handleSelectRecording = useCallback((recording: Recording) => {
    setCurrentRecordingId(recording.id);
    // On mobile, switch to analyze tab when a recording is selected
    if (window.innerWidth < 1024) {
      setActiveTab("analyze");
    }
  }, [setCurrentRecordingId]);

  // Handle recording deletion
  const handleDeleteRecording = useCallback(async (recordingId: string) => {
    const success = await deleteRecording(recordingId);
    if (success) {
      // If the deleted recording was selected, clear the selection
      if (currentRecordingId === recordingId) {
        setCurrentRecordingId(null);
      }
    }
  }, [deleteRecording, currentRecordingId, setCurrentRecordingId]);

  // Handle recording update
  const handleUpdateRecording = useCallback((updatedRecording: Recording) => {
    // Re-fetch recordings to get the updated data
    fetchRecordings();
  }, [fetchRecordings]);

  // Handle segment highlighting
  const handleHighlightSegment = useCallback((segmentId: number) => {
    // This function will be passed to the ChatInterface to highlight transcript segments
    if (currentAnalysis?.transcript_json) {
      // Find the segment in the transcript
      const segment = currentAnalysis.transcript_json.find(s => s.id === segmentId);
      if (segment) {
        // Implement your highlighting logic here
        console.log("Highlighting segment:", segment);
      }
    }
  }, [currentAnalysis]);

  // Find the current recording object from the list
  const currentRecording = recordings.find(r => r.id === currentRecordingId) || null;

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />
      
      <Header currentView={currentView} onViewChange={handleViewChange} />

      <div className="container max-w-7xl mx-auto px-4 py-8 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-emerald-400 to-pink-500 bg-clip-text text-transparent">
              Minato AI Listening
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Record conversations and get AI-powered insights, summaries, and action items
            </p>
          </div>

          {/* Mobile Tabs */}
          <div className="lg:hidden mb-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "record" | "analyze")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="record" className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  <span>Record</span>
                </TabsTrigger>
                <TabsTrigger value="analyze" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analyze</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="record" className="mt-4">
                <div className="space-y-6">
                  {/* Recording button */}
                  <div className="flex justify-center mb-4">
                    <RecordingButton
                      onRecordingComplete={(recordingId) => {
                        setCurrentRecordingId(recordingId);
                        fetchRecordings();
                      }}
                    />
                  </div>

                  {/* Recordings list */}
                  <RecordingList
                    recordings={recordings}
                    isLoading={isLoading}
                    selectedRecordingId={currentRecordingId}
                    onSelectRecording={handleSelectRecording}
                    onDeleteRecording={handleDeleteRecording}
                    onUpdateRecording={handleUpdateRecording}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="analyze" className="mt-4">
                <RecordingAnalysis
                  recording={currentRecording}
                  analysis={currentAnalysis}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-8">
            {/* Left column: Recording list and recording button */}
            <div className="lg:col-span-1 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="recording-controls"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Recording button */}
                  <div className="flex justify-center mb-6">
                    <RecordingButton
                      onRecordingComplete={(recordingId) => {
                        setCurrentRecordingId(recordingId);
                        fetchRecordings();
                      }}
                      className="transform hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Recordings list */}
                  <RecordingList
                    recordings={recordings}
                    isLoading={isLoading}
                    selectedRecordingId={currentRecordingId}
                    onSelectRecording={handleSelectRecording}
                    onDeleteRecording={handleDeleteRecording}
                    onUpdateRecording={handleUpdateRecording}
                    className="shadow-lg hover:shadow-xl transition-shadow"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right column: Recording analysis */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentRecordingId || "empty"}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <RecordingAnalysis
                    recording={currentRecording}
                    analysis={currentAnalysis}
                    isLoading={isLoading}
                    className="shadow-lg hover:shadow-xl transition-shadow"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
} 