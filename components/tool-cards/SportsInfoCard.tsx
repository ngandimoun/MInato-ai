//components/tool-cards/SportsInfoCard.tsx
"use client";

import { SportsStructuredOutput, SportsTeamData, SportsEventData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Trophy, ShieldQuestion, CalendarDays, Users, ExternalLink, Landmark, Shirt, Users2, Tv, List } from "lucide-react"; // Added more icons
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"; // For multiple events
import { cn } from "@/lib/utils";

interface SportsInfoCardProps { data: SportsStructuredOutput; }

export function SportsInfoCard({ data }: SportsInfoCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No sports data available.</p>;
  
  const team = data.teamInfo;
  const mainEvent = data.event; 
  const eventsList = data.eventsList; // List of events for next/last game queries

  const renderEventDetails = (ev: SportsEventData, isMainEvent: boolean = false) => (
    <div className={cn("mt-2 text-xs", isMainEvent ? "pb-2" : "p-2 border rounded-md hover:bg-muted/30")}>
      <h5 className={cn("font-semibold mb-0.5", isMainEvent ? "text-sm" : "text-xs")}>
        {ev.name} 
        <span className={cn("ml-1 font-normal", 
            ev.status?.toLowerCase().includes("finished") ? "text-green-600" : 
            ev.status?.toLowerCase().includes("scheduled") ? "text-blue-600" : 
            ev.status?.toLowerCase().includes("postponed") ? "text-amber-600" : 
            "text-muted-foreground"
        )}>
            ({ev.status || "Scheduled"})
        </span>
      </h5>
      <p><strong className="text-blue-600">{ev.homeTeamName}</strong> vs <strong className="text-red-600">{ev.awayTeamName}</strong></p>
      {ev.homeScore !== null && ev.awayScore !== null &&
          <p className="font-bold">Score: {ev.homeScore} - {ev.awayScore}</p>
      }
      {(ev.dateTimeUtc || ev.date) && (
          <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <CalendarDays size={12}/> {ev.dateTimeUtc || ev.date}
          </p>
      )}
      {ev.venue && <p className="text-muted-foreground flex items-center gap-1 text-[11px]"><Landmark size={12}/> {ev.venue}</p>}
      {ev.videoUrl && <a href={ev.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[11px] flex items-center gap-1"><Tv size={12}/> Watch Highlights</a>}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {team?.badgeUrl ? <img src={team.badgeUrl} alt={`${team.name} badge`} className="h-7 w-7 object-contain"/> : <Trophy className="h-5 w-5 text-primary"/>}
            {team?.name || data.query?.teamName || "Sports Info"}
        </CardTitle>
        <CardDescription>
            {data.query?.queryType === "team_info" && "Team Information"}
            {data.query?.queryType === "next_game" && "Next Game"}
            {data.query?.queryType === "last_game" && "Last Game Result"}
            {team?.league && ` - ${team.league} (${team.sport || 'Sport'})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {data.error && <p className="text-destructive">{data.error}</p>}
        
        {!data.error && (data.query?.queryType === "team_info") && team && (
            <div className="space-y-1.5">
                <p><strong>Formed:</strong> {team.formedYear || "N/A"}</p>
                {team.stadium && <p className="flex items-center gap-1"><Landmark size={14} className="text-muted-foreground"/><strong>Stadium:</strong> {team.stadium} {team.stadiumLocation && `(${team.stadiumLocation})`}</p>}
                {team.description && <p className="text-xs mt-1 text-muted-foreground line-clamp-4"><strong>About:</strong> {team.description}</p>}
                {team.bannerUrl && <img src={team.bannerUrl} alt={`${team.name} banner`} className="mt-2 rounded-md max-h-24 w-full object-cover"/>}
            </div>
        )}

        {!data.error && ((data.query?.queryType === "next_game") || (data.query?.queryType === "last_game")) && mainEvent && (
            renderEventDetails(mainEvent, true)
        )}
        
        {!data.error && ((data.query?.queryType === "next_game") || (data.query?.queryType === "last_game")) && !mainEvent && (
            <p className="text-muted-foreground py-3 text-center">No {data.query?.queryType === "next_game" ? "upcoming game" : "recent game result"} found for this team.</p>
        )}

        {!data.error && ((data.query?.queryType === "next_game") || (data.query?.queryType === "last_game")) && eventsList && eventsList.length > 1 && (
            <div className="mt-3">
                <h6 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><List size={14}/> Other relevant games:</h6>
                <ScrollArea className="max-h-32">
                    <div className="space-y-1.5">
                        {eventsList.slice(1, 4).map(ev => renderEventDetails(ev))}
                    </div>
                </ScrollArea>
            </div>
        )}

      </CardContent>
      {(team?.website /*|| team?.strTwitter || team?.strFacebook || team?.strInstagram*/) && (
        <CardFooter className="pt-3 border-t flex flex-wrap gap-2 text-xs">
            {team?.website && (
                <Button variant="outline" size="sm" asChild>
                    <a href={team.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        <ExternalLink size={12}/> Website
                    </a>
                </Button>
            )}
            {/* Add other social links similarly if desired */}
        </CardFooter>
      )}
    </Card>
  );
}