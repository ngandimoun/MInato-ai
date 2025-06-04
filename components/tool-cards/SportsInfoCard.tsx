//components/tool-cards/SportsInfoCard.tsx
"use client";

import { SportsStructuredOutput, SportsTeamData, SportsEventData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Trophy, ShieldQuestion, CalendarDays, Users, ExternalLink, Landmark, Shirt, Users2, Tv, List, Sparkles, TrendingUp, Crown, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";

interface SportsInfoCardProps { data: SportsStructuredOutput; }

export function SportsInfoCard({ data }: SportsInfoCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No sports data available.</p>;
  
  const team = data.teamInfo;
  const mainEvent = data.event; 
  const eventsList = data.eventsList;

  const renderEventDetails = (ev: SportsEventData, isMainEvent: boolean = false, index: number = 0) => (
    <motion.div 
      key={`${ev.name}-${index}-${ev.homeTeamName}-${ev.awayTeamName}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-300",
        isMainEvent 
          ? "p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 hover:border-green-500/40"
          : "p-3 bg-gradient-to-r from-background/50 to-background/30 border border-border/50 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10"
      )}
    >
      {/* Event Status Badge */}
      <div className="absolute top-2 right-2">
        <Badge 
          className={cn(
            "text-xs py-1 px-2 border-0 backdrop-blur-sm",
            ev.status?.toLowerCase().includes("finished") 
              ? "bg-green-500/90 text-white" 
              : ev.status?.toLowerCase().includes("scheduled") 
              ? "bg-blue-500/90 text-white"
              : ev.status?.toLowerCase().includes("postponed") 
              ? "bg-amber-500/90 text-white"
              : "bg-muted/90 text-foreground"
          )}
        >
          {ev.status || "Scheduled"}
        </Badge>
      </div>

      <div className="space-y-2">
        <h5 className={cn(
          "font-semibold pr-20",
          isMainEvent ? "text-lg" : "text-base"
        )}>
          {ev.name}
        </h5>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{ev.homeTeamName}</span>
              <span className="mx-2 text-muted-foreground">vs</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{ev.awayTeamName}</span>
            </p>
            
            {ev.homeScore !== null && ev.awayScore !== null && (
              <div className="text-xl font-bold text-center py-2 px-3 bg-background/50 rounded-lg backdrop-blur-sm">
                {ev.homeScore} - {ev.awayScore}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {(ev.dateTimeUtc || ev.date) && (
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
              <CalendarDays size={12}/> 
              {ev.dateTimeUtc || ev.date}
            </span>
          )}
          {ev.venue && (
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-full">
              <Landmark size={12}/> 
              {ev.venue}
            </span>
          )}
        </div>

        {ev.videoUrl && (
          <motion.a 
            href={ev.videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg text-xs font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200"
          >
            <Play size={12}/> 
            Watch Highlights
          </motion.a>
        )}
      </div>
    </motion.div>
  );

  const getQueryTypeInfo = () => {
    switch (data.query?.queryType) {
      case "team_info":
        return {
          title: "Team Information",
          icon: <Users className="w-6 h-6 text-green-500 animate-pulse" />,
          badge: "Team Stats"
        };
      case "next_game":
        return {
          title: "Next Game",
          icon: <CalendarDays className="w-6 h-6 text-blue-500 animate-pulse" />,
          badge: "Upcoming"
        };
      case "last_game":
        return {
          title: "Last Game Result",
          icon: <Trophy className="w-6 h-6 text-amber-500 animate-pulse" />,
          badge: "Recent"
        };
      default:
        return {
          title: "Sports Info",
          icon: <Trophy className="w-6 h-6 text-green-500" />,
          badge: "Sports"
        };
    }
  };

  const queryInfo = getQueryTypeInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full overflow-hidden backdrop-blur-xl bg-gradient-to-br from-background/95 via-background/85 to-background/95 border border-border/50 shadow-xl">
        <CardHeader className="pb-2 relative">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          
          <CardTitle className="flex items-center gap-3 text-base md:text-lg relative z-10">
            <div className="relative">
              {team?.badgeUrl ? (
                <motion.img 
                  src={team.badgeUrl} 
                  alt={`${team.name} badge`} 
                  className="h-8 w-8 object-contain rounded-full"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                />
              ) : (
                <div className="relative">
                  {queryInfo.icon}
                  <div className="absolute inset-0 bg-green-500/20 blur-xl" />
                </div>
              )}
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent font-semibold">
              {team?.name || data.query?.teamName || "Sports Info"}
            </span>
            <Badge variant="secondary" className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
              <Sparkles className="w-3 h-3 mr-1" />
              {queryInfo.badge}
            </Badge>
          </CardTitle>
          
          <CardDescription className="mt-1 relative z-10">
            {queryInfo.title}
            {team?.league && ` - ${team.league} (${team.sport || 'Sport'})`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 relative z-10">
          {data.error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-destructive p-3 bg-destructive/10 rounded-lg"
            >
              {data.error}
            </motion.p>
          )}
          
          {!data.error && (data.query?.queryType === "team_info") && team && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-background/50 to-background/30 rounded-lg border border-border/50">
                    <p className="text-sm">
                      <span className="font-medium text-muted-foreground">Formed:</span> 
                      <span className="ml-2 font-semibold">{team.formedYear || "N/A"}</span>
                    </p>
                  </div>
                  
                  {team.stadium && (
                    <div className="p-3 bg-gradient-to-r from-background/50 to-background/30 rounded-lg border border-border/50">
                      <p className="flex items-center gap-2 text-sm">
                        <Landmark size={16} className="text-muted-foreground"/>
                        <span className="font-medium text-muted-foreground">Stadium:</span>
                      </p>
                      <p className="mt-1 font-semibold">{team.stadium}</p>
                      {team.stadiumLocation && (
                        <p className="text-xs text-muted-foreground">{team.stadiumLocation}</p>
                      )}
                    </div>
                  )}
                </div>

                {team.bannerUrl && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img 
                      src={team.bannerUrl} 
                      alt={`${team.name} banner`} 
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                )}
              </div>

              {team.description && (
                <div className="p-4 bg-gradient-to-r from-background/50 to-background/30 rounded-lg border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-2">About</p>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {team.description}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {!data.error && ((data.query?.queryType === "next_game") || (data.query?.queryType === "last_game")) && mainEvent && (
            renderEventDetails(mainEvent, true, 0)
          )}
          
          {!data.error && ((data.query?.queryType === "next_game") || (data.query?.queryType === "last_game")) && !mainEvent && (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                No {data.query?.queryType === "next_game" ? "upcoming game" : "recent game result"} found for this team.
              </p>
            </div>
          )}

          {!data.error && ((data.query?.queryType === "next_game") || (data.query?.queryType === "last_game")) && eventsList && eventsList.length > 1 && (
            <motion.div 
              className="mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h6 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <List size={16}/> 
                Other relevant games:
              </h6>
              <ScrollArea className="h-64">
                <div className="space-y-3 pr-4">
                  {eventsList.slice(1, 4).map((ev, idx) => renderEventDetails(ev, false, idx + 1))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </CardContent>

        {(team?.website) && (
          <CardFooter className="pt-3 border-t border-border/50 bg-muted/20 backdrop-blur-sm">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" size="sm" asChild className="bg-background/50 backdrop-blur-sm hover:bg-green-500/10 hover:border-green-500/30">
                <a href={team.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink size={14}/> 
                  Official Website
                </a>
              </Button>
            </motion.div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}