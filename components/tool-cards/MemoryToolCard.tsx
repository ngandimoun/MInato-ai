//components/tool-cards/MemoryToolCard.tsx
"use client";

import { MemoryToolResult } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Search, ThumbsUp, AlertTriangle, BadgeCheck, Info, CalendarDays, Tag, Activity, AlertCircle, Sparkles } from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

interface MemoryToolCardProps { data: MemoryToolResult; }

const MemoryListItem: React.FC<{ memory: NonNullable<MemoryToolResult['memories']>[number]; index: number }> = ({ memory, index }) => {
    const { toast } = useToast();
    const updatedDate = parseISO(memory.updated_at);
    const formattedDate = format(updatedDate, "MMM d, yyyy 'at' h:mm a");
    const relativeDate = formatDistanceToNowStrict(updatedDate, { addSuffix: true });

    let statusIcon = <Info size={12} className="text-blue-500" />;
    let statusText = "Current";
    let statusColor = "status-current";
    let isLatest = false;

    if (memory.is_latest_fact === true) {
        statusIcon = <BadgeCheck size={12} className="text-green-500 fill-green-500/20" />;
        statusText = "Latest Info";
        statusColor = "status-latest";
        isLatest = true;
    } else if (memory.is_latest_fact === false) {
        statusIcon = <AlertTriangle size={12} className="text-amber-500" />;
        statusText = "Possibly Outdated";
        statusColor = "status-outdated";
    }

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(memory.content);
        toast({
            title: "Copied to clipboard 🧠⚡",
            description: "Memory content copied",
            duration: 2000,
        });
    };

    return (
        <motion.li
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, ease: 'easeOut' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyToClipboard}
            className={cn(
                "glass-card relative p-2.5 rounded-xl transition-all h-full cursor-pointer", 
                isLatest && "border-cyan-400/60 minato-glow"
            )}
        >
            {/* Left accent */}
            <span className="card-accent-left" />
            {/* Top accent (mobile) */}
            <span className="card-accent-top" />
            
            <p className="text-sm text-foreground mb-1 line-clamp-3">{memory.content}</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1.5" title={formattedDate}>
                    <CalendarDays size={12} />
                    <span>Updated: {relativeDate}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                    {memory.score !== null && memory.score !== undefined && (
                        <span className="memory-chip bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" title={`Relevance score: ${memory.score.toFixed(3)}`}>
                            <ThumbsUp size={10} /> {memory.score.toFixed(1)} ⭐
                        </span>
                    )}
                    <span className={cn("memory-chip", statusColor)}>
                        {statusIcon} {statusText}
                    </span>
                    {memory.memory_type && (
                        <span className="memory-chip bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Tag size={10}/> {memory.memory_type.replace(/_/g, " ")}
                        </span>
                    )}
                </div>
            </div>
        </motion.li>
    );
};

export function MemoryToolCard({ data }: MemoryToolCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No memory tool data available.</p>;

  const queryText = typeof data.query === "string" ? data.query : data.query?.query || "your request";

  return (
    <Card className="w-full glass-card overflow-hidden">
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex items-center"
            >
                <Brain className="h-5 w-5 text-cyan-500 mr-1"/>
                <Sparkles className="h-3 w-3 text-cyan-400" />
            </motion.div>
            <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                Minato memories
            </motion.span>
        </CardTitle>
        <CardDescription className="flex items-center text-xs">
          <span className="font-medium">Found {data.count || 0} relevant facts</span>
          <span className="mx-1.5">•</span>
          <span className="italic">just now</span>
        </CardDescription>
      </CardHeader>
      
      {/* MODIFICATION: Ajustement du padding de CardContent */}
      <CardContent className="pt-2 pb-4 px-4 md:px-6"> 
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
            {/* MODIFICATION: mb-3 au lieu de mb-2 pour l'espacement avant ScrollArea */}
            <div className="text-sm mb-3 text-muted-foreground flex items-center"> 
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-foreground/90 font-medium"
              >
                Results for: "<span className="text-cyan-600 dark:text-cyan-400">{queryText.substring(0,50)}{queryText.length > 50 ? "..." : ""}</span>"
              </motion.div>
            </div>
            {/* MODIFICATION: Ajustement des classes de ScrollArea pour max-h et pr */}
            <ScrollArea className="h-64 md:h-80 lg:h-96 pr-3 custom-scrollbar"> 
              <ul className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {data.memories.map((mem, index) => (
                  <MemoryListItem key={mem.memory_id} memory={mem} index={index} />
                ))}
              </ul>
            </ScrollArea>
          </>
        ) : (
          !data.error && 
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg"
          >
              No specific memories found matching that query for you.
          </motion.div>
        )}
      </CardContent>
      {data.memories && data.memories.length > 0 && (
        <CardFooter className="text-xs text-muted-foreground justify-center pt-2 pb-3 border-t">
            <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70">Displaying {data.memories.length} of {data.count} memories</span>
                {/* <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs flex gap-1 items-center"
                >
                    <Search className="h-3 w-3" /> Search again
                </Button> */}
            </div>
        </CardFooter>
      )}
    </Card>
  );
}