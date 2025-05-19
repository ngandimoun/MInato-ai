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
const generateId = () => globalThis.crypto.randomUUID();
import { Loader2 } from "lucide-react";
import type {
  ChatMessage as Message,
  MessageAttachment,
  AnyToolStructuredData,
  OrchestratorResponse,
  ChatMessageContentPart,
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
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false); // Keep for UI feedback
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputAreaRef = useRef<InputAreaHandle>(null);
  // imagePreviews state can be removed if attachments are handled directly by InputArea for its previews
  // and full MessageAttachment objects are passed up for sending.

  const playSound = (soundType: "send" | "receive" | "error") => {
    logger.debug(`[ChatInterface] Sound: ${soundType}`);
  };

  const addOptimisticMessage = (
    content: string | Message['content'], // Allow complex content
    attachmentsFromInputArea?: MessageAttachment[]
  ): string => {
    const optimisticId = `user-temp-${generateId()}`;
    const newMessage: Message = {
      id: optimisticId, role: "user", content: content,
      attachments: (attachmentsFromInputArea || []).map(att => ({
          ...att, storagePath: att.storagePath ?? undefined
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
      // MessageAttachment now includes the File object for the backend
      const currentAttachments: MessageAttachment[] = (attachmentsFromInputArea || []).map(att => ({
        ...att,
        file: att.file, // Ensure File object is passed
        storagePath: att.storagePath ?? undefined
      }));

      if (!currentText && currentAttachments.length === 0) {
        toast({ title: "Empty message", description: "Please type or attach something." });
        return;
      }
      
      // REMOVED "videosOnly" early return. All messages go to /api/chat
      
      setInputDisabled(true); setIsTyping(true); playSound("send");

      // Construct the user message content based on text and attachments
      let userMessageContent: string | Message['content'];
      const imageAttachmentsForContent = currentAttachments.filter(att => att.type === 'image' && att.url);
      
      if (imageAttachmentsForContent.length > 0) {
        // userMessageContent doit être un tableau de ChatMessageContentPart
        const contentParts: ChatMessageContentPart[] = [{ type: "text", text: currentText }];
        imageAttachmentsForContent.forEach(imgAtt => {
          contentParts.push({
            type: "input_image",
            image_url: imgAtt.url!, // url should be dataURI from preview or captured
          });
        });
        userMessageContent = contentParts;
      } else {
        userMessageContent = currentText;
      }
      
      const optimisticId = addOptimisticMessage(userMessageContent, currentAttachments);
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
        // The last user message for API now includes all attachments, including File objects
        const currentUserMessageForApi: Partial<Message> = {
          id: optimisticId, role: "user", content: userMessageContent,
          attachments: currentAttachments, // Pass full attachments
          timestamp: new Date().toISOString(),
        };

        const requestBodyMessages = [...historyForApi.map(m => ({
            id: m.id, role: m.role, content: m.content, name: m.name, tool_calls: m.tool_calls,
            tool_call_id: m.tool_call_id, timestamp: m.timestamp,
            audioUrl: m.audioUrl,
            // For history, strip File objects if they were ever included (they shouldn't be based on current logic)
            attachments: m.attachments?.map(a => ({...a, file: undefined})),
          })),
          currentUserMessageForApi // Send the current message with File objects in attachments
        ];

        const requestBody: { messages: Partial<Message>[]; id?: string; data?: any } = {
          messages: requestBodyMessages,
          id: historyForApi.length > 0 && historyForApi[0].id ? historyForApi[0].id.split("-")[0] || generateId() : generateId(),
        };
        
        const hasFileObjects = currentAttachments.some(att => att.file instanceof File);
        logger.info(`[ChatInterface] Sending to /api/chat. Attachments in current msg: ${currentAttachments.length}. Has File objects: ${hasFileObjects}`);
        
        let response: Response;
        if (hasFileObjects) {
          const formData = new FormData();
          // Only messages (without File objects) go into the 'messages' JSON string part
          const messagesForFormData = requestBodyMessages.map(m => ({
            ...m,
            attachments: m.attachments?.map(a => ({ ...a, file: undefined })) // Strip File here
          }));
          formData.append("messages", JSON.stringify(messagesForFormData));
          if(requestBody.id) formData.append("id", requestBody.id);
          if(requestBody.data) formData.append("data", JSON.stringify(requestBody.data));

          currentAttachments.forEach((att, idx) => {
            if (att.file instanceof File) {
              formData.append(`attachment_${idx}`, att.file, att.name); // Use a consistent naming pattern
            }
          });
          response = await fetch("/api/chat", { method: "POST", body: formData, signal });
        } else {
          response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody), // All attachments are URLs or already processed
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
        setIsVideoAnalyzing(false); // Remplace onVideoAnalysisStatusChange par setIsVideoAnalyzing
      }
    },
    [inputDisabled, messages, onDocumentsSubmit] 
  );

  const handleSendAudio = useCallback(
    async (audioBlob: Blob) => {
      if (inputDisabled) return;
      setInputDisabled(true); setIsTyping(true); playSound("send");
      const optimisticId = `user-audio-${generateId()}`;
      const audioUrl = URL.createObjectURL(audioBlob); // URL for local preview
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
        // Strip File objects from history attachments before sending
        formData.append("history", JSON.stringify(historyForApi.map(m => ({...m, attachments: m.attachments?.map(a => ({...a, file: undefined})) }) )));
        formData.append("sessionId", messages.length > 0 && messages[0].id ? messages[0].id.split('-')[0] || generateId() : generateId());

        const response = await fetch("/api/audio", { method: "POST", body: formData, signal });
        if (signal.aborted) { logger.info("[ChatInterface] Send audio fetch aborted."); setMessages(prev => prev.filter(m => m.id !== assistantMessageId)); return; }
        if (!response.ok) { const errData = await response.json().catch(()=>({error: `API err ${response.status}`})); throw new Error(errData.error || `API req fail (${response.status})`); }

        const result: OrchestratorResponse = await response.json();
        setMessages(prev => prev.map(msg => {
          if (msg.id === assistantMessageId) {
            return { 
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
              attachments: result.attachments || [], 
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
      URL.revokeObjectURL(audioUrl); // Clean up local blob URL
    }
  }, [inputDisabled, messages]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)]">
      <div className="flex-1 overflow-hidden relative">
        <MessageList messages={messages} messagesEndRef={messagesEndRef} />
        {isTyping && !isVideoAnalyzing && ( // Only show generic typing if not video analyzing
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
      </div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}
        className="mt-2 flex-shrink-0">
        <InputArea
          ref={inputAreaRef}
          onSendMessage={handleSendMessage}
          onSendAudio={handleSendAudio}
          onDocumentsSubmit={onDocumentsSubmit}
          disabled={inputDisabled || isVideoAnalyzing} // Disable input while video analyzing too
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