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
  Image as ImageIconLucide, User, CalendarDays, PlayCircle, Info, Hash, Palette, ArrowRight, Heart, Search, Bookmark, BookmarkPlus, Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WebSearchCardProps { data: AnyToolStructuredData; }

const ProductItem: React.FC<{ product: CachedProduct }> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="relative flex flex-col overflow-hidden border rounded-lg hover:shadow-md transition-all duration-200 h-full bg-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute top-2 right-2 z-10 flex space-x-1">
        <button className="p-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 shadow-sm">
          <Heart size={14} className="text-muted-foreground hover:text-rose-500 transition-colors" />
        </button>
        <button className="p-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 shadow-sm">
          <BookmarkPlus size={14} className="text-muted-foreground hover:text-primary transition-colors" />
        </button>
      </div>
      
      {/* Image section */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.title} 
            className={cn(
              "object-cover w-full h-full transition-transform duration-300",
              isHovered ? "scale-105" : "scale-100"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>
      
      {/* Content section */}
      <div className="flex flex-col flex-grow p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-1 leading-tight">
          {product.title}
        </h3>
        
        <div className="flex items-baseline mt-1 mb-2 space-x-1">
          <span className="text-sm font-semibold">
            {product.currency || '$'}{product.price}
          </span>
          {product.offers && (
            <span className="text-xs text-green-600 dark:text-green-400">{product.offers}</span>
          )}
        </div>
        
        {/* Ratings */}
        {(product.rating !== null || product.ratingCount !== null) && (
          <div className="flex items-center text-xs text-muted-foreground mt-auto space-x-1">
            {product.rating !== null && (
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-0.5" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
            )}
            {product.ratingCount !== null && (
              <span>({product.ratingCount})</span>
            )}
          </div>
        )}
        
        {/* Retailer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground truncate">
            From: {product.source}
          </span>
          {product.delivery && (
            <span className="text-xs text-muted-foreground">{product.delivery}</span>
          )}
        </div>
      </div>
    </div>
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
      case "product_search": return <ShoppingBag className="h-4 w-4 text-primary" />;
      case "tiktok_search": return <Film className="h-4 w-4 text-destructive" />;
      case "fallback_search": return <Globe className="h-4 w-4 text-blue-500" />;
      default: return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  // PRODUCT SEARCH
  if (data.result_type === "product_list" && Array.isArray(data.products) && data.products.length > 0) {
    cardTitle = `Shopping Results`;
    cardDescription = `Found ${data.products.length} product(s) for "${queryText}"`;
    const itemsToShow = showAll ? data.products : data.products.slice(0, 4);
    content = (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {itemsToShow.map((product, idx) => (
            <ProductItem key={product.productId || product.link || idx} product={product} />
          ))}
        </div>
        {data.products.length > 4 && (
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              className="group"
            >
              {showAll ? "Show Less" : `Show All ${data.products.length} Products`}
              <ArrowRight size={14} className={cn("ml-1 transition-transform", 
                showAll ? "rotate-90" : "group-hover:translate-x-1")} />
            </Button>
          </div>
        )}
      </>
    );
  } 
  // TIKTOK VIDEO SEARCH - Explicitly check for TikTok videos
  else if (
    data.result_type === "video_list" && 
    data.source_api === "serper_tiktok" && 
    Array.isArray(data.videos) && 
    data.videos.length > 0
  ) {
    cardTitle = 'TikTok Videos';
    cardDescription = `Found ${data.videos.length} TikTok video(s) for "${queryText}"`;
    const itemsToShow = showAll ? data.videos : data.videos.slice(0, 4);
    content = (
      <>
        <div className="space-y-3">
          {itemsToShow.map((video, idx) => {
            // Ensure we're dealing with TikTok videos by safely checking properties
            const videoUrl = (video as any).videoUrl || '';
            const isTikTokVideo = 
              ((video as any).source === "TikTok") || 
              (typeof videoUrl === 'string' && videoUrl.includes("tiktok.com"));
              
            if (isTikTokVideo) {
              return (
                <VideoItem 
                  key={(video as any).videoId || videoUrl || idx} 
                  video={video as any} 
                />
              );
            }
            return null;
          })}
        </div>
        {data.videos.length > 4 && (
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              className="group"
            >
              {showAll ? "Show Less" : `Show All ${data.videos.length} Videos`}
              <ArrowRight size={14} className={cn("ml-1 transition-transform", 
                showAll ? "rotate-90" : "group-hover:translate-x-1")} />
            </Button>
          </div>
        )}
      </>
    );
  }
  // OTHER VIDEO SEARCH (YouTube, etc.)
  else if (data.result_type === "video_list" && Array.isArray(data.videos) && data.videos.length > 0) {
    cardTitle = 'Videos';
    cardDescription = `Found ${data.videos.length} video(s) for "${queryText}"`;
    const itemsToShow = showAll ? data.videos : data.videos.slice(0, 4);
    content = (
      <>
        <div className="space-y-3">
          {itemsToShow.map((video, idx) => (
            <VideoItem 
              key={(video as CachedYouTubeVideo).videoId || (video as CachedTikTokVideo).videoId || video.videoUrl || idx} 
              video={video as CachedTikTokVideo | CachedYouTubeVideo} 
            />
          ))}
        </div>
        {data.videos.length > 4 && (
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              className="group"
            >
              {showAll ? "Show Less" : `Show All ${data.videos.length} Videos`}
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
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              {getIconForMode(searchMode)}
              {cardTitle}
            </CardTitle>
            {cardDescription && <CardDescription className="mt-1">{cardDescription}</CardDescription>}
          </div>
          {searchMode && (
            <Badge variant={searchMode === "product_search" ? "default" : 
                   searchMode === "tiktok_search" ? "destructive" : "secondary"}
                  className="shrink-0">
              {searchMode === "product_search" ? "Shopping" : 
               searchMode === "tiktok_search" ? "TikTok" : "Web Search"}
            </Badge>
          )}
        </div>
      </CardHeader>

      {showFilterTabs && data.result_type === "product_list" && (
        <div className="px-4 pb-2">
          <Tabs defaultValue="relevant" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="relevant" className="text-xs">Relevant</TabsTrigger>
              <TabsTrigger value="price" className="text-xs">Price</TabsTrigger>
              <TabsTrigger value="rating" className="text-xs">Rating</TabsTrigger>
              <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
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
        <ScrollArea className={cn("max-h-[500px]",
            (data.result_type === "product_list" && Array.isArray(data.products) && data.products.length > 2) || 
            (data.result_type === "video_list" && Array.isArray(data.videos) && data.videos.length > 2) 
            ? "pr-2" : "")}>
          {content}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground justify-between pt-3 pb-3 px-4 border-t bg-muted/30">
        <span className="flex items-center">
          {data.source_api && <Globe className="h-3 w-3 mr-1" />}
          {data.result_type === "product_list" && "Product results via Serper.dev"}
          {data.result_type === "video_list" && data.source_api === "serper_tiktok" && "TikTok videos via Serper.dev"}
          {data.result_type === "video_list" && data.source_api !== "serper_tiktok" && "Videos via Serper.dev"}
          {data.result_type === "web_snippet" && "Web snippet via Serper.dev"}
          {data.result_type === "answerBox" && "Answer via Serper.dev"}
          {data.result_type === "knowledgeGraph" && "Knowledge Graph via Serper.dev"}
          {(data.result_type === "recipe" || data.result_type === "recipe_detail") && "Recipe via Serper.dev"}
        </span>
        
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          New Search <Search className="ml-1 h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}
