import React from "react";
import { Citation } from "./citation";
import { motion } from "framer-motion";

interface AIMessageProps {
  answer: string;
  citations: Array<{
    text: string;
    timestamp: string;
    segment_id: number;
  }>;
  onHighlight: (segmentId: number) => void;
}

export function AIMessage({ answer, citations, onHighlight }: AIMessageProps) {
  // Process the answer to replace citation markers with components
  const renderAnswer = () => {
    if (!answer) return null;
    
    // Split by citation markers like [1], [2], etc.
    const parts = answer.split(/(\[\d+\])/g);
    
    return parts.map((part, index) => {
      // Check if this part is a citation marker
      const citationMatch = part.match(/\[(\d+)\]/);
      
      if (citationMatch) {
        const citationIndex = parseInt(citationMatch[1], 10) - 1;
        if (citations && citations[citationIndex]) {
          return (
            <Citation 
              key={`citation-${index}`}
              index={citationIndex}
              citation={citations[citationIndex]}
              onHighlight={onHighlight}
            />
          );
        }
      }
      
      // Regular text
      return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-primary/5 border border-primary/10 rounded-lg p-4 shadow-sm"
    >
      <div className="flex items-start space-x-3">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary text-sm font-medium">AI</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {renderAnswer()}
          </div>
          {citations && citations.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Based on {citations.length} citation{citations.length !== 1 ? 's' : ''} from the transcript
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 