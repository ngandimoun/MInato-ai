//components/tool-cards/MemoryToolCard.tsx
"use client";

import { MemoryToolResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Search, ThumbsUp } from "lucide-react";

interface MemoryToolCardProps { data: MemoryToolResult; }

export function MemoryToolCard({ data }: MemoryToolCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No memory tool data.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary"/>
            Memory Retrieval
        </CardTitle>
        <CardDescription>
          Searched for: "
          {typeof data.query === "string"
            ? data.query
            : data.query
              ? JSON.stringify(data.query)
              : "N/A"}
          "
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.found && data.memories && data.memories.length > 0 ? (
          <>
            <p className="text-sm mb-2">Found {data.count} relevant memories:</p>
            <ul className="space-y-2 text-xs max-h-60 overflow-y-auto border p-2 rounded-md">
              {data.memories.map(mem => (
                <li key={mem.memory_id} className="border-b pb-1 last:border-b-0">
                  <p className="line-clamp-2">{mem.content}</p>
                  <div className="text-muted-foreground/80 flex justify-between items-center mt-0.5">
                    <span>Updated: {new Date(mem.updated_at).toLocaleDateString()}</span>
                    {mem.score !== null && mem.score !== undefined && <span className="flex items-center gap-0.5"><ThumbsUp size={11}/> {mem.score.toFixed(2)}</span>}
                  </div>
                  {mem.is_latest_fact === false && <span className="text-amber-600 text-[10px]">(Possibly Outdated)</span>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No specific memories found matching that query.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}