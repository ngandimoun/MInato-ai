// FILE: components/memory/memory-panel.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useAuth } from "@/context/auth-provider";
import { DEFAULT_USER_NAME } from "@/lib/constants";

// Sample memories to show when no real memories are available
const SAMPLE_MEMORIES: SearchResult[] = [
  {
    memory_id: "sample-1",
    content: "Friend finds it delicious",
    user_id: "sample",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    memory_type: "fact",
    categories: ["food", "preferences"],
    vector_score: null,
    keyword_score: null,
    graph_score: null,
    final_score: 0.28,
    is_latest_fact: false,
    role: "user",
    embedding: null,
    run_id: null,
    metadata: {}
  },
  {
    memory_id: "sample-2",
    content: "Friend is preparing spiced eggs.",
    user_id: "sample",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    memory_type: "fact",
    categories: ["hobbies_interests", "food_cooking"],
    vector_score: null,
    keyword_score: null,
    graph_score: null,
    final_score: 0.22,
    is_latest_fact: false,
    role: "user",
    embedding: null,
    run_id: null,
    metadata: {}
  },
  {
    memory_id: "sample-3",
    content: "Friend is eating ice cream",
    user_id: "sample",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    memory_type: "fact",
    categories: ["food_interest", "hobbies_interests"],
    vector_score: null,
    keyword_score: null,
    graph_score: null,
    final_score: 0.22,
    is_latest_fact: false,
    role: "user",
    embedding: null,
    run_id: null,
    metadata: {}
  },
  {
    memory_id: "sample-4",
    content: "Friend is wearing gloves while cooking.",
    user_id: "sample",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    memory_type: "fact",
    categories: ["food_cooking"],
    vector_score: null,
    keyword_score: null,
    graph_score: null,
    final_score: 0.21,
    is_latest_fact: false,
    role: "user",
    embedding: null,
    run_id: null,
    metadata: {}
  },
  {
    memory_id: "sample-5",
    content: "Friend requested a random recipe but none was found on TheMealDB.",
    user_id: "sample",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    memory_type: "fact",
    categories: ["misc"],
    vector_score: null,
    keyword_score: null,
    graph_score: null,
    final_score: 0.21,
    is_latest_fact: false,
    role: "user",
    embedding: null,
    run_id: null,
    metadata: {}
  }
];

