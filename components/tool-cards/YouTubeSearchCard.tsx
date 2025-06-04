//componetnts/tool-cards/YouTubeSearchCard.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { CachedVideoList, CachedYouTubeVideo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Youtube as YoutubeIcon, PlayCircle, XCircle, Clock, Eye, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/memory-framework/config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface YouTubeSearchCardProps { 
  data: CachedVideoList; 
}

export function YouTubeSearchCard({ data }: YouTubeSearchCardProps) {
  const [selectedVideo, setSelectedVideo] = useState<CachedYouTubeVideo | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data?.videos?.length > 0) {
      setSelectedVideo(data.videos[0] as CachedYouTubeVideo);
      setShowPlayer(false);
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
  };

  const validVideos = data.videos
    .filter((video): video is CachedYouTubeVideo => 
      (video as CachedYouTubeVideo).videoId !== undefined && 
      (video as any).source !== "TikTok"
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full overflow-hidden backdrop-blur-xl bg-gradient-to-br from-background/95 via-background/85 to-background/95 border border-border/50 shadow-xl">
        <CardHeader className="pb-2 relative">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-red-600/10 rounded-full blur-3xl" />
          
          <CardTitle className="flex items-center gap-3 text-base md:text-lg relative z-10">
            <div className="relative">
              <YoutubeIcon className="h-6 w-6 text-red-500 animate-pulse"/>
              <div className="absolute inset-0 bg-red-500/20 blur-xl" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent font-semibold">
              Minato found {validVideos.length} videos
            </span>
            <Badge variant="secondary" className="ml-auto bg-red-500/10 text-red-600 border-red-500/20">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Curated
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          <AnimatePresence mode="wait">
            {showPlayer && selectedVideo && selectedVideo.embedUrl ? (
              <motion.div
                key="player"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300" />
                  
                  <div 
                    ref={playerRef}
                    className="relative aspect-video rounded-xl overflow-hidden bg-black/90 shadow-2xl"
                  >
                    <iframe
                      src={selectedVideo.embedUrl}
                      title={selectedVideo.title || "YouTube video player"}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClosePlayer}
                    className="absolute -top-2 -right-2 p-2 bg-background/90 backdrop-blur-sm rounded-full shadow-lg border border-border/50 hover:bg-background transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                  </motion.button>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 space-y-2"
                >
                  <h3 className="font-semibold text-lg line-clamp-2">{selectedVideo.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {selectedVideo.channelTitle && (
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-pink-500" />
                        {selectedVideo.channelTitle}
                      </span>
                    )}
                  </div>
                  {selectedVideo.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                      {selectedVideo.description}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {validVideos.length > 0 ? (
                  <ScrollArea className={cn("w-full", validVideos.length > 3 ? "h-[450px]" : "h-auto")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
                      {validVideos.map((video, index) => (
                        <motion.div
                          key={video.videoId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onMouseEnter={() => setHoveredVideo(video.videoId)}
                          onMouseLeave={() => setHoveredVideo(null)}
                        >
                          <div
                            onClick={() => handlePlayVideo(video)}
                            className={cn(
                              "group relative p-3 rounded-xl cursor-pointer transition-all duration-300",
                              "bg-gradient-to-r from-background/50 to-background/30",
                              "hover:from-red-500/5 hover:to-pink-500/5",
                              "border border-border/50 hover:border-red-500/30",
                              "hover:shadow-lg hover:shadow-red-500/10",
                              hoveredVideo === video.videoId && "scale-[1.02]"
                            )}
                          >
                            <div className="flex flex-col gap-2">
                              {/* Thumbnail */}
                              <div className="relative flex-shrink-0 group">
                                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
                                  {video.thumbnailUrl && (
                                    <img 
                                      src={video.thumbnailUrl} 
                                      alt={video.title || 'Video thumbnail'} 
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  
                                  {/* Play overlay */}
                                  <motion.div 
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    whileHover={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                                  >
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <PlayCircle className="w-10 h-10 text-white drop-shadow-lg" />
                                    </motion.div>
                                  </motion.div>
                                </div>

                                {/* Glow effect on hover */}
                                <div className={cn(
                                  "absolute inset-0 rounded-lg transition-opacity duration-300",
                                  "bg-gradient-to-r from-red-500/30 to-pink-500/30 blur-xl",
                                  hoveredVideo === video.videoId ? "opacity-100" : "opacity-0"
                                )} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <h4 className="font-medium text-sm md:text-base line-clamp-2 group-hover:text-red-500 transition-colors">
                                  {video.title}
                                </h4>
                                
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {video.channelTitle && (
                                    <span className="truncate max-w-[120px]">{video.channelTitle}</span>
                                  )}
                                </div>

                                {video.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {video.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2 mt-1">
                                  {video.publishedAt && (
                                    <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      {new Date(video.publishedAt).toLocaleDateString()}
                                    </span>
                                  )}

                                  {/* AI insight badge */}
                                  {index === 0 && (
                                    <Badge variant="secondary" className="text-xs bg-gradient-to-r from-red-500/10 to-pink-500/10 border-0">
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      Most Relevant
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <YoutubeIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No videos found for your search.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {data.error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive mt-4 p-3 bg-destructive/10 rounded-lg"
            >
              Error: {data.error}
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}