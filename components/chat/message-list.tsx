"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageItem } from "./message-item";
import { DateSeparator } from "./date-separator";
import type { ChatMessage as Message } from "@/lib/types/index";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/memory-framework/config";

interface MessageListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, messagesEndRef }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the ScrollArea's Radix viewport
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setIsAtBottom(true); // Assume we are at bottom after programmatic scroll
  };

  // Auto-scroll if user is near the bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, isAtBottom]); // Dependency on isAtBottom added

  useEffect(() => {
    const viewport = scrollAreaRef.current; // This ref is now directly on the ScrollArea viewport child
    const handleScroll = () => {
      if (!viewport) return;
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // User is considered at bottom if less than 100px from it
      setIsAtBottom(isNearBottom);
      setShowScrollButton(!isNearBottom && scrollHeight > clientHeight + 50); // Show if not near bottom and scrollable
    };

    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      // Initial check
      handleScroll();
      // Scroll to bottom on initial load if messages are present
      if (messages.length > 0) {
        setTimeout(() => scrollToBottom("auto"), 100); // Slight delay for layout
      }
      return () => viewport.removeEventListener("scroll", handleScroll);
    }
  }, [messages]); // Re-run when messages change to re-evaluate scroll button visibility

  const groupedMessages: { [dateKey: string]: Message[] } = {};
  messages.forEach((message) => {
    if (message.timestamp === undefined || message.timestamp === null) {
        logger.warn(`[MessageList] Message ID ${message.id || 'unknown'} has invalid timestamp. Skipping grouping.`);
        return;
    }
    try {
        const dateObj = new Date(message.timestamp);
        if (isNaN(dateObj.getTime())) {
            logger.warn(`[MessageList] Message ID ${message.id || 'unknown'} has unparseable timestamp: ${message.timestamp}. Skipping.`);
            return;
        }
        const dateKey = dateObj.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
        groupedMessages[dateKey].push(message);
    } catch (e) {
        logger.error(`[MessageList] Error processing timestamp for message ID ${message.id || 'unknown'}: "${message.timestamp}"`, e);
    }
  });

  const sortedDateKeys = Object.keys(groupedMessages).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="h-full relative">
      {/*
        To get a ref to the actual scrollable viewport within ScrollArea,
        you need to pass a ref to its child if ScrollArea itself doesn't forward it
        or use its `viewportRef` prop if available (shadcn/ui's ScrollArea is based on Radix).
        Let's assume `ScrollArea` has a way to get to its viewport or we apply ref to a direct child.
        Radix `ScrollArea.Viewport` can take a ref.
      */}
      <ScrollArea className="h-full">
        <div ref={scrollAreaRef} className="h-full w-full [&>div]:h-full"> {/* Ensure viewport div takes full height */}
            <div className="space-y-3 px-1 py-4 pb-8"> {/* Added more padding bottom */}
            {sortedDateKeys.map((dateKey) => (
                <div key={dateKey} className="space-y-3">
                <DateSeparator date={dateKey} />
                <div className="space-y-2.5"> {/* Slightly reduced space between messages */}
                    <AnimatePresence initial={false}>
                    {groupedMessages[dateKey].map((message) => (
                        <motion.div
                            key={message.id || `msg-${Math.random()}`} // Fallback key if id is missing
                            layout
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10, transition: {duration: 0.15} }}
                            transition={{ type: "spring", stiffness: 350, damping: 30, duration: 0.25 }}
                        >
                            <MessageItem message={message} />
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </div>
                </div>
            ))}
            <div ref={messagesEndRef} className="h-px" />
            </div>
        </div>
      </ScrollArea>
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.2 }}
            className="absolute bottom-4 right-4 z-40" // Closer to bottom
          >
            <Button
              size="icon"
              variant="default"
              className="rounded-full shadow-xl w-10 h-10 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => scrollToBottom("smooth")}
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}