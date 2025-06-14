//components/tool-cards/RedditCard.tsx
"use client";

import React, { useState } from "react";
import { RedditStructuredOutput, RedditPost } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, ThumbsUp, ExternalLink, CalendarClock, Image as ImageIcon, Link as LinkIcon, FileText, AlertCircle, Eye, TrendingUp, Flame, Award, ArrowUp, ChevronDown, ChevronUp, Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, fromUnixTime } from 'date-fns';
import { motion, AnimatePresence } from "motion/react";

interface RedditCardProps { data: RedditStructuredOutput; }

// Utility to deduce post type
function getPostType(post: RedditPost): 'image' | 'video' | 'self' | 'link' {
    if (post.isSelf) return 'self';
    if (post.url && post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (post.url && post.url.includes('youtu') || post.url?.match(/\.(mp4|webm|mov)$/i)) return 'video';
    return 'link';
}

// Utility for relative date
function getRelativeDate(post: RedditPost): string | undefined {
    if (post.createdUtc) {
        try {
            return formatDistanceToNowStrict(typeof post.createdUtc === 'number' ? fromUnixTime(post.createdUtc) : new Date(post.createdUtc * 1000), { addSuffix: true });
        } catch {
            return undefined;
        }
    }
    return undefined;
}

const RedditPostItem: React.FC<{post: RedditPost, isExpanded: boolean, onToggleExpand: () => void, index: number}> = ({ post, isExpanded, onToggleExpand, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    const getPostIcon = () => {
        switch(getPostType(post)) {
            case 'image': return <ImageIcon size={14} className="text-purple-500"/>;
            case 'video': return <LinkIcon size={14} className="text-red-500"/>;
            case 'self': return <FileText size={14} className="text-green-500"/>;
            case 'link': default: return <ExternalLink size={14} className="text-blue-500"/>;
        }
    };

    const getScoreColor = (score: number) => {
        if (score > 1000) return "from-red-500 to-pink-500";
        if (score > 500) return "from-orange-500 to-red-500";
        if (score > 100) return "from-amber-500 to-orange-500";
        if (score > 50) return "from-blue-500 to-indigo-500";
        return "from-gray-500 to-gray-600";
    };

    const score = post.score || 0;

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
                "hover:scale-[1.01] hover:-translate-y-1"
            )}>
                {/* Gradient background overlay on hover */}
                <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300"
                    animate={{ opacity: isHovered ? 1 : 0 }}
                />

                <div className="relative z-10 flex flex-col gap-3"> {/* Main content now in flex-col */}

                    {/* Section 1: Title, Author, Score */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <motion.a
                                    href={post.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-base text-foreground hover:text-primary transition-colors line-clamp-3 leading-snug"
                                    title={post.title}
                                    whileHover={{ x: 2 }}
                                >
                                    {post.title}
                                </motion.a>
                                {post.author && (
                                    <motion.span
                                        className="block mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        u/{post.author}
                                    </motion.span>
                                )}
                            </div>

                            {/* Enhanced score display */}
                            <motion.div
                                className="flex-shrink-0"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className={cn(
                                    "relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm",
                                    "bg-gradient-to-br shadow-lg",
                                    getScoreColor(score)
                                )}>
                                    <div className="absolute inset-0 rounded-xl bg-white/20 backdrop-blur-sm" />
                                    <span className="relative z-10 flex flex-col items-center">
                                        <ArrowUp size={10} />
                                        <span className="text-xs">{score}</span>
                                    </span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Enhanced metadata (Comments, Date, Type) */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {post.numComments !== null && (
                                <motion.span
                                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <MessageSquare size={12}/>
                                    <span className="font-medium">{post.numComments} comments</span>
                                </motion.span>
                            )}
                            {getRelativeDate(post) && (
                                <span className="flex items-center gap-1">
                                    <CalendarClock size={12}/>
                                    {getRelativeDate(post)}
                                </span>
                            )}
                            <span className="flex items-center gap-1 capitalize">
                                {getPostIcon()}
                                <span className="font-medium">{getPostType(post)}</span>
                            </span>
                        </div>
                    </div>

                    {/* Section 2: Enhanced thumbnail (if present) */}
                    {post.thumbnailUrl && (
                        <motion.div
                            className="relative w-full overflow-hidden rounded-lg"
                            whileHover={{ scale: 1.02 }} // Gentle scale on thumbnail container hover
                            transition={{ duration: 0.2 }}
                        >
                            <a href={post.url || post.permalink} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                    src={post.thumbnailUrl}
                                    alt="Post thumbnail"
                                    className="w-full h-auto max-h-96 object-cover rounded-lg transition-all duration-300 group-hover:brightness-110" // max-h can be adjusted
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                            </a>
                        </motion.div>
                    )}

                    {/* Section 3: Content (SelfText or External Link) */}
                    <AnimatePresence>
                        {post.isSelf && post.selfText && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-2"
                            >
                                <motion.p
                                    className={cn(
                                        "text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border",
                                        !isExpanded && "line-clamp-2" // Kept original line-clamp
                                    )}
                                    layout
                                >
                                    {post.selfText}
                                </motion.p>
                                {post.selfText.length > 100 && ( // Kept original condition
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onToggleExpand}
                                        className="h-8 text-xs text-primary hover:text-primary/80"
                                    >
                                        {isExpanded ? (
                                            <><ChevronUp size={14} className="mr-1" />Show Less</>
                                        ) : (
                                            <><ChevronDown size={14} className="mr-1" />Read More</>
                                        )}
                                    </Button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!post.isSelf && post.url && !post.url.includes(post.permalink) && (
                        <motion.a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 hover:text-blue-600 transition-colors py-1" // Adjusted padding
                            whileHover={{ x: 2 }}
                        >
                            <ExternalLink size={12}/>
                            View Linked Content
                        </motion.a>
                    )}

                    {/* Section 4: Footer with Badges and Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 flex-wrap">
                            {score > 500 && (
                                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-orange-500/10 to-red-500/10">
                                    <Flame size={10} className="mr-1" />Hot
                                </Badge>
                            )}
                            {(post.numComments || 0) > 50 && (
                                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                                    <MessageSquare size={10} className="mr-1" />Active
                                </Badge>
                            )}
                            {index === 0 && (
                                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary/10 to-accent/10">
                                    <TrendingUp size={10} className="mr-1" />Top
                                </Badge>
                            )}
                        </div>

                        {/* Action buttons (now horizontal) */}
                        <motion.div
                            className="flex gap-2 items-center" // Buttons are now side-by-side
                            initial={{ x: 10, opacity: 0 }}
                            animate={{ x: isHovered ? 0 : 10, opacity: isHovered ? 1 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-lg bg-background/80 hover:bg-primary/10 border hover:border-primary/20 transition-colors"
                                title="Bookmark post"
                            >
                                <Bookmark size={16} className="text-muted-foreground hover:text-primary transition-colors" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-lg bg-background/80 hover:bg-primary/10 border hover:border-primary/20 transition-colors"
                                title="Share post"
                            >
                                <Share2 size={16} className="text-muted-foreground hover:text-primary transition-colors" />
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.li>
    );
};

export function RedditCard({ data }: RedditCardProps) {
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  if (!data) return <p className="text-sm text-muted-foreground">No Reddit data available.</p>;

  const toggleExpand = (postId: string) => {
    setExpandedPostId(prevId => (prevId === postId ? null : postId));
  };
  
  const redditIcon = (
    <motion.svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-orange-500"
        whileHover={{ rotate: 5, scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
    >
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="10" r="3"></circle>
        <path d="M7 20.662V17.5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 17.5v3.162"></path>
    </motion.svg>
  );

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
                    className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-accent/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
                <div className="relative z-10">
                    <CardTitle className="flex items-center gap-3 text-xl">
                        {redditIcon}
                        <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                            Reddit: r/{data.subreddit}
                        </span>
                        <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {data.filter}
                            </Badge>
                            {data.time && (
                                <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600">
                                    {data.time}
                                </Badge>
                            )}
                        </div>
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {data.count > 0 ? (
                            <span className="flex items-center gap-2">
                                <Eye size={16} className="text-primary" />
                                Found {data.count} post{data.count > 1 ? 's' : ''}
                                {data.query?.query && (
                                    <Badge variant="outline" className="ml-2">
                                        "{data.query.query}"
                                    </Badge>
                                )}
                            </span>
                        ) : (
                            "No posts found."
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
                            <p className="font-semibold">Error Fetching Reddit Posts</p>
                            <p className="text-xs opacity-80">{data.error}</p>
                        </div>
                    </motion.div>
                )}
                
                {!data.error && data.posts && data.posts.length > 0 ? (
                    <ScrollArea className="h-[600px] px-6">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-6">
                            {data.posts.map((post, index) => (
                                <RedditPostItem 
                                    key={post.id} 
                                    post={post}
                                    isExpanded={expandedPostId === post.id}
                                    onToggleExpand={() => toggleExpand(post.id)}
                                    index={index}
                                />
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
                                <div className="mx-auto text-muted-foreground/50 w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <circle cx="12" cy="10" r="3"></circle>
                                        <path d="M7 20.662V17.5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 17.5v3.162"></path>
                                    </svg>
                                </div>
                                <p className="text-muted-foreground">No posts to display based on current filters</p>
                            </motion.div>
                        </div>
                    )
                )}
            </CardContent>

            {data.posts && data.posts.length > 0 && (
                <CardFooter className="text-xs text-muted-foreground justify-center pt-4 border-t border-border/50 bg-muted/30">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2"
                    >
                        <Award size={12} />
                        Showing {data.posts.length} post{data.posts.length > 1 ? 's' : ''} from r/{data.subreddit}
                    </motion.p>
                </CardFooter>
            )}
        </Card>
    </motion.div>
  );
}