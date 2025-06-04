//components/tool-cards/NewsAggregatorCard.tsx
"use client";

import { NewsArticleList, NewsArticle } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, ExternalLink, CalendarClock, Globe, AlertCircle, Eye, TrendingUp, Clock, Bookmark, Share2, Zap } from "lucide-react";
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
// Import the Locale type and specific locales you need
import { type Locale } from 'date-fns';
import { enUS, fr, es, de /* Add other locales here if needed */ } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

// Create a mapping object for locales
const dateFnsLocales: { [key: string]: Locale } = {
  en: enUS,
  fr: fr,
  es: es,
  de: de,
  // Add other mappings here. Make sure the key (e.g., 'en')
  // matches what you expect from userLocale (e.g., 'en' from 'en-US')
};

interface NewsAggregatorCardProps { data: NewsArticleList; }

const ArticleItem: React.FC<{ article: NewsArticle, locale?: string, index: number }> = ({ article, locale, index }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    // Use the mapping object to get the date-fns locale
    const dateFnsLocaleObject = locale ? dateFnsLocales[locale] : undefined;

    const publishedAgo = article.publishedAt
        ? formatDistanceToNowStrict(parseISO(article.publishedAt), {
            addSuffix: true,
            locale: dateFnsLocaleObject, // Pass the locale object here
          })
        : "some time ago";

    const formattedDate = article.publishedAt ? format(parseISO(article.publishedAt), "MMM d, yyyy") : "Unknown date";

    return (
        <motion.li 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={cn(
                "relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-300",
                "bg-gradient-to-br from-background/80 to-background/40 dark:from-background/90 dark:to-background/60",
                "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
                "hover:scale-[1.01] hover:-translate-y-1"
            )}>
                {/* Gradient background overlay on hover */}
                <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300"
                    animate={{ opacity: isHovered ? 1 : 0 }}
                />
                
                <div className="relative z-10">
                    <div className="flex gap-4 items-start">
                        {/* Enhanced thumbnail */}
                        {article.imageUrl && (
                            <motion.div
                                className="flex-shrink-0 relative overflow-hidden rounded-lg"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                            >
                                <a href={article.url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 md:w-28 md:h-28">
                                    <img
                                        src={article.imageUrl}
                                        alt={article.title}
                                        className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </a>
                            </motion.div>
                        )}
                        
                        {/* Content section */}
                        <div className="flex-1 min-w-0 space-y-2">
                            <div>
                                <motion.a 
                                    href={article.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="font-semibold text-base text-foreground hover:text-primary transition-colors line-clamp-3 leading-snug"
                                    title={article.title}
                                    whileHover={{ x: 2 }}
                                >
                                    {article.title}
                                </motion.a>
                                
                                {article.description && (
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                                        {article.description}
                                    </p>
                                )}
                            </div>

                            {/* Enhanced metadata */}
                            <div className="flex flex-wrap gap-3 items-center text-xs">
                                <div className="flex items-center gap-1.5">
                                    {article.sourceFavicon && (
                                        <img 
                                            src={article.sourceFavicon} 
                                            alt="" 
                                            className="h-4 w-4 rounded-sm"
                                        />
                                    )}
                                    {article.sourceName && (
                                        <span className="font-semibold text-foreground">
                                            {article.sourceName}
                                        </span>
                                    )}
                                </div>
                                
                                <motion.span 
                                    className="flex items-center gap-1 text-muted-foreground" 
                                    title={formattedDate}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <Clock size={12}/>
                                    {publishedAgo}
                                </motion.span>
                                
                                {index === 0 && (
                                    <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary/10 to-accent/10">
                                        <TrendingUp size={10} className="mr-1" />
                                        Latest
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <motion.div 
                            className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            initial={{ x: 20 }}
                            animate={{ x: isHovered ? 0 : 20 }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-lg bg-background/80 hover:bg-primary/10 border hover:border-primary/20 transition-colors"
                                title="Bookmark article"
                            >
                                <Bookmark size={16} className="text-muted-foreground hover:text-primary transition-colors" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 rounded-lg bg-background/80 hover:bg-primary/10 border hover:border-primary/20 transition-colors"
                                title="Share article"
                            >
                                <Share2 size={16} className="text-muted-foreground hover:text-primary transition-colors" />
                            </motion.button>
                        </motion.div>
                    </div>

                    {/* Footer with read more */}
                    <div className="flex justify-end mt-3 pt-3 border-t border-border/50">
                        <motion.div
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                asChild 
                                className="h-8 text-xs text-primary/80 hover:text-primary hover:bg-primary/10"
                            >
                                <a href={article.url} target="_blank" rel="noopener noreferrer">
                                    Read Full Story <ExternalLink size={12} className="ml-1"/>
                                </a>
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.li>
    );
};

export function NewsAggregatorCard({ data }: NewsAggregatorCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No news data available.</p>;
  // userLocale will be 'en', 'fr', etc. thanks to .split("-")[0]
  const userLocale = data.query?.context?.locale?.split("-")[0];

  const getCategoryDisplay = () => {
      if (data.query?.category && data.query.category !== "general") {
          return data.query.category.charAt(0).toUpperCase() + data.query.category.slice(1);
      }
      return null;
  }
  const categoryDisplay = getCategoryDisplay();
  const queryDisplay = data.query?.query;
  const countryDisplay = data.query?.country?.toUpperCase();

  let description = "";
  if (data.articles.length > 0) {
      description += `Showing ${data.articles.length} headline${data.articles.length > 1 ? 's' : ''}`;
      if (queryDisplay) description += ` for "${queryDisplay}"`;
      if (categoryDisplay) description += ` in ${categoryDisplay}`;
      if (countryDisplay) description += ` from ${countryDisplay}`;
      if (data.source_api && data.source_api !== "none" && data.source_api !== "gnews.io" && data.source_api !== "newsapi.org") description += ` (via ${data.source_api})`;
      description += ".";
  } else {
      description = "No news headlines found for your criteria.";
  }

  return (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
    >
        <Card className={cn(
            "w-full relative overflow-hidden",
            "bg-gradient-to-br from-background to-background/80",
            "backdrop-blur-sm border-border/50",
            "shadow-lg dark:shadow-primary/5"
        )}>
            {/* Header with enhanced styling */}
            <CardHeader className="relative">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
                <div className="relative z-10">
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Newspaper className="h-6 w-6 text-blue-500"/>
                        </motion.div>
                        <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                            Latest News Headlines
                        </span>
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {data.articles.length > 0 ? (
                            <span className="flex items-center gap-2 flex-wrap">
                                <Eye size={16} className="text-primary" />
                                {description}
                                {queryDisplay && (
                                    <Badge variant="outline" className="ml-2">
                                        "{queryDisplay}"
                                    </Badge>
                                )}
                                {categoryDisplay && (
                                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                                        {categoryDisplay}
                                    </Badge>
                                )}
                                {countryDisplay && (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                        {countryDisplay}
                                    </Badge>
                                )}
                            </span>
                        ) : (
                            description
                        )}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {data.error && (
                    <motion.div 
                        className="flex items-center gap-3 text-destructive text-sm p-4 mx-6 mb-4 bg-destructive/10 rounded-xl border border-destructive/20"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <AlertCircle size={20}/>
                        <div>
                            <p className="font-semibold">Error Fetching News</p>
                            <p className="text-xs opacity-80">{data.error}</p>
                        </div>
                    </motion.div>
                )}
                
                {!data.error && data.articles && data.articles.length > 0 ? (
                    <ScrollArea className="max-h-[600px] px-6">
                        <ul className="space-y-4 pb-6">
                            {data.articles.map((article, index) => (
                                <ArticleItem 
                                    key={article.url || index} 
                                    article={article} 
                                    locale={userLocale}
                                    index={index}
                                />
                            ))}
                        </ul>
                    </ScrollArea>
                ) : (
                    !data.error && (
                        <div className="text-center py-12 px-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3"
                            >
                                <Newspaper size={48} className="mx-auto text-muted-foreground/50" />
                                <p className="text-muted-foreground">No news articles to display</p>
                            </motion.div>
                        </div>
                    )
                )}
            </CardContent>

            {data.articles && data.articles.length > 0 && (
                <CardFooter className="text-xs text-muted-foreground justify-center pt-4 border-t border-border/50 bg-muted/30">
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2"
                    >
                        <Zap size={12} />
                        News provided by {data.source_api === "gnews.io" ? "GNews.io" : data.source_api === "newsapi.org" ? "NewsAPI.org" : "various sources"}
                    </motion.p>
                </CardFooter>
            )}
        </Card>
    </motion.div>
  );
}