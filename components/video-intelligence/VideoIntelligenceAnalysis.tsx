"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoPlayerWithFrameNavigation, VideoFrameMarker } from "./VideoPlayerWithFrameNavigation";
import { VideoIntelligenceNotificationService } from "@/lib/services/VideoIntelligenceNotificationService";
import { useTranslation } from "@/hooks/useTranslation";
import { Globe } from "lucide-react";

interface AnalysisResult {
  summary: string;
  frames: Array<{ timestamp: number; url: string; description?: string }>;
  audio: { transcript: string; language: string };
  objects: Array<{ label: string; timestamp: number; confidence: number }>;
  actions: Array<{ action: string; timestamp: number; confidence: number }>;
  threats: Array<{ type: string; timestamp: number; description: string }>;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  frameTimestamp?: number;
  language?: string;
}

interface VideoIntelligenceAnalysisProps {
  videoUrl: string;
  analysisResults: AnalysisResult;
  chatMessages: ChatMessage[];
  frameMarkers: VideoFrameMarker[];
  onFrameJump?: (timestamp: number) => void;
  userId: string;
  streamId: string;
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

export function VideoIntelligenceAnalysis({
  videoUrl,
  analysisResults,
  chatMessages,
  frameMarkers,
  onFrameJump,
  userId,
  streamId,
}: VideoIntelligenceAnalysisProps) {
  const [activeTab, setActiveTab] = useState("video");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const { translateText, isTranslating } = useTranslation();
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [translatedTranscript, setTranslatedTranscript] = useState<string | null>(null);

  // Real-time notifications
  useEffect(() => {
    const notificationService = new VideoIntelligenceNotificationService();
    let unsubAlerts: (() => void) | undefined;
    let unsubAnalysis: (() => void) | undefined;
    (async () => {
      unsubAlerts = await notificationService.subscribeToStreamAlerts(
        streamId,
        userId,
        (alert) => {
          // Optionally handle alert click (e.g., jump to frame)
          if (alert && alert.frame_timestamp && onFrameJump) {
            onFrameJump(alert.frame_timestamp);
          }
        }
      );
      unsubAnalysis = await notificationService.subscribeToAnalysisCompletion(
        userId,
        (analysis) => {
          // Optionally handle analysis completion (e.g., refresh UI)
        }
      );
    })();
    return () => {
      unsubAlerts && unsubAlerts();
      unsubAnalysis && unsubAnalysis();
    };
  }, [streamId, userId, onFrameJump]);

  // Multi-language translation for summary
  useEffect(() => {
    if (selectedLanguage === "en" || !analysisResults?.summary) {
      setTranslatedSummary(null);
      return;
    }
    translateText(analysisResults.summary, selectedLanguage, "en").then(setTranslatedSummary);
  }, [selectedLanguage, analysisResults?.summary, translateText]);

  // Multi-language translation for transcript
  useEffect(() => {
    if (selectedLanguage === "en" || !analysisResults?.audio?.transcript) {
      setTranslatedTranscript(null);
      return;
    }
    translateText(analysisResults.audio.transcript, selectedLanguage, analysisResults.audio.language || "en").then(setTranslatedTranscript);
  }, [selectedLanguage, analysisResults?.audio?.transcript, analysisResults?.audio?.language, translateText]);

  // Frame jump handler
  const handleFrameJump = useCallback((timestamp: number) => {
    if (onFrameJump) onFrameJump(timestamp);
  }, [onFrameJump]);

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Video Intelligence Analysis</span>
          <Globe className="h-5 w-5 ml-2" />
          <select
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
            ))}
          </select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="frames">Frames</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="objects">Objects</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          {/* Inline Video Player with Frame Navigation */}
          <TabsContent value="video">
            <VideoPlayerWithFrameNavigation
              videoUrl={videoUrl}
              markers={frameMarkers}
              onMarkerClick={marker => handleFrameJump(marker.timestamp)}
              autoPlay={false}
              loop={false}
            />
          </TabsContent>

          {/* Frames Tab */}
          <TabsContent value="frames">
            <ScrollArea className="h-96">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analysisResults.frames?.map((frame, idx) => (
                  <div key={idx} className="relative group cursor-pointer" onClick={() => handleFrameJump(frame.timestamp)}>
                    <img src={frame.url} alt={`Frame ${idx + 1}`} className="rounded shadow" />
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {frame.description || `Timestamp: ${frame.timestamp}s`}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Audio Tab */}
          <TabsContent value="audio">
            <div className="mb-4">
              <Badge variant="outline">Transcript</Badge>
              <ScrollArea className="h-48 mt-2 p-2 bg-muted/30 rounded">
                <p className="whitespace-pre-line text-sm">
                  {isTranslating ? "Translating..." : (selectedLanguage === "en" ? analysisResults.audio?.transcript : translatedTranscript) || "No transcript available."}
                </p>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Objects Tab */}
          <TabsContent value="objects">
            <ScrollArea className="h-64">
              <ul className="space-y-2">
                {analysisResults.objects?.map((obj, idx) => (
                  <li key={idx} className="flex items-center gap-2 cursor-pointer" onClick={() => handleFrameJump(obj.timestamp)}>
                    <Badge variant="secondary">{obj.label}</Badge>
                    <span className="text-xs text-muted-foreground">{obj.confidence ? `${Math.round(obj.confidence * 100)}%` : ""}</span>
                    <span className="text-xs text-muted-foreground">at {obj.timestamp}s</span>
                  </li>
                )) || <li>No objects detected.</li>}
              </ul>
            </ScrollArea>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <ScrollArea className="h-64">
              <ul className="space-y-2">
                {analysisResults.actions?.map((action, idx) => (
                  <li key={idx} className="flex items-center gap-2 cursor-pointer" onClick={() => handleFrameJump(action.timestamp)}>
                    <Badge variant="default">{action.action}</Badge>
                    <span className="text-xs text-muted-foreground">{action.confidence ? `${Math.round(action.confidence * 100)}%` : ""}</span>
                    <span className="text-xs text-muted-foreground">at {action.timestamp}s</span>
                  </li>
                )) || <li>No actions detected.</li>}
              </ul>
            </ScrollArea>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <ScrollArea className="h-96">
              <ul className="space-y-3">
                {chatMessages.map((msg, idx) => (
                  <li key={msg.id} className={msg.role === "user" ? "text-right" : "text-left"}>
                    <div className="inline-block max-w-[80%] p-2 rounded-lg bg-muted/40">
                      <span className="block text-xs text-muted-foreground mb-1">{msg.role === "user" ? "You" : "AI"} {msg.frameTimestamp !== undefined && (
                        <Button variant="link" size="sm" className="ml-2 px-1 py-0 text-xs" onClick={() => handleFrameJump(msg.frameTimestamp!)}>
                          Jump to {msg.frameTimestamp}s
                        </Button>
                      )}</span>
                      <span>{msg.content}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 