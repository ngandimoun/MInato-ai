"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { ChatMessage as Message, MessageAttachment, AnyToolStructuredData } from "@/lib/types/index";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";
import { StructuredDataRenderer } from "./structured-data-renderer";
import { FileText, Download, Image as ImageIconLucide, Video as VideoIconLucide, Paperclip, ExternalLink } from "lucide-react";
import { logger } from "@/memory-framework/config";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // For GitHub Flavored Markdown (tables, strikethrough, etc.)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Choose a style

const formatFileSize = (bytes?: number | null, decimals = 2): string => {
  if (bytes === undefined || bytes === null || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  const isUser = message.role === "user";
  let time = "Invalid Date";
  if (message.timestamp) {
    try {
      time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      logger.error(`[MessageItem] Invalid timestamp ID ${message.id}: "${message.timestamp}"`, e);
    }
  }

  const attachments = message.attachments ?? [];
  const hasAttachments = attachments && attachments.length > 0;
  const hasDedicatedStructuredData = !!message.structured_data;

  const contentIsStructuredJsonString = !hasDedicatedStructuredData && typeof message.content === 'string' &&
    message.content.startsWith("{") && message.content.endsWith("}") &&
    (message.content.includes('"type":') || message.content.includes('"result_type":'));

  const hasAudio = message.audioUrl;
  const isAiAudioWithTranscript = !isUser && message.audioUrl && typeof message.content === 'string' &&
    message.content && !hasDedicatedStructuredData && !contentIsStructuredJsonString;

  const createDownloadLink = (attachment: MessageAttachment): string | undefined => {
    if (attachment.file instanceof Blob) {
      try { return URL.createObjectURL(attachment.file); }
      catch (error) { console.error("Error creating object URL for download:", error); return undefined; }
    } else if (attachment.url && !attachment.url.startsWith("data:") && !attachment.url.startsWith("blob:")) {
      return attachment.url;
    } else if (attachment.storagePath && !attachment.url) {
      logger.warn(`[MessageItem] Cannot create direct download for storagePath: ${attachment.storagePath}`);
      return undefined;
    }
    return undefined;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target); }});
    }, { threshold: 0.1 });
    const currentRef = messageRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, []);

  const renderContent = () => {
    if (hasAudio && !isAiAudioWithTranscript) {
      return <AudioPlayer isUser={isUser} audioUrl={message.audioUrl} />;
    }
    if (isAiAudioWithTranscript) {
      return (
        <div className="space-y-3">
          <AudioPlayer isUser={isUser} audioUrl={message.audioUrl} />
          {typeof message.content === "string" && message.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
    // Dedicated structured data takes precedence
    if (hasDedicatedStructuredData && message.structured_data) {
      return <StructuredDataRenderer data={message.structured_data} />; // Pass object directly
    }
    // Then check if content string itself is structured JSON
    if (contentIsStructuredJsonString && typeof message.content === "string") {
      return <StructuredDataRenderer data={message.content} />; // Pass string to be parsed by renderer
    }
    // Standard text content with Markdown
    if (typeof message.content === "string") {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside my-1 space-y-0.5" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside my-1 space-y-0.5" {...props} />,
              code({ node, inline, className, children, ...props }: { node?: any; inline?: boolean; className?: string; children?: React.ReactNode }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter style={oneDark as any} language={match[1]} {...props}>
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={cn(className, "bg-muted/50 px-1 py-0.5 rounded-sm text-xs")} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }
    // Multimodal content (text + images from user usually)
    if (Array.isArray(message.content)) {
      return (
        <div className="space-y-2">
          {message.content.map((part, index) => {
            if (part.type === "text" && typeof part.text === 'string') {
              return (
                <div key={index} className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {part.text}
                  </ReactMarkdown>
                </div>
              );
            } else if (part.type === "input_image" && typeof part.image_url === 'string') {
              return <img key={index} src={part.image_url} alt={`Content image ${index + 1}`} className="mt-2 rounded-lg max-w-full h-auto max-h-60 object-contain border border-border" loading="lazy" />;
            }
            return null;
          })}
        </div>
      );
    }
    if (message.role === 'assistant' && !message.content && !hasAttachments && !hasAudio && !hasDedicatedStructuredData && !message.tool_calls) {
        return <p className="text-sm text-muted-foreground italic">Minato is processing...</p>;
    }
    return null;
  };

  const getAttachmentIcon = (type?: MessageAttachment["type"] | null) => {
    switch (type) {
      case "image": return <ImageIconLucide className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
      case "video": return <VideoIconLucide className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
      case "document": return <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
      case "audio": return <AudioPlayer isUser={false} audioUrl={undefined /* Placeholder, this is for non-primary audio attachments */} />; // Or a Mic icon
      default: return <Paperclip className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
    }
  };


  return (
    <div ref={messageRef} className={cn("group relative flex w-full", isUser ? "justify-end" : "justify-start")}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "circOut" }}
        className={cn("max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-md",
          isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card text-card-foreground rounded-tl-sm border border-border/80"
        )}
      >
        {renderContent()}

        {hasAttachments && (
          <div className={cn("mt-2.5 grid gap-2", (attachments?.length || 0) > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
            {attachments?.map((attachment) => {
              const downloadUrl = createDownloadLink(attachment);
              const attachmentIcon = getAttachmentIcon(attachment.type);
              const attachmentName = attachment.name ?? (attachment.type ? `${attachment.type} attachment` : "Attachment");
              const fileSize = formatFileSize(attachment.size);

              return (
                <div key={attachment.id} className="relative rounded-lg border border-border/30 bg-background/20 dark:bg-black/20 p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {attachmentIcon}
                      <div className="flex-1 min-w-0">
                        <p className={cn("truncate font-medium text-xs", isUser ? "text-primary-foreground/90" : "text-foreground/90")} title={attachmentName}>
                          {attachmentName}
                        </p>
                        <p className={cn("text-[10px]", isUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {fileSize} {attachment.mimeType && `(${attachment.mimeType})`}
                        </p>
                      </div>
                    </div>
                    {downloadUrl && (
                      <a href={downloadUrl} download={attachmentName} target="_blank" rel="noopener noreferrer"
                         className={cn("ml-2 flex-shrink-0 p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                           isUser ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                         )} title={`Download ${attachmentName}`}>
                        <Download className="h-3.5 w-3.5" /> <span className="sr-only">Download</span>
                      </a>
                    )}
                  </div>
                   {attachment.type === "image" && attachment.url && (
                        <img src={attachment.url} alt={attachmentName} className="mt-2 rounded-md max-w-full h-auto max-h-40 object-contain mx-auto border border-border/30" loading="lazy"/>
                    )}
                    {attachment.type === "video" && attachment.url && (
                        <video src={attachment.url} controls className="mt-2 rounded-md max-w-full h-auto max-h-40 block mx-auto border border-border/30" preload="metadata"/>
                    )}
                </div>
              );
            })}
          </div>
        )}

        <div className={cn("text-[10px] mt-1.5 opacity-60", isUser ? "text-right" : "text-left")}>
          {time}
        </div>
      </motion.div>
    </div>
  );
}