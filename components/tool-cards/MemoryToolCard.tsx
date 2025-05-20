//components/tool-cards/MemoryToolCard.tsx
"use client";

import { MemoryToolResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added for potential actions
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Search, ThumbsUp, AlertTriangle, BadgeCheck, Info, CalendarDays, Tag, Activity, AlertCircle } from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";

interface MemoryToolCardProps { data: MemoryToolResult; }

const MemoryListItem: React.FC<{ memory: NonNullable<MemoryToolResult['memories']>[number] }> = ({ memory }) => {
    const updatedDate = parseISO(memory.updated_at);
    const formattedDate = format(updatedDate, "MMM d, yyyy 'at' h:mm a");
    const relativeDate = formatDistanceToNowStrict(updatedDate, { addSuffix: true });

    let statusIcon = <Info size={12} className="text-blue-500" />;
    let statusText = "Current";
    let statusColor = "text-blue-500";

    if (memory.is_latest_fact === true) {
        statusIcon = <BadgeCheck size={12} className="text-green-500 fill-green-500/20" />;
        statusText = "Latest Info";
        statusColor = "text-green-600 dark:text-green-400";
    } else if (memory.is_latest_fact === false) {
        statusIcon = <AlertTriangle size={12} className="text-amber-500" />;
        statusText = "Possibly Outdated";
        statusColor = "text-amber-600 dark:text-amber-400";
    }

    return (
        <li className="p-2.5 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
            <p className="text-sm text-foreground mb-1 line-clamp-3">{memory.content}</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1.5" title={formattedDate}>
                    <CalendarDays size={12} />
                    <span>Updated: {relativeDate}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                    {memory.score !== null && memory.score !== undefined && (
                        <span className="flex items-center gap-0.5" title={`Relevance score: ${memory.score.toFixed(3)}`}>
                            <ThumbsUp size={11} /> Relevance: {memory.score.toFixed(2)}
                        </span>
                    )}
                    <span className={cn("flex items-center gap-0.5", statusColor)}>
                        {statusIcon} {statusText}
                    </span>
                    {memory.memory_type && (
                        <span className="flex items-center gap-0.5 capitalize">
                            <Tag size={11}/> {memory.memory_type.replace(/_/g, " ")}
                        </span>
                    )}
                    {/* Add other metadata if useful, e.g., confidence */}
                </div>
            </div>
            {/* Potential actions: Edit, Delete (if MemoryPanel isn't the only place) */}
        </li>
    );
};

export function MemoryToolCard({ data }: MemoryToolCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No memory tool data available.</p>;

  const queryText = typeof data.query === "string" ? data.query : data.query?.query || "your request";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary"/>
            Minato's Memory Retrieval
        </CardTitle>
        <CardDescription>
          Searched for: "<span className="font-medium">{queryText.substring(0,100)}{queryText.length > 100 ? "..." : ""}</span>"
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={18}/> 
                <div>
                    <p className="font-medium">Memory Search Error</p>
                    <p className="text-xs">{data.error}</p>
                </div>
            </div>
        )}
        {!data.error && data.found && data.memories && data.memories.length > 0 ? (
          <>
            <p className="text-sm mb-2 text-muted-foreground">
              Found {data.count} relevant piece{data.count > 1 ? 's' : ''} of information:
            </p>
            <ScrollArea className="max-h-72 border rounded-md">
              <ul className="divide-y divide-border/50">
                {data.memories.map(mem => (
                  <MemoryListItem key={mem.memory_id} memory={mem} />
                ))}
              </ul>
            </ScrollArea>
          </>
        ) : (
          !data.error && <p className="text-sm text-muted-foreground text-center py-4">No specific memories found matching that query for you.</p>
        )}
      </CardContent>
      {data.memories && data.memories.length > 0 && (
        <CardFooter className="text-xs text-muted-foreground justify-center pt-3 border-t">
            Displaying {data.memories.length} of {data.count} memories.
        </CardFooter>
      )}
    </Card>
  );
}