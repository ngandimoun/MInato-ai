//components/tool-cards/NewsAggregatorCard.tsx
"use client";

import { NewsArticleList, NewsArticle } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, ExternalLink, CalendarClock, Globe, AlertCircle } from "lucide-react";
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
// Importez le type Locale et les locales spécifiques dont vous avez besoin
import { type Locale } from 'date-fns';
import { enUS, fr, es, de /* Ajoutez d'autres locales ici si nécessaire */ } from 'date-fns/locale';
import { cn } from "@/lib/utils";

// Créez un objet de mapping pour les locales
const dateFnsLocales: { [key: string]: Locale } = {
  en: enUS,
  fr: fr,
  es: es,
  de: de,
  // Ajoutez d'autres mappings ici. Assurez-vous que la clé (ex: 'en')
  // correspond à ce que vous attendez de userLocale (ex: 'en' de 'en-US')
};

interface NewsAggregatorCardProps { data: NewsArticleList; }

const ArticleItem: React.FC<{ article: NewsArticle, locale?: string }> = ({ article, locale }) => {
    // Utilisez l'objet de mapping pour obtenir la locale date-fns
    const dateFnsLocaleObject = locale ? dateFnsLocales[locale] : undefined;

    const publishedAgo = article.publishedAt
        ? formatDistanceToNowStrict(parseISO(article.publishedAt), {
            addSuffix: true,
            locale: dateFnsLocaleObject, // Passez l'objet de locale ici
          })
        : "some time ago";

    const formattedDate = article.publishedAt ? format(parseISO(article.publishedAt), "MMM d, yyyy") : "Unknown date";

    return (
        <li className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
            <div className="flex gap-3 items-start">
                {article.imageUrl && (
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 w-20 h-20 block">
                        <img
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover rounded-md border border-border group-hover:opacity-90 transition-opacity"
                            onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if image fails to load
                        />
                    </a>
                )}
                <div className="flex-1 min-w-0">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-primary hover:underline line-clamp-2" title={article.title}>
                        {article.title}
                    </a>
                    {article.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{article.description}</p>}
                    <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1 items-center">
                        {article.sourceFavicon && <img src={article.sourceFavicon} alt="" className="h-3 w-3 inline-block mr-0.5"/>}
                        {article.sourceName && <span className="font-medium">{article.sourceName}</span>}
                        <span className="flex items-center gap-0.5" title={formattedDate}><CalendarClock size={11}/>{publishedAgo}</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-1">
                 <Button variant="link" size="sm" asChild className="text-xs h-auto p-0 text-primary/80 hover:text-primary">
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                        Read More <ExternalLink size={11} className="ml-1"/>
                    </a>
                </Button>
            </div>
        </li>
    );
};

export function NewsAggregatorCard({ data }: NewsAggregatorCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No news data available.</p>;
  // userLocale sera 'en', 'fr', etc. grâce à .split("-")[0]
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary"/>
            Latest News Headlines
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={18}/>
                <div>
                    <p className="font-medium">Error Fetching News</p>
                    <p className="text-xs">{data.error}</p>
                </div>
            </div>
        )}
        {!data.error && data.articles && data.articles.length > 0 ? (
          <ScrollArea className={cn("max-h-80", data.articles.length > 3 ? "pr-2" : "")}>
            <ul className="space-y-2.5">
              {data.articles.map((article, index) => (
                <ArticleItem key={article.url || index} article={article} locale={userLocale} />
              ))}
            </ul>
          </ScrollArea>
        ) : (
          !data.error && <p className="text-sm text-muted-foreground text-center py-4">No news articles to display.</p>
        )}
      </CardContent>
      {data.articles && data.articles.length > 0 && (
         <CardFooter className="text-xs text-muted-foreground justify-center pt-3 border-t">
            News provided by {data.source_api === "gnews.io" ? "GNews.io" : data.source_api === "newsapi.org" ? "NewsAPI.org" : "various sources"}.
        </CardFooter>
      )}
    </Card>
  );
}