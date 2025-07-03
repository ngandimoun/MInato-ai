"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, StopCircle, Loader2 } from "lucide-react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { cn } from "@/lib/utils";

interface RecordingButtonProps {
  onRecordingComplete: (recordingId: string) => void;
  className?: string;
}

export function RecordingButton({ onRecordingComplete, className }: RecordingButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTitle, setRecordingTitle] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
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

  // Media recorder setup
  const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } = 
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
    setRecordingTime(0);
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    
    startRecording();
  };

  // Handle stop recording
  const handleStopRecording = () => {
    stopRecording();
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

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          className={cn(
            "h-16 w-16 rounded-full shadow-lg transition-all duration-300",
            isRecording ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={status === "recording" && !isRecording || isUploading}
        >
          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-6 w-6 animate-spin" />
              </motion.div>
            ) : isRecording ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <StopCircle className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Mic className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
        
        {/* Recording indicator */}
        {isRecording && (
          <motion.div
            className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full"
            variants={pulseVariants}
            animate="pulse"
          />
        )}
      </div>
      
      <div className="mt-3 text-center">
        {isRecording ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="text-destructive font-medium">{formatTime(recordingTime)}</div>
            <div className="text-xs text-muted-foreground mt-1">Recording...</div>
          </motion.div>
        ) : isUploading ? (
          <div className="text-xs text-muted-foreground">Saving recording...</div>
        ) : (
          <div className="text-xs text-muted-foreground">Press to start recording</div>
        )}
      </div>
    </div>
  );
} 