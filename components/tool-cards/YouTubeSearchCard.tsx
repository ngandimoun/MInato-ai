//componetnts/tool-cards/YouTubeSearchCard.tsx
"use client";

import { CachedVideoList, CachedYouTubeVideo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Youtube as YoutubeIcon, ExternalLink, User, CalendarDays } from "lucide-react"; // Renamed Youtube

interface YouTubeSearchCardProps { data: CachedVideoList; }

export function YouTubeSearchCard({ data }: YouTubeSearchCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No YouTube video data.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <YoutubeIcon className="h-5 w-5 text-red-600"/>
            YouTube Results for "{data.query?.query || "Search"}"
        </CardTitle>
        <CardDescription>
            {data.videos.length > 0 ? `Found ${data.videos.length} video(s).` : "No videos found."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.videos && data.videos.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {data.videos
              .filter((video): video is CachedYouTubeVideo => (video as CachedYouTubeVideo).videoId !== undefined && (video as any).source !== "TikTok")
              .map(video => (
                <li key={video.videoId} className="p-2 border rounded-md hover:bg-muted/50 flex gap-3">
                  {video.thumbnailUrl && (
                      <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <img src={video.thumbnailUrl} alt={video.title} className="w-24 h-16 object-cover rounded"/>
                      </a>
                  )}
                  <div className="min-w-0">
                      <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-sm line-clamp-2" title={video.title}>{video.title}</a>
                      {video.channelTitle && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><User size={12}/> {video.channelTitle}</p>}
                      {video.publishedAt && <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays size={12}/> {new Date(video.publishedAt).toLocaleDateString()}</p>}
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No videos to display.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}