//components/tool-cards/HackerNewsCard.tsx
"use client";

import { HackerNewsStructuredOutput, HackerNewsStory } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Newspaper, MessageCircle, ThumbsUp, ExternalLink, User, CalendarClock, AlertCircle, Flame, TrendingUp, Sparkles, Briefcase, HelpCircle, ChevronDown, ChevronUp, Bookmark, Share2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

interface HackerNewsCardProps { data: HackerNewsStructuredOutput; }

// Utilities for relative and formatted date
function getRelativeDate(story: HackerNewsStory): string | undefined {
    if (story.createdAt) {
        try {
            return formatDistanceToNowStrict(parseISO(story.createdAt), { addSuffix: true });
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function getFormattedDate(story: HackerNewsStory): string | undefined {
    if (story.createdAt) {
        try {
            return format(parseISO(story.createdAt), "MMM d, yyyy 'at' h:mm a");
        } catch {
            return undefined;
        }
    }
    return undefined;
}

const StoryItem: React.FC<{ story: HackerNewsStory; index: number }> = ({ story, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const storyTypeIcon = () => {
        switch (story.type) {
            case "job": return <Briefcase size={14} className="text-emerald-500"/>;
            case "ask": return <HelpCircle size={14} className="text-blue-500"/>;
            case "show": return <Sparkles size={14} className="text-amber-500"/>;
            default: return <Newspaper size={14} className="text-orange-500"/>;
        }
    }

    const getScoreColor = (points: number) => {
        if (points > 500) return "from-red-500 to-pink-500";
        if (points > 200) return "from-orange-500 to-red-500";
        if (points > 100) return "from-amber-500 to-orange-500";
        if (points > 50) return "from-blue-500 to-indigo-500";
        return "from-gray-500 to-gray-600";
    }

    const points = story.points || 0;

    return (
        <motion.li 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={cn(
                "relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-300",
                "bg-gradient-to-br from-background/80 to-background/40 dark:from-background/90 dark:to-background/60",
                "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
                "hover:scale-[1.02] hover:-translate-y-1"
            )}>
                {/* Gradient background overlay on hover */}
                <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300"
                    animate={{ opacity: isHovered ? 1 : 0 }}
                />
                
                <div className="relative z-10">
                    <div className="flex gap-4 items-start">
                        {/* Enhanced Score Badge */}
                        <motion.div 
                            className="flex-shrink-0"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className={cn(
                                "relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm",
                                "bg-gradient-to-br shadow-lg",
                                getScoreColor(points)
                            )}>
                                <div className="absolute inset-0 rounded-xl bg-white/20 backdrop-blur-sm" />
                                <span className="relative z-10">{points}</span>
                            </div>
                            <div className="flex items-center justify-center mt-1 gap-1">
                                {storyTypeIcon()}
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                    {story.type}
                                </span>
                            </div>
                        </motion.div>

                        {/* Content Section */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div>
                                <motion.a 
                                    href={story.url || story.hnLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="font-semibold text-base text-foreground hover:text-primary transition-colors line-clamp-2 leading-tight"
                                    title={story.title}
                                    whileHover={{ x: 2 }}
                                >
                                    {story.title}
                                </motion.a>

                                {/* Enhanced metadata */}
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                    {story.author && (
                                        <motion.span 
                                            className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            <User size={12}/> 
                                            <span className="font-medium">{story.author}</span>
                                        </motion.span>
                                    )}
                                    {story.numComments !== null && (
                                        <motion.span 
                                            className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            <MessageCircle size={12}/> 
                                            <span className="font-medium">{story.numComments} comments</span>
                                        </motion.span>
                                    )}
                                    {getRelativeDate(story) && (
                                        <span 
                                            className="flex items-center gap-1" 
                                            title={getFormattedDate(story)}
                                        >
                                            <CalendarClock size={12}/>
                                            {getRelativeDate(story)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Story text preview with expand/collapse */}
                            <AnimatePresence>
                                {story.text && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-2"
                                    >
                                        <motion.p 
                                            className={cn(
                                                "text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border",
                                                !isExpanded && "line-clamp-2"
                                            )}
                                            layout
                                        >
                                            {story.text}
                                        </motion.p>
                                        {story.text.length > 150 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsExpanded(!isExpanded)}
                                                className="h-8 text-xs text-primary hover:text-primary/80"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp size={14} className="mr-1" />
                                                        Show Less
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown size={14} className="mr-1" />
                                                        Read More
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Action buttons */}
                        <motion.div 
                            className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            initial={{ x: 20 }}
                            animate={{ x: isHovered ? 0 : 20 }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-lg bg-background/80 hover:bg-primary/10 border hover:border-primary/20 transition-colors"
                                title="Bookmark story"
                            >
                                <Bookmark size={16} className="text-muted-foreground hover:text-primary transition-colors" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-lg bg-background/80 hover:bg-primary/10 border hover:border-primary/20 transition-colors"
                                title="Share story"
                            >
                                <Share2 size={16} className="text-muted-foreground hover:text-primary transition-colors" />
                            </motion.button>
                        </motion.div>
                    </div>

                    {/* Footer with external link */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                            {points > 100 && (
                                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary/10 to-accent/10">
                                    <Flame size={10} className="mr-1" />
                                    Trending
                                </Badge>
                            )}
                        </div>
                        <motion.a 
                            href={story.hnLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors"
                            title="View on Hacker News"
                            whileHover={{ x: 2 }}
                        >
                            <ExternalLink size={12}/> 
                            <span className="font-medium">View on HN</span>
                        </motion.a>
                    </div>
                </div>
            </div>
        </motion.li>
    );
};

export function HackerNewsCard({ data }: HackerNewsCardProps) {
  console.log("[HackerNewsCard] Rendering with data:", data);
  console.log("typeof data.result_type:", typeof data.result_type, "value:", data.result_type, "===", data.result_type === "hn_stories");
  if (!data) return <p className="text-sm text-muted-foreground">No Hacker News data.</p>;

  const iconForSource = () => {
      if (data.query?.filter === "top" || data.sourceDescription.toLowerCase().includes("top")) 
          return <Flame className="h-6 w-6 text-orange-500"/>;
      if (data.query?.filter === "new" || data.sourceDescription.toLowerCase().includes("new")) 
          return <Sparkles className="h-6 w-6 text-blue-500"/>;
      if (data.query?.filter === "best" || data.sourceDescription.toLowerCase().includes("best")) 
          return <TrendingUp className="h-6 w-6 text-green-500"/>;
      return <Newspaper className="h-6 w-6 text-primary"/>;
  };

  return (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
    >
        <Card className={cn(
            "w-full relative overflow-hidden",
            "bg-gradient-to-br from-background to-background/80",
            "backdrop-blur-sm border-border/50",
            "shadow-lg dark:shadow-primary/5"
        )}>
            {/* Header with enhanced styling */}
            <CardHeader className="relative">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
                <div className="relative z-10">
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            {iconForSource()}
                        </motion.div>
                        <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                            Hacker News: {data.sourceDescription || "Stories"}
                        </span>
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {data.count > 0 ? (
                            <span className="flex items-center gap-2">
                                <Eye size={16} className="text-primary" />
                                Showing {data.count} top stories
                                {data.query?.query && (
                                    <Badge variant="outline" className="ml-2">
                                        "{data.query.query}"
                                    </Badge>
                                )}
                            </span>
                        ) : (
                            "No stories found matching your criteria."
                        )}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {data.error && (
                    <motion.div 
                        className="flex items-center gap-3 text-destructive text-sm p-4 mx-6 mb-4 bg-destructive/10 rounded-xl border border-destructive/20"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <AlertCircle size={20}/> 
                        <div>
                            <p className="font-semibold">Error Fetching Hacker News</p>
                            <p className="text-xs opacity-80">{data.error}</p>
                        </div>
                    </motion.div>
                )}
                
                {!data.error && data.stories && data.stories.length > 0 ? (
                    <ScrollArea className="max-h-[600px] px-6">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                            {data.stories.map((story, index) => (
                                <StoryItem key={story.id} story={story} index={index} />
                            ))}
                        </ul>
                    </ScrollArea>
                ) : (
                    !data.error && (
                        <div className="text-center py-12 px-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3"
                            >
                                <Newspaper size={48} className="mx-auto text-muted-foreground/50" />
                                <p className="text-muted-foreground">No stories to display</p>
                            </motion.div>
                        </div>
                    )
                )}
            </CardContent>

            {data.stories && data.stories.length > 0 && (
                <CardFooter className="text-xs text-muted-foreground justify-center pt-4 border-t border-border/50 bg-muted/30">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2"
                    >
                        <Sparkles size={12} />
                        Stories from Hacker News via {data.source_api === "hackernews" ? "Algolia/Firebase API" : data.source_api}
                    </motion.p>
                </CardFooter>
            )}
        </Card>
    </motion.div>
  );
}