interface MemoryPanelProps {
onClose: () => void;
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
const { state, profile } = useAuth();
const userName = state?.user_first_name || profile?.first_name || profile?.full_name?.split(" ")[0] || DEFAULT_USER_NAME;

const [searchQuery, setSearchQuery] = useState("");
const [memories, setMemories] = useState<SearchResult[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [hasPerformedInitialFetch, setHasPerformedInitialFetch] = useState(false);
const [offset, setOffset] = useState(0);
const [hasMore, setHasMore] = useState(true);
const [totalEstimated, setTotalEstimated] = useState(0);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const limit = 20;

// Reference for the loader element that will trigger more memories to load
const loaderRef = useRef<HTMLDivElement>(null);

const fetchMemories = useCallback(
async (query: string, isInitialFetch = false) => {
setIsLoading(true);
setError(null);
if (isInitialFetch) {
  setOffset(0);
  setMemories([]);
}
const fetchQuery = query.trim(); // Send empty string if query is empty for initial fetch
logger.info(
`[MemoryPanel] Fetching memories. Query: "${fetchQuery.substring(0, 30)}...", Initial: ${isInitialFetch}, Offset: ${isInitialFetch ? 0 : offset}`
);
try {
    const response = await fetch(MEMORY_SEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: fetchQuery, // Backend now handles empty string for "fetch recent"
        limit: limit,
        offset: isInitialFetch ? 0 : offset,
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
    // If we got actual memories, use those
    if (data.results && data.results.length > 0) {
      if (isInitialFetch) {
        setMemories(data.results);
      } else {
        setMemories(prev => [...prev, ...data.results]);
      }
      
      // Update pagination state
      setTotalEstimated(data.total_estimated || 0);
      setHasMore((offset + data.results.length) < (data.total_estimated || 0));
      
      logger.info(
        `[MemoryPanel] Fetched ${data.results.length} memories. Total: ${data.total_estimated || 0}`
      );
    } else if (isInitialFetch || query === "") {
      // If no memories but it's initial fetch or empty query, show sample memories
      setMemories(SAMPLE_MEMORIES);
      setHasMore(false);
      logger.info(
        `[MemoryPanel] No memories found, showing ${SAMPLE_MEMORIES.length} sample memories.`
      );
    } else if (!isInitialFetch && offset > 0 && memories.length > 0) {
      // No more results to load
      setHasMore(false);
      logger.info(
        `[MemoryPanel] No more memories to load for query "${fetchQuery}".`
      );
    } else {
      // For specific searches with no results, show empty state
      setMemories([]);
      setHasMore(false);
      logger.info(
        `[MemoryPanel] No memories found for search query "${fetchQuery}".`
      );
    }
  } catch (err: any) {
    logger.error("[MemoryPanel] Error fetching memories:", err);
    setError(`Failed to load memories: ${err.message}`);
    // On error, show sample memories rather than an empty state
    if (isInitialFetch) {
      setMemories(SAMPLE_MEMORIES);
      setHasMore(false);
    }
  } finally {
    setIsLoading(false);
    setIsLoadingMore(false);
    if (isInitialFetch) {
        setHasPerformedInitialFetch(true);
    }
  }
},
[offset, limit]
);

const loadMoreMemories = useCallback(() => {
  if (isLoading || isLoadingMore || !hasMore || memories[0]?.memory_id.startsWith('sample-')) {
    console.log('[MemoryPanel] Skipping loadMoreMemories', { isLoading, isLoadingMore, hasMore, isSample: memories[0]?.memory_id.startsWith('sample-') });
    return;
  }
  
  console.log('[MemoryPanel] Loading more memories, current offset:', offset, 'limit:', limit);
  setIsLoadingMore(true);
  setOffset(prev => prev + limit);
}, [isLoading, isLoadingMore, hasMore, limit, memories, offset]);

useEffect(() => {
  if (offset > 0 && !isLoading) {
    fetchMemories(searchQuery);
  }
}, [offset, fetchMemories, searchQuery]);

useEffect(() => {
fetchMemories("", true); // Initial fetch with empty query
}, [fetchMemories]);

const handleSearch = (e?: React.FormEvent) => {
e?.preventDefault();
setOffset(0); // Reset offset on new search
fetchMemories(searchQuery, true); // Search with the current query as initial fetch
};

const handleResetSearch = () => {
setSearchQuery("");
setOffset(0); // Reset offset
fetchMemories("", true); // Reset to initial "fetch recent"
};

const handleDeleteMemory = useCallback(
async (id: string) => {
logger.warn(`[MemoryPanel] Attempting to delete memory ID: ${id}`);
const originalMemories = [...memories];

// Don't attempt to delete sample memories
if (id.startsWith('sample-')) {
  logger.info(`[MemoryPanel] Ignoring delete for sample memory ${id}`);
  toast({
    title: "Sample Memory",
    description: "This is a sample memory and cannot be deleted.",
  });
  return;
}

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
fetchMemories(searchQuery, true); // Re-fetch based on current search with reset pagination
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

// Set up IntersectionObserver to detect when the user scrolls to the loader element
useEffect(() => {
  // Don't set up observer if there are no more memories to load or if using sample memories
  if (!hasMore || isLoading || isLoadingMore || !memories.length || memories[0]?.memory_id.startsWith('sample-')) {
    console.log('[MemoryPanel] Not setting up IntersectionObserver', { 
      hasMore, 
      isLoading, 
      isLoadingMore, 
      memoriesLength: memories.length, 
      isSample: memories[0]?.memory_id.startsWith('sample-')
    });
    return;
  }

  console.log('[MemoryPanel] Setting up IntersectionObserver');
  
  const observer = new IntersectionObserver(
    (entries) => {
      // If the loader is visible, load more memories
      if (entries[0].isIntersecting) {
        console.log('[MemoryPanel] Loader visible, loading more memories');
        loadMoreMemories();
      }
    },
    { 
      root: null, // Use the viewport as the root
      rootMargin: '0px 0px 300px 0px', // Load more memories when loader is 300px from the bottom edge
      threshold: 0.1 // Trigger when 10% of the loader is visible
    }
  );

  const currentLoaderRef = loaderRef.current;
  if (currentLoaderRef) {
    console.log('[MemoryPanel] Observer observing loaderRef');
    observer.observe(currentLoaderRef);
  } else {
    console.log('[MemoryPanel] loaderRef.current is null');
  }

  return () => {
    console.log('[MemoryPanel] Cleaning up IntersectionObserver');
    if (currentLoaderRef) {
      observer.unobserve(currentLoaderRef);
    }
    observer.disconnect();
  };
}, [hasMore, isLoading, isLoadingMore, loadMoreMemories, memories]);

// Explicitly fetch more memories when offset changes
useEffect(() => {
  if (offset > 0 && !isLoading && !isLoadingMore) {
    console.log('[MemoryPanel] Offset changed, fetching more memories', { offset });
    fetchMemories(searchQuery);
  }
}, [offset, fetchMemories, searchQuery, isLoading, isLoadingMore]);

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
<Button variant="outline" size="sm" onClick={() => fetchMemories(searchQuery, true)} className="mt-2">
Try Again
</Button>
</Alert>
);
}
if (isLoading && hasPerformedInitialFetch && offset === 0) {
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
                {memories[0]?.memory_id.startsWith('sample-') 
                    ? `Hey ${userName}, Our Incredible Journey Together` 
                    : 'Recent Memories'}
            </div>
        )}
        {memories.map((memory) => (
            <MemoryItem
                key={memory.memory_id}
                memory={memory}
                onDelete={() => handleDeleteMemory(memory.memory_id)}
            />
        ))}
        
        {isLoadingMore && (
            <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
            </div>
        )}
        
        {/* Invisible loader element that triggers loading more memories when visible */}
        {hasMore && !memories[0]?.memory_id.startsWith('sample-') && (
            <div 
                ref={loaderRef} 
                className="h-20 w-full flex items-center justify-center text-muted-foreground text-xs"
                style={{ opacity: isLoadingMore ? 0 : 1 }}
            >
                {!isLoadingMore && "Scroll for more memories"}
            </div>
        )}
        
        {!hasMore && memories.length > 0 && !memories[0]?.memory_id.startsWith('sample-') && offset > 0 && (
            <div className="text-center text-xs text-muted-foreground py-2">
                You've reached the end of your memories
            </div>
        )}
    </div>
);
};

// Debug button to manually load more memories (temporary)
const debugLoadMore = () => {
  console.log('[MemoryPanel] Manual load more triggered');
  if (hasMore && !isLoadingMore && !isLoading && memories.length > 0 && !memories[0]?.memory_id.startsWith('sample-')) {
    loadMoreMemories();
  } else {
    console.log('[MemoryPanel] Cannot load more', { 
      hasMore, 
      isLoadingMore, 
      isLoading, 
      memoriesLength: memories.length, 
      isSample: memories[0]?.memory_id.startsWith('sample-')
    });
  }
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
<Brain className="h-5 w-5 text-primary" /> {userName}'s Memory
</h2>
<div className="flex items-center gap-2">
  {hasMore && !isLoadingMore && !memories[0]?.memory_id.startsWith('sample-') && (
    <Button
      variant="ghost"
      size="sm"
      onClick={debugLoadMore}
      className="text-xs"
    >
      Load More
    </Button>
  )}
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