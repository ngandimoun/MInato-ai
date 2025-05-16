// FILE: components/memory/memory-item.tsx
// (Content from finalcodebase.txt - verified, added specific type)
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Star, Edit } from "lucide-react"; // Added Star, Edit
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SearchResult as MemoryFrameworkSearchResult } from "@/memory-framework/core/types"; // Use specific type

interface MemoryItemProps {
  memory: MemoryFrameworkSearchResult; // Use the detailed type, assuming it's updated
  onDelete: () => void;
  // Add props for edit/pin if implementing later
  // onEdit: (id: string) => void;
  // onPin: (id: string) => void;
}

export function MemoryItem({
  memory,
  onDelete /*, onEdit, onPin */,
}: MemoryItemProps) {
  const [showActions, setShowActions] = useState(false);

  // Format date more nicely
  const formattedDate = memory.updated_at
    ? new Date(memory.updated_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown date";

  const isOutdated = memory.is_latest_fact === false;
  const isLatest = memory.is_latest_fact === true;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50", // Use muted for hover
        isOutdated ? "border-amber-500/30 bg-amber-500/5" : "border-border"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      // Use focus trapping for accessibility if interactions become more complex
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          {/* Title/Content - Use content directly */}
          <p className="text-sm text-card-foreground flex-1 break-words pr-10">
            {memory.content}
            {isOutdated && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                (Possibly Outdated)
              </span>
            )}
            {isLatest && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                (Latest Info)
              </span>
            )}
          </p>
          {/* Date & Score */}
          <div className="text-right flex-shrink-0 space-y-0.5">
            <span className="block text-xs text-muted-foreground whitespace-nowrap">
              {formattedDate}
            </span>
            {memory.final_score !== null &&
              memory.final_score !== undefined && (
                <span className="block text-xs text-muted-foreground/70">
                  Score: {memory.final_score.toFixed(2)}
                </span>
              )}
          </div>
        </div>
        {/* Optional: Display categories or other metadata */}
        {memory.categories && memory.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {memory.categories.slice(0, 3).map(
              (
                cat // Limit displayed categories
              ) => (
                <span
                  key={cat}
                  className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded"
                >
                  {cat.replace(/_/g, " ")}
                </span>
              )
            )}
          </div>
        )}
        {/* Display new memory attributes */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
          {memory.memory_type && (
            <span>Type: <span className="font-medium text-foreground/80">{memory.memory_type.replace(/_/g, " ")}</span></span>
          )}
          {memory.metadata?.status && memory.metadata.status !== 'active' && (
            <span>Status: <span className="font-medium text-foreground/80">{memory.metadata.status}</span></span>
          )}
          {memory.metadata?.confidence_score !== null && memory.metadata?.confidence_score !== undefined && (
            <span>Confidence: <span className="font-medium text-foreground/80">{(memory.metadata.confidence_score * 100).toFixed(0)}%</span></span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: showActions ? 1 : 0,
          scale: showActions ? 1 : 0.8,
        }}
        transition={{ duration: 0.15 }}
        className={cn(
          "absolute -right-2 -top-2 z-10 flex gap-1",
          !showActions && "pointer-events-none" // Hide from interaction when invisible
        )}
      >
        {/* Add Tooltips for actions */}
        <TooltipProvider delayDuration={200}>
          {/* <Tooltip>
               <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-background hover:bg-muted" onClick={(e) => { e.stopPropagation(); onPin(memory.memory_id); }}>
                        <Star className="h-3.5 w-3.5" /> <span className="sr-only">Pin</span>
                    </Button>
               </TooltipTrigger>
               <TooltipContent><p>Pin Memory</p></TooltipContent>
           </Tooltip>
           <Tooltip>
               <TooltipTrigger asChild>
                   <Button variant="outline" size="icon" className="h-7 w-7 rounded-full bg-background hover:bg-muted" onClick={(e) => { e.stopPropagation(); onEdit(memory.memory_id); }}>
                        <Edit className="h-3.5 w-3.5" /> <span className="sr-only">Edit</span>
                   </Button>
               </TooltipTrigger>
               <TooltipContent><p>Edit Memory</p></TooltipContent>
           </Tooltip> */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />{" "}
                <span className="sr-only">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete Memory</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </motion.div>
  );
}
