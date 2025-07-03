"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  ListChecks,
  BarChart3,
  TextSearch,
  Pause,
  Play,
  Volume2,
  Loader2,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnalysisResult, Recording } from "@/context/listening-context";
import { ChatInterface } from "./chat-interface";
import { RecordingSkeleton } from "./recording-skeleton";

interface RecordingAnalysisProps {
  recording: Recording | null;
  analysis: AnalysisResult | null;
  isLoading: boolean;
  className?: string;
}

export function RecordingAnalysis({
  recording,
  analysis,
  isLoading,
  className,
}: RecordingAnalysisProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<number | null>(null);

  // Set up audio player when recording changes
  useEffect(() => {
    if (recording) {
      const audio = new Audio();
      audioRef.current = audio;

      // Audio event listeners
      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener("play", () => {
        setIsPlaying(true);
      });

      audio.addEventListener("pause", () => {
        setIsPlaying(false);
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      // Clean up
      return () => {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    }
  }, [recording]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Play/pause audio
  const togglePlayback = async () => {
    if (!audioRef.current || !recording) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Load audio if not loaded
      if (!audioRef.current.src) {
        // TODO: Replace with real URL from your API
        const audioUrl = `/api/recordings/${recording.id}/audio`;
        audioRef.current.src = audioUrl;
        await audioRef.current.load();
      }
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error("Failed to play audio:", error);
      }
    }
  };

  // Seek to specific time
  const seekToTime = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
  };

  // Seek to specific segment
  const seekToSegment = (segmentId: number) => {
    if (!analysis || !audioRef.current || !analysis.transcript_json) return;
    
    const segment = analysis.transcript_json.find(s => s.id === segmentId);
    if (segment) {
      setHighlightedSegmentId(segmentId);
      seekToTime(segment.start);
      
      // Auto-scroll to segment in transcript tab
      if (activeTab !== "transcript") {
        setActiveTab("transcript");
      }
      
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedSegmentId(null), 3000);
    }
  };

  // Get sentiment class for styling
  const getSentimentClass = (sentiment: string): string => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "negative":
        return "bg-red-500/20 text-red-700 dark:text-red-400";
      default:
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    }
  };

  // Render loading state
  if (isLoading) {
    return <RecordingSkeleton className={className} />;
  }

  // Render processing or pending state
  if (recording && (recording.status === "pending" || recording.status === "processing")) {
    return (
      <Card className={cn("w-full h-[600px]", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="truncate">{recording.title}</div>
            <Badge variant="outline" className="ml-2">
              {recording.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            {recording.created_at
              ? formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })
              : "Just now"} • {formatTime(recording.duration_seconds || 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[calc(100%-120px)] text-center p-8">
          <div className="mb-6">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {recording.status === "processing" ? "Processing your recording" : "Waiting to process"}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {recording.status === "processing" 
                ? "This usually takes 1-2 minutes depending on the length of your recording. The page will update automatically when it's ready."
                : "Your recording is in the queue for processing. It will start shortly."
              }
            </p>
          </div>
          
          {recording.status === "pending" && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/recordings/${recording.id}/process`, {
                    method: "POST",
                  });
                  
                  if (response.ok) {
                    // Status will be updated via real-time subscription
                  }
                } catch (error) {
                  console.error("Failed to trigger processing:", error);
                }
              }}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Processing Now
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render failed state with retry option
  if (recording && recording.status === "failed") {
    return (
      <Card className={cn("w-full h-[600px]", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="truncate">{recording.title}</div>
            <Badge variant="destructive" className="ml-2">
              Failed
            </Badge>
          </CardTitle>
          <CardDescription>
            {recording.created_at
              ? formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })
              : "Just now"} • {formatTime(recording.duration_seconds || 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[calc(100%-120px)] text-center p-8">
          <div className="mb-6">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Processing Failed</h3>
            <p className="text-muted-foreground max-w-md">
              There was an error processing your recording. This could be due to audio format issues or temporary service problems.
            </p>
          </div>
          
          <Button
            onClick={async () => {
              try {
                const response = await fetch(`/api/recordings/${recording.id}/process`, {
                  method: "POST",
                });
                
                if (response.ok) {
                  // Status will be updated via real-time subscription
                }
              } catch (error) {
                console.error("Failed to retry processing:", error);
              }
            }}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Processing
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!recording) {
    return (
      <Card className={cn("w-full h-[600px]", className)}>
        <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No recording selected</h3>
          <p className="text-muted-foreground">
            Select a recording from the list or create a new recording to view its analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full h-[600px]", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="truncate">{recording.title}</div>
          {recording.status !== "completed" && (
            <Badge variant={recording.status === "failed" ? "destructive" : "outline"} className="ml-2">
              {recording.status}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {recording.created_at
            ? formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })
            : "Just now"} • {formatTime(recording.duration_seconds || 0)}
        </CardDescription>
        {recording.status === "completed" && (
          <div className="flex mt-3 items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <div className="flex-1 flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Progress 
                value={(currentTime / (duration || 1)) * 100} 
                className="h-2" 
              />
              <span className="text-xs text-muted-foreground min-w-[36px] text-right">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {recording.status !== "completed" ? (
          <div className="flex flex-col items-center justify-center h-[450px] text-center p-4">
            {recording.status === "failed" ? (
              <>
                <div className="rounded-full bg-destructive/10 p-3 mb-4">
                  <FileText className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-medium mb-2">Processing failed</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  There was an error processing this recording. Please try again or contact support if the issue persists.
                </p>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium mb-2">Processing your recording</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  This usually takes 1-2 minutes depending on the length of your recording. 
                  The page will update automatically when it's ready.
                </p>
              </>
            )}
          </div>
        ) : !analysis ? (
          <div className="flex flex-col items-center justify-center h-[450px] text-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading analysis</h3>
            <p className="text-muted-foreground text-sm">Please wait while we load the analysis</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[480px]">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="summary" className="text-xs">
                <FileText className="h-4 w-4 mr-1" /> Summary
              </TabsTrigger>
              <TabsTrigger value="transcript" className="text-xs">
                <TextSearch className="h-4 w-4 mr-1" /> Transcript
              </TabsTrigger>
              <TabsTrigger value="action-items" className="text-xs">
                <ListChecks className="h-4 w-4 mr-1" /> Actions
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                <BarChart3 className="h-4 w-4 mr-1" /> Insights
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs">
                <MessageSquare className="h-4 w-4 mr-1" /> Chat
              </TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary" className="h-[440px]">
              <ScrollArea className="h-full p-4">
                <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
                <p className="text-sm mb-6">{analysis.summary_text}</p>
                
                <h3 className="text-lg font-semibold mb-2">Key Themes</h3>
                <div className="space-y-3 mb-6">
                  {analysis.key_themes_json?.map((theme, index) => (
                    <div 
                      key={index} 
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => seekToSegment(theme.transcript_segment_ids?.[0])}
                    >
                      <p className="text-sm font-medium">{theme.theme}</p>
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No key themes identified</p>}
                </div>
                
                <h3 className="text-lg font-semibold mb-2">Structured Notes</h3>
                <div className="space-y-4">
                  {analysis.structured_notes_json && Object.entries(analysis.structured_notes_json).map(([topic, notes], index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <h4 className="text-sm font-semibold mb-2">{topic}</h4>
                      <ul className="space-y-1 pl-4">
                        {notes?.map((note, noteIndex) => (
                          <li key={noteIndex} className="text-sm list-disc">{note}</li>
                        )) || <li className="text-sm text-muted-foreground">No notes available</li>}
                      </ul>
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No structured notes available</p>}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Transcript Tab */}
            <TabsContent value="transcript" className="h-[440px]">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {analysis.transcript_json?.map((segment) => {
                    // Get sentiment for this segment
                    const sentimentData = analysis.sentiment_analysis_json?.find(
                      (s) => s.segment_id === segment.id
                    );
                    const sentiment = sentimentData?.sentiment || "neutral";
                    
                    return (
                      <div
                        key={segment.id}
                        className={cn(
                          "p-3 border rounded-lg transition-colors",
                          highlightedSegmentId === segment.id ? "bg-primary/10 border-primary/50" : "",
                          currentTime >= segment.start && currentTime <= segment.end ? "bg-secondary/20" : ""
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatTime(segment.start)}
                          </span>
                          <Badge
                            variant="outline" 
                            className={cn("text-xs", getSentimentClass(sentiment))}
                          >
                            {sentiment}
                          </Badge>
                        </div>
                        <p className="text-sm">{segment.text}</p>
                        <div className="flex justify-end mt-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => seekToTime(segment.start)}
                          >
                            <Play className="h-3 w-3 mr-1" /> Play
                          </Button>
                        </div>
                      </div>
                    );
                  }) || <p className="text-muted-foreground text-sm text-center p-8">No transcript available</p>}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Action Items Tab */}
            <TabsContent value="action-items" className="h-[440px]">
              <ScrollArea className="h-full p-4">
                {(!analysis.action_items_json || analysis.action_items_json.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <ListChecks className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-muted-foreground">No action items identified</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysis.action_items_json?.map((item, index) => (
                      <div 
                        key={index} 
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => seekToSegment(item.transcript_segment_id)}
                      >
                        <div className="flex justify-between">
                          <h4 className="text-sm font-medium">{item.task}</h4>
                          {item.due_date_iso && (
                            <Badge variant="outline">Due: {new Date(item.due_date_iso).toLocaleDateString()}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned to: {item.assigned_to}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            {/* Insights Tab */}
            <TabsContent value="insights" className="h-[440px]">
              <ScrollArea className="h-full p-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Sentiment Analysis</h3>
                    <div className="flex items-center mb-3 gap-3">
                      {/* Count sentiment occurrences */}
                      {(() => {
                        const sentiments = {
                          positive: 0,
                          negative: 0,
                          neutral: 0,
                        };
                        
                        analysis.sentiment_analysis_json?.forEach((s) => {
                          sentiments[s.sentiment]++;
                        });
                        
                        const total = analysis.sentiment_analysis_json?.length || 1;
                        
                        return (
                          <div className="w-full h-6 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-green-500 h-full" 
                              style={{ width: `${(sentiments.positive / total) * 100}%` }}
                              title={`${sentiments.positive} positive segments`}
                            />
                            <div 
                              className="bg-blue-500 h-full" 
                              style={{ width: `${(sentiments.neutral / total) * 100}%` }}
                              title={`${sentiments.neutral} neutral segments`}
                            />
                            <div 
                              className="bg-red-500 h-full" 
                              style={{ width: `${(sentiments.negative / total) * 100}%` }}
                              title={`${sentiments.negative} negative segments`}
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                        <span>Positive</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                        <span>Neutral</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                        <span>Negative</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* More insights could be added here */}
                </div>
              </ScrollArea>
            </TabsContent>
            
            {/* Chat Tab */}
            <TabsContent value="chat" className="h-[440px]">
              <ChatInterface 
                recordingId={recording?.id || null}
                onHighlightSegment={seekToSegment}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
} 