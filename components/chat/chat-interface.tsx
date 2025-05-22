// FILE: components/chat/chat-interface.tsx
"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageList } from "./message-list";
import { InputArea, InputAreaHandle } from "./input-area";
import type { DocumentFile } from "@/components/settings/settings-panel";
import { logger } from "@/memory-framework/config";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
const generateId = () => globalThis.crypto.randomUUID();
import { Loader2 } from "lucide-react";
import type {
ChatMessage as Message,
MessageAttachment,
AnyToolStructuredData,
OrchestratorResponse,
ChatMessageContentPart,
ChatMessageContentPartText,
ChatMessageContentPartInputImage,
} from "@/lib/types/index";
interface ChatInterfaceProps {
onDocumentsSubmit: (documents: DocumentFile[]) => void;
}
const MESSAGES_PER_PAGE_HISTORY = 30;
export function ChatInterface({ onDocumentsSubmit }: ChatInterfaceProps) {
const [messages, setMessages] = useState<Message[]>([]);
const [isLoadingHistory, setIsLoadingHistory] = useState(true);
const [hasMoreHistory, setHasMoreHistory] = useState(true);
const [historyPage, setHistoryPage] = useState(1);
const [isTyping, setIsTyping] = useState(false);
const [inputDisabled, setInputDisabled] = useState(false);
const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
const messagesEndRef = useRef<HTMLDivElement>(null);
const abortControllerRef = useRef<AbortController | null>(null);
const inputAreaRef = useRef<InputAreaHandle>(null);
const isFetchingMoreHistoryRef = useRef(false);
const messagesRef = useRef(messages);
useEffect(() => {
messagesRef.current = messages;
}, [messages]);
const fetchChatHistory = useCallback(async (page: number, initialLoad = false) => {
if (isFetchingMoreHistoryRef.current && !initialLoad) return;
if (initialLoad) setIsLoadingHistory(true);
else isFetchingMoreHistoryRef.current = true;
logger.info(`[ChatInterface] Fetching chat history page ${page}...`);
try {
const response = await fetch(`/api/chat/history?page=${page}&limit=${MESSAGES_PER_PAGE_HISTORY}`);
if (!response.ok) {
const errorData = await response.json().catch(() => ({}));
throw new Error(errorData.error || `Failed to fetch history: ${response.status}`);
}
const fetchedMessages = (await response.json()) as Message[];
setMessages(prevMessages => {
const existingMessageIds = new Set(prevMessages.map(m => m.id));
const newMessages = fetchedMessages.filter(m => m.id && !existingMessageIds.has(m.id));
const combined = [...newMessages, ...prevMessages];
const uniqueMessages = Array.from(new Map(combined.map(m => [m.id, m])).values());
return uniqueMessages.sort((a, b) => (new Date(a.timestamp || 0)).getTime() - (new Date(b.timestamp || 0)).getTime());
});
setHasMoreHistory(fetchedMessages.length === MESSAGES_PER_PAGE_HISTORY);
if (fetchedMessages.length === MESSAGES_PER_PAGE_HISTORY && initialLoad) {
setHistoryPage(prevPage => prevPage + 1);
} else if (fetchedMessages.length < MESSAGES_PER_PAGE_HISTORY) {
setHasMoreHistory(false);
}
if (initialLoad && fetchedMessages.length === 0 && messagesRef.current.length === 0) {
setMessages([{
id: `minato-initial-${generateId()}`,
role: "assistant",
content: "Hello! I'm Minato, your AI companion. How can I assist you today?",
timestamp: new Date().toISOString(),
attachments: [],
audioUrl: undefined,
structured_data: null,
debugInfo: null,
workflowFeedback: null,
intentType: null,
ttsInstructions: null,
clarificationQuestion: null,
error: undefined
}]);
}
} catch (error: any) {
logger.error(`[ChatInterface] Error fetching chat history: ${error.message}`);
toast({ title: "Could not load chat history", description: error.message, variant: "destructive" });
if (initialLoad && messagesRef.current.length === 0) {
setMessages([{
id: `minato-initial-${generateId()}`,
role: "assistant",
content: "Hello! I'm Minato, your AI companion. How can I assist you today?",
timestamp: new Date().toISOString(),
attachments: [],
audioUrl: undefined,
structured_data: null,
debugInfo: null,
workflowFeedback: null,
intentType: null,
ttsInstructions: null,
clarificationQuestion: null,
error: undefined
}]);
}
} finally {
if (initialLoad) setIsLoadingHistory(false);
isFetchingMoreHistoryRef.current = false;
}
}, []);
useEffect(() => {
fetchChatHistory(1, true);
}, [fetchChatHistory]);
const playSound = (soundType: "send" | "receive" | "error") => {
logger.debug(`[ChatInterface] Sound: ${soundType}`);
};
const addOptimisticMessage = (
userMessageContent: string | ChatMessageContentPart[],
attachmentsForMessage: MessageAttachment[]
): string => {
const optimisticId = `user-temp-${generateId()}`;
const newMessage: Message = {
id: optimisticId, role: "user", content: userMessageContent,
attachments: attachmentsForMessage.filter(att => att.type !== 'image' || !att.url?.startsWith('data:') && !att.url?.startsWith('blob:')),
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
...att,
file: att.file,
storagePath: att.storagePath ?? undefined
}));
if (!currentText && currentAttachments.length === 0) {
toast({ title: "Empty message", description: "Please type something or add an attachment." });
return;
}
setInputDisabled(true); setIsTyping(true); playSound("send");
let userMessageContentForState: string | ChatMessageContentPart[];
const imageContentPartsForState: ChatMessageContentPartInputImage[] = [];
const nonImageAttachmentsForMessageState: MessageAttachment[] = [];
currentAttachments.forEach(att => {
if (att.type === 'image' && att.url && (att.url.startsWith('data:') || att.url.startsWith('blob:'))) {
imageContentPartsForState.push({ type: "input_image", image_url: att.url });
} else {
nonImageAttachmentsForMessageState.push(att);
}
});
if (imageContentPartsForState.length > 0) {
userMessageContentForState = [{ type: "text", text: currentText }, ...imageContentPartsForState];
} else {
userMessageContentForState = currentText;
}
const optimisticId = addOptimisticMessage(userMessageContentForState, nonImageAttachmentsForMessageState);
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
let streamProcessingError: Error | null = null;
try {
const historyForApi = messagesRef.current.filter((m) => m.id !== optimisticId && m.id !== assistantMessageId);
const apiUserMessageContentParts: ChatMessageContentPart[] = [];
if (currentText) {
apiUserMessageContentParts.push({ type: "text", text: currentText });
}
const apiAttachments: MessageAttachment[] = [];
currentAttachments.forEach(att => {
if (att.type === 'image' && att.url && (att.url.startsWith('data:') || att.url.startsWith('blob:'))) {
apiUserMessageContentParts.push({ type: 'input_image', image_url: att.url });
} else {
apiAttachments.push(att);
}
});
const currentUserMessageForApi: Message = {
id: optimisticId, role: "user",
content: apiUserMessageContentParts.length > 0 ? apiUserMessageContentParts : (currentText || null),
attachments: apiAttachments,
timestamp: new Date().toISOString(),
};
const requestBodyMessages: Partial<Message>[] = [
...historyForApi.map(m => ({
id: m.id, role: m.role, content: m.content, name: m.name, tool_calls: m.tool_calls,
tool_call_id: m.tool_call_id, timestamp: m.timestamp, audioUrl: m.audioUrl,
attachments: m.attachments?.map(a => ({ ...a, file: undefined })),
})),
currentUserMessageForApi
];
const requestBody: { messages: Partial<Message>[]; id?: string; data?: any } = {
messages: requestBodyMessages,
};
const hasFileObjects = apiAttachments.some(att => att.file instanceof File || att.file instanceof Blob);
logger.info(`[ChatInterface] Sending to /api/chat. Attachments needing upload by API: ${apiAttachments.filter(a=>a.file).length}. Has File objects for API: ${hasFileObjects}`);
let response: Response;
if (hasFileObjects) {
const formData = new FormData();
const messagesForFormData = requestBodyMessages.map(m => {
if (m.id === optimisticId && m.attachments) { // Ensure attachments exists before filtering
return { ...m, attachments: m.attachments.filter(att => !(att.file instanceof File || att.file instanceof Blob)).map(att => ({...att, file: undefined})) };
}
return {...m, attachments: m.attachments?.map(a => ({...a, file: undefined}))}; // Ensure file is undefined for all other messages too
});
formData.append("messages", JSON.stringify(messagesForFormData));
if(requestBody.id) formData.append("id", requestBody.id);
if(requestBody.data) formData.append("data", JSON.stringify(requestBody.data));
apiAttachments.forEach((att, idx) => { if (att.file instanceof File || att.file instanceof Blob) { formData.append(`attachment_${idx}`, att.file, att.name); }});
response = await fetch("/api/chat", { method: "POST", body: formData, signal });
} else {
response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody), signal });
}
if (signal.aborted) {
logger.info(`[ChatInterface] Send fetch aborted by client.`);
setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
setIsTyping(false);
setInputDisabled(false);
abortControllerRef.current = null;
if (inputAreaRef.current) inputAreaRef.current.focusTextarea();
return;
}
if (!response.ok) {
let errorDetail = `API error: ${response.status}`;
let errorBodyText = "Could not read error response body.";
try {
errorBodyText = await response.text();
const errData = JSON.parse(errorBodyText);
errorDetail = errData.error || JSON.stringify(errData);
} catch (e) {
errorDetail = errorBodyText.substring(0, 200) || `HTTP ${response.status}`;
}
throw new Error(errorDetail);
}
if (!response.body) { throw new Error("Response body is null."); }
const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
let accumulatedText = "";
let finalAnnotations: Partial<Omit<Message, "id"| "role" | "content" | "timestamp">> = {};
let finalUiComponentData: AnyToolStructuredData | null = null;
let finalAttachmentsFromAssistant: MessageAttachment[] = [];
let finalAssistantMessageIdFromServer: string | null = null;
let loopError: Error | null = null;
try {
while (true) {
if (signal.aborted) { logger.info(`[ChatInterface] SSE processing aborted by client.`); break; }
const { value, done } = await reader.read();
if (done) { logger.debug(`[ChatInterface] SSE Stream done.`); break; }
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
                const { id, role, content, timestamp, messageId, attachments, ...validAnnotations } = eventData;
                finalAnnotations = { ...finalAnnotations, ...validAnnotations };
                if (messageId) finalAssistantMessageIdFromServer = messageId;
                if (Array.isArray(attachments)) {
                    finalAttachmentsFromAssistant = attachments;
                }
            } else if (eventName === "error" && eventData.error) { 
                logger.error(`[ChatInterface SSE Error Event]: ${eventData.error} (Status: ${eventData.statusCode})`);
                toast({title: "Assistant Error", description: eventData.error, variant: "destructive"});
                setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: `Error: ${eventData.error}`, error: true } : msg));
            } else if (eventName === "stream-end") { 
                logger.debug("[ChatInterface] Stream-end server event.", eventData);
                if (eventData.assistantMessageId) finalAssistantMessageIdFromServer = eventData.assistantMessageId;
            }
        } catch (parseError: any) { 
            logger.error(`[ChatInterface] Error parsing SSE event data: ${parseError.message} Raw event: ${rawEvent}`);
        }
    }
}

} catch (readError: any) {
logger.error(`[ChatInterface] Error reading from SSE stream: ${readError.message}`);
streamProcessingError = readError;
setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: `Stream error: ${readError.message}`, error: true } : m));
} finally {
try { if (!signal.aborted) await reader.cancel("Stream processing finished or errored"); }
catch (cancelError: any) { logger.warn("[ChatInterface] Error cancelling reader (already closed?):", cancelError.message); }
}
if (streamProcessingError) throw streamProcessingError;
setMessages(prev => prev.map(msg => {
if (msg.id === assistantMessageId) {
return {
...msg,
id: finalAssistantMessageIdFromServer || assistantMessageId,
content: accumulatedText || (finalUiComponentData ? msg.content || "[Structured Data]" : (finalAttachmentsFromAssistant.length > 0 ? msg.content || "[Attachment(s) Received]" : "[Response processed]")),
structured_data: finalUiComponentData || msg.structured_data,
attachments: finalAttachmentsFromAssistant.length > 0 ? finalAttachmentsFromAssistant : msg.attachments,
...finalAnnotations,
timestamp: new Date().toISOString(),
error: msg.error || false
};
}
return msg;
}));
playSound("receive");
} catch (error: any) {
logger.error(`[ChatInterface handleSendMessage] Outer error: ${error.message}`, error);
toast({ title: "Error Sending Message", description: error.message, variant: "destructive" });
setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: `Error: ${error.message}`, error: true } : m));
}
finally {
setIsTyping(false);
setInputDisabled(false);
if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
abortControllerRef.current.abort("Process completed or errored out in outer finally");
}
abortControllerRef.current = null;
if (inputAreaRef.current) inputAreaRef.current.focusTextarea();
}
},
[inputDisabled, onDocumentsSubmit, messagesRef]
);
const handleSendAudio = useCallback(
async (audioBlob: Blob) => {
if (inputDisabled) return;
setInputDisabled(true);
setIsTyping(true);
playSound("send");
const optimisticId = `user-audio-${generateId()}`;
const audioUrl = URL.createObjectURL(audioBlob);
const audioAttachment: MessageAttachment = {
id: `audio-att-${generateId()}`,
type: 'audio',
name: `voice_message_${Date.now()}.${audioBlob.type.split('/')[1] || 'webm'}`,
url: audioUrl,
file: audioBlob,
size: audioBlob.size,
mimeType: audioBlob.type
};
const audioMessage: Message = {
id: optimisticId,
role: "user",
content: "[Audio Message]",
audioUrl: audioUrl,
attachments: [audioAttachment],
timestamp: new Date().toISOString(),
structured_data: null, debugInfo: null, workflowFeedback: null,
intentType: null, ttsInstructions: null, clarificationQuestion: null, error: undefined
};
setMessages(prev => [...prev, audioMessage]);
let assistantMessageId = `asst-temp-${generateId()}`;
let currentAssistantPlaceholder: Message = {
id: assistantMessageId, role: "assistant", content: "",
timestamp: new Date().toISOString(), attachments: [], audioUrl: undefined,
structured_data: null, debugInfo: null, workflowFeedback: null,
intentType: null, ttsInstructions: null, clarificationQuestion: null, error: undefined
};
setMessages(prev => [...prev, currentAssistantPlaceholder]);
abortControllerRef.current = new AbortController();
const signal = abortControllerRef.current.signal;
let finalAssistantMessageIdFromServer: string | null = null;
try {
const formData = new FormData();
formData.append("audio", audioBlob, audioAttachment.name);
const historyForApi = messagesRef.current.filter(m => m.id !== optimisticId && m.id !== assistantMessageId);
const messagesForFormData = historyForApi.map(m => ({
id: m.id, role: m.role, content: m.content, timestamp: m.timestamp,
attachments: m.attachments?.map(a => ({...a, file: undefined}))
}));
messagesForFormData.push({
id: optimisticId, role: "user",
content: "[User sent an audio message]",
timestamp: audioMessage.timestamp,
attachments: []
});
formData.append("messages", JSON.stringify(messagesForFormData));
const response = await fetch("/api/audio", { method: "POST", body: formData, signal });
if (signal.aborted) {
logger.info("[ChatInterface] Audio send fetch aborted by client.");
setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
setIsTyping(false);
setInputDisabled(false);
abortControllerRef.current = null;
if (audioUrl) URL.revokeObjectURL(audioUrl);
if (inputAreaRef.current) inputAreaRef.current.focusTextarea();
return;
}
if (!response.ok) {
let errorDetail = `API error: ${response.status}`;
let errorBodyText = "Could not read error response body.";
try {
errorBodyText = await response.text();
const errData = JSON.parse(errorBodyText);
errorDetail = errData.error || JSON.stringify(errData);
} catch (e) {
errorDetail = errorBodyText.substring(0, 200) || `HTTP ${response.status}`;
}
throw new Error(errorDetail);
}
const orchestratorResponse: OrchestratorResponse = await response.json();
if (orchestratorResponse.error && !orchestratorResponse.clarificationQuestion) {
logger.error("[ChatInterface handleSendAudio] Orchestrator Error:", orchestratorResponse.error);
setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: `Error: ${orchestratorResponse.error}`, error: true } : msg));
toast({ title: "Audio Processing Error", description: orchestratorResponse.error, variant: "destructive" });
} else {
finalAssistantMessageIdFromServer = (orchestratorResponse.debugInfo as any)?.assistantMessageId || `asst-${generateId()}`;
setMessages(prev => prev.map(msg => {
if (msg.id === assistantMessageId) {
return {
...msg,
id: finalAssistantMessageIdFromServer!,
content: orchestratorResponse.response || (orchestratorResponse.structuredData ? "[Structured Data]" : "[Audio processed]"),
structured_data: orchestratorResponse.structuredData || null,
attachments: orchestratorResponse.attachments || [],
audioUrl: orchestratorResponse.audioUrl || undefined,
intentType: orchestratorResponse.intentType || null,
ttsInstructions: orchestratorResponse.ttsInstructions || null,
clarificationQuestion: orchestratorResponse.clarificationQuestion || null,
debugInfo: orchestratorResponse.debugInfo || null,
workflowFeedback: orchestratorResponse.workflowFeedback || null,
timestamp: new Date().toISOString(),
error: !!orchestratorResponse.error,
};
}
return msg;
}));
playSound("receive");
}
} catch (error: any) {
logger.error(`[ChatInterface handleSendAudio] Error: ${error.message} ${error.stack}`);
toast({ title: "Error Processing Audio", description: error.message, variant: "destructive" });
setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: `Error: ${error.message}`, error: true } : m));
} finally {
setIsTyping(false);
setInputDisabled(false);
if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
abortControllerRef.current.abort("Process completed or errored out in audio finally");
}
abortControllerRef.current = null;
if (audioUrl) URL.revokeObjectURL(audioUrl);
if (inputAreaRef.current) inputAreaRef.current.focusTextarea();
}
}, [inputDisabled, messagesRef]);
useEffect(() => {
if (!isLoadingHistory && messagesEndRef.current) {
messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
}
}, [messages, isTyping, isLoadingHistory]);
useEffect(() => {
const handleKeyDown = (event: KeyboardEvent) => {
if (event.key === "Escape" && inputDisabled && abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
logger.info("[ChatInterface] ESC pressed. Aborting AI response.");
abortControllerRef.current.abort("User aborted with ESC key");
toast({ title: "Response Cancelled", description: "Minato's response generation stopped."});
}
};
window.addEventListener("keydown", handleKeyDown);
return () => window.removeEventListener("keydown", handleKeyDown);
}, [inputDisabled]);
const handleLoadMoreHistory = () => {
if (hasMoreHistory && !isFetchingMoreHistoryRef.current) {
const nextPageToFetch = Math.floor(messages.length / MESSAGES_PER_PAGE_HISTORY) + 1;
fetchChatHistory(nextPageToFetch);
}
}
return (
<div className="flex flex-col h-[calc(100vh-6.5rem)]">
{isLoadingHistory && messages.length === 0 && (
<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
<Loader2 className="h-8 w-8 animate-spin text-primary mb-3"/>
<p>Loading conversation...</p>
</div>
)}
{(!isLoadingHistory || messages.length > 0) && (
<>
<div className="flex-1 overflow-hidden relative">
{hasMoreHistory && !isFetchingMoreHistoryRef.current && messages.length > 0 && (
<div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pt-1">
<Button variant="outline" size="sm" onClick={handleLoadMoreHistory} className="bg-background/80 backdrop-blur-sm text-xs h-7 px-2">
Load Older Messages
</Button>
</div>
)}
{isFetchingMoreHistoryRef.current && messages.length > 0 && (
<div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pt-1 flex justify-center text-muted-foreground text-xs items-center bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md">
<Loader2 className="h-3 w-3 animate-spin mr-1.5"/> Loading more...
</div>
)}
<MessageList messages={messages} messagesEndRef={messagesEndRef} />
{isTyping && !isVideoAnalyzing && (
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
disabled={inputDisabled || isVideoAnalyzing}
onVideoAnalysisStatusChange={setIsVideoAnalyzing}
/>
</motion.div>
</>
)}
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