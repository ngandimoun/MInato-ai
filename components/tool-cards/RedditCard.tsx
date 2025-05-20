//components/tool-cards/RedditCard.tsx
"use client";

import React, { useState } from "react";
import { RedditStructuredOutput, RedditPost } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, ThumbsUp, ExternalLink, CalendarClock, Image as ImageIcon, Link as LinkIcon, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, fromUnixTime } from 'date-fns';

interface RedditCardProps { data: RedditStructuredOutput; }

// Utilitaire pour déduire le type de post
function getPostType(post: RedditPost): 'image' | 'video' | 'self' | 'link' {
    if (post.isSelf) return 'self';
    if (post.url && post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (post.url && post.url.includes('youtu') || post.url?.match(/\.(mp4|webm|mov)$/i)) return 'video';
    return 'link';
}

// Utilitaire pour la date relative
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

const RedditPostItem: React.FC<{post: RedditPost, isExpanded: boolean, onToggleExpand: () => void}> = ({ post, isExpanded, onToggleExpand }) => {
    const getPostIcon = () => {
        switch(getPostType(post)) {
            case 'image': return <ImageIcon size={14} className="text-sky-500"/>;
            case 'video': return <LinkIcon size={14} className="text-red-500"/>;
            case 'self': return <FileText size={14} className="text-green-500"/>;
            case 'link': default: return <ExternalLink size={14} className="text-blue-500"/>;
        }
    };

    return (
        <li className="p-2.5 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex gap-2 items-start">
                {post.thumbnailUrl && (
                    <a href={post.url || post.permalink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-16 h-16 block">
                        <img src={post.thumbnailUrl} alt="Post thumbnail" className="w-full h-full object-cover rounded-md border"/>
                    </a>
                )}
                <div className="flex-1 min-w-0">
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-sm line-clamp-2" title={post.title}>
                        {post.title}
                    </a>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                        {post.author && <span>u/{post.author}</span>}
                        {post.score !== null && <span className="flex items-center gap-0.5"><ThumbsUp size={11}/> {post.score}</span>}
                        {post.numComments !== null && <span className="flex items-center gap-0.5"><MessageSquare size={11}/> {post.numComments}</span>}
                        {getRelativeDate(post) && <span className="flex items-center gap-0.5"><CalendarClock size={11}/>{getRelativeDate(post)}</span>}
                        <span className="flex items-center gap-0.5 capitalize">{getPostIcon()} {getPostType(post)}</span>
                    </div>
                </div>
            </div>
            {post.isSelf && post.selfText && (
                <div className="mt-1.5 text-xs">
                    <p className={cn("text-muted-foreground", !isExpanded && "line-clamp-2")}>
                        {post.selfText}
                    </p>
                    {post.selfText.length > 100 && (
                        <Button variant="link" size="sm" onClick={onToggleExpand} className="p-0 h-auto text-primary/80">
                            {isExpanded ? "Show Less" : "Show More"}
                        </Button>
                    )}
                </div>
            )}
            {!post.isSelf && post.url && !post.url.includes(post.permalink) && (
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-1">
                    <ExternalLink size={12}/> View Linked Content
                </a>
            )}
        </li>
    );
};

export function RedditCard({ data }: RedditCardProps) {
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  if (!data) return <p className="text-sm text-muted-foreground">No Reddit data available.</p>;

  const toggleExpand = (postId: string) => {
    setExpandedPostId(prevId => (prevId === postId ? null : postId));
  };
  
  const redditIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="10" r="3"></circle>
      <path d="M7 20.662V17.5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 17.5v3.162"></path>
    </svg>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {redditIcon}
            Reddit: r/{data.subreddit} <span className="text-sm font-normal text-muted-foreground">({data.filter}{data.time ? ` / ${data.time}` : ""})</span>
        </CardTitle>
        <CardDescription>
            {data.count > 0 ? `Found ${data.count} post(s).` : "No posts found."}
            {data.query?.query && ` For query: "${data.query.query}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.error && (
             <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={18}/> 
                <div>
                    <p className="font-medium">Error Fetching Reddit Posts</p>
                    <p className="text-xs">{data.error}</p>
                </div>
            </div>
        )}
        {!data.error && data.posts && data.posts.length > 0 ? (
          <ScrollArea className={cn("max-h-80", data.posts.length > 3 ? "pr-2" : "")}>
            <ul className="space-y-2.5">
              {data.posts.map(post => (
                <RedditPostItem 
                    key={post.id} 
                    post={post}
                    isExpanded={expandedPostId === post.id}
                    onToggleExpand={() => toggleExpand(post.id)}
                />
              ))}
            </ul>
          </ScrollArea>
        ) : (
          !data.error && <p className="text-sm text-muted-foreground text-center py-4">No posts to display based on current filters.</p>
        )}
      </CardContent>
      {data.posts && data.posts.length > 0 && (
         <CardFooter className="text-xs text-muted-foreground justify-center pt-3 border-t">
            Showing {data.posts.length} post(s) from r/{data.subreddit}.
        </CardFooter>
      )}
    </Card>
  );
}