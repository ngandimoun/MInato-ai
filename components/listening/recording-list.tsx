"use client";

import React, { useState } from "react";
import { 
  FileAudio, 
  Loader2, 
  MoreHorizontal, 
  Play, 
  AlertTriangle,
  Check,
  Trash2,
  RefreshCw,
  Edit3,
  X,
  Save
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Recording } from "@/context/listening-context";
import { useToast } from "@/hooks/use-toast";
import { useTrialProtectedApiCall } from '@/hooks/useTrialExpirationHandler';

interface RecordingListProps {
  recordings: Recording[];
  isLoading: boolean;
  selectedRecordingId: string | null;
  onSelectRecording: (recording: Recording) => void;
  onDeleteRecording: (recordingId: string) => void;
  onUpdateRecording?: (updatedRecording: Recording) => void;
  className?: string;
}

export function RecordingList({
  recordings,
  isLoading,
  selectedRecordingId,
  onSelectRecording,
  onDeleteRecording,
  onUpdateRecording,
  className,
}: RecordingListProps) {
  const { toast } = useToast();
  const { callTrialProtectedApi } = useTrialProtectedApiCall();
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  // Format duration as MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start editing a recording title
  const handleStartEdit = (recording: Recording, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingRecordingId(recording.id);
    setEditingTitle(recording.title);
  };

  // Cancel editing
  const handleCancelEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingRecordingId(null);
    setEditingTitle("");
  };

  // Save the edited title
  const handleSaveEdit = async (recordingId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!editingTitle.trim()) {
      toast({
        title: "Error",
        description: "Title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editingTitle.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update recording title");
      }

      // Find the current recording and update it
      const currentRecording = recordings.find(r => r.id === recordingId);
      if (currentRecording) {
        const updatedRecording = { ...currentRecording, title: editingTitle.trim() };
        
        // Call the update callback if available
        if (onUpdateRecording) {
          onUpdateRecording(updatedRecording);
        }
      }

      // Clear editing state
      setEditingRecordingId(null);
      setEditingTitle("");

      toast({
        title: "Success",
        description: "Recording title updated successfully",
      });
    } catch (error) {
      console.error("Error updating recording title:", error);
      toast({
        title: "Error",
        description: "Failed to update recording title",
        variant: "destructive",
      });
    }
  };

  // Trigger manual processing for a failed or pending recording
  const handleProcessRecording = async (recordingId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const response = await callTrialProtectedApi(
        async () => fetch(`/api/recordings/${recordingId}/process`, {
          method: "POST",
        })
      );

      if (!response?.ok) {
        throw new Error("Failed to trigger processing");
      }

      toast({
        title: "Processing Started",
        description: "Your recording is now being processed",
      });
    } catch (error) {
      console.error("Error triggering processing:", error);
      toast({
        title: "Error",
        description: "Failed to start processing",
        variant: "destructive",
      });
    }
  };

  // Render the appropriate status icon
  const renderStatusIcon = (status: Recording["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (status: Recording["status"]): string => {
    switch (status) {
      case "pending":
        return "Pending";
      case "processing":
        return "Processing";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  return (
    <Card className={cn("w-[310px] md:w-full max-w-md h-[500px]", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Your Recordings</CardTitle>
        <CardDescription>Select a recording to view its analysis</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4 pb-4">
          {isLoading ? (
            // Loading skeletons
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
          ) : recordings.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <FileAudio className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">No recordings yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tap the record button to create your first recording
              </p>
            </div>
          ) : (
            // Recordings list
            recordings.map((recording) => (
              <div
                key={recording.id}
                onClick={() => onSelectRecording(recording)}
                className={cn(
                  "flex items-start gap-3 w-[280px] md:w-full mb-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedRecordingId === recording.id && "bg-primary/5 border-primary/30"
                )}
              >
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                  {selectedRecordingId === recording.id ? (
                    <Play className="h-5 w-5 text-primary" />
                  ) : (
                    <FileAudio className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    {editingRecordingId === recording.id ? (
                      <div className="flex items-center gap-1 flex-1 mr-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="h-6 text-xs px-2"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              handleSaveEdit(recording.id, e as any);
                            } else if (e.key === "Escape") {
                              e.stopPropagation();
                              handleCancelEdit(e as any);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => handleSaveEdit(recording.id, e)}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => handleCancelEdit(e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <h4 className="font-medium text-sm leading-none truncate mb-1">
                        {recording.title}
                      </h4>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="flex items-center cursor-pointer"
                          onClick={(e) => handleStartEdit(recording, e)}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Name
                        </DropdownMenuItem>
                        {(recording.status === "failed" || recording.status === "pending") && (
                          <DropdownMenuItem
                            className="flex items-center cursor-pointer"
                            onClick={(e) => handleProcessRecording(recording.id, e)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {recording.status === "failed" ? "Retry Processing" : "Process Now"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive flex items-center cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecording(recording.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="text-xs text-muted-foreground flex items-center">
                    <div className="flex items-center mr-3">
                      {renderStatusIcon(recording.status)}
                      <span className="ml-1">{getStatusText(recording.status)}</span>
                    </div>
                    <span className="mr-2">•</span>
                    <span className="mr-3">
                      {formatDuration(recording.duration_seconds)}
                    </span>
                    <span className="mr-2">•</span>
                    <span className="truncate">
                      {recording.created_at 
                        ? formatDistanceToNow(new Date(recording.created_at), { addSuffix: true }) 
                        : "Just now"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 