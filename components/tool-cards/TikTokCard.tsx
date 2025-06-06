// components/tool-cards/TikTokCard.tsx
"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookmarkPlus, Film, Globe, Heart, Search, Share2, Tv, Video, Play, Sparkles, TrendingUp, Clock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CachedTikTokVideo, CachedVideoList } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface TikTokCardProps { 
  data: CachedVideoList;
}

const TikTokVideo: React.FC<{ video: CachedTikTokVideo; index: number }> = ({ video, index }) => {
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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={cn(
          "group relative p-4 rounded-xl cursor-pointer transition-all duration-300 h-full", // Ajout de h-full pour s'assurer que les cartes dans une grille ont une hauteur cohérente si nécessaire
          "bg-gradient-to-r from-background/50 to-background/30",
          "hover:from-pink-500/5 hover:to-purple-500/5",
          "border border-border/50 hover:border-pink-500/30",
          "hover:shadow-lg hover:shadow-pink-500/10",
          isHovered && "scale-[1.02]"
        )}
      >
        <div className="flex flex-col gap-3">
          {/* Thumbnail Section */}
          <div className="relative group">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              {thumbnailUrl ? (
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                  <img 
                    src={thumbnailUrl} 
                    alt={title} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Play overlay */}
                  <motion.div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    whileHover={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Play className="w-10 h-10 text-white drop-shadow-lg fill-white" />
                    </motion.div>
                  </motion.div>

                  {/* TikTok Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className="text-xs py-0.5 px-2 bg-black/80 text-white border-0 backdrop-blur-sm">
                      <Tv className="h-3 w-3 mr-1" /> 
                      TikTok
                    </Badge>
                  </div>
                  
                  {/* Duration */}
                  {duration && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-xs text-white font-medium">
                      {duration}
                    </div>
                  )}
                </a>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                  <Film className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Glow effect on hover */}
            <div className={cn(
              "absolute inset-0 rounded-lg transition-opacity duration-300",
              "bg-gradient-to-r from-pink-500/30 to-purple-500/30 blur-xl",
              isHovered ? "opacity-100" : "opacity-0"
            )} />
          </div>
          
          {/* Content Section */}
          <div className="flex-1 min-w-0 space-y-1">
            <a href={videoUrl} target="_blank" rel="noopener noreferrer">
              <h4 className="font-medium text-sm md:text-base line-clamp-2 group-hover:text-pink-500 transition-colors">
                {title}
              </h4>
            </a>
            
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {channel && (
                <span className="flex items-center gap-1 truncate max-w-[120px]">
                  <User className="w-3 h-3" />
                  @{channel}
                </span>
              )}
              
              {dateInfo && (
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {dateInfo}
                </span>
              )}
            </div>

            {/* AI insight badge for first video */}
            {index === 0 && (
              <Badge variant="secondary" className="mt-1 text-xs bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-0">
                <TrendingUp className="w-3 h-3 mr-1" />
                Most Viral
              </Badge>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors group"
                >
                  <Heart size={14} className="text-muted-foreground group-hover:text-red-500 transition-colors" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-full hover:bg-blue-500/10 transition-colors group"
                >
                  <Share2 size={14} className="text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-full hover:bg-primary/10 transition-colors group"
                >
                  <BookmarkPlus size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export function TikTokCard({ data }: TikTokCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState("popular");
  
  const hasQuery = (d: any): d is { query: { query?: string; mode?: string } } =>
    d && typeof d === 'object' && 'query' in d && d.query !== undefined;
  
  const queryText = hasQuery(data) ? data.query.query || "TikTok videos" : "TikTok videos";
  
  const tikTokVideos = Array.isArray(data.videos) ? 
    data.videos.filter((v) => {
      return 'source' in v && v.source === 'TikTok';
    }) as CachedTikTokVideo[] : [];
  
  if (!tikTokVideos.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full overflow-hidden backdrop-blur-xl bg-gradient-to-br from-background/95 via-background/85 to-background/95 border border-border/50 shadow-xl">
          <CardHeader className="pb-2 relative">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            
            <CardTitle className="flex items-center gap-3 text-xs md:text-sm relative z-10">
              <div className="relative">
                <Film className="h-4 w-4 text-pink-500 animate-pulse"/>
                <div className="absolute inset-0 bg-pink-500/20 blur-xl" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent font-semibold">
                No TikTok videos found
              </span>
            </CardTitle>
            <CardDescription className="mt-1 relative z-10">for "{queryText}"</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="text-center py-8 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No TikTok videos found for this search.</p>
              <p className="text-xs opacity-70 mt-1">Try different search terms or be more specific.</p>
            </div>
          </CardContent>
          
          <CardFooter className="text-xs text-muted-foreground justify-between pt-3 pb-3 px-4 border-t border-border/50 bg-muted/20">
            <span className="flex items-center">
              <Globe className="h-3 w-3 mr-1" />
              TikTok videos via Serper.dev
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-pink-500/10">
              New Search <Search className="ml-1 h-3 w-3" />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }
  
  const itemsToShow = showAll ? tikTokVideos : tikTokVideos.slice(0, 6);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full text-sm overflow-hidden backdrop-blur-xl bg-gradient-to-br from-background/95 via-background/85 to-background/95 border border-border/50 shadow-xl">
        <CardHeader className="pb-2 relative">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
          
          <CardTitle className="flex items-center gap-3 text-xs md:text-sm relative z-10">
            <div className="relative">
              <Film className="h-4 w-4 text-pink-500 animate-pulse"/>
              <div className="absolute inset-0 bg-pink-500/20 blur-xl" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent font-semibold">
              Minato found {tikTokVideos.length} TikToks
            </span>
            <Badge variant="secondary" className="ml-auto bg-pink-500/10 text-pink-600 border-pink-500/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Viral Content
            </Badge>
          </CardTitle>
          <CardDescription className="mt-1 relative z-10">for "{queryText}"</CardDescription>
        </CardHeader>

        <div className="px-4 pb-2 relative z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8 bg-background/50 backdrop-blur-sm">
              <TabsTrigger value="popular" className="text-xs data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-600">
                Popular
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-600">
                Recent
              </TabsTrigger>
              <TabsTrigger value="trending" className="text-xs data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-600">
                Trending
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <CardContent className="pt-2 px-4">
          <ScrollArea className={cn("w-full", tikTokVideos.length > 3 ? "h-[450px]" : "h-auto")}>
            {/* MODIFICATION 1: Suppression de space-y-3 ici */}
            <div className="pr-4"> {/* Était: className="space-y-3 pr-4" */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  // MODIFICATION 2: Ajout des classes pour la grille
                  className="grid grid-cols-1 lg:grid-cols-3 gap-3"
                >
                  {itemsToShow.map((video, idx) => (
                    <TikTokVideo key={video.videoId || video.videoUrl || idx} video={video} index={idx} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {tikTokVideos.length > 4 && (
              <motion.div 
                className="mt-6 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAll(!showAll)}
                  className="group bg-background/50 backdrop-blur-sm hover:bg-pink-500/10 hover:border-pink-500/30"
                >
                  {showAll ? "Show Less" : `Show All ${tikTokVideos.length} Videos`}
                  <ArrowRight size={14} className={cn("ml-1 transition-transform", 
                    showAll ? "rotate-90" : "group-hover:translate-x-1")} />
                </Button>
              </motion.div>
            )}
          </ScrollArea>
        </CardContent>
        
        {/* <CardFooter className="text-xs text-muted-foreground justify-between pt-3 pb-3 px-4 border-t border-border/50 bg-muted/20 backdrop-blur-sm">
          <span className="flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            TikTok videos via Serper.dev
          </span>
          
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-pink-500/10">
            New Search <Search className="ml-1 h-3 w-3" />
          </Button>
        </CardFooter> */}
      </Card>
    </motion.div>
  );
}