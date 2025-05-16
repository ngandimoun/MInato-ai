//components/tool-cards/HackerNewsCard.tsx
"use client";

import { HackerNewsStructuredOutput, HackerNewsStory } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Newspaper, MessageCircle, ThumbsUp, ExternalLink } from "lucide-react";

interface HackerNewsCardProps { data: HackerNewsStructuredOutput; }

export function HackerNewsCard({ data }: HackerNewsCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No Hacker News data.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary"/>
            Hacker News: {data.sourceDescription || "Stories"}
        </CardTitle>
        <CardDescription>
            {data.count > 0 ? `Showing ${data.count} stories.` : "No stories found."}
            {data.query?.query && ` For query: "${data.query.query}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.stories && data.stories.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {data.stories.map(story => (
              <li key={story.id} className="p-3 border rounded-md hover:bg-muted/50">
                <a href={story.url || story.hnLink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-sm">{story.title}</a>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                    {story.author && <span>By: {story.author}</span>}
                    {story.points !== null && <span className="flex items-center gap-0.5"><ThumbsUp size={12}/> {story.points}</span>}
                    {story.numComments !== null && <span className="flex items-center gap-0.5"><MessageCircle size={12}/> {story.numComments}</span>}
                    {story.createdAt && <span>{new Date(story.createdAt).toLocaleDateString()}</span>}
                    <a href={story.hnLink} target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary text-xs flex items-center gap-0.5"><ExternalLink size={12}/> HN Link</a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No stories to display.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}