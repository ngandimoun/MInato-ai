//components/tool-cards/NewsAggregatorCard.tsx
"use client";

import { NewsArticleList, NewsArticle } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Newspaper, ExternalLink, CalendarClock } from "lucide-react";

interface NewsAggregatorCardProps { data: NewsArticleList; }

export function NewsAggregatorCard({ data }: NewsAggregatorCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No news data available.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary"/>
            News Headlines
        </CardTitle>
        <CardDescription>
          {data.articles.length > 0 ? `Showing ${data.articles.length} top headlines.` : "No news headlines found."}
          {data.query?.query && ` For: "${data.query.query}"`}
          {data.query?.category && data.query.category !== "general" && ` Category: ${data.query.category}`}
          {data.query?.country && ` Country: ${data.query.country.toUpperCase()}`}
          {data.source_api && data.source_api !== "none" && ` (Source: ${data.source_api})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.articles && data.articles.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {data.articles.map((article, index) => (
              <li key={article.url || index} className="p-3 border rounded-md hover:bg-muted/50">
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-sm">{article.title}</a>
                {article.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.description}</p>}
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                    {article.sourceName && <span>{article.sourceName}</span>}
                    {article.publishedAt && <span className="flex items-center gap-0.5"><CalendarClock size={12}/>{new Date(article.publishedAt).toLocaleDateString()}</span>}
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary text-xs flex items-center gap-0.5"><ExternalLink size={12}/> Read More</a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No news articles to display.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}