"use client"

import type React from "react"

import type { NewsArticleList, NewsArticle } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Newspaper, ExternalLink, AlertCircle, Eye, TrendingUp, Clock, Bookmark, Share2 } from "lucide-react"
import { formatDistanceToNowStrict, parseISO, format } from "date-fns"
import type { Locale } from "date-fns"
import { enUS, fr, es, de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { useState } from "react"

const dateFnsLocales: { [key: string]: Locale } = {
  en: enUS,
  fr: fr,
  es: es,
  de: de,
}

interface NewsAggregatorCardProps {
  data: NewsArticleList
}

const ArticleItem: React.FC<{ article: NewsArticle; locale?: string; index: number }> = ({
  article,
  locale,
  index,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const dateFnsLocaleObject = locale ? dateFnsLocales[locale] : undefined
  const publishedAgo = article.publishedAt
    ? formatDistanceToNowStrict(parseISO(article.publishedAt), {
        addSuffix: true,
        locale: dateFnsLocaleObject,
      })
    : "some time ago"
  const formattedDate = article.publishedAt ? format(parseISO(article.publishedAt), "MMM d, yyyy") : "Unknown date"

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative p-5 rounded-2xl border backdrop-blur-sm transition-all duration-500 h-full flex flex-col",
          "bg-gradient-to-br from-background/95 to-background/85 dark:from-background/98 dark:to-background/90",
          "hover:shadow-xl hover:shadow-primary/8 hover:border-primary/30",
          "hover:scale-[1.02] hover:-translate-y-1",
          "border-border/60 hover:border-border/80",
        )}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/8 opacity-0 transition-opacity duration-500"
          animate={{ opacity: isHovered ? 1 : 0 }}
        />

        <div className="relative z-10 flex flex-col items-center flex-grow text-center space-y-4">
          {/* Image de l'article */}
          {article.imageUrl && (
            <motion.div
              className="w-full h-44 md:h-52 rounded-xl overflow-hidden flex-shrink-0 shadow-md"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                <img
                  src={article.imageUrl || "/placeholder.svg"}
                  alt={article.title}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-105 group-hover:saturate-110"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </a>
            </motion.div>
          )}

          <div className="flex flex-col items-center flex-grow w-full space-y-3">
            {/* Titre */}
            <motion.a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-base md:text-lg text-foreground hover:text-primary transition-colors duration-300 line-clamp-3 leading-tight"
              title={article.title}
              whileHover={{ scale: 1.01 }}
            >
              {article.title}
            </motion.a>

            {/* Description */}
            {article.description && (
              <p className="text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed max-w-prose">
                {article.description}
              </p>
            )}

            {/* Métadonnées */}
            <div className="flex flex-col items-center gap-2 text-xs">
              <div className="flex items-center gap-2">
                {article.sourceFavicon && (
                  <img
                    src={article.sourceFavicon || "/placeholder.svg"}
                    alt=""
                    className="h-4 w-4 rounded-sm ring-1 ring-border/20"
                  />
                )}
                {article.sourceName && (
                  <span className="font-semibold text-foreground/90 bg-muted/50 px-2 py-1 rounded-full">
                    {article.sourceName}
                  </span>
                )}
              </div>
              <motion.span
                className="flex items-center gap-1.5 text-muted-foreground/80 bg-muted/30 px-2.5 py-1 rounded-full"
                title={formattedDate}
              >
                <Clock size={12} />
                {publishedAgo}
              </motion.span>
              {index === 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-gradient-to-r from-primary/15 to-accent/15 border-primary/20 text-primary font-medium"
                >
                  <TrendingUp size={10} className="mr-1" />
                  Latest
                </Badge>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <motion.button
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-300"
                title="Bookmark article"
              >
                <Bookmark
                  size={16}
                  className="text-muted-foreground hover:text-primary transition-colors duration-300"
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-300"
                title="Share article"
              >
                <Share2 size={16} className="text-muted-foreground hover:text-primary transition-colors duration-300" />
              </motion.button>
            </div>

            {/* Bouton "Read Full Story" */}
            <div className="mt-auto w-full pt-3">
              <motion.div whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.98 }} className="inline-block">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-9 text-xs font-medium text-primary/90 hover:text-primary hover:bg-primary/15 border border-primary/20 hover:border-primary/40 rounded-full px-4 transition-all duration-300"
                >
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Read Full Story <ExternalLink size={12} className="ml-2" />
                  </a>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  )
}

export function NewsAggregatorCard({ data }: NewsAggregatorCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No news data available.</p>

  const userLocale = data.query?.context?.locale?.split("-")[0]

  const getCategoryDisplay = () => {
    if (data.query?.category && data.query.category !== "general") {
      return data.query.category.charAt(0).toUpperCase() + data.query.category.slice(1)
    }
    return null
  }

  const categoryDisplay = getCategoryDisplay()
  const queryDisplay = data.query?.query
  const countryDisplay = data.query?.country?.toUpperCase()

  let descriptionText = ""
  if (data.articles.length > 0) {
    descriptionText += `Showing ${data.articles.length} headline${data.articles.length > 1 ? "s" : ""}`
    if (queryDisplay) descriptionText += ` for "${queryDisplay}"`
    if (categoryDisplay) descriptionText += ` in ${categoryDisplay}`
    if (countryDisplay) descriptionText += ` from ${countryDisplay}`
    if (
      data.source_api &&
      data.source_api !== "none" &&
      data.source_api !== "gnews.io" &&
      data.source_api !== "newsapi.org"
    )
      descriptionText += ` (via ${data.source_api})`
    descriptionText += "."
  } else {
    descriptionText = "No news headlines found for your criteria."
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card
        className={cn(
          "w-full relative overflow-hidden",
          "bg-gradient-to-br from-background/98 to-background/95",
          "backdrop-blur-md border-border/60",
          "shadow-xl shadow-primary/5 dark:shadow-primary/10",
          "hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-500",
        )}
      >
        <CardHeader className="relative px-5 py-5 sm:px-6 sm:py-6 md:px-7 md:py-6">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-accent/8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <div className="relative z-10 space-y-3">
            <CardTitle className="flex items-center gap-3 sm:gap-4 text-xl sm:text-2xl font-bold">
              <motion.div
                whileHover={{ rotate: 8, scale: 1.15 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20"
              >
                <Newspaper className="h-6 sm:h-7 w-6 sm:w-7 text-blue-600 dark:text-blue-400" />
              </motion.div>
              <span className="bg-gradient-to-r from-foreground via-foreground/95 to-foreground/90 bg-clip-text text-transparent">
                Latest News Headlines
              </span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed">
              {data.articles.length > 0 ? (
                <span className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Eye size={14} className="text-primary" />
                  </div>
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
              className="flex items-center gap-4 text-destructive text-sm p-4 sm:p-5 mx-5 sm:mx-6 mb-5 bg-gradient-to-r from-destructive/10 to-destructive/5 rounded-2xl border border-destructive/30 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="p-2 rounded-xl bg-destructive/20">
                <AlertCircle size={20} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Error Fetching News</p>
                <p className="text-xs sm:text-sm opacity-90">{data.error}</p>
              </div>
            </motion.div>
          )}

          {!data.error && data.articles && data.articles.length > 0 ? (
            <ScrollArea className="h-[420px] px-5 sm:px-6 pt-2 pb-5">
              <ul className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-3">
                {data.articles.map((article, index) => (
                  <ArticleItem key={article.url || index} article={article} locale={userLocale} index={index} />
                ))}
              </ul>
            </ScrollArea>
          ) : (
            !data.error && (
              <div className="text-center py-12 sm:py-16 px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-2xl bg-muted/30 w-fit mx-auto">
                    <Newspaper size={48} className="text-muted-foreground/60" />
                  </div>
                  <p className="text-base sm:text-lg text-muted-foreground font-medium">No news articles to display</p>
                </motion.div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
