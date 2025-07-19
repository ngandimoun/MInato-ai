// FILE: components/memory/memory-panel.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, Search, Brain, Trash2, AlertCircle, Loader2, ListRestart, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemoryItem } from "./memory-item";
import { SearchResult, PaginatedResults } from "@/memory-framework/core/types";
import { logger } from "@/memory-framework/config";
import { useTranslation } from "@/hooks/useTranslation";
import {
  MEMORY_SEARCH_ENDPOINT,
  MEMORY_DELETE_ENDPOINT,
} from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-provider";
import { DEFAULT_USER_NAME } from "@/lib/constants";
import { toast as sonnerToast } from "sonner";

// Language options
const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" }
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

  // Language translation state
  const [language, setLanguage] = useState<string>("en");
  const { translateText, isTranslating } = useTranslation();
  const [translatedMemories, setTranslatedMemories] = useState<Record<string, string>>({});
  const [translatedUI, setTranslatedUI] = useState({
    title: `${userName}'s Memory`,
    searchPlaceholder: "Search memories...",
    loadingText: "Loading Minato's Memories...",
    errorTitle: "Error Loading Memories",
    tryAgain: "Try Again",
    searching: "Searching memories...",
    emptyTitle: "Memory Bank Empty",
    noMatchTitle: "No Matching Memories",
    emptyDescription: "As you chat with Minato, important details will be stored here for easy recall.",
    noMatchDescription: "Try refining your search or exploring different topics.",
    showRecent: "Show Recent Memories",
    recentMemories: "Recent Memories",
    journeyTitle: `Hey ${userName}, Our Incredible Journey Together`,
    loadMore: "Load More",
    scrollMore: "Scroll for more memories",
    endReached: "You've reached the end of your memories"
  });

  // Reference for the loader element that will trigger more memories to load
  const loaderRef = useRef<HTMLDivElement>(null);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('memory-language');
    if (savedLanguage && languages.find(lang => lang.code === savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference when changed
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem('memory-language', value);
  };

  // Translate UI text when language changes
  useEffect(() => {
    const translateUI = async () => {
      if (language === "en") {
        // Reset to default English text
        setTranslatedUI({
          title: `${userName}'s Memory`,
          searchPlaceholder: "Search memories...",
          loadingText: "Loading Minato's Memories...",
          errorTitle: "Error Loading Memories",
          tryAgain: "Try Again",
          searching: "Searching memories...",
          emptyTitle: "Memory Bank Empty",
          noMatchTitle: "No Matching Memories",
          emptyDescription: "As you chat with Minato, important details will be stored here for easy recall.",
          noMatchDescription: "Try refining your search or exploring different topics.",
          showRecent: "Show Recent Memories",
          recentMemories: "Recent Memories",
          journeyTitle: `Hey ${userName}, Our Incredible Journey Together`,
          loadMore: "Load More",
          scrollMore: "Scroll for more memories",
          endReached: "You've reached the end of your memories"
        });
        setTranslatedMemories({});
        return;
      }

      try {
        // Translate all UI text elements
        const [
          title, searchPlaceholder, loadingText, errorTitle, tryAgain, searching,
          emptyTitle, noMatchTitle, emptyDescription, noMatchDescription,
          showRecent, recentMemories, journeyTitle, loadMore, scrollMore, endReached
        ] = await Promise.all([
          translateText(`${userName}'s Memory`, language, "en"),
          translateText("Search memories...", language, "en"),
          translateText("Loading Minato's Memories...", language, "en"),
          translateText("Error Loading Memories", language, "en"),
          translateText("Try Again", language, "en"),
          translateText("Searching memories...", language, "en"),
          translateText("Memory Bank Empty", language, "en"),
          translateText("No Matching Memories", language, "en"),
          translateText("As you chat with Minato, important details will be stored here for easy recall.", language, "en"),
          translateText("Try refining your search or exploring different topics.", language, "en"),
          translateText("Show Recent Memories", language, "en"),
          translateText("Recent Memories", language, "en"),
          translateText(`Hey ${userName}, Our Incredible Journey Together`, language, "en"),
          translateText("Load More", language, "en"),
          translateText("Scroll for more memories", language, "en"),
          translateText("You've reached the end of your memories", language, "en")
        ]);

        // Update translated text state
        setTranslatedUI({
          title, searchPlaceholder, loadingText, errorTitle, tryAgain, searching,
          emptyTitle, noMatchTitle, emptyDescription, noMatchDescription,
          showRecent, recentMemories, journeyTitle, loadMore, scrollMore, endReached
        });

        // Translate current memories
        await translateMemories();
      } catch (error) {
        console.error("Error translating UI:", error);
      }
    };

    translateUI();
  }, [language, translateText, userName]);

  // Translate memory content
  const translateMemories = async () => {
    if (language === "en" || memories.length === 0) {
      setTranslatedMemories({});
      return;
    }

    try {
      const translatedContent: Record<string, string> = {};

      // Translate each memory's content
      for (const memory of memories) {
        if (memory.content) {
          const translated = await translateText(memory.content, language, "en");
          translatedContent[memory.memory_id] = translated;
        }
      }

      setTranslatedMemories(translatedContent);
    } catch (error) {
      console.error("Error translating memories:", error);
    }
  };

  // Translate new memories when they are loaded
  useEffect(() => {
    if (language !== "en" && memories.length > 0) {
      translateMemories();
    }
  }, [memories, language]);

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
      console.log("[MemoryPanel DEBUG] Starting fetch with query:", fetchQuery, "isInitialFetch:", isInitialFetch);
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
              filters: {
                // Ensure memories are ordered by creation date (most recent first)
                sort_by: 'created_at',
                sort_order: 'desc'
              }
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
        console.log("[MemoryPanel DEBUG] API Response:", data);
        // If we got actual memories, use those
        if (data.results && data.results.length > 0) {
          // Sort memories by creation date (most recent first) as backup
          const sortedResults = [...data.results].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          if (isInitialFetch) {
            setMemories(sortedResults);
          } else {
            setMemories(prev => [...prev, ...sortedResults]);
          }

          // Update pagination state
          setTotalEstimated(data.total_estimated || 0);
          const currentOffset = isInitialFetch ? 0 : offset;
          const newTotalLoaded = currentOffset + data.results.length;
          const hasMoreResults = newTotalLoaded < (data.total_estimated || 0) && data.results.length === limit;
          setHasMore(hasMoreResults);

          console.log(`[MemoryPanel DEBUG] Pagination: loaded=${newTotalLoaded}, total=${data.total_estimated}, hasMore=${hasMoreResults}`);

          logger.info(
            `[MemoryPanel] Fetched ${data.results.length} memories. Total: ${data.total_estimated || 0}`
          );
        } else {
          // No memories found - don't show sample memories, just empty state
          console.log("[MemoryPanel DEBUG] No memories found in response");
          if (isInitialFetch) {
            setMemories([]);
            setHasMore(false);
            logger.info(`[MemoryPanel] No real memories found for user.`);
          } else {
            // No more results for pagination
            setHasMore(false);
            console.log("[MemoryPanel DEBUG] No more memories to load");
          }
        }

        // Handle pagination state for when no more results can be loaded
        if (!isInitialFetch && offset > 0 && memories.length > 0 && data.results.length === 0) {
          // No more results to load on pagination
          setHasMore(false);
          logger.info(
            `[MemoryPanel] No more memories to load for query "${fetchQuery}".`
          );
        }
      } catch (err: any) {
        logger.error("[MemoryPanel] Error fetching memories:", err);
        console.error("[MemoryPanel DEBUG] Fetch error:", err);
        setError(`Failed to load memories: ${err.message}`);
        // On error, don't show sample memories - let the error state handle it
        if (isInitialFetch) {
          setMemories([]);
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
    if (isLoading || isLoadingMore || !hasMore) {
      console.log('[MemoryPanel] Skipping loadMoreMemories', { isLoading, isLoadingMore, hasMore });
      return;
    }

    console.log('[MemoryPanel] Loading more memories, current offset:', offset, 'limit:', limit);
    setIsLoadingMore(true);
    setOffset(prev => prev + limit);
  }, [isLoading, isLoadingMore, hasMore, limit, offset]);

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
    // Don't set up observer if there are no more memories to load
    if (!hasMore || isLoading || isLoadingMore || !memories.length) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        // If the loader is visible, load more memories with debouncing
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          // Clear any existing timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Debounce the load more call to prevent rapid triggering
          timeoutId = setTimeout(() => {
            if (hasMore && !isLoading && !isLoadingMore) {
              loadMoreMemories();
            }
          }, 300); // Increased delay to prevent rapid triggering
        }
      },
      {
        root: null, // Use the viewport as the root
        rootMargin: '0px 0px 100px 0px', // Smaller margin to trigger closer to bottom
        threshold: 0.1 // Trigger when 10% of the loader is visible
      }
    );

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      // Clean up timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Clean up observer
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, loadMoreMemories, memories.length]); // Use memories.length instead of memories array

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
          <p className="text-sm">{translatedUI.loadingText}</p>
        </div>
      );
    }
    if (error) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{translatedUI.errorTitle}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={() => fetchMemories(searchQuery, true)} className="mt-2">
            {translatedUI.tryAgain}
          </Button>
        </Alert>
      );
    }
    if (isLoading && hasPerformedInitialFetch && offset === 0) {
      return (
        <div className="flex items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70 mr-2" />
          <p className="text-sm text-muted-foreground">
            {translatedUI.searching}
          </p>
        </div>
      );
    }
    if (memories.length === 0 && hasPerformedInitialFetch) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Brain className="h-12 w-12 text-primary/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchQuery ? translatedUI.noMatchTitle : translatedUI.emptyTitle}
          </h3>
          <p className="text-sm max-w-xs">
            {searchQuery ? translatedUI.noMatchDescription : translatedUI.emptyDescription}
          </p>
          {searchQuery && (
            <Button variant="ghost" onClick={handleResetSearch} className="mt-3 text-xs">
              <ListRestart size={14} className="mr-1.5" /> {translatedUI.showRecent}
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
              ? translatedUI.journeyTitle
              : translatedUI.recentMemories}
          </div>
        )}
        {memories.map((memory) => (
          <MemoryItem
            key={memory.memory_id}
            memory={{
              ...memory,
              content: translatedMemories[memory.memory_id] || memory.content
            }}
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
            {!isLoadingMore && translatedUI.scrollMore}
          </div>
        )}

        {!hasMore && memories.length > 0 && !memories[0]?.memory_id.startsWith('sample-') && offset > 0 && (
          <div className="text-center text-xs text-muted-foreground py-2">
            {translatedUI.endReached}
          </div>
        )}
      </div>
    );
  };

  // Debug button to manually load more memories (temporary)
  const debugLoadMore = () => {
    console.log('[MemoryPanel] Manual load more triggered');
    
    // La condition pour charger reste la même
    if (hasMore && !isLoadingMore && !isLoading) {
      loadMoreMemories();
    } else {
      // Si on ne peut pas charger, on vérifie pourquoi.
      // Est-ce parce qu'on a atteint la fin de la liste ?
      if (!hasMore && !isLoading) {
        // Si oui, on affiche le toast !
        sonnerToast.info("Our Journey So Far", {
          description: translatedUI.endReached, // Message clair déjà traduit
        });
      }
  
      // On peut garder le log pour le débogage, il reste utile.
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
      className="bg-background border border-border rounded-sm shadow-sm overflow-hidden flex flex-col h-[calc(100vh-6.5rem)]"
    >
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" /> {translatedUI.title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <Select value={language} onValueChange={handleLanguageChange} disabled={isTranslating}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <SelectValue>
                  {languages.find(lang => lang.code === language) ? (
                    <span>
                      {languages.find(lang => lang.code === language)?.flag}{" "}
                      {languages.find(lang => lang.code === language)?.name}
                    </span>
                  ) : (
                    "Language"
                  )}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasPerformedInitialFetch && !error && !memories[0]?.memory_id.startsWith('sample-') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={debugLoadMore}
              className="text-xs"
            // Aucune propriété 'disabled' ici
            >
              {/* Le texte est toujours "Load More" */}
              {translatedUI.loadMore}
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
            placeholder={translatedUI.searchPlaceholder}
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