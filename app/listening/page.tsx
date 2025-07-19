"use client";

import React, { useState, useCallback } from "react";
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from "framer-motion";
import { RecordingList } from "@/components/listening/recording-list";
import { RecordingAnalysis } from "@/components/listening/recording-analysis";
import { useListening, Recording } from "@/context/listening-context";
import { VideoIntelligencePanel } from "@/components/video-intelligence/video-intelligence-panel";
import { Header } from "@/components/header";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/context/navigation-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, List, BarChart3, Loader2, Video, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const RecordingButton = dynamic(
  () => import('@/components/listening').then(mod => mod.RecordingButton),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center">
        <Button
          variant="default"
          size="lg"
          className="h-16 w-16 rounded-full shadow-lg opacity-50 cursor-not-allowed"
          disabled
        >
          <Loader2 className="h-6 w-6 animate-spin" />
        </Button>
        <div className="mt-3 text-center">
          <div className="text-xs text-muted-foreground">Loading recorder...</div>
        </div>
      </div>
    ),
  }
);

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
  const [activeTab, setActiveTab] = useState<"record" | "analyze" | "video-intelligence">("record");
  const { navigateWithLoading } = useNavigation();
  const router = useRouter();

  const handleViewChange = (view: View) => {
    if (view === "listening") {
      return;
    } else if (view === "dashboard") {
      navigateWithLoading("/dashboard", "Loading dashboard...");
    } else if (view === "games") {
      navigateWithLoading("/games", "Loading games...");
    } else if (view === "insights") {
      navigateWithLoading("/insights", "Loading insights...");
    } else if (view === "creation-hub") {
      navigateWithLoading("/creation-hub", "Loading creation hub...");
    } else {
      navigateWithLoading(`/chat?view=${view}`, `Loading ${view}...`);
    }
  };

  const handleSelectRecording = useCallback((recording: Recording) => {
    setCurrentRecordingId(recording.id);
    if (window.innerWidth < 1024) {
      setActiveTab("analyze");
    }
  }, [setCurrentRecordingId]);

  const handleDeleteRecording = useCallback(async (recordingId: string) => {
    const success = await deleteRecording(recordingId);
    if (success) {
      if (currentRecordingId === recordingId) {
        setCurrentRecordingId(null);
      }
    }
  }, [deleteRecording, currentRecordingId, setCurrentRecordingId]);

  const handleUpdateRecording = useCallback((updatedRecording: Recording) => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handleHighlightSegment = useCallback((segmentId: number) => {
    if (currentAnalysis?.transcript_json) {
      const segment = currentAnalysis.transcript_json.find(s => s.id === segmentId);
      if (segment) {
        console.log("Highlighting segment:", segment);
      }
    }
  }, [currentAnalysis]);

  const currentRecording = recordings.find(r => r.id === currentRecordingId) || null;

  return (
    <main className="flex h-screen flex-col bg-background overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />
      
      <Header currentView={currentView} onViewChange={handleViewChange} />

      {/* Main container to center the panel */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* The fixed-height panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-7xl h-full max-h-[calc(100vh-7rem)] bg-card border rounded-sm shadow-sm flex flex-col overflow-hidden"
        >
          {/* Panel Header (fixed) */}
          <div className="p-6 border-b h-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-emerald-400 to-pink-500 bg-clip-text text-transparent">
                Minato AI Intelligence
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-xs">
                Advanced AI-powered audio and video intelligence for enhanced security and insights
              </p>
            </div>
          </div>

          {/* Panel Content (scrollable) */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Mobile Tabs */}
              <div className="lg:hidden mb-6">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "record" | "analyze" | "video-intelligence")}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="record" className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      <span>Audio</span>
                    </TabsTrigger>
                    <TabsTrigger value="analyze" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Analyze</span>
                    </TabsTrigger>
                    <TabsTrigger value="video-intelligence" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Video AI</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="record" className="mt-4">
                    <div className="space-y-6">
                      <div className="flex justify-center mb-4">
                        <RecordingButton
                          onRecordingComplete={(recordingId) => {
                            setCurrentRecordingId(recordingId);
                            fetchRecordings();
                          }}
                        />
                      </div>

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
                  
                  <TabsContent value="video-intelligence" className="mt-4">
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Shield className="h-16 w-16 mx-auto mb-4 text-primary" />
                        <h2 className="text-2xl font-bold mb-2">Minato AI Video Intelligence</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Advanced video surveillance with AI-powered threat detection, child safety monitoring, and proactive alerts
                        </p>
                        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                          <div className="bg-card p-4 rounded-lg border">
                            <h3 className="font-semibold text-sm mb-2">🛡️ Child Safety Monitor</h3>
                            <p className="text-xs text-muted-foreground">AI detects children in danger zones and provides voice intervention</p>
                          </div>
                          <div className="bg-card p-4 rounded-lg border">
                            <h3 className="font-semibold text-sm mb-2">🚨 Fall Detection</h3>
                            <p className="text-xs text-muted-foreground">Instant alerts for medical emergencies and accidents</p>
                          </div>
                          <div className="bg-card p-4 rounded-lg border">
                            <h3 className="font-semibold text-sm mb-2">🔒 Intrusion Detection</h3>
                            <p className="text-xs text-muted-foreground">Real-time stranger detection and security alerts</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:block">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "record" | "analyze" | "video-intelligence")} className="w-full">
                  <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-8">
                    <TabsTrigger value="record" className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      <span>Audio Recording</span>
                    </TabsTrigger>
                    <TabsTrigger value="analyze" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Analysis</span>
                    </TabsTrigger>
                    <TabsTrigger value="video-intelligence" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Video Intelligence</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="record" className="mt-4">
                    <div className="grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1 space-y-6">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key="recording-controls"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex justify-center mb-6">
                              <RecordingButton
                                onRecordingComplete={(recordingId) => {
                                  setCurrentRecordingId(recordingId);
                                  fetchRecordings();
                                }}
                                className="transform hover:scale-105 transition-transform"
                              />
                            </div>

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
                  </TabsContent>
                  
                  <TabsContent value="analyze" className="mt-4">
                    <div className="grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1 space-y-6">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key="recording-controls"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex justify-center mb-6">
                              <RecordingButton
                                onRecordingComplete={(recordingId) => {
                                  setCurrentRecordingId(recordingId);
                                  fetchRecordings();
                                }}
                                className="transform hover:scale-105 transition-transform"
                              />
                            </div>

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
                  </TabsContent>
                  
                  <TabsContent value="video-intelligence" className="mt-4">
                    <VideoIntelligencePanel />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </main>
  );
}