import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookmarkPlus, Film, Globe, Heart, Search, Share2, Tv, Video } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CachedTikTokVideo, CachedVideoList } from '@/lib/types';

interface TikTokCardProps { 
  data: CachedVideoList;
}

const TikTokVideo: React.FC<{ video: CachedTikTokVideo }> = ({ video }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Extract video properties safely
  const title = video.title || "TikTok Video";
  const thumbnailUrl = video.thumbnailUrl || null;
  const description = video.description || null;
  const videoUrl = video.videoUrl || "#";
  const embedUrl = video.embedUrl || null;
  const channel = video.channel || null;
  const dateInfo = video.date || "Recent";
  const duration = video.duration || null;
  const videoId = video.videoId || null;
  
  return (
    <div 
      className="flex flex-col sm:flex-row gap-3 p-3 border rounded-lg bg-card hover:shadow-md transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail Section */}
      <div className="relative sm:w-1/3 h-[140px] sm:h-auto min-h-[80px] overflow-hidden rounded-md bg-muted shrink-0">
        {thumbnailUrl ? (
          <div className="relative w-full h-full">
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              <img 
                src={thumbnailUrl} 
                alt={title} 
                className={cn(
                  "object-cover w-full h-full transition-transform duration-300",
                  isHovered ? "scale-105" : "scale-100"
                )}
              />
              
              <div className="absolute bottom-2 left-2">
                <Badge variant="destructive" className="text-xs py-0.5 px-1.5 flex items-center gap-1">
                  <Tv className="h-3 w-3" /> TikTok
                </Badge>
              </div>
              
              {duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs py-0.5 px-1.5 rounded">
                  {duration}
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                {isHovered && (
                  <div className="p-2 bg-primary/90 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </a>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="flex flex-col flex-1 min-w-0">
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
          <h3 className="font-medium text-sm mb-1 line-clamp-2">
            {title}
          </h3>
        </a>
        
        {description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="mt-auto space-y-1.5">
          {channel && (
            <div className="flex items-center text-xs">
              <span className="font-medium text-muted-foreground flex items-center">
                <Badge variant="outline" className="mr-1 text-[10px] px-1 py-0">@</Badge>
                {channel}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {dateInfo}
            </span>
            
            <div className="flex space-x-1">
              <button className="p-1 rounded-full hover:bg-muted transition-colors">
                <Heart size={14} className="text-muted-foreground hover:text-rose-500 transition-colors" />
              </button>
              <button className="p-1 rounded-full hover:bg-muted transition-colors">
                <Share2 size={14} className="text-muted-foreground hover:text-blue-500 transition-colors" />
              </button>
              <button className="p-1 rounded-full hover:bg-muted transition-colors">
                <BookmarkPlus size={14} className="text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function TikTokCard({ data }: TikTokCardProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Extract query text if available
  const hasQuery = (d: any): d is { query: { query?: string; mode?: string } } =>
    d && typeof d === 'object' && 'query' in d && d.query !== undefined;
  
  const queryText = hasQuery(data) ? data.query.query || "TikTok videos" : "TikTok videos";
  
  // Filter only TikTok videos - Safely check for TikTok videos
  const tikTokVideos = Array.isArray(data.videos) ? 
    data.videos.filter((v) => {
      // Type-safe check for TikTok videos
      return 'source' in v && v.source === 'TikTok';
    }) as CachedTikTokVideo[] : [];
  
  // Error handling
  if (!tikTokVideos.length) {
    return (
      <Card className="w-full shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <CardHeader className="pb-3 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Film className="h-4 w-4 text-destructive" />
                TikTok Videos
              </CardTitle>
              <CardDescription className="mt-1">No TikTok videos found for "{queryText}"</CardDescription>
            </div>
            <Badge variant="destructive" className="shrink-0">TikTok</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Film className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No TikTok videos found for this search.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try different search terms or be more specific.</p>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground justify-between pt-3 pb-3 px-4 border-t bg-muted/30">
          <span className="flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            TikTok videos via Serper.dev
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            New Search <Search className="ml-1 h-3 w-3" />
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Main content display
  const itemsToShow = showAll ? tikTokVideos : tikTokVideos.slice(0, 4);
  
  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Film className="h-4 w-4 text-destructive" />
              TikTok Videos
            </CardTitle>
            <CardDescription className="mt-1">Found {tikTokVideos.length} TikTok video(s) for "{queryText}"</CardDescription>
          </div>
          <Badge variant="destructive" className="shrink-0">TikTok</Badge>
        </div>
      </CardHeader>

      <div className="px-4 pb-2">
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="popular" className="text-xs">Popular</TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="pt-2 px-4">
        <ScrollArea className={cn("max-h-[500px]", tikTokVideos.length > 2 ? "pr-2" : "")}>
          <div className="space-y-3">
            {itemsToShow.map((video, idx) => (
              <TikTokVideo key={video.videoId || video.videoUrl || idx} video={video} />
            ))}
          </div>
          
          {tikTokVideos.length > 4 && (
            <div className="mt-4 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAll(!showAll)}
                className="group"
              >
                {showAll ? "Show Less" : `Show All ${tikTokVideos.length} Videos`}
                <ArrowRight size={14} className={cn("ml-1 transition-transform", 
                  showAll ? "rotate-90" : "group-hover:translate-x-1")} />
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground justify-between pt-3 pb-3 px-4 border-t bg-muted/30">
        <span className="flex items-center">
          <Globe className="h-3 w-3 mr-1" />
          TikTok videos via Serper.dev
        </span>
        
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          New Search <Search className="ml-1 h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
} 