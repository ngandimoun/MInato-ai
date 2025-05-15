// FILE: components/chat/message-item.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type {
  ChatMessage as Message, // Aliasing ChatMessage to Message
  MessageAttachment,
  ChatMessageContentPart, // Ensure this is imported if used for message.content
  AnyToolStructuredData,
} from "@/lib/types/index";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";
import { StructuredDataRenderer } from "./structured-data-renderer";
import {
  FileText,
  Download,
  Image as ImageIcon,
  Video as VideoIcon,
} from "lucide-react"; // Added ImageIcon and VideoIcon
import { logger } from "@/memory-framework/config";

// Utility function for formatting file size (should be defined or imported)
const formatFileSize = (bytes?: number | null, decimals = 2): string => {
  if (bytes === undefined || bytes === null || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
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
      time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      logger.error(
        `[MessageItem] Invalid timestamp for message ID ${message.id}: "${message.timestamp}"`,
        e
      );
    }
  }

  const attachments = message.attachments;
  const hasAttachments = attachments && attachments.length > 0;

  // Check if the dedicated structured_data field has content
  const hasDedicatedStructuredData = !!message.structured_data;

  // Check if message.content itself is a string that looks like JSON (legacy or alternative)
  const contentIsStructuredJsonString =
    !hasDedicatedStructuredData && // Only consider this if dedicated field is empty
    typeof message.content === "string" &&
    message.content.startsWith("{") &&
    message.content.endsWith("}") &&
    (message.content.includes('"type":') ||
      message.content.includes('"result_type":'));

  const hasAudio = message.audioUrl;
  const isAiAudioWithTranscript =
    !isUser &&
    message.audioUrl &&
    typeof message.content === "string" && // Ensure content is string for transcript
    message.content &&
    !hasDedicatedStructuredData &&
    !contentIsStructuredJsonString;

  const createDownloadLink = (
    attachment: MessageAttachment
  ): string | undefined => {
    if (attachment.file instanceof Blob) {
      try {
        return URL.createObjectURL(attachment.file);
      } catch (error) {
        console.error("Error creating object URL for download:", error);
        return undefined;
      }
    } else if (
      attachment.url &&
      !attachment.url.startsWith("data:") &&
      !attachment.url.startsWith("blob:")
    ) {
      // If it's a web URL (e.g., from Supabase storage public URL or a pre-signed URL)
      return attachment.url;
    } else if (attachment.storagePath && !attachment.url) {
      // If only storagePath is available, a backend endpoint would be needed to generate a download link
      // For now, we can't directly create a client-side downloadable link from just a storagePath.
      // This function could be adapted if there's a known base URL for storagePath.
      logger.warn(
        `[MessageItem] Cannot create direct download for storagePath: ${attachment.storagePath} without a base URL strategy.`
      );
      return undefined;
    }
    return undefined;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    const currentRef = messageRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  const renderContent = () => {
    if (hasAudio && !isAiAudioWithTranscript) {
      return <AudioPlayer isUser={isUser} audioUrl={message.audioUrl} />;
    }
    if (isAiAudioWithTranscript) {
      return (
        <div className="space-y-3">
          <AudioPlayer isUser={isUser} audioUrl={message.audioUrl} />
          {typeof message.content === "string" &&
            message.content && ( // Ensure content is string for transcript
              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                {message.content}
              </div>
            )}
        </div>
      );
    }
    if (hasDedicatedStructuredData && message.structured_data) {
      return (
        <StructuredDataRenderer
          data={JSON.stringify(message.structured_data)}
        />
      );
    }
    if (contentIsStructuredJsonString && typeof message.content === "string") {
      return <StructuredDataRenderer data={message.content} />;
    }
    if (typeof message.content === "string") {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          {message.content}
        </div>
      );
    }
    if (Array.isArray(message.content)) {
      // Handle ChatMessageContentPart[]
      return (
        <div className="space-y-2">
          {message.content.map((part, index) => {
            if (part.type === "text") {
              return (
                <div
                  key={index}
                  className="prose prose-sm dark:prose-invert max-w-none break-words"
                >
                  {part.text}
                </div>
              );
            } else if (part.type === "image_url" && part.image_url) {
              return (
                <img
                  key={index}
                  src={part.image_url.url}
                  alt={`Content image ${index + 1}`}
                  className="mt-2 rounded-lg max-w-full h-auto max-h-60 object-contain"
                  loading="lazy"
                />
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null; // Should not happen if content is string | ChatMessageContentPart[] | null
  };

  return (
    <div
      ref={messageRef}
      className={cn(
        "group relative flex",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={
          isVisible
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 20, scale: 0.95 }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card text-card-foreground rounded-tl-sm border border-border"
        )}
      >
        {renderContent()}

        {/* Attachments (distinct from multimodal content parts) */}
        {hasAttachments && (
          <div
            className={cn(
              "mt-3 grid gap-2",
              (attachments?.length || 0) > 1 ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {attachments?.map((attachment) => {
              const downloadUrl = createDownloadLink(attachment);
              let icon = (
                <FileText
                  className={cn(
                    "h-6 w-6 flex-shrink-0",
                    isUser
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                />
              );
              if (attachment.type === "image")
                icon = (
                  <ImageIcon
                    className={cn(
                      "h-6 w-6 flex-shrink-0",
                      isUser
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  />
                );
              else if (attachment.type === "video")
                icon = (
                  <VideoIcon
                    className={cn(
                      "h-6 w-6 flex-shrink-0",
                      isUser
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    )}
                  />
                );
              // Audio attachments are typically handled by message.audioUrl, but if they appear here:
              // else if (attachment.type === "audio") icon = <Mic className={cn("h-6 w-6 ...")} />;

              return (
                <div
                  key={attachment.id}
                  className="relative rounded-lg overflow-hidden border border-border/20 bg-black/5 dark:bg-white/5"
                >
                  {attachment.type === "image" && attachment.url && (
                    <img
                      src={attachment.url}
                      alt={attachment.name || "Attached image"}
                      className="w-full h-auto max-w-xs sm:max-w-sm object-contain aspect-video mx-auto"
                      loading="lazy"
                    />
                  )}
                  {attachment.type === "video" && attachment.url && (
                    <video
                      src={attachment.url}
                      controls
                      className="w-full h-auto max-w-xs sm:max-w-sm block mx-auto"
                      preload="metadata"
                    />
                  )}
                  {(attachment.type === "document" ||
                    attachment.type ===
                      "audio") /* Add other non-previewable types here */ && (
                    <div className="flex items-center justify-between gap-2 p-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {icon}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "truncate font-medium",
                              isUser
                                ? "text-primary-foreground"
                                : "text-foreground"
                            )}
                            title={attachment.name || undefined}
                          >
                            {attachment.name || "Attachment"}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              isUser
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      {downloadUrl && (
                        <a
                          href={downloadUrl}
                          download={attachment.name || "attachment"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "ml-2 flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                            isUser
                              ? "text-primary-foreground/80 hover:text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title={`Download ${attachment.name || "attachment"}`}
                        >
                          <Download className="h-4 w-4" />{" "}
                          <span className="sr-only">Download</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={cn(
            "text-xs mt-1.5 opacity-70",
            isUser ? "text-right" : "text-left"
          )}
        >
          {time}
        </div>
      </motion.div>
    </div>
  );
}
