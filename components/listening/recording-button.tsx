//components/listening/recording-button.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, StopCircle, Loader2, Pause, Play, Square, X } from "lucide-react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { cn } from "@/lib/utils";
import { ListeningLimitGuard } from "@/components/subscription/listening-limit-guard";

interface RecordingButtonProps {
  onRecordingComplete: (recordingId: string) => void;
  className?: string;
}

const MAX_RECORDING_TIME = 25 * 60; // 25 minutes in seconds

export function RecordingButton({ onRecordingComplete, className }: RecordingButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTitle, setRecordingTitle] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { user, profile, isFetchingProfile } = useAuth();
  // TODO: Typage fort du profil utilisateur (ajouter plan_type et trial_recordings_remaining à UserProfile)
  const typedProfile = profile as any;
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate a default title based on date and time
  const generateDefaultTitle = (): string => {
    const now = new Date();
    return `Recording - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Reset state when recording stops
  const resetState = () => {
    setIsRecording(false);
    setIsPaused(false);
    setIsUploading(false);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Check for maximum recording time
  useEffect(() => {
    if (recordingTime >= MAX_RECORDING_TIME && isRecording && !isPaused) {
      handleStopRecording();
      toast({
        title: "Recording time limit reached",
        description: "Maximum recording time of 25 minutes has been reached.",
      });
    }
  }, [recordingTime, isRecording, isPaused]);

  // Media recorder setup
  const { status, startRecording, stopRecording, pauseRecording, resumeRecording, mediaBlobUrl, clearBlobUrl } = 
    useReactMediaRecorder({
      audio: true,
      video: false,
      onStop: async (blobUrl, blob) => {
        if (!blob) {
          toast({
            title: "Recording failed",
            description: "Could not create recording. Please try again.",
            variant: "destructive",
          });
          resetState();
          return;
        }
        
        try {
          setIsUploading(true);
          
          // Create a title for the recording
          const title = recordingTitle || generateDefaultTitle();
          
          // Create a file from the blob
          const audioFile = new File([blob], `${title}.webm`, { type: "audio/webm" });
          
          // Create a FormData object to send the file
          const formData = new FormData();
          formData.append("file", audioFile);
          
          // Upload the file to Supabase storage
          const uploadResponse = await fetch("/api/recordings/upload", {
            method: "POST",
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(`Upload failed: ${errorData.error || uploadResponse.statusText}`);
          }
          
          const { filePath } = await uploadResponse.json();
          
          // Create a recording entry in the database
          const createResponse = await fetch("/api/recordings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              file_path: filePath,
              duration_seconds: recordingTime,
              size_bytes: blob.size,
            }),
          });
          
          if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}));
            throw new Error(`Create recording failed: ${errorData.error || createResponse.statusText}`);
          }
          
          const { data } = await createResponse.json();
          
          // Notify parent component
          onRecordingComplete(data.id);
          
          toast({
            title: "Recording saved",
            description: "Your recording is being processed and will be ready soon.",
          });
          
          // Clear the media blob URL
          clearBlobUrl();
          setRecordingTitle("");
        } catch (error) {
          console.error("Error saving recording:", error);
          toast({
            title: "Error saving recording",
            description: error instanceof Error ? error.message : "There was a problem saving your recording. Please try again.",
            variant: "destructive",
          });
        } finally {
          resetState();
        }
      },
    });

  // Handle start recording
  const handleStartRecording = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to record audio.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    
    startRecording();
  };

  // Handle pause recording
  const handlePauseRecording = () => {
    if (isPaused) {
      resumeRecording();
      setIsPaused(false);
      
      // Resume the timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      pauseRecording();
      setIsPaused(true);
      
      // Pause the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Handle stop recording
  const handleStopRecording = () => {
    stopRecording();
  };

  // Handle cancel recording
  const handleCancelRecording = () => {
    // Stop the recording to cut off microphone access
    stopRecording();
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    clearBlobUrl();
    resetState();
    toast({
      title: "Recording cancelled",
      description: "Your recording has been cancelled.",
    });
  };

  // Pulse animation for recording indicator
  const pulseVariants = {
    pulse: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Supprimer la fonction renderQuotaInfo et tout affichage du quota ici

  return (
    <ListeningLimitGuard>
      <div className={cn("flex flex-col items-center", className)}>
        <div className="relative">
          {!isRecording ? (
            // Main record button when not recording
            <Button
              variant="default"
              size="lg"
              className={cn(
                "h-16 w-16 rounded-full shadow-lg transition-all duration-300",
                "bg-primary hover:bg-primary/90"
              )}
              onClick={handleStartRecording}
              disabled={status === "recording" && !isRecording}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Mic className="h-6 w-6" />
                </motion.div>
              </AnimatePresence>
            </Button>
        ) : (
          // Recording controls when recording is active
          <div className="flex items-center gap-3">
            {/* Cancel button */}
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 rounded-full shadow-md"
              onClick={handleCancelRecording}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Pause/Resume button */}
            <Button
              variant={isPaused ? "outline" : "secondary"}
              size="sm"
              className="h-12 w-12 rounded-full shadow-md"
              onClick={handlePauseRecording}
              disabled={isUploading}
            >
              {isPaused ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </Button>
            
            {/* Stop button */}
            <Button
              variant="destructive"
              size="sm"
              className="h-12 w-12 rounded-full shadow-md"
              onClick={handleStopRecording}
              disabled={isUploading}
            >
              <Square className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        {/* Recording indicator */}
        {isRecording && !isPaused && (
          <motion.div
            className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full"
            variants={pulseVariants}
            animate="pulse"
          />
        )}
      </div>
      
      {/* Affichage du quota juste sous le bouton */}
      {/* Supprimer la fonction renderQuotaInfo et tout affichage du quota ici */}
      <div className="mt-3 text-center">
        {isRecording ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className={cn(
              "font-medium",
              isPaused ? "text-muted-foreground" : "text-destructive",
              recordingTime >= MAX_RECORDING_TIME - 60 && "text-orange-500" // Warning color when approaching limit
            )}>
              {formatTime(recordingTime)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isPaused ? "Paused" : "Recording..."}
            </div>
            {recordingTime >= MAX_RECORDING_TIME - 60 && (
              <div className="text-xs text-orange-500 mt-1">
                {recordingTime >= MAX_RECORDING_TIME ? "Time limit reached!" : "Approaching 25 min limit"}
              </div>
            )}
          </motion.div>
        ) : isUploading ? (
          <div className="text-xs text-muted-foreground">Saving recording...</div>
        ) : (
          <div className="text-xs text-muted-foreground">Press to start recording</div>
        )}
      </div>
    </div>
    </ListeningLimitGuard>
  );
} 