import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface CitationProps {
  index: number;
  citation: {
    text: string;
    timestamp: string;
    segment_id: number;
  };
  onHighlight: (segmentId: number) => void;
}

export function Citation({ index, citation, onHighlight }: CitationProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.sup
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="inline-flex items-center justify-center cursor-pointer text-primary ml-0.5"
            onClick={() => onHighlight(citation.segment_id)}
          >
            <span className="bg-primary/10 hover:bg-primary/20 rounded-full px-1.5 py-0.5 text-xs font-medium transition-colors">
              [{index + 1}]
            </span>
          </motion.sup>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          <div className="space-y-1">
            <p className="text-sm font-medium">"{citation.text}"</p>
            <p className="text-xs text-muted-foreground">
              Timestamp: {citation.timestamp}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 