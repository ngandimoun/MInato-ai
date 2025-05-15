// FILE: components/memory/memory-panel.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Search, Brain, Trash2, AlertCircle, Loader2 } from "lucide-react"; // Gardez Loader2
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
  const [isLoading, setIsLoading] = useState(false); // Mettre à false initialement si pas de fetch auto
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false); // Pour savoir si une recherche a été tentée

  const limit = 20;

  const fetchMemories = useCallback(
    async (query: string) => {
      // Ne pas fetcher si la query est vide et que ce n'est pas une action explicite
      if (!query && !hasSearched) {
        // Modifié pour ne pas fetcher si query vide et pas de recherche initiale explicite
        setMemories([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setHasSearched(true); // Marquer qu'une recherche est tentée
      setError(null);
      logger.info(
        `[MemoryPanel] Fetching memories for query: "${query.substring(
          0,
          30
        )}..."`
      );
      try {
        const response = await fetch(MEMORY_SEARCH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query, // query peut être vide ici si on l'autorise
            limit: limit,
            offset: 0,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to fetch memories" }));
          // Si le backend retourne 400 pour query vide, l'erreur sera affichée ici
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
      }
    },
    [limit, hasSearched] // Ajouter hasSearched aux dépendances
  );

  // Supprimer le useEffect qui appelle fetchMemories("") au montage pour l'Option B
  // useEffect(() => {
  //   fetchMemories(""); // Ne plus faire cet appel initial si on veut un panneau vide au début
  // }, [fetchMemories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() === "" && !hasSearched) {
      // Si la première recherche est vide, on peut décider de ne rien faire ou de charger les récents
      // Pour l'instant, si la recherche est vide, on ne fait rien ou on affiche un message.
      // Si vous voulez que la recherche vide charge les récents, le backend doit le gérer.
      setMemories([]);
      setError(null);
      setIsLoading(false);
      setHasSearched(true); // Marquer qu'une "recherche" (vide) a eu lieu pour afficher le message approprié
      return;
    }
    fetchMemories(searchQuery);
  };

  const handleDeleteMemory = useCallback(
    async (id: string) => {
      logger.warn(`[MemoryPanel] Attempting to delete memory ID: ${id}`);
      const originalMemories = memories;
      setMemories((prev) => prev.filter((mem) => mem.memory_id !== id));
      try {
        const deleteUrl = `${MEMORY_DELETE_ENDPOINT}?id=${encodeURIComponent(
          id
        )}`;
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
      } catch (err: any) {
        logger.error(`[MemoryPanel] Error deleting memory ${id}:`, err);
        toast({
          title: "Delete Failed",
          description: err.message,
          variant: "destructive",
        });
        setMemories(originalMemories); // Revert UI on error
      }
    },
    [memories]
  ); // Ajouter memories pour la réversion

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
        >
          <X className="h-5 w-5" /> <span className="sr-only">Close</span>
        </Button>
      </div>

      <div className="p-4 flex-shrink-0 border-b border-border">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            className="pl-10 pr-10" // Espace pour le bouton clear
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchQuery("");
                // Optionnel: re-fetcher les "récents" si la query est vidée, ou juste clearer les résultats
                // fetchMemories(""); // Si vous voulez que vider la recherche affiche les récents
                setMemories([]);
                setHasSearched(false);
                setError(null); // Pour afficher le message initial
              }}
              disabled={isLoading}
            >
              <X className="h-3.5 w-3.5" />{" "}
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </form>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70 mr-2" />
                <p className="text-sm text-muted-foreground">
                  Accessing memories...
                </p>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Memories</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : !hasSearched && memories.length === 0 ? ( // Message initial si aucune recherche n'a été faite
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Brain className="h-12 w-12 text-primary/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">Search Memories</h3>
                <p className="text-sm max-w-xs">
                  Enter keywords to find relevant information Minato has stored.
                </p>
              </div>
            ) : hasSearched && memories.length === 0 && !error ? ( // Message si recherche faite mais pas de résultat
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Brain className="h-12 w-12 text-primary/30 mb-4" />
                <h3 className="text-lg font-medium mb-1">
                  No Matching Memories
                </h3>
                <p className="text-sm max-w-xs">
                  Try refining your search or exploring different topics.
                </p>
              </div>
            ) : (
              // Afficher les mémoires si elles existent
              memories.map((memory) => (
                <MemoryItem
                  key={memory.memory_id}
                  memory={memory}
                  onDelete={() => handleDeleteMemory(memory.memory_id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
