//components/tool-cards/RedditCard.tsx
"use client";

import { RedditStructuredOutput, RedditPost } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, ThumbsUp, ExternalLink, CalendarClock } from "lucide-react"; // Re-using ExternalLink, CalendarClock

interface RedditCardProps { data: RedditStructuredOutput; }

export function RedditCard({ data }: RedditCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No Reddit data available.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {/* You can find a Reddit-like icon or use a generic one */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="10" r="3"></circle><path d="M7 20.662V17.5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 17 17.5v3.162"></path></svg>
            Reddit: r/{data.subreddit} ({data.filter}{data.time ? `/${data.time}` : ""})
        </CardTitle>
        <CardDescription>
            {data.count > 0 ? `Showing ${data.count} posts.` : "No posts found."}
            {data.query?.subreddit && ` For subreddit: "r/${data.query.subreddit}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.posts && data.posts.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {data.posts.map(post => (
              <li key={post.id} className="p-3 border rounded-md hover:bg-muted/50">
                <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-sm">{post.title}</a>
                {post.thumbnailUrl && !post.thumbnailUrl.startsWith("self") && !post.thumbnailUrl.startsWith("default") && (
                    <img src={post.thumbnailUrl} alt="Thumbnail" className="mt-1 max-h-20 w-auto rounded"/>
                )}
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                    {post.author && <span>By: u/{post.author}</span>}
                    {post.score !== null && <span className="flex items-center gap-0.5"><ThumbsUp size={12}/> {post.score}</span>}
                    {post.numComments !== null && <span className="flex items-center gap-0.5"><MessageSquare size={12}/> {post.numComments}</span>}
                    {post.createdUtc && <span className="flex items-center gap-0.5"><CalendarClock size={12}/>{new Date(post.createdUtc * 1000).toLocaleDateString()}</span>}
                </div>
                 {post.isSelf && post.selfText && <p className="text-xs mt-1 line-clamp-2">"{post.selfText}"</p>}
                 {!post.isSelf && post.url && !post.url.includes(post.permalink) && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-1">
                        <ExternalLink size={12}/> Linked Content
                    </a>
                 )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No posts to display.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}