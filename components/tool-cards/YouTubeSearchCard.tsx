//componetnts/tool-cards/YouTubeSearchCard.tsx
"use client";
import React, { useState, useEffect } from "react";
import { CachedVideoList, CachedYouTubeVideo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Youtube as YoutubeIcon, ExternalLink, User, CalendarDays, PlayCircle, XCircle, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/memory-framework/config";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added for multiple videos
interface YouTubeSearchCardProps { data: CachedVideoList; }
export function YouTubeSearchCard({ data }: YouTubeSearchCardProps) {
const [selectedVideo, setSelectedVideo] = useState<CachedYouTubeVideo | null>(null);
const [showPlayer, setShowPlayer] = useState(false);
useEffect(() => {
if (data?.videos?.length > 0) {
// Select the first video by default, but don't auto-play
setSelectedVideo(data.videos[0] as CachedYouTubeVideo);
setShowPlayer(false); // Don't show player initially
} else {
setSelectedVideo(null);
setShowPlayer(false);
}
}, [data]);
if (!data) return <p className="text-sm text-muted-foreground">No YouTube video data.</p>;
const handlePlayVideo = (video: CachedYouTubeVideo) => {
setSelectedVideo(video);
setShowPlayer(true);
logger.debug(`[YouTubeCard] User wants to play: ${video.title}`);
};
const handleClosePlayer = () => {
setShowPlayer(false);
// Optionally, keep selectedVideo as is, or reset to first.
// If you want it to revert to the list view after closing, you might set selectedVideo to null
// or to the first video if that's desired behavior. For now, it keeps selection.
// setSelectedVideo(data.videos[0] as CachedYouTubeVideo); // Example: revert to first
};
const validVideos = data.videos
.filter((video): video is CachedYouTubeVideo => (video as CachedYouTubeVideo).videoId !== undefined && (video as any).source !== "TikTok");
return (
<Card className="w-full overflow-hidden">
<CardHeader className="pb-3">
<CardTitle className="flex items-center gap-2 text-base md:text-lg">
<YoutubeIcon className="h-5 w-5 text-red-600"/>
YouTube Results for "{data.query?.query || "Search"}"
</CardTitle>
{!showPlayer && (
<CardDescription>
{validVideos.length > 0 ? `Found ${validVideos.length} video(s). Click to play.` : "No videos found."}
</CardDescription>
)}
</CardHeader>
<CardContent className="pt-0">
{showPlayer && selectedVideo && selectedVideo.embedUrl && (
<div className="mb-4">
<div className="aspect-video relative mb-2 border border-border rounded-lg overflow-hidden">
<iframe
src={selectedVideo.embedUrl}
title={selectedVideo.title || "YouTube video player"}
frameBorder="0"
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
allowFullScreen
className="absolute top-0 left-0 w-full h-full"
></iframe>
</div>
<div className="flex justify-between items-start">
<div>
<h3 className="font-semibold text-sm line-clamp-2" title={selectedVideo.title || undefined}>{selectedVideo.title}</h3>
{selectedVideo.channelTitle && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><User size={12}/> {selectedVideo.channelTitle}</p>}
</div>
<Button variant="ghost" size="sm" onClick={handleClosePlayer} className="text-xs text-muted-foreground">
<XCircle size={14} className="mr-1"/> Close Player
</Button>
</div>
</div>
)}
{!showPlayer && validVideos.length > 0 && (
      <ScrollArea className={cn("max-h-80", validVideos.length > 3 ? "pr-2" : "")}>
        <ul className="space-y-2.5">
          {validVideos.map(video => (
            <li key={video.videoId} className="p-2.5 border rounded-lg hover:bg-muted/50 transition-colors flex gap-3 cursor-pointer" onClick={() => handlePlayVideo(video)}>
              {video.thumbnailUrl && (
                  <div className="flex-shrink-0 w-28 h-16 relative group">
                    <img src={video.thumbnailUrl} alt={video.title || 'Video thumbnail'} className="w-full h-full object-cover rounded-md"/>
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="h-8 w-8 text-white" />
                    </div>
                  </div>
              )}
              <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm line-clamp-2" title={video.title || undefined}>{video.title}</h4>
                  {video.channelTitle && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><User size={12}/> {video.channelTitle}</p>}
                  {video.publishedAt && <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays size={12}/> {new Date(video.publishedAt).toLocaleDateString()}</p>}
                  <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary/80 hover:text-primary hover:underline flex items-center gap-1 mt-0.5 w-fit">
                    <ExternalLink size={12}/> Watch on YouTube
                  </a>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    )}
    {!showPlayer && validVideos.length === 0 && !data.error && (
       <p className="text-sm text-muted-foreground text-center py-4">No videos to display.</p>
    )}
    {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
  </CardContent>
</Card>
);
}