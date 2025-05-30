"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/chat/audio-player";

interface AudioMessage {
  id: string;
  role: string;
  timestamp: string;
  audio_url: string | null;
}

interface DebugData {
  totalMessages: number;
  audioMessagesFound: number;
  audioMessages: AudioMessage[];
  error?: string;
}

export default function DebugAudioPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fullAudioUrls, setFullAudioUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/audio-messages');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setDebugData(data);
      
      // Also fetch the full chat history to get complete audio URLs
      const historyResponse = await fetch('/api/chat/history?limit=100');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        
        // Extract full audio URLs from history
        const audioUrlMap: Record<string, string> = {};
        historyData.forEach((msg: any) => {
          if (msg.audioUrl && msg.id) {
            audioUrlMap[msg.id] = msg.audioUrl;
          }
        });
        
        setFullAudioUrls(audioUrlMap);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching debug data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const testChatHistoryEndpoint = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chat/history?limit=100');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Chat History Response:", data);
      
      // Count audio messages
      const audioMessagesInHistory = data.filter((msg: any) => msg.audioUrl).length;
      
      alert(`Chat history contains ${data.length} messages, including ${audioMessagesInHistory} with audio URLs.`);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching chat history:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Audio Messages Debug</h1>
      
      <div className="flex gap-4 mb-8">
        <Button onClick={fetchDebugData} disabled={isLoading}>
          {isLoading ? "Loading..." : "Fetch Audio Messages Debug Data"}
        </Button>
        
        <Button onClick={testChatHistoryEndpoint} variant="outline" disabled={isLoading}>
          Test Chat History Endpoint
        </Button>
      </div>
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-300 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {debugData && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h2 className="text-lg font-semibold mb-2">Summary</h2>
            <p>Total messages in conversation: {debugData.totalMessages}</p>
            <p>Audio messages found: {debugData.audioMessagesFound}</p>
          </div>
          
          <h2 className="text-xl font-semibold mt-8 mb-4">Audio Messages</h2>
          
          {debugData.audioMessagesFound === 0 ? (
            <p className="text-amber-600">No audio messages found in the database.</p>
          ) : (
            <div className="space-y-4">
              {debugData.audioMessages.map((msg) => (
                <div key={msg.id} className="p-4 border rounded bg-card">
                  <div className="mb-3">
                    <p><strong>ID:</strong> {msg.id}</p>
                    <p><strong>Role:</strong> {msg.role}</p>
                    <p><strong>Timestamp:</strong> {new Date(msg.timestamp).toLocaleString()}</p>
                    <p><strong>Audio URL (truncated):</strong> {msg.audio_url}</p>
                  </div>
                  
                  {fullAudioUrls[msg.id] ? (
                    <div className="mt-4 p-3 bg-muted rounded">
                      <h4 className="text-sm font-medium mb-2">Audio Player Test</h4>
                      <AudioPlayer 
                        isUser={msg.role === 'user'} 
                        audioUrl={fullAudioUrls[msg.id]} 
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      Full audio URL not available from chat history.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 