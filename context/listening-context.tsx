"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";

export interface Recording {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_path: string;
  status: "pending" | "processing" | "completed" | "failed";
  duration_seconds: number | null;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  recording_id: string;
  transcript_text: string;
  transcript_json: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
  content_type?: string;
  summary_text: string;
  speakers_json?: Array<{
    speaker_id: string;
    possible_name: string | null;
    speaking_segments: number[];
    role?: string;
    key_contributions?: string[];
  }>;
  key_themes_json: Array<{
    theme: string;
    importance?: "high" | "medium" | "low";
    transcript_segment_ids: number[];
  }>;
  action_items_json: Array<{
    task: string;
    assigned_to: string;
    priority?: "high" | "medium" | "low";
    due_date_iso?: string;
    transcript_segment_id: number;
  }>;
  sentiment_analysis_json: Array<{
    segment_id: number;
    sentiment: "positive" | "negative" | "neutral";
    intensity?: "high" | "medium" | "low";
    score?: number;
  }>;
  structured_notes_json: Record<string, string[]>;
  key_moments_json?: Array<{
    moment_type: string;
    description: string;
    segment_id: number;
    importance?: "high" | "medium" | "low";
  }>;
}

interface ListeningContextType {
  recordings: Recording[];
  isLoading: boolean;
  currentRecordingId: string | null;
  currentAnalysis: AnalysisResult | null;
  fetchRecordings: () => Promise<void>;
  deleteRecording: (recordingId: string) => Promise<boolean>;
  setCurrentRecordingId: (recordingId: string | null) => void;
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void;
  processRecording: (recordingId: string) => Promise<boolean>;
}

const ListeningContext = createContext<ListeningContextType>({
  recordings: [],
  isLoading: false,
  currentRecordingId: null,
  currentAnalysis: null,
  fetchRecordings: async () => {},
  deleteRecording: async () => false,
  setCurrentRecordingId: () => {},
  setCurrentAnalysis: () => {},
  processRecording: async () => false,
});

export function ListeningProvider({ children }: { children: React.ReactNode }) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = getBrowserSupabaseClient();

  // Fetch recordings from API
  const fetchRecordings = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch("/api/recordings");
      
      if (!response.ok) {
        throw new Error("Failed to fetch recordings");
      }
      
      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      toast({
        title: "Error",
        description: "Failed to load recordings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Delete a recording
  const deleteRecording = useCallback(async (recordingId: string) => {
    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete recording");
      }
      
      // Update local state
      setRecordings((prev) => prev.filter((rec) => rec.id !== recordingId));
      
      // If the deleted recording was selected, clear the selection
      if (currentRecordingId === recordingId) {
        setCurrentRecordingId(null);
        setCurrentAnalysis(null);
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting recording:", error);
      toast({
        title: "Error",
        description: "Failed to delete recording",
        variant: "destructive",
      });
      return false;
    }
  }, [currentRecordingId, toast]);

  // Fetch recording details when currentRecordingId changes
  useEffect(() => {
    const fetchRecordingDetails = async () => {
      if (!currentRecordingId) {
        setCurrentAnalysis(null);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/recordings/${currentRecordingId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch recording details");
        }
        
        const { recording, analysis } = await response.json();
        
        // Update the recording in the list with the latest data
        setRecordings((prev) =>
          prev.map((rec) => (rec.id === recording.id ? recording : rec))
        );
        
        // Set the analysis data
        setCurrentAnalysis(analysis);
      } catch (error) {
        console.error("Error fetching recording details:", error);
        toast({
          title: "Error",
          description: "Failed to load recording details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecordingDetails();
  }, [currentRecordingId, toast]);

  // Set up real-time updates for recording status
  useEffect(() => {
    if (!user) return;
    
    let channel: any = null;
    let isMounted = true;
    
    const setupRealtimeSubscription = async () => {
      try {
        // Create a unique channel name to avoid conflicts
        const channelName = `recordings-${user.id}-${Date.now()}`;
        
        console.log("Setting up realtime subscription for recordings with channel:", channelName);
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'audio_recordings',
              filter: `user_id=eq.${user.id}`,
            },
            (payload: { new: any; old: any }) => {
              console.log("Received realtime update for recording:", payload.new.id);
              console.log("New status:", payload.new.status);
              
              if (!isMounted) return;
              
              const updatedRecording = payload.new as Recording;
              
              // Update the recording in the list
              setRecordings((prev) =>
                prev.map((rec) => (rec.id === updatedRecording.id ? updatedRecording : rec))
              );
              
              // If this is the currently selected recording, refresh the details
              if (currentRecordingId === updatedRecording.id) {
                console.log("Updating currently selected recording:", updatedRecording.id);
                
                if (updatedRecording.status === "completed") {
                  console.log("Recording completed, fetching analysis...");
                  // Fetch the updated analysis
                  fetch(`/api/recordings/${updatedRecording.id}`)
                    .then((response) => response.json())
                    .then(({ analysis }) => {
                      console.log("Analysis fetched:", analysis ? "success" : "empty");
                      if (isMounted) {
                        setCurrentAnalysis(analysis);
                        toast({
                          title: "Analysis Complete",
                          description: "Your recording analysis is now ready",
                        });
                      }
                    })
                    .catch((error) => {
                      console.error("Error fetching updated analysis:", error);
                    });
                } else if (updatedRecording.status === "failed") {
                  console.log("Recording processing failed");
                  if (isMounted) {
                    toast({
                      title: "Processing Failed",
                      description: "There was an error processing your recording",
                      variant: "destructive",
                    });
                  }
                }
              }
            }
          )
          .subscribe((status: any) => {
            console.log("Subscription status:", status);
          });
      } catch (error) {
        console.error("Error setting up realtime subscription:", error);
      }
    };
    
    setupRealtimeSubscription();
    
    // Cleanup subscription
    return () => {
      isMounted = false;
      if (channel) {
        console.log("Cleaning up realtime subscription");
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, currentRecordingId, toast, supabase]); // Add supabase to dependencies

  // Fetch recordings when user changes
  useEffect(() => {
    if (user) {
      fetchRecordings();
    } else {
      // Clear data when user logs out
      setRecordings([]);
      setCurrentRecordingId(null);
      setCurrentAnalysis(null);
    }
  }, [user, fetchRecordings]);

  // Handle manual processing of a recording
  const processRecording = useCallback(async (recordingId: string) => {
    try {
      const response = await fetch(`/api/recordings/${recordingId}/process`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to process recording");
      }
      
      const data = await response.json();
      
      // Show toast notification if included in the response
      if (data.toast) {
        toast({
          title: data.toast.title,
          description: data.toast.description,
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error processing recording:", error);
      toast({
        title: "Error",
        description: "Failed to process recording",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return (
    <ListeningContext.Provider
      value={{
        recordings,
        isLoading,
        currentRecordingId,
        currentAnalysis,
        fetchRecordings,
        deleteRecording,
        setCurrentRecordingId,
        setCurrentAnalysis,
        processRecording,
      }}
    >
      {children}
    </ListeningContext.Provider>
  );
}

export function useListening() {
  return useContext(ListeningContext);
} 