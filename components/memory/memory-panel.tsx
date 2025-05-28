// FILE: components/memory/memory-panel.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Search, Brain, Trash2, AlertCircle, Loader2, ListRestart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MemoryItem } from "./memory-item";
import { SearchResult, PaginatedResults } from "@/memory-framework/core/types";
import { logger } from "@/memory-framework/config";
import {
MEMORY_SEARCH_ENDPOINT,
MEMORY_DELETE_ENDPOINT,
} from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MemoryPanelProps {
onClose: () => void;
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
const [searchQuery, setSearchQuery] = useState("");
const [memories, setMemories] = useState<SearchResult[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [hasPerformedInitialFetch, setHasPerformedInitialFetch] = useState(false);
const limit = 20;

const fetchMemories = useCallback(
async (query: string, isInitialFetch = false) => {
setIsLoading(true);
setError(null);
const fetchQuery = query.trim(); // Send empty string if query is empty for initial fetch
logger.info(
`[MemoryPanel] Fetching memories. Query: "${fetchQuery.substring(0, 30)}...", Initial: ${isInitialFetch}`
);
try {
    const response = await fetch(MEMORY_SEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: fetchQuery, // Backend now handles empty string for "fetch recent"
        limit: limit,
        offset: 0,
        searchOptions: { // Sensible defaults for general browsing vs specific search
          enableHybridSearch: true,
          enableGraphSearch: isInitialFetch ? false : true, // Don't use graph search for initial fetch
          vectorWeight: fetchQuery ? 0.7 : 0.5, // Balanced vector weight for recent memories
          keywordWeight: fetchQuery ? 0.3 : 0.5, // Higher keyword weight for recent
          graphWeight: fetchQuery ? 0.6 : 0.0,   // No graph weight for general initially
          recentFirst: isInitialFetch || !fetchQuery, // Prioritize recent memories when no query
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Failed to fetch memories" }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const data: PaginatedResults<SearchResult> = await response.json();
    setMemories(data.results || []);
    logger.info(
      `[MemoryPanel] Fetched ${data.results?.length || 0} memories.`
    );
  } catch (err: any) {
    logger.error("[MemoryPanel] Error fetching memories:", err);
    setError(`Failed to load memories: ${err.message}`);
    setMemories([]);
  } finally {
    setIsLoading(false);
    if (isInitialFetch) {
        setHasPerformedInitialFetch(true);
    }
  }
},
[limit]
);

useEffect(() => {
fetchMemories("", true); // Initial fetch with empty query
}, [fetchMemories]);

const handleSearch = (e?: React.FormEvent) => {
e?.preventDefault();
fetchMemories(searchQuery); // Search with the current query
};

const handleResetSearch = () => {
setSearchQuery("");
fetchMemories("", true); // Reset to initial "fetch recent"
};

const handleDeleteMemory = useCallback(
async (id: string) => {
logger.warn(`[MemoryPanel] Attempting to delete memory ID: ${id}`);
const originalMemories = [...memories];
setMemories((prev) => prev.filter((mem) => mem.memory_id !== id));
try {
const deleteUrl = `${MEMORY_DELETE_ENDPOINT}?id=${encodeURIComponent(id)}`;
const response = await fetch(deleteUrl, { method: "DELETE" });
if (!response.ok) {
const errorData = await response
.json()
.catch(() => ({ error: "Failed to delete" }));
throw new Error(errorData.error || `HTTP error ${response.status}`);
}
logger.info(`[MemoryPanel] Memory ${id} deleted successfully via API.`);
toast({
title: "Memory Deleted",
description: "The memory item has been removed.",
});
// Optionally, re-fetch memories to update the list after deletion
fetchMemories(searchQuery, !searchQuery); // Re-fetch based on current search or initial if empty
} catch (err: any) {
logger.error(`[MemoryPanel] Error deleting memory ${id}:`, err);
toast({
title: "Delete Failed",
description: err.message,
variant: "destructive",
});
setMemories(originalMemories);
}
},
[memories, searchQuery, fetchMemories] // Added fetchMemories dependency
);

const renderContent = () => {
if (isLoading && !hasPerformedInitialFetch) {
return (
<div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
<Loader2 className="h-10 w-10 animate-spin text-primary/70 mb-4" />
<p className="text-sm">Loading Minato's Memories...</p>
</div>
);
}
if (error) {
return (
<Alert variant="destructive" className="m-4">
<AlertCircle className="h-4 w-4" />
<AlertTitle>Error Loading Memories</AlertTitle>
<AlertDescription>{error}</AlertDescription>
<Button variant="outline" size="sm" onClick={() => fetchMemories(searchQuery, !searchQuery)} className="mt-2">
Try Again
</Button>
</Alert>
);
}
if (isLoading && hasPerformedInitialFetch) {
return (
<div className="flex items-center justify-center py-12 text-center">
<Loader2 className="h-8 w-8 animate-spin text-primary/70 mr-2" />
<p className="text-sm text-muted-foreground">
Searching memories...
</p>
</div>
);
}
if (memories.length === 0 && hasPerformedInitialFetch) {
    return (
         <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Brain className="h-12 w-12 text-primary/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {searchQuery ? "No Matching Memories" : "Memory Bank Empty"}
            </h3>
            <p className="text-sm max-w-xs">
              {searchQuery 
                ? "Try refining your search or exploring different topics." 
                : "As you chat with Minato, important details will be stored here for easy recall."}
            </p>
            {searchQuery && (
                <Button variant="ghost" onClick={handleResetSearch} className="mt-3 text-xs">
                    <ListRestart size={14} className="mr-1.5"/> Show Recent Memories
                </Button>
            )}
        </div>
    );
}

return (
    <div className="space-y-3">
        {!searchQuery && (
            <div className="text-sm font-medium text-muted-foreground mb-2 px-1">
                Recent Memories
            </div>
        )}
        {memories.map((memory) => (
            <MemoryItem
                key={memory.memory_id}
                memory={memory}
                onDelete={() => handleDeleteMemory(memory.memory_id)}
            />
        ))}
    </div>
);
};

return (
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 20 }}
transition={{ duration: 0.3 }}
className="bg-background border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]"
>
<div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
<h2 className="text-lg font-semibold flex items-center gap-2">
<Brain className="h-5 w-5 text-primary" /> Minato's Memory
</h2>
<Button
variant="ghost"
size="icon"
className="rounded-full"
onClick={onClose}
aria-label="Close memory panel"
>
<X className="h-5 w-5" />
</Button>
</div>
<div className="p-4 flex-shrink-0 border-b border-border">
    <form onSubmit={handleSearch} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search memories..."
        className="pl-10 pr-10" 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        disabled={isLoading && !hasPerformedInitialFetch}
      />
      {searchQuery && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
          onClick={handleResetSearch}
          disabled={isLoading && !hasPerformedInitialFetch}
          aria-label="Clear search and show recent"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </form>
  </div>

  <div className="flex-1 overflow-hidden">
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {renderContent()}
      </div>
    </ScrollArea>
  </div>
</motion.div>
);
}