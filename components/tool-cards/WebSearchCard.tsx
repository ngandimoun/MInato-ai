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
  Image as ImageIconLucide, User, CalendarDays, PlayCircle, Info, Hash, Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

interface WebSearchCardProps { data: AnyToolStructuredData; }

const ProductItem: React.FC<{ product: CachedProduct }> = ({ product }) => (
  <a href={product.link || '#'} target="_blank" rel="noopener noreferrer" className="block p-2.5 border rounded-lg hover:shadow-md transition-shadow group">
    <div className="flex flex-col sm:flex-row gap-3 items-start">
      {product.imageUrl && (
        <div className="flex-shrink-0 w-full sm:w-24 h-32 sm:h-24 bg-muted rounded-md overflow-hidden">
          <img src={product.imageUrl} alt={product.title || 'Product image'} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-primary line-clamp-2" title={product.title}>{product.title}</h4>
        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
          {product.price !== null && (
            <p className="font-medium text-foreground flex items-center"><DollarSign size={12} className="mr-0.5"/>{product.price}{product.currency && ` ${product.currency}`}</p>
          )}
          {product.source && <p>From: {product.source}</p>}
          {product.rating !== null && (
            <p className="flex items-center gap-0.5"><Star size={12} className="text-yellow-500 fill-yellow-500"/> {product.rating.toFixed(1)} {product.ratingCount ? `(${product.ratingCount} reviews)` : ''}</p>
          )}
          {product.delivery && <p>Delivery: {product.delivery}</p>}
        </div>
      </div>
    </div>
  </a>
);

// Type guard for TikTok
function isTikTokVideo(video: CachedTikTokVideo | CachedYouTubeVideo): video is CachedTikTokVideo {
  return (video as CachedTikTokVideo).channel !== undefined;
}

const VideoItem: React.FC<{ video: CachedTikTokVideo | CachedYouTubeVideo }> = ({ video }) => {
  const isTikTok = isTikTokVideo(video);
  const channel = isTikTok ? video.channel : (video as CachedYouTubeVideo).channelTitle;
  const publishedDate = isTikTok ? video.date : (video as CachedYouTubeVideo).publishedAt;

  return (
    <a href={video.videoUrl || '#'} target="_blank" rel="noopener noreferrer" className="block p-2.5 border rounded-lg hover:shadow-md transition-shadow group">
      <div className="flex gap-3 items-start">
        {video.thumbnailUrl && (
          <div className="flex-shrink-0 w-28 h-16 relative">
            <img src={video.thumbnailUrl} alt={video.title || 'Video thumbnail'} className="w-full h-full object-cover rounded-md border" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <PlayCircle className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-primary line-clamp-2" title={video.title || undefined}>{video.title || "Video"}</h4>
          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
            {channel && <p className="flex items-center gap-1"><User size={12}/> {channel}</p>}
            {publishedDate && <p className="flex items-center gap-1"><CalendarDays size={12}/> {formatDistanceToNowStrict(parseISO(publishedDate), { addSuffix: true })}</p>}
            {isTikTok && video.duration && <p>Duration: {video.duration}</p>}
          </div>
        </div>
      </div>
    </a>
  );
};

const WebSnippetItem: React.FC<{ snippet: CachedWebSnippet }> = ({ snippet }) => (
  <div className="p-2.5 border rounded-lg">
    <a href={snippet.link || '#'} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-primary hover:underline line-clamp-1">
      {snippet.title || "Web Result"}
    </a>
    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{snippet.snippet}</p>
    {snippet.source && <p className="text-[10px] text-muted-foreground/70 mt-1">Source: {snippet.source}</p>}
  </div>
);

const AnswerBoxItem: React.FC<{ answerBox: CachedAnswerBox }> = ({ answerBox }) => (
  <div className="p-3 border-2 border-primary/30 bg-primary/5 rounded-lg">
    {answerBox.title && <h4 className="font-semibold text-sm mb-1">{answerBox.title}</h4>}
    <p className="text-sm text-foreground">{answerBox.answer || answerBox.snippet}</p>
    {answerBox.link && (
      <a href={answerBox.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1.5 block">
        Source <ExternalLink size={10} className="inline-block ml-0.5"/>
      </a>
    )}
  </div>
);

const KnowledgeGraphItem: React.FC<{ kg: CachedKnowledgeGraph }> = ({ kg }) => (
  <div className="p-3 border rounded-lg flex gap-3 items-start bg-muted/30">
    {kg.imageUrl && (
      <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border">
        <img src={kg.imageUrl} alt={kg.title || 'Knowledge graph image'} className="w-full h-full object-cover"/>
      </div>
    )}
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-sm text-foreground">{kg.title} <span className="text-xs text-muted-foreground font-normal">({kg.type})</span></h4>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{kg.description}</p>
      {kg.attributes && Object.entries(kg.attributes).slice(0, 2).map(([key, value]) => (
        <p key={key} className="text-[10px] text-muted-foreground/80"><strong className="capitalize">{key}:</strong> {value}</p>
      ))}
      {kg.link && (
        <a href={kg.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1.5 block">
          Learn more at {kg.source || "source"} <ExternalLink size={10} className="inline-block ml-0.5"/>
        </a>
      )}
    </div>
  </div>
);


export function WebSearchCard({ data }: WebSearchCardProps) {
  const [showAll, setShowAll] = useState(false); // For lists with many items

  // Type guard for query
  const hasQuery = (d: any): d is { query: { query?: string; context?: { userName?: string; mode?: string } } } =>
    d && typeof d === 'object' && 'query' in d && d.query !== undefined;

  const queryText = hasQuery(data) && data.query?.query ? data.query.query : "your search";
  const userNameForResponse = hasQuery(data) && data.query?.context?.userName ? data.query.context.userName : "friend";
  
  const getIconForMode = (mode?: string) => {
    if (mode === "product_search") return <ShoppingBag className="h-5 w-5 text-primary"/>;
    if (mode === "tiktok_search") return <Tv className="h-5 w-5 text-pink-500"/>; // Specific for TikTok
    return <Globe className="h-5 w-5 text-primary"/>;
  }

  let content: React.ReactNode = null;
  let cardTitle = `Web Search Results for "${queryText}"`;
  let cardDescription = "";

  if (data.error) {
    content = (
      <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
        <AlertCircle size={18}/> 
        <div>
            <p className="font-medium">Search Error</p>
            <p className="text-xs">{data.error}</p>
        </div>
      </div>
    );
    cardTitle = "Web Search Error";
    cardDescription = `Could not complete search for "${queryText}".`;
  } else if (data.result_type === "product_list" && Array.isArray(data.products) && data.products.length > 0) {
    cardTitle = `Products for "${queryText}"`;
    cardDescription = `Found ${data.products.length} product(s) for ${userNameForResponse}.`;
    const itemsToShow = showAll ? data.products : data.products.slice(0, 3);
    content = (
      <>
        <ul className="space-y-2.5">
          {itemsToShow.map(product => <ProductItem key={product.productId || product.link} product={product} />)}
        </ul>
        {data.products.length > 3 && (
          <Button variant="link" size="sm" onClick={() => setShowAll(!showAll)} className="mt-2 text-xs">
            {showAll ? "Show Less" : `Show All ${data.products.length} Products`}
          </Button>
        )}
      </>
    );
  } else if (data.result_type === "video_list" && Array.isArray(data.videos) && data.videos.length > 0) { // Handles both YouTube and TikTok if structure is same
    cardTitle = `${data.source_api === 'serper_tiktok' ? 'TikToks' : 'Videos'} for "${queryText}"`;
    cardDescription = `Found ${data.videos.length} video(s) for ${userNameForResponse}.`;
    const itemsToShow = showAll ? data.videos : data.videos.slice(0, 3);
    content = (
      <>
        <ul className="space-y-2.5">
          {itemsToShow.map(video => <VideoItem key={(video as CachedYouTubeVideo).videoId || (video as CachedTikTokVideo).videoId || video.videoUrl} video={video as CachedTikTokVideo | CachedYouTubeVideo} />)}
        </ul>
        {data.videos.length > 3 && (
          <Button variant="link" size="sm" onClick={() => setShowAll(!showAll)} className="mt-2 text-xs">
            {showAll ? "Show Less" : `Show All ${data.videos.length} Videos`}
          </Button>
        )}
      </>
    );
  } else if ((data.result_type === "web_snippet" || data.result_type === "answerBox" || data.result_type === "knowledgeGraph") && data.data) {
      cardTitle = data.data.title || `Web Result for "${queryText}"`;
      cardDescription = `Information from the web for ${userNameForResponse}.`;
      if (data.result_type === "web_snippet") content = <WebSnippetItem snippet={data.data as CachedWebSnippet} />;
      else if (data.result_type === "answerBox") content = <AnswerBoxItem answerBox={data.data as CachedAnswerBox} />;
      else if (data.result_type === "knowledgeGraph") content = <KnowledgeGraphItem kg={data.data as CachedKnowledgeGraph} />;
  } else if (data.result_type === "recipe" && data.recipe) { // Serper can return recipes in fallback
      cardTitle = `Recipe for "${data.recipe.title || queryText}"`;
      cardDescription = `Found a recipe for ${userNameForResponse}.`;
      // Simplified recipe display for brevity, or you could make a dedicated RecipeItem
      content = <div className="p-2.5 border rounded-lg">
          <h4 className="font-semibold text-sm text-primary">{data.recipe.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{data.recipe.ingredients?.slice(0,3).join(', ')}...</p>
          <a href={data.recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">View Full Recipe</a>
      </div>;
  } else {
    content = <p className="text-sm text-muted-foreground text-center py-4">No specific results to display for this search mode.</p>;
    cardDescription = `No direct results for "${queryText}" in ${hasQuery(data) ? data.query?.context?.mode : 'this search'}.`;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            {hasQuery(data) ? getIconForMode(data.query?.context?.mode) : getIconForMode(undefined)}
            {cardTitle}
        </CardTitle>
        {cardDescription && <CardDescription>{cardDescription}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn("max-h-96", 
            (data.result_type === "product_list" && Array.isArray(data.products) && data.products.length > 2) || (data.result_type === "video_list" && Array.isArray(data.videos) && data.videos.length > 2) 
            ? "pr-2" : "")}>
          {content}
        </ScrollArea>
      </CardContent>
      {(data.result_type === "product_list" && Array.isArray(data.products) && data.products.length > 0 && data.products[0].link) &&
        <CardFooter className="text-xs text-muted-foreground justify-center pt-2 border-t">
            Product results from Serper.dev
        </CardFooter>
      }
      {(data.result_type === "video_list" && Array.isArray(data.videos) && data.videos.length > 0 && (data.videos[0] as CachedTikTokVideo).videoUrl) &&
        <CardFooter className="text-xs text-muted-foreground justify-center pt-2 border-t">
            Videos sourced via Serper.dev from TikTok
        </CardFooter>
      }
    </Card>
  );
}
