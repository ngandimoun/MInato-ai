// components/tool-cards/WebSearchCard.tsx
"use client";

import React, { useState } from 'react';
import {
  AnyToolStructuredData, CachedProductList, CachedVideoList, CachedSingleWebResult,
  CachedProduct, CachedTikTokVideo, CachedYouTubeVideo, CachedWebSnippet, CachedAnswerBox, CachedKnowledgeGraph,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingBag, Film, Tv, Globe, AlertCircle, ExternalLink, ThumbsUp, MessageSquare, Star, DollarSign,
  Image as ImageIconLucide, User, CalendarDays, PlayCircle, Info, Hash, Palette, ArrowRight, Heart, Search, Bookmark, BookmarkPlus, Video, Sparkles, TrendingUp, ShoppingCart, Zap, Crown, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

interface WebSearchCardProps { data: AnyToolStructuredData; }

const ProductItem: React.FC<{ product: CachedProduct; index: number }> = ({ product, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={cn(
          "group relative overflow-hidden rounded-xl transition-all duration-300",
          "bg-gradient-to-br from-background/50 to-background/30",
          "hover:from-blue-500/5 hover:to-purple-500/5",
          "border border-border/50 hover:border-blue-500/30",
          "hover:shadow-xl hover:shadow-blue-500/10",
          "backdrop-blur-sm",
          isHovered && "scale-[1.03]"
        )}
      >
        {/* Action buttons */}
        <div className="absolute top-3 right-3 z-20 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border/50 hover:bg-red-500/10 transition-colors group"
          >
            <Heart size={16} className="text-muted-foreground group-hover:text-red-500 transition-colors" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border/50 hover:bg-blue-500/10 transition-colors group"
          >
            <BookmarkPlus size={16} className="text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </motion.button>
        </div>
        
        {/* AI Insight Badge for top products */}
        {index === 0 && (
          <div className="absolute top-3 left-3 z-20">
            <Badge className="text-xs py-1 px-2 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white border-0 backdrop-blur-sm">
              <Crown className="w-3 h-3 mr-1" />
              Best Deal
            </Badge>
          </div>
        )}

        {/* Price badge for deals */}
        {product.offers && (
          <div className="absolute top-3 left-3 z-20">
            <Badge className="text-xs py-1 px-2 bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white border-0 backdrop-blur-sm">
              <Flame className="w-3 h-3 mr-1" />
              {product.offers}
            </Badge>
          </div>
        )}
        
        {/* Image section */}
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Quick shop button */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={false}
            animate={{ opacity: isHovered ? 1 : 0 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-background/90 backdrop-blur-sm rounded-full shadow-xl border border-border/50 font-medium text-sm hover:bg-blue-500/10 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 mr-2 inline" />
              Quick Shop
            </motion.button>
          </motion.div>

          {/* Glow effect on hover */}
          <div className={cn(
            "absolute -inset-2 rounded-xl transition-opacity duration-300",
            "bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl",
            isHovered ? "opacity-100" : "opacity-0"
          )} />
        </div>
        
        {/* Content section */}
        <div className="relative p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-base line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
              {product.title}
            </h3>
            
            {/* Price section */}
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {product.currency || '$'}{product.price}
                </span>
                {product.offers && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {product.offers}
                  </span>
                )}
              </div>
              
              {/* Free shipping indicator */}
              {product.delivery && product.delivery.toLowerCase().includes('free') && (
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  <Zap className="w-3 h-3 mr-1" />
                  Free Ship
                </Badge>
              )}
            </div>
          </div>
          
          {/* Ratings section */}
          {(product.rating !== null || product.ratingCount !== null) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {product.rating !== null && (
                  <div className="flex items-center space-x-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={cn(
                            "h-4 w-4",
                            star <= Math.floor(product.rating!) 
                              ? "fill-amber-400 text-amber-400" 
                              : "text-muted-foreground/30"
                          )} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                  </div>
                )}
                {product.ratingCount !== null && (
                  <span className="text-sm text-muted-foreground">
                    ({product.ratingCount} reviews)
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Retailer section */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
              <span className="text-sm text-muted-foreground truncate">
                {product.source}
              </span>
            </div>
            {product.delivery && (
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                {product.delivery}
              </span>
            )}
          </div>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-3 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            View Product
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

function isTikTokVideo(video: any): video is CachedTikTokVideo {
  return (
    video.source === "TikTok" || 
    (typeof video.videoUrl === 'string' && video.videoUrl.includes("tiktok.com")) ||
    (typeof video.embedUrl === 'string' && video.embedUrl.includes("tiktok.com"))
  );
}

function hasDuration(video: any): boolean {
  return typeof video.duration === 'string' && video.duration.length > 0;
}

const VideoItem: React.FC<{ video: any }> = ({ video }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Use a more flexible approach to handle different video object structures
  const title = video.title || "Untitled Video";
  const thumbnailUrl = video.thumbnailUrl || null;
  const description = video.description || null;
  const videoUrl = video.videoUrl || "#";
  const channel = video.channel || video.channelTitle || null;
  const dateInfo = video.date || video.publishedAt || "Recent";
  const isTikTok = isTikTokVideo(video);
  
  // Extract duration in a more readable format if available
  let formattedDuration = '';
  if (hasDuration(video)) {
    // Handle formats like "1:45" or "0:45"
    formattedDuration = video.duration;
  }
  
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
            <img 
              src={thumbnailUrl} 
              alt={title || "Video thumbnail"} 
              className={cn(
                "object-cover w-full h-full transition-transform duration-300",
                isHovered ? "scale-105" : "scale-100"
              )}
            />
            
            {isTikTok && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="bg-black/70 text-white text-xs py-0.5 px-1.5 flex items-center gap-1">
                  <Tv className="h-3 w-3" /> TikTok
                </Badge>
              </div>
            )}
            
            {formattedDuration && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs py-0.5 px-1.5 rounded">
                {formattedDuration}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="flex flex-col flex-1 min-w-0">
        <h3 className="font-medium text-sm mb-1 line-clamp-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="mt-auto space-y-1.5">
          {channel && (
            <div className="flex items-center text-xs">
              <span className="font-medium text-muted-foreground">
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
                <BookmarkPlus size={14} className="text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WebSnippetItem: React.FC<{ snippet: CachedWebSnippet }> = ({ snippet }) => (
  <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
    {snippet.title && (
      <h4 className="font-semibold text-sm text-primary mb-1">{snippet.title}</h4>
    )}
    <p className="text-sm text-muted-foreground">
      {snippet.snippet || "No description available."}
    </p>
    {snippet.link && (
      <div className="mt-3 flex justify-end">
        <a href={snippet.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
          Read More <ArrowRight size={12} className="ml-1" />
        </a>
      </div>
    )}
  </div>
);

const AnswerBoxItem: React.FC<{ answerBox: CachedAnswerBox }> = ({ answerBox }) => (
  <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
    {answerBox.title && (
      <h4 className="font-semibold text-primary mb-1">{answerBox.title}</h4>
    )}
    <div className="text-sm">
      {answerBox.answer && (
        <p className="font-medium mb-2">{answerBox.answer}</p>
      )}
      {answerBox.snippet && (
        <p className="text-muted-foreground">{answerBox.snippet}</p>
      )}
    </div>
    {answerBox.link && (
      <div className="mt-3 flex justify-end">
        <a href={answerBox.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
          Source <ArrowRight size={12} className="ml-1" />
        </a>
      </div>
    )}
  </div>
);

const KnowledgeGraphItem: React.FC<{ kg: CachedKnowledgeGraph }> = ({ kg }) => (
  <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
    <div className="flex gap-4">
      {kg.imageUrl && (
        <div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-md overflow-hidden">
          <img src={kg.imageUrl} alt={kg.title || "Knowledge Graph"} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1">
        {kg.title && (
          <h4 className="font-semibold text-primary">{kg.title}</h4>
        )}
        {kg.type && (
          <p className="text-xs text-muted-foreground mb-1">{kg.type}</p>
        )}
        {kg.description && (
          <p className="text-sm text-muted-foreground">{kg.description}</p>
        )}
      </div>
    </div>
    
    {kg.attributes && Object.keys(kg.attributes).length > 0 && (
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs font-medium mb-1">Quick Facts</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(kg.attributes).slice(0, 6).map(([key, value], idx) => (
            <div key={idx} className="text-xs">
              <span className="text-muted-foreground">{key}: </span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    )}
    
    {kg.link && (
      <div className="mt-3 flex justify-end">
        <a href={kg.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
          Learn More <ArrowRight size={12} className="ml-1" />
        </a>
      </div>
    )}
  </div>
);

export function WebSearchCard({ data }: WebSearchCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState("relevant");
  
  // Try to extract query text from various data structures
  const hasQuery = (d: any): d is { query: { query?: string; mode?: string } } =>
    d && typeof d === 'object' && 'query' in d && d.query !== undefined;
  
  const queryText = hasQuery(data) ? data.query.query || "your search" : "your search";
  const searchMode = hasQuery(data) ? data.query.mode : undefined;
  
  let cardTitle = "Web Search Results";
  let cardDescription = "";
  let content: React.ReactNode = null;
  
  const getIconForMode = (mode?: string) => {
    switch (mode) {
      case "product_search": return <ShoppingBag className="h-6 w-6 text-blue-500 animate-pulse" />;
      case "tiktok_search": return <Film className="h-6 w-6 text-pink-500 animate-pulse" />;
      case "fallback_search": return <Globe className="h-6 w-6 text-green-500 animate-pulse" />;
      default: return <Search className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getBrandColors = (mode?: string) => {
    switch (mode) {
      case "product_search": return {
        gradient: "from-blue-500/10 to-purple-500/10",
        glow: "bg-blue-500/20",
        accent: "blue-500",
        badge: "bg-blue-500/10 text-blue-600 border-blue-500/20"
      };
      case "tiktok_search": return {
        gradient: "from-pink-500/10 to-purple-500/10", 
        glow: "bg-pink-500/20",
        accent: "pink-500",
        badge: "bg-pink-500/10 text-pink-600 border-pink-500/20"
      };
      default: return {
        gradient: "from-green-500/10 to-blue-500/10",
        glow: "bg-green-500/20", 
        accent: "green-500",
        badge: "bg-green-500/10 text-green-600 border-green-500/20"
      };
    }
  };

  const colors = getBrandColors(searchMode);
  
  // PRODUCT SEARCH
  if (data.result_type === "product_list" && Array.isArray((data as any).products) && (data as any).products.length > 0) {
    cardTitle = `Shopping Results`;
    cardDescription = `Found ${(data as any).products.length} product(s) for "${queryText}"`;
    const itemsToShow = showAll ? (data as any).products : (data as any).products.slice(0, 4);
    content = (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {itemsToShow.map((product: any, idx: number) => (
            <ProductItem key={product.productId || product.link || idx} product={product} index={idx} />
          ))}
        </div>
        {(data as any).products.length > 4 && (
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
              className={cn(
                "group bg-background/50 backdrop-blur-sm border-border/50",
                searchMode === "product_search" && "hover:bg-blue-500/10 hover:border-blue-500/30"
              )}
            >
              {showAll ? "Show Less" : `Show All ${(data as any).products.length} Products`}
              <ArrowRight size={14} className={cn("ml-1 transition-transform", 
                showAll ? "rotate-90" : "group-hover:translate-x-1")} />
            </Button>
          </motion.div>
        )}
      </>
    );
  } 
  // TIKTOK VIDEO SEARCH - Explicitly check for TikTok videos
  else if (
    data.result_type === "video_list" && 
    (data as any).source_api === "serper_tiktok" && 
    Array.isArray((data as any).videos) && 
    (data as any).videos.length > 0
  ) {
    cardTitle = 'TikTok Videos';
    cardDescription = `Found ${(data as any).videos.length} TikTok video(s) for "${queryText}"`;
    const itemsToShow = showAll ? (data as any).videos : (data as any).videos.slice(0, 4);
    content = (
      <>
        <div className="space-y-3">
          {itemsToShow.map((video: any, idx: number) => {
            // Ensure we're dealing with TikTok videos by safely checking properties
            const videoUrl = video.videoUrl || '';
            const isTikTokVideo = 
              (video.source === "TikTok") || 
              (typeof videoUrl === 'string' && videoUrl.includes("tiktok.com"));
              
            if (isTikTokVideo) {
              return (
                <VideoItem 
                  key={video.videoId || videoUrl || idx} 
                  video={video} 
                />
              );
            }
            return null;
          })}
        </div>
        {(data as any).videos.length > 4 && (
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              className="group"
            >
              {showAll ? "Show Less" : `Show All ${(data as any).videos.length} Videos`}
              <ArrowRight size={14} className={cn("ml-1 transition-transform", 
                showAll ? "rotate-90" : "group-hover:translate-x-1")} />
            </Button>
          </div>
        )}
      </>
    );
  }
  // OTHER VIDEO SEARCH (YouTube, etc.)
  else if (data.result_type === "video_list" && Array.isArray((data as any).videos) && (data as any).videos.length > 0) {
    cardTitle = 'Videos';
    cardDescription = `Found ${(data as any).videos.length} video(s) for "${queryText}"`;
    const itemsToShow = showAll ? (data as any).videos : (data as any).videos.slice(0, 4);
    content = (
      <>
        <div className="space-y-3">
          {itemsToShow.map((video: any, idx: number) => (
            <VideoItem 
              key={(video as CachedYouTubeVideo).videoId || (video as CachedTikTokVideo).videoId || video.videoUrl || idx} 
              video={video as CachedTikTokVideo | CachedYouTubeVideo} 
            />
          ))}
        </div>
        {(data as any).videos.length > 4 && (
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              className="group"
            >
              {showAll ? "Show Less" : `Show All ${(data as any).videos.length} Videos`}
              <ArrowRight size={14} className={cn("ml-1 transition-transform", 
                showAll ? "rotate-90" : "group-hover:translate-x-1")} />
            </Button>
          </div>
        )}
      </>
    );
  }
  // WEB SNIPPET 
  else if (data.result_type === "web_snippet") {
    cardTitle = "Web Result";
    cardDescription = `Information from the web for "${queryText}"`;
    content = <WebSnippetItem snippet={data as unknown as CachedWebSnippet} />;
  }
  // ANSWER BOX
  else if (data.result_type === "answerBox") {
    cardTitle = "Quick Answer";
    cardDescription = `Information for "${queryText}"`;
    content = <AnswerBoxItem answerBox={data as unknown as CachedAnswerBox} />;
  }
  // KNOWLEDGE GRAPH
  else if (data.result_type === "knowledgeGraph") {
    cardTitle = "Knowledge Graph";
    cardDescription = `Information about "${(data as any).title || queryText}"`;
    content = <KnowledgeGraphItem kg={data as unknown as CachedKnowledgeGraph} />;
  }
  // RECIPE
  else if (data.result_type === "recipe" || data.result_type === "recipe_detail") {
    cardTitle = `Recipe`;
    const recipeData = data as any;
    cardDescription = `Recipe for "${recipeData.title || recipeData.recipe?.title || queryText}"`;
    
    // Handle different recipe data structures
    const title = recipeData.title || (recipeData.recipe && recipeData.recipe.title) || "Recipe";
    const imageUrl = recipeData.imageUrl || (recipeData.recipe && recipeData.recipe.imageUrl);
    const ingredients = recipeData.ingredients || (recipeData.recipe && recipeData.recipe.ingredients) || [];
    const sourceUrl = recipeData.sourceUrl || (recipeData.recipe && recipeData.recipe.sourceUrl) || "#";
    
    content = (
      <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
        <h4 className="font-semibold text-base text-primary">{title}</h4>
        {imageUrl && (
          <div className="mt-2 rounded-md overflow-hidden h-40">
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="mt-3">
          <p className="text-sm font-medium text-foreground">Ingredients:</p>
          <ul className="mt-1 space-y-1">
            {ingredients.slice(0,5).map((ingredient: string, idx: number) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start">
                <span className="mr-1.5 text-primary">•</span> {ingredient}
              </li>
            ))}
            {ingredients.length > 5 && (
              <li className="text-xs text-muted-foreground italic">And more...</li>
            )}
          </ul>
        </div>
        <div className="mt-3 flex justify-end">
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
            View Full Recipe <ArrowRight size={12} className="ml-1" />
          </a>
        </div>
      </div>
    );
  }
  // FALLBACK - NO RESULTS
  else {
    content = (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No specific results to display for this search.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Try different search terms or another search mode.</p>
      </div>
    );
    cardDescription = `No direct results for "${queryText}" in ${searchMode || 'this search mode'}.`;
  }

  // Filter buttons for various modes
  const showFilterTabs = data.result_type === "product_list" || data.result_type === "video_list";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full overflow-hidden backdrop-blur-xl bg-gradient-to-br from-background/95 via-background/85 to-background/95 border border-border/50 shadow-xl">
        <CardHeader className="pb-2 relative">
          <div className={cn("absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl", colors.gradient)} />
          <div className={cn("absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl", colors.gradient)} />
          
          <CardTitle className="flex items-center gap-3 text-base md:text-lg relative z-10">
            <div className="relative">
              {getIconForMode(searchMode)}
              <div className={cn("absolute inset-0 blur-xl", colors.glow)} />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent font-semibold">
              {searchMode === "product_search" ? `Minato found ${(data as any).products?.length || 0} products` : cardTitle}
            </span>
            {searchMode && (
              <Badge variant="secondary" className={cn("ml-auto", colors.badge)}>
                <Sparkles className="w-3 h-3 mr-1" />
                {searchMode === "product_search" ? "Smart Shopping" : 
                 searchMode === "tiktok_search" ? "Viral Content" : "AI Curated"}
              </Badge>
            )}
          </CardTitle>
          {cardDescription && <CardDescription className="mt-1 relative z-10">{cardDescription}</CardDescription>}
        </CardHeader>

        {showFilterTabs && data.result_type === "product_list" && (
          <div className="px-4 pb-2 relative z-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8 bg-background/50 backdrop-blur-sm">
                <TabsTrigger value="relevant" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600">
                  Relevant
                </TabsTrigger>
                <TabsTrigger value="price" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600">
                  Price
                </TabsTrigger>
                <TabsTrigger value="rating" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600">
                  Rating
                </TabsTrigger>
                <TabsTrigger value="trending" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600">
                  Trending
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {showFilterTabs && data.result_type === "video_list" && (
          <div className="px-4 pb-2">
            <Tabs defaultValue="popular" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="popular" className="text-xs">Popular</TabsTrigger>
                <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
                <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <CardContent className={cn("px-4", showFilterTabs ? "pt-2" : "pt-0")}>
          <ScrollArea className={cn("w-full",
              (data.result_type === "product_list" && Array.isArray((data as any).products) && (data as any).products.length > 2) || 
              (data.result_type === "video_list" && Array.isArray((data as any).videos) && (data as any).videos.length > 2) 
              ? "h-[450px]" : "h-auto")}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="text-xs text-muted-foreground justify-between pt-3 pb-3 px-4 border-t border-border/50 bg-muted/20 backdrop-blur-sm">
          <span className="flex items-center">
            {(data as any).source_api && <Globe className="h-3 w-3 mr-1" />}
            {data.result_type === "product_list" && "Product results via Serper.dev"}
            {data.result_type === "video_list" && (data as any).source_api === "serper_tiktok" && "TikTok videos via Serper.dev"}
            {data.result_type === "video_list" && (data as any).source_api !== "serper_tiktok" && "Videos via Serper.dev"}
            {data.result_type === "web_snippet" && "Web snippet via Serper.dev"}
            {data.result_type === "answerBox" && "Answer via Serper.dev"}
            {data.result_type === "knowledgeGraph" && "Knowledge Graph via Serper.dev"}
            {(data.result_type === "recipe" || data.result_type === "recipe_detail") && "Recipe via Serper.dev"}
          </span>
          
          <Button variant="ghost" size="sm" className={cn(
            "h-6 px-2 text-xs",
            searchMode === "product_search" && "hover:bg-blue-500/10",
            searchMode === "tiktok_search" && "hover:bg-pink-500/10"
          )}>
            New Search <Search className="ml-1 h-3 w-3" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
