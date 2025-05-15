// components/call/transcript-display.tsx
"use client";
import { useEffect, useRef } from "react"; 
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TranscriptItem {
  id: number | string; 
  speaker: string;
  text: string;
  timestamp: string;
}

interface TranscriptDisplayProps {
  transcriptData: TranscriptItem[]; 
  onClose: () => void;
}

export function TranscriptDisplay({
  transcriptData = [],
  onClose,
}: TranscriptDisplayProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "div[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [transcriptData]); 

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-x-0 bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border rounded-t-2xl shadow-lg max-h-[60vh] md:max-h-[70vh]"
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-medium">Transcript</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close Transcript</span>
        </Button>
      </div>

      <ScrollArea
        ref={scrollAreaRef}
        className="h-[calc(60vh-3rem-1px)] md:h-[calc(70vh-3rem-1px)]" 
      >
        <div className="p-4 space-y-4">
          {transcriptData.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Minato's conversation will appear here...
            </p>
          )}
          {transcriptData.map((item) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3"
            >
              <div className="text-xs text-muted-foreground pt-1 w-16 flex-shrink-0 tabular-nums">
                {item.timestamp}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{item.speaker === "You" ? "You" : "Minato"}</div>
                <div className="text-sm mt-1 whitespace-pre-wrap break-words">
                  {item.text}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
