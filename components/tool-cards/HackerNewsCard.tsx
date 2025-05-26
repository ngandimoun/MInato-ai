//components/tool-cards/HackerNewsCard.tsx
"use client";

import { HackerNewsStructuredOutput, HackerNewsStory } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Newspaper, MessageCircle, ThumbsUp, ExternalLink, User, CalendarClock, AlertCircle, Flame, TrendingUp, Sparkles, Briefcase, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, format, parseISO } from 'date-fns';

interface HackerNewsCardProps { data: HackerNewsStructuredOutput; }

// Utilitaires pour la date relative et formatée
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

const StoryItem: React.FC<{ story: HackerNewsStory }> = ({ story }) => {
    const storyTypeIcon = () => {
        switch (story.type) {
            case "job": return <Briefcase size={12} className="text-green-500"/>;
            case "ask": return <HelpCircle size={12} className="text-blue-500"/>;
            case "show": return <Sparkles size={12} className="text-yellow-500"/>;
            default: return <Newspaper size={12} className="text-orange-500"/>;
        }
    }

    return (
        <li className="p-2.5 border rounded-lg hover:bg-muted/30 transition-shadow">
            <div className="flex flex-col sm:flex-row gap-2 items-start">
                <div className="flex-shrink-0 text-center sm:text-left pt-0.5 sm:pt-0">
                    <div className={cn("w-8 h-8 mx-auto sm:mx-0 rounded-md flex items-center justify-center text-sm font-bold", 
                        (story.points || 0) > 100 ? "bg-red-500/10 text-red-600" : 
                        (story.points || 0) > 50 ? "bg-orange-500/10 text-orange-600" :
                        "bg-muted text-muted-foreground"
                    )}>
                        {story.points || 0}
                    </div>
                     <p className="text-[10px] text-muted-foreground mt-0.5">{storyTypeIcon()} {story.type}</p>
                </div>
                <div className="flex-1 min-w-0">
                    <a href={story.url || story.hnLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-primary hover:underline line-clamp-2" title={story.title}>
                        {story.title}
                    </a>
                     <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 items-center">
                        {story.author && <span className="flex items-center gap-0.5"><User size={11}/> {story.author}</span>}
                        {story.numComments !== null && <span className="flex items-center gap-0.5"><MessageCircle size={11}/> {story.numComments}</span>}
                        {getRelativeDate(story) && <span className="flex items-center gap-0.5" title={getFormattedDate(story)}><CalendarClock size={11}/>{getRelativeDate(story)}</span>}
                    </div>
                </div>
                <a href={story.hnLink} target="_blank" rel="noopener noreferrer" 
                   className="flex-shrink-0 text-primary/80 hover:text-primary text-xs flex items-center gap-0.5 self-start sm:self-center pt-1 sm:pt-0" 
                   title="View on Hacker News">
                    <ExternalLink size={12}/> HN
                </a>
            </div>
            {story.text && (
                <p className="mt-1.5 text-xs text-muted-foreground bg-muted/50 p-1.5 rounded-sm line-clamp-3">
                   {story.text}
                </p>
            )}
        </li>
    );
};

export function HackerNewsCard({ data }: HackerNewsCardProps) {
  console.log("[HackerNewsCard] Rendering with data:", data);
  console.log("typeof data.result_type:", typeof data.result_type, "value:", data.result_type, "===", data.result_type === "hn_stories");
  if (!data) return <p className="text-sm text-muted-foreground">No Hacker News data.</p>;

  const iconForSource = () => {
      if (data.query?.filter === "top" || data.sourceDescription.toLowerCase().includes("top")) return <Flame className="h-5 w-5 text-primary"/>;
      if (data.query?.filter === "new" || data.sourceDescription.toLowerCase().includes("new")) return <Sparkles className="h-5 w-5 text-primary"/>;
      if (data.query?.filter === "best" || data.sourceDescription.toLowerCase().includes("best")) return <TrendingUp className="h-5 w-5 text-primary"/>;
      return <Newspaper className="h-5 w-5 text-primary"/>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {iconForSource()}
            Hacker News: {data.sourceDescription || "Stories"}
        </CardTitle>
        <CardDescription>
            {data.count > 0 ? `Showing ${data.count} top stories.` : "No stories found matching your criteria."}
            {data.query?.query && ` For query: "${data.query.query}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.error && (
             <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={18}/> 
                <div>
                    <p className="font-medium">Error Fetching Hacker News</p>
                    <p className="text-xs">{data.error}</p>
                </div>
            </div>
        )}
        {!data.error && data.stories && data.stories.length > 0 ? (
          <ScrollArea className={cn("max-h-80", data.stories.length > 3 ? "pr-2" : "")}>
            <ul className="space-y-2.5">
              {data.stories.map(story => (
                <StoryItem key={story.id} story={story} />
              ))}
            </ul>
          </ScrollArea>
        ) : (
          !data.error && <p className="text-sm text-muted-foreground text-center py-4">No stories to display.</p>
        )}
      </CardContent>
      {data.stories && data.stories.length > 0 && (
         <CardFooter className="text-xs text-muted-foreground justify-center pt-3 border-t">
            Stories from Hacker News via {data.source_api === "hackernews" ? "Algolia/Firebase API" : data.source_api}.
        </CardFooter>
      )}
    </Card>
  );
}