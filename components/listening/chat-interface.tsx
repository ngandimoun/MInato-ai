import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AIMessage } from "./ai-message";
import { UserMessage } from "./user-message";
import { useAuth } from "@/context/auth-provider";

interface Message {
  role: "user" | "ai";
  content: string;
  citations?: Array<{
    text: string;
    timestamp: string;
    segment_id: number;
  }>;
}

interface ChatInterfaceProps {
  recordingId: string | null;
  onHighlightSegment: (segmentId: number) => void;
}

export function ChatInterface({ recordingId, onHighlightSegment }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset messages when recording changes
  useEffect(() => {
    setMessages([]);
  }, [recordingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !recordingId) return;
    
    // Add user message
    const userMessage = { role: "user" as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Call the API
      const response = await fetch(`/api/recordings/${recordingId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuestion: input,
          conversationHistory: messages,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add AI message
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: data.answer,
          citations: data.citations,
        },
      ]);
    } catch (error) {
      console.error("Error chatting with recording:", error);
      toast({
        title: "Error",
        description: "Failed to process your question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!recordingId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="rounded-full bg-primary/10 p-3 mb-4">
          <Send className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-medium mb-2">Select a recording to chat</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Choose a recording from the list to ask questions about the conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden shadow-sm bg-card">
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="text-sm font-medium">Chat with Recording</h3>
        <div className="text-xs text-muted-foreground">
          Ask questions about this conversation
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center p-6"
          >
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ask questions about the recording to get insights from the conversation.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4"
              >
                {message.role === "user" ? (
                  <UserMessage 
                    message={message.content} 
                    userImage={user?.user_metadata?.avatar_url} 
                    userName={user?.user_metadata?.full_name}
                  />
                ) : (
                  <AIMessage 
                    answer={message.content} 
                    citations={message.citations || []} 
                    onHighlight={onHighlightSegment}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-sm font-medium">AI</span>
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this recording..."
          disabled={isLoading || !recordingId}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim() || !recordingId}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
} 