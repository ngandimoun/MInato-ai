// FILE: components/chat/message-list.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageItem } from "./message-item";
import { DateSeparator } from "./date-separator";
import type { ChatMessage as Message } from "@/lib/types/index"; // Use ChatMessage as Message
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Import ScrollBar if needed
import { logger } from "@/memory-framework/config";

interface MessageListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, messagesEndRef }: MessageListProps) {
  // Ref for the ScrollArea's outer div. We'll find the viewport inside it.
  const scrollAreaOuterRef = useRef<HTMLDivElement>(null);
  const [scrollableViewport, setScrollableViewport] = useState<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Effect to get the actual scrollable viewport element from ScrollArea
  useEffect(() => {
    if (scrollAreaOuterRef.current) {
      const viewport = scrollAreaOuterRef.current.querySelector('div[style*="overflow: scroll hidden;"]') as HTMLDivElement | null;
      // Radix ScrollArea typically creates a viewport div with inline styles for overflow.
      // This selector is a common way to find it. It might need adjustment based on exact shadcn/ui version.
      // A more robust way might be to pass a callback ref to a child if <ScrollArea> doesn't support viewportRef.
      // Or, if <ScrollArea type="auto" ...> the ref might be on the direct child if there is one.
      // For now, this querySelector is a common approach.
      setScrollableViewport(viewport);
    }
  }, []); // Run once on mount

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const currentViewport = scrollableViewport; // Use the state variable holding the viewport
    const handleScroll = () => {
      if (!currentViewport) return;
      const { scrollTop, scrollHeight, clientHeight } = currentViewport;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > Math.max(100, clientHeight * 0.3); // Show if 30% scrolled up or 100px
      setShowScrollButton(isScrolledUp);
    };

    if (currentViewport) {
      currentViewport.addEventListener("scroll", handleScroll);
      handleScroll(); // Initial check
      return () => currentViewport.removeEventListener("scroll", handleScroll);
    }
  }, [messages, scrollableViewport]); // Re-check on messages change or when viewport is found

  // Group messages by date
  const groupedMessages: { [dateKey: string]: Message[] } = {};
  messages.forEach((message) => {
    // Ensure timestamp is valid before creating Date object
    if (message.timestamp === undefined || message.timestamp === null) {
        logger.warn(`[MessageList] Message ID ${message.id} has undefined or null timestamp. Skipping grouping for this message.`);
        return; // Skip this message for grouping
    }
    try {
        const dateKey = new Date(message.timestamp).toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric",
        });
        if (!groupedMessages[dateKey]) {
            groupedMessages[dateKey] = [];
        }
        groupedMessages[dateKey].push(message);
    } catch (e) {
        logger.error(`[MessageList] Error processing timestamp for message ID ${message.id}: "${message.timestamp}"`, e);
    }
  });

  const sortedDateKeys = Object.keys(groupedMessages).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="h-full relative">
      <ScrollArea
        className="h-full px-1 py-4"
        ref={scrollAreaOuterRef} // Attach ref to the ScrollArea component itself
      >
        {/* Add ScrollBar if you want it to be visible */}
        {/* <ScrollBar orientation="vertical" /> */}
        <div className="space-y-6 pb-4"> {/* Added pb-4 for some bottom padding inside scroll area */}
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-6">
              <DateSeparator date={dateKey} />
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {groupedMessages[dateKey].map((message) => (
                      <motion.div
                        key={message.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <MessageItem message={message} />
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-px" /> {/* Small div to scroll to */}
        </div>
      </ScrollArea>
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }} // Added y and scale
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.2 }} // Spring animation
            className="absolute bottom-6 right-6 z-10" // Adjusted positioning slightly
          >
            <Button
              size="icon"
              variant="default" // Changed to default for better visibility
              className="rounded-full shadow-xl w-10 h-10 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={scrollToBottom}
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