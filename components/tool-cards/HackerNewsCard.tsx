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
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface HackerNewsCardProps { data: HackerNewsStructuredOutput; }

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
            case "job": return <Briefcase size={12} className="text-emerald-600 dark:text-emerald-500"/>;
            case "ask": return <HelpCircle size={12} className="text-blue-600 dark:text-blue-500"/>;
            case "show": return <Sparkles size={12} className="text-amber-600 dark:text-amber-500"/>;
            default: return <Newspaper size={12} className="text-orange-600 dark:text-orange-500"/>;
        }
    }

    const getScoreColor = (points: number) => {
        if (points > 500) return "from-red-500 to-pink-500";
        if (points > 200) return "from-orange-500 to-red-500";
        if (points > 100) return "from-amber-500 to-orange-500";
        if (points > 50) return "from-sky-500 to-blue-500";
        return "from-neutral-500 to-neutral-600";
    }

    const points = story.points || 0;

    return (
        <motion.li 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={cn(
                "relative p-3 sm:p-3.5 rounded-lg border transition-all duration-300", // p-3 pour petits écrans, p-3.5 pour sm+
                "bg-white/80 dark:bg-neutral-900/70 backdrop-blur-sm",
                "border-neutral-200/90 dark:border-neutral-700/60",
                "hover:shadow-xl hover:shadow-primary/10 dark:hover:shadow-primary/5",
                "hover:border-primary/30 dark:hover:border-primary/40",
                "hover:scale-[1.015] hover:-translate-y-0.5"
            )}>
                <motion.div
                    className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300"
                    animate={{ opacity: isHovered ? 1 : 0 }}
                />
                
                <div className="relative z-10">
                    <div className="flex gap-3 sm:gap-3.5 items-start"> {/* gap-3 pour petits écrans */}
                        <motion.div 
                            className="flex-shrink-0 flex flex-col items-center w-12 sm:w-14" // w-12 pour petits écrans
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                             <div className={cn(
                                "relative w-12 h-12 sm:w-14 sm:h-14 rounded-md flex items-center justify-center text-white font-semibold text-base", // taille score ajustée
                                "bg-gradient-to-br shadow-md",
                                getScoreColor(points)
                            )}>
                                <div className="absolute inset-0 rounded-md bg-white/10 backdrop-blur-xs" />
                                <span className="relative z-10 text-sm sm:text-base">{points}</span> {/* taille texte score ajustée */}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 text-center">
                                {storyTypeIcon()}
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-tight"> {/* taille texte type ajustée */}
                                    {story.type}
                                </span>
                            </div>
                        </motion.div>
                        <div className="flex-1 min-w-0">
                            <div>
                                <motion.a 
                                    href={story.url || story.hnLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="font-semibold text-sm sm:text-base text-neutral-800 dark:text-neutral-100 hover:text-primary dark:hover:text-primary transition-colors line-clamp-2 leading-snug" // taille titre ajustée
                                    title={story.title}
                                    whileHover={{ x: 1 }}
                                >
                                    {story.title}
                                </motion.a>
                                <div className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 mt-1 text-xs text-neutral-500 dark:text-neutral-400"> {/* gap-x ajusté */}
                                     {story.author && (
                                        <motion.span 
                                            className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-default"
                                            whileHover={{ scale: 1.03 }}
                                        >
                                            <User size={12}/> 
                                            <span className="font-medium">{story.author}</span>
                                        </motion.span>
                                    )}
                                    {story.numComments !== null && (
                                        <motion.span 
                                            className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-default"
                                            whileHover={{ scale: 1.03 }}
                                        >
                                            <MessageCircle size={12}/> 
                                            <span className="font-medium">{story.numComments}</span>
                                        </motion.span>
                                    )}
                                    {getRelativeDate(story) && (
                                        <span 
                                            className="flex items-center gap-1 cursor-default" 
                                            title={getFormattedDate(story)}
                                        >
                                            <CalendarClock size={12}/>
                                            {getRelativeDate(story)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <motion.div 
                            className="flex flex-col gap-1 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" // gap ajusté
                            initial={{ x: 10, opacity:0 }}
                            animate={{ x: isHovered ? 0 : 10, opacity: isHovered ? 1: 0 }}
                            transition={{ ease: "easeOut", duration:0.2 }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: 'var(--primary-hover-bg, #F0F9FF)' }} 
                                whileTap={{ scale: 0.95 }}
                                className="p-1 sm:p-1.5 rounded-md bg-white/80 dark:bg-neutral-800/80 hover:text-primary border border-neutral-200/80 dark:border-neutral-700/70 hover:border-primary/30" // padding ajusté
                                title="Bookmark story"
                                style={{ '--primary-hover-bg': 'hsl(var(--primary)/0.1)' } as React.CSSProperties}
                            >
                                <Bookmark size={14} className="text-neutral-500 dark:text-neutral-400 group-hover:text-primary transition-colors" /> {/* taille icone ajustée */}
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: 'var(--primary-hover-bg, #F0F9FF)' }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1 sm:p-1.5 rounded-md bg-white/80 dark:bg-neutral-800/80 hover:text-primary border border-neutral-200/80 dark:border-neutral-700/70 hover:border-primary/30" // padding ajusté
                                title="Share story"
                                style={{ '--primary-hover-bg': 'hsl(var(--primary)/0.1)' } as React.CSSProperties}
                            >
                                <Share2 size={14} className="text-neutral-500 dark:text-neutral-400 group-hover:text-primary transition-colors" /> {/* taille icone ajustée */}
                            </motion.button>
                        </motion.div>
                    </div>
                    <AnimatePresence initial={false}>
                        {story.text && (
                            <motion.div
                                layout
                                key="storyTextContainer"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0, marginTop:0, marginBottom:0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="w-full mt-2 space-y-1 sm:space-y-1.5 overflow-hidden" // space-y ajusté
                            >
                                {isExpanded ? (
                                    <ScrollArea 
                                        className="h-48 pr-2 sm:pr-2.5 custom-scrollbar-thin" // max-h et pr ajustés
                                    >
                                        <p className={cn(
                                            "text-xs sm:text-sm text-neutral-600 dark:text-neutral-300", // taille texte ajustée
                                            "bg-neutral-100/70 dark:bg-neutral-800/40 p-2 sm:p-2.5 rounded-md", // padding ajusté
                                            "border border-neutral-200/60 dark:border-neutral-700/40",
                                            "whitespace-pre-wrap"
                                        )}>
                                            {story.text}
                                        </p>
                                    </ScrollArea>
                                ) : (
                                    <p className={cn(
                                        "text-xs sm:text-sm text-neutral-600 dark:text-neutral-300", // taille texte ajustée
                                        "bg-neutral-100/70 dark:bg-neutral-800/40 p-2 sm:p-2.5 rounded-md", // padding ajusté
                                        "border border-neutral-200/60 dark:border-neutral-700/40",
                                        "line-clamp-2"
                                    )}>
                                        {story.text}
                                    </p>
                                )}
                                {story.text.length > 100 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="h-auto py-0.5 px-1 sm:py-1 sm:px-1.5 text-[11px] sm:text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10" // padding et taille texte ajustés
                                    >
                                        {isExpanded ? (
                                            <><ChevronUp size={12} className="mr-0.5" />Show Less</>
                                        ) : (
                                            <><ChevronDown size={12} className="mr-0.5" />Read More</>
                                        )}
                                    </Button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="flex justify-between items-center mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-neutral-200/70 dark:border-neutral-700/50"> {/* marges ajustées */}
                        <div className="flex items-center gap-1.5 sm:gap-2"> {/* gap ajusté */}
                            {points > 100 && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20 font-normal"> {/* taille texte ajustée */}
                                    <Flame size={10} className="mr-1" />
                                    Trending
                                </Badge>
                            )}
                        </div>
                        <motion.a 
                            href={story.hnLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs text-primary/90 hover:text-primary font-medium hover:underline" // taille texte et gap ajustés
                            title="View on Hacker News"
                            whileHover={{ x: 1 }}
                        >
                            <ExternalLink size={12}/> 
                            <span>View on HN</span>
                        </motion.a>
                    </div>
                </div>
            </div>
        </motion.li>
    );
};

export function HackerNewsCard({ data }: HackerNewsCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No Hacker News data.</p>;

  const iconForSource = () => {
      if (data.query?.filter === "top" || data.sourceDescription.toLowerCase().includes("top")) 
          return <Flame className="h-5 w-5 text-red-500"/>;
      if (data.query?.filter === "new" || data.sourceDescription.toLowerCase().includes("new")) 
          return <Sparkles className="h-5 w-5 text-sky-500"/>;
      if (data.query?.filter === "best" || data.sourceDescription.toLowerCase().includes("best")) 
          return <TrendingUp className="h-5 w-5 text-emerald-500"/>;
      return <Newspaper className="h-5 w-5 text-orange-500"/>;
  };

  return (
    <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
    >
        <Card className={cn(
            "w-full relative overflow-hidden",
            "bg-gradient-to-br from-white dark:from-neutral-900 to-neutral-50 dark:to-neutral-800/90",
            "backdrop-blur-md border-neutral-200/80 dark:border-neutral-700/60",
            "shadow-lg dark:shadow-neutral-950/20"
        )}>
            {/* Ajustement du padding pour le CardHeader pour les petits écrans */}
            <CardHeader className="relative px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
                <div className="relative z-10">
                    <CardTitle className="flex items-center gap-2 sm:gap-2.5 text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100"> {/* Taille de police et gap ajustés */}
                        <motion.div
                            whileHover={{ rotate: 3, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300, damping:15 }}
                        >
                            {iconForSource()}
                        </motion.div>
                        <span className="bg-gradient-to-r from-neutral-800 to-neutral-600 dark:from-neutral-100 dark:to-neutral-300 bg-clip-text text-transparent">
                            Hacker News: {data.sourceDescription || "Stories"}
                        </span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 sm:mt-1.5"> {/* Taille de police et margin ajustées */}
                        {data.count > 0 ? (
                            <span className="flex items-center gap-1 sm:gap-1.5"> {/* Gap ajusté */}
                                <Eye size={14} className="text-primary/80" />
                                Showing {data.count} top stories
                                {data.query?.query && (
                                    <Badge variant="outline" className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs font-normal border-neutral-300 dark:border-neutral-600"> {/* Margin et taille de texte ajustés */}
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
                        className="flex items-center gap-2 sm:gap-3 text-destructive-600 dark:text-destructive-400 text-xs sm:text-sm p-3 sm:p-3.5 mx-3 sm:mx-4 md:mx-5 mb-3 sm:mb-4 bg-destructive/10 rounded-lg border border-destructive/20" /* Paddings et margins ajustés */
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <AlertCircle size={16}/> 
                        <div>
                            <p className="font-semibold">Error Fetching Hacker News</p>
                            <p className="text-[11px] sm:text-xs opacity-90">{data.error}</p> {/* Taille de texte ajustée */}
                        </div>
                    </motion.div>
                )}
                
                {!data.error && data.stories && data.stories.length > 0 ? (
                    // Ajustement du padding pour la ScrollArea pour les petits écrans
                    <ScrollArea className="max-h-[550px] px-2.5 sm:px-4 md:px-5 pt-1 pb-2">
                        <ul className="grid grid-cols-1 gap-2.5 sm:gap-3 md:gap-3.5 pb-2.5 sm:pb-4"> {/* Gaps ajustés */}
                            {data.stories.map((story, index) => (
                                <StoryItem key={story.id} story={story} index={index} />
                            ))}
                        </ul>
                    </ScrollArea>
                ) : (
                    !data.error && (
                        <div className="text-center py-8 sm:py-10 px-3 sm:px-5"> {/* Padding ajusté */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2 sm:space-y-2.5" // Space-y ajusté
                            >
                                <Newspaper size={36} className="mx-auto text-neutral-400 dark:text-neutral-600" />
                                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">No stories to display</p>
                            </motion.div>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    </motion.div>
  );
}