//components/tool-cards/NewsAggregatorCard.tsx
"use client";

import { NewsArticleList, NewsArticle } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, ExternalLink, CalendarClock, Globe, AlertCircle, Eye, TrendingUp, Clock, Bookmark, Share2, Zap } from "lucide-react";
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
import { type Locale } from 'date-fns';
import { enUS, fr, es, de } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

const dateFnsLocales: { [key: string]: Locale } = {
  en: enUS,
  fr: fr,
  es: es,
  de: de,
};

interface NewsAggregatorCardProps { data: NewsArticleList; }

const ArticleItem: React.FC<{ article: NewsArticle, locale?: string, index: number }> = ({ article, locale, index }) => {
    const [isHovered, setIsHovered] = useState(false); // Peut être utilisé pour des effets subtils même dans ce layout
    
    const dateFnsLocaleObject = locale ? dateFnsLocales[locale] : undefined;

    const publishedAgo = article.publishedAt
        ? formatDistanceToNowStrict(parseISO(article.publishedAt), {
            addSuffix: true,
            locale: dateFnsLocaleObject,
          })
        : "some time ago";

    const formattedDate = article.publishedAt ? format(parseISO(article.publishedAt), "MMM d, yyyy") : "Unknown date";

    return (
        <motion.li 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
            className="group relative h-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={cn(
                "relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 h-full flex flex-col", // flex-col pour positionner le contenu
                "bg-gradient-to-br from-background/80 to-background/40 dark:from-background/90 dark:to-background/60",
                "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
                "hover:scale-[1.01] hover:-translate-y-0.5" // Léger effet au survol
            )}>
                <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity duration-300"
                    animate={{ opacity: isHovered ? 1 : 0 }} // Garde l'effet de fond au survol
                />
                
                {/* Conteneur principal pour l'image puis le texte, aligné verticalement et centré */}
                <div className="relative z-10 flex flex-col items-center flex-grow text-center">
                    {/* Image de l'article */}
                    {article.imageUrl && (
                        <motion.div
                            className="w-full h-40 md:h-48 mb-4 rounded-lg overflow-hidden flex-shrink-0" // Hauteur fixe, mb pour espacement
                            whileHover={{ scale: 1.03 }} // Effet de zoom léger sur l'image
                            transition={{ duration: 0.2 }}
                        >
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                <img
                                    src={article.imageUrl}
                                    alt={article.title}
                                    className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </a>
                        </motion.div>
                    )}

                    {/* Conteneur pour le reste du contenu, centré */}
                    <div className="flex flex-col items-center flex-grow w-full">
                        {/* Titre */}
                        <motion.a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-semibold text-base text-foreground hover:text-primary transition-colors line-clamp-3 leading-snug mb-1.5" // mb pour espacement
                            title={article.title}
                        >
                            {article.title}
                        </motion.a>
                        
                        {/* Description */}
                        {article.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-2.5 max-w-prose"> {/* max-w-prose pour lisibilité */}
                                {article.description}
                            </p>
                        )}

                        {/* Métadonnées */}
                        <div className="flex flex-col items-center gap-1.5 text-xs mb-3"> {/* flex-col pour aligner les métadonnées verticalement au centre */}
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
                            >
                                <Clock size={12}/>
                                {publishedAgo}
                            </motion.span>
                            {index === 0 && (
                                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary/10 to-accent/10 mt-1">
                                    <TrendingUp size={10} className="mr-1" />
                                    Latest
                                </Badge>
                            )}
                        </div>
                        
                        {/* Boutons d'action (Bookmark, Share) - Optionnel, peut encombrer */}
                        <div className="flex gap-2 mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
                             <motion.button
                                whileHover={{ scale: 1.1, color: 'hsl(var(--primary))' }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 rounded-full hover:bg-primary/10 border-transparent transition-colors"
                                title="Bookmark article"
                            >
                                <Bookmark size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1, color: 'hsl(var(--primary))' }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1.5 rounded-full hover:bg-primary/10 border-transparent transition-colors"
                                title="Share article"
                            >
                                <Share2 size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </motion.button>
                        </div>
                        
                        {/* Bouton "Read Full Story" - toujours en bas grâce à mt-auto sur son parent et flex-grow sur ce conteneur */}
                        <div className="mt-auto w-full pt-2"> {/* mt-auto pour pousser vers le bas, w-full pour que le bouton soit centré */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-block" // Pour que le scale ne perturbe pas le layout
                            >
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    asChild 
                                    className="h-8 text-xs text-primary/90 hover:text-primary hover:bg-primary/10"
                                >
                                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                                        Read Full Story <ExternalLink size={12} className="ml-1.5"/>
                                    </a>
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.li>
    );
};

export function NewsAggregatorCard({ data }: NewsAggregatorCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No news data available.</p>;
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

  let descriptionText = "";
  if (data.articles.length > 0) {
      descriptionText += `Showing ${data.articles.length} headline${data.articles.length > 1 ? 's' : ''}`;
      if (queryDisplay) descriptionText += ` for "${queryDisplay}"`;
      if (categoryDisplay) descriptionText += ` in ${categoryDisplay}`;
      if (countryDisplay) descriptionText += ` from ${countryDisplay}`;
      if (data.source_api && data.source_api !== "none" && data.source_api !== "gnews.io" && data.source_api !== "newsapi.org") descriptionText += ` (via ${data.source_api})`;
      descriptionText += ".";
  } else {
      descriptionText = "No news headlines found for your criteria.";
  }

  return (
    <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
    >
        <Card className={cn(
            "w-full relative overflow-hidden",
            "bg-gradient-to-br from-background to-background/80",
            "backdrop-blur-sm border-border/50",
            "shadow-lg dark:shadow-primary/5"
        )}>
            <CardHeader className="relative px-4 py-4 sm:px-5 sm:py-4 md:px-6 md:py-5">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                />
                <div className="relative z-10">
                    <CardTitle className="flex items-center gap-2.5 sm:gap-3 text-lg sm:text-xl font-semibold">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                            <Newspaper className="h-5 sm:h-6 w-5 sm:w-6 text-blue-500"/>
                        </motion.div>
                        <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                            Latest News Headlines
                        </span>
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-1.5 sm:mt-2">
                        {data.articles.length > 0 ? (
                            <span className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <Eye size={14} className="text-primary" />
                                {descriptionText}
                            </span>
                        ) : (
                            descriptionText
                        )}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {data.error && (
                    <motion.div 
                        className="flex items-center gap-3 text-destructive text-sm p-3.5 sm:p-4 mx-4 sm:mx-6 mb-4 bg-destructive/10 rounded-xl border border-destructive/20"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <AlertCircle size={18} />
                        <div>
                            <p className="font-semibold">Error Fetching News</p>
                            <p className="text-xs sm:text-sm opacity-80">{data.error}</p>
                        </div>
                    </motion.div>
                )}
                
                {!data.error && data.articles && data.articles.length > 0 ? (
                    <ScrollArea className="h-[400px] px-4 sm:px-6 pt-1 pb-4">
                        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
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
                        <div className="text-center py-10 sm:py-12 px-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2.5 sm:space-y-3"
                            >
                                <Newspaper size={40} className="mx-auto text-muted-foreground/50" />
                                <p className="text-sm sm:text-base text-muted-foreground">No news articles to display</p>
                            </motion.div>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    </motion.div>
  );
}