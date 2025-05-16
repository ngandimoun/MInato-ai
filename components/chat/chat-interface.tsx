// FILE: components/chat/chat-interface.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageList } from "./message-list";
import { InputArea, InputAreaHandle } from "./input-area";
import { TypingIndicator } from "./typing-indicator";
import type { DocumentFile } from "@/components/settings/settings-panel";
import { logger } from "@/memory-framework/config";
import { toast } from "@/components/ui/use-toast";
const generateId = () => globalThis.crypto.randomUUID(); // Browser-standard UUID
import { Loader2 } from "lucide-react";
import type {
  ChatMessage as Message,
  MessageAttachment,
  AnyToolStructuredData,
  OrchestratorResponse,
} from "@/lib/types/index";

interface ChatInterfaceProps {
  onDocumentsSubmit: (documents: DocumentFile[]) => void;
}

export function ChatInterface({ onDocumentsSubmit }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: `minato-initial-${generateId()}`,
      role: "assistant",
      content: "Hello! I'm Minato, your AI companion. How can I assist you today?",
      timestamp: new Date().toISOString(),
      attachments: [], audioUrl: undefined, structured_data: null, debugInfo: null,
      workflowFeedback: null, intentType: null, ttsInstructions: null,
      clarificationQuestion: null, error: undefined,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputAreaRef = useRef<InputAreaHandle>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const playSound = (soundType: "send" | "receive" | "error") => {
    logger.debug(`[ChatInterface] Sound: ${soundType}`);
  };

  const addOptimisticMessage = (
    content: string,
    attachmentsFromInputArea?: MessageAttachment[]
  ): string => {
    const optimisticId = `user-temp-${generateId()}`;
    const newMessage: Message = {
      id: optimisticId, role: "user", content: content,
      attachments: (attachmentsFromInputArea || []).map(att => ({
          ...att, storagePath: att.storagePath || null, fileId: att.fileId || null,
      })),
      timestamp: new Date().toISOString(),
      audioUrl: undefined, structured_data: null, debugInfo: null, workflowFeedback: null,
      intentType: null, ttsInstructions: null, clarificationQuestion: null, error: undefined,
    };
    setMessages((prev) => [...prev, newMessage]);
    return optimisticId;
  };

  const handleSendMessage = useCallback(
    async (text: string, attachmentsFromInputArea?: MessageAttachment[]) => {
      if (inputDisabled) return;
      const currentText = text.trim();
      const currentAttachments: MessageAttachment[] = (attachmentsFromInputArea || []).map(att => ({
        ...att, storagePath: att.storagePath || null, fileId: att.fileId || null,
      }));

      if (!currentText && currentAttachments.length === 0) {
        toast({ title: "Empty message", description: "Please type or attach something." });
        return;
      }

      const videosOnly =
        !currentText &&
        currentAttachments.length > 0 &&
        currentAttachments.every((att) => att.mimeType?.startsWith("video/"));

      if (videosOnly) {
        // Just show the video in the chat without calling the backend
        addOptimisticMessage("", currentAttachments);
        playSound("send");
        // No assistant placeholder because summary will arrive via onAssistantReply
        return;
      }

      setInputDisabled(true); setIsTyping(true); playSound("send");
      const optimisticId = addOptimisticMessage(currentText, currentAttachments);
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      let assistantMessageId = `asst-temp-${generateId()}`;
      let currentAssistantPlaceholder: Message = {
        id: assistantMessageId, role: "assistant", content: "",
        timestamp: new Date().toISOString(), attachments: [], audioUrl: undefined,
        structured_data: null, debugInfo: null, workflowFeedback: null,
        intentType: null, ttsInstructions: null, clarificationQuestion: null, error: undefined,
      };
      setMessages((prev) => [...prev, currentAssistantPlaceholder]);

      try {
        const historyForApi = messages.filter((m) => m.id !== optimisticId);
        const currentUserMessageForApi: Message = {
          id: optimisticId, role: "user", content: currentText,
          attachments: currentAttachments, timestamp: new Date().toISOString(),
          audioUrl: undefined, structured_data: null, debugInfo: null, workflowFeedback: null,
          intentType: null, ttsInstructions: null, clarificationQuestion: null, error: undefined,
        };

        const requestBodyMessages = [...historyForApi.map(m => ({
            id: m.id, role: m.role, content: m.content, name: m.name, tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id, timestamp: m.timestamp,
            audioUrl: m.audioUrl,
            attachments: m.attachments?.map(a => ({...a, file: undefined})), // Strip File object
          })),
          // For currentUserMessageForApi, ensure it also doesn't send raw File objects in `attachments`
          {
            ...currentUserMessageForApi,
            attachments: currentUserMessageForApi.attachments?.map(a => ({...a, file: undefined}))
          }
        ];


        const requestBody: { messages: Partial<Message>[]; id?: string; data?: any } = {
          messages: requestBodyMessages,
          id: historyForApi.length > 0 && historyForApi[0].id ? historyForApi[0].id.split("-")[0] || generateId() : generateId(),
        };

        const hasFileAttachments = currentAttachments.some(att => att.file instanceof File);
        logger.info(`[ChatInterface] Sending to /api/chat. Attachments in current msg: ${currentAttachments.length}. Multipart: ${hasFileAttachments}`);
        if (hasFileAttachments) {
          console.log('[DEBUG] attachmentsToSend:', currentAttachments);
        }

        let response: Response;
        if (hasFileAttachments) {
          // Build multipart/form-data so backend can process and store the files
          const formData = new FormData();
          formData.append("messages", JSON.stringify(requestBodyMessages));
          formData.append("id", requestBody.id || generateId());
          
          // Log total attachments before processing
          console.log(`[DEBUG] Preparing to attach ${currentAttachments.length} files to FormData`);
          
          let imageCount = 0;
          let videoCount = 0;
          
          currentAttachments.forEach((att, idx) => {
            if (att.file instanceof File) {
              // Check if it's a video file
              const isVideo = att.file.type.startsWith("video/");
              const isImage = att.file.type.startsWith("image/");
              
              console.log(`[DEBUG] Processing attachment ${idx}: ${att.name}, type: ${att.file.type}, size: ${att.file.size} bytes, isVideo: ${isVideo}, isImage: ${isImage}`);
              
              // Add the file to FormData with specific key naming
              if (isVideo) {
                const fieldName = `video${videoCount}`;
                formData.append(fieldName, att.file, att.name || `video_${videoCount}.mp4`);
                console.log(`[DEBUG] Added video to FormData as '${fieldName}'`);
                videoCount++;
              } else if (isImage) {
                const fieldName = `image${imageCount}`;
                formData.append(fieldName, att.file, att.name || `image_${imageCount}.jpg`);
                console.log(`[DEBUG] Added image to FormData as '${fieldName}'`);
                imageCount++;
              } else {
                const fieldName = `file${idx}`;
                formData.append(fieldName, att.file, att.name || `file_${idx}`);
                console.log(`[DEBUG] Added generic file to FormData as '${fieldName}'`);
              }
            } else {
              console.log(`[DEBUG] Skipping attachment ${idx}: ${att.name}, file is not a File instance`);
            }
          });
          
          console.log('[DEBUG] FormData details:');
          for (let pair of formData.entries()) {
            console.log('[DEBUG] FormData field:', pair[0]);
            if (pair[1] instanceof File) {
              console.log('[DEBUG] - File details:', {
                name: pair[1].name,
                size: pair[1].size,
                type: pair[1].type,
                lastModified: new Date(pair[1].lastModified).toISOString()
              });
            }
          }
          
          console.log('[DEBUG] Sending request to /api/chat with FormData');
          response = await fetch("/api/chat", { method: "POST", body: formData, signal });
        } else {
          response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal,
          });
        }

        if (signal.aborted) { logger.info("[ChatInterface] Send fetch aborted."); setMessages(prev => prev.filter(m => m.id !== assistantMessageId)); return; }
        if (!response.ok) { const errData = await response.json().catch(()=>({error: `HTTP ${response.status}`})); throw new Error(errData.error || `API fail ${response.status}`); }
        if (!response.body) throw new Error("Response body null.");

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let accumulatedText = "";
        let finalAnnotations: Partial<Omit<Message, "id"| "role" | "content" | "timestamp">> = {};
        let finalUiComponentData: AnyToolStructuredData | null = null;

        while (true) {
          if (signal.aborted) { logger.info("[ChatInterface] SSE aborted."); reader.cancel("Aborted").catch(e=>logger.warn("Err cancel:",e)); break; }
          const { value, done } = await reader.read();
          if (done) { logger.debug("[ChatInterface] SSE Stream done."); break; }

          const rawEvents = value.split("\n\n");
          for (const rawEvent of rawEvents) {
            if (!rawEvent.trim()) continue;
            let eventName = "message"; let eventDataJson = rawEvent.substring("data: ".length);
            if (rawEvent.startsWith("event: ")) {
              const lines = rawEvent.split("\n");
              eventName = lines[0].substring("event: ".length).trim();
              eventDataJson = lines.find(line => line.startsWith("data: "))?.substring("data: ".length) || "{}";
            }
            try {
              const eventData = JSON.parse(eventDataJson);
              if (eventName === "text-chunk" && typeof eventData.text === 'string') {
                accumulatedText += eventData.text;
                setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg ));
              } else if (eventName === "ui-component" && eventData.data) {
                finalUiComponentData = eventData.data as AnyToolStructuredData;
                setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, structured_data: finalUiComponentData } : msg ));
              } else if (eventName === "annotations" && typeof eventData === 'object' && eventData !== null) {
                // Filter out fields that are not part of the Message type or are handled separately
                const { id, role, content, timestamp, messageId, ...validAnnotations } = eventData;
                finalAnnotations = { ...finalAnnotations, ...validAnnotations };
              } else if (eventName === "error" && eventData.error) {
                logger.error(`[ChatInterface] SSE Error: ${eventData.error}`);
                toast({ title: "Minato Error", description: String(eventData.error), variant: "destructive" });
                setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: `Error: ${eventData.error}`, error: true } : msg ));
                reader.cancel("Error event").catch(e=>logger.warn("Err cancel:",e));
                throw new Error(String(eventData.error));
              } else if (eventName === "stream-end") { logger.debug("[ChatInterface] Stream-end server event."); }
            } catch (parseError: any) {
              logger.error("[ChatInterface] SSE JSON parse error:", parseError.message, "Raw:", eventDataJson);
              if (eventName === "message" && typeof eventDataJson === 'string' && !eventDataJson.startsWith("{")) {
                accumulatedText += eventDataJson;
                setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg ));
              }
            }
          }
        }
        setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
                return {
                    ...msg,
                    content: accumulatedText || (finalUiComponentData ? msg.content || "[Structured Data]" : "[Response processed]"),
                    structured_data: finalUiComponentData || msg.structured_data,
                    ...finalAnnotations,
                    timestamp: new Date().toISOString(),
                };
            }
            return msg;
        }));
        playSound("receive");
      } catch (error: any) {
        if (error.name === 'AbortError') {
          logger.info(`[ChatInterface] Send message fetch aborted: ${currentText.substring(0,30)}...`);
          setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
        } else {
          logger.error("[ChatInterface] Error sending message:", error);
          toast({ title: "Error", description: error.message || "Failed to send.", variant: "destructive" });
          setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: `Error: ${error.message}`, error: true } : msg ));
        }
      } finally {
        setIsTyping(false); setInputDisabled(false); abortControllerRef.current = null;
        inputAreaRef.current?.focusTextarea();
      }
    },
    [inputDisabled, messages, onDocumentsSubmit] // Added messages to dependencies
  );

  const handleSendAudio = useCallback(
    async (audioBlob: Blob) => {
      if (inputDisabled) return;
      setInputDisabled(true); setIsTyping(true); playSound("send");
      const optimisticId = `user-audio-${generateId()}`;
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioMessage: Message = {
        id: optimisticId, role: "user", content: "[Audio Message]",
        audioUrl: audioUrl, timestamp: new Date().toISOString(),
        attachments: [], structured_data: null, debugInfo: null, workflowFeedback: null,
        intentType: null, ttsInstructions: null, clarificationQuestion: null, error: undefined,
      };
      setMessages(prev => [...prev, audioMessage]);

      let assistantMessageId = `asst-temp-${generateId()}`;
      let currentAssistantPlaceholder: Message = {
        id: assistantMessageId, role: "assistant", content: "",
        timestamp: new Date().toISOString(), attachments: [], audioUrl: undefined,
        structured_data: null, debugInfo: null, workflowFeedback: null,
        intentType: null, ttsInstructions: null, clarificationQuestion: null, error: undefined,
      };
      setMessages(prev => [...prev, currentAssistantPlaceholder]);
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, `voice_msg_${Date.now()}.webm`);
        const historyForApi = messages.filter(m => m.id !== optimisticId);
        formData.append("history", JSON.stringify(historyForApi.map(m => ({...m, attachments: m.attachments?.map(a => ({...a, file: undefined})) }) )));
        formData.append("sessionId", messages.length > 0 && messages[0].id ? messages[0].id.split('-')[0] || generateId() : generateId());

        const response = await fetch("/api/audio", { method: "POST", body: formData, signal });
        if (signal.aborted) { logger.info("[ChatInterface] Send audio fetch aborted."); setMessages(prev => prev.filter(m => m.id !== assistantMessageId)); return; }
        if (!response.ok) { const errData = await response.json().catch(()=>({error: `API err ${response.status}`})); throw new Error(errData.error || `API req fail (${response.status})`); }

        const result: OrchestratorResponse = await response.json();
        setMessages(prev => prev.map(msg => {
          if (msg.id === assistantMessageId) {
            return { // Ensure all fields from Message are handled
              ...msg,
              content: result.response || "[Audio response processed]",
              audioUrl: result.audioUrl || undefined,
              structured_data: result.structuredData || null,
              intentType: result.intentType || null,
              ttsInstructions: result.ttsInstructions || null,
              debugInfo: result.debugInfo || null,
              workflowFeedback: result.workflowFeedback || null,
              clarificationQuestion: result.clarificationQuestion || null,
              error: result.error ? true : undefined,
              timestamp: new Date().toISOString(),
              // attachments will be empty for assistant audio response unless API sends some
              attachments: [], // Or map from result.attachments if it exists
            };
          }
          return msg;
        }));
        if (result.error) toast({ title: "Minato Error", description: result.error, variant: "destructive"});
        playSound("receive");
      } catch (error: any) {
       if (error.name === 'AbortError') { logger.info("[ChatInterface] Send audio fetch aborted by controller."); setMessages(prev => prev.filter(m => m.id !== assistantMessageId)); }
       else {
        logger.error("[ChatInterface] Error sending audio:", error);
        toast({ title: "Error", description: error.message || "Failed to send audio.", variant: "destructive" });
        setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: `Error: ${error.message}`, error: true } : msg ));
       }
    } finally {
      setIsTyping(false); setInputDisabled(false); abortControllerRef.current = null;
      inputAreaRef.current?.focusTextarea();
    }
  }, [inputDisabled, messages]); // Added messages as dependency

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    setImagePreviews(imageFiles.map(file => URL.createObjectURL(file)));
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && inputDisabled && abortControllerRef.current) {
        logger.info("[ChatInterface] ESC pressed. Aborting AI response.");
        abortControllerRef.current.abort("User aborted with ESC key");
        toast({ title: "Response Cancelled", description: "Minato's response generation stopped."});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputDisabled]);

  // Add a handler for assistant replies (e.g., video summary)
  const handleAssistantReply = useCallback((content: string) => {
    const assistantId = `asst-video-summary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
      attachments: [],
      audioUrl: undefined,
      structured_data: null,
      debugInfo: null,
      workflowFeedback: null,
      intentType: null,
      ttsInstructions: null,
      clarificationQuestion: null,
      error: undefined,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    playSound("receive");
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)]">
      <div className="flex-1 overflow-hidden relative">
        <MessageList messages={messages} messagesEndRef={messagesEndRef} />
        {isTyping && (
          <div className="px-1 py-4 sticky bottom-0">
             <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="bg-card text-card-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-border text-sm flex items-center w-fit"
             >
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary/80" />
                Minato is thinking...
             </motion.div>
          </div>
        )}
        {imagePreviews.map((src, idx) => (
          <img key={idx} src={src} alt={`preview-${idx}`} style={{ maxWidth: 120, maxHeight: 120, margin: 4 }} />
        ))}
      </div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}
        className="mt-2 flex-shrink-0">
        <InputArea
          ref={inputAreaRef}
          onSendMessage={handleSendMessage}
          onSendAudio={handleSendAudio}
          onDocumentsSubmit={onDocumentsSubmit}
          disabled={inputDisabled}
          onAssistantReply={handleAssistantReply}
          onVideoAnalysisStatusChange={setIsVideoAnalyzing}
        />
      </motion.div>
      {isVideoAnalyzing && (
        <div className="px-1 py-4 sticky bottom-0 z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="bg-card text-card-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-border text-sm flex items-center w-fit"
          >
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary/80" />
            Minato is analyzing your video...
          </motion.div>
        </div>
      )}
    </div>
  );
}