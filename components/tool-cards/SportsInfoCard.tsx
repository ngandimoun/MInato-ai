//components/tool-cards/SportsInfoCard.tsx
"use client";

import { SportsStructuredOutput, SportsTeamData, SportsEventData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Trophy, ShieldQuestion, CalendarDays, Users, ExternalLink, BarChart3 } from "lucide-react";

interface SportsInfoCardProps { data: SportsStructuredOutput; }

export function SportsInfoCard({ data }: SportsInfoCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No sports data available.</p>;
  const team = data.teamInfo;
  const event = data.event; // Could be next or last game

  const renderEventDetails = (ev: SportsEventData) => (
    <div className="mt-2 border-t pt-2">
        <h5 className="text-xs font-semibold mb-1">{ev.name} ({ev.status || "Scheduled"})</h5>
        <p className="text-xs"><strong className="text-blue-600">{ev.homeTeamName}</strong> vs <strong className="text-red-600">{ev.awayTeamName}</strong></p>
        {ev.homeScore !== null && ev.awayScore !== null &&
            <p className="text-xs font-bold">Score: {ev.homeScore} - {ev.awayScore}</p>
        }
        {ev.dateTimeUtc &&
            <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays size={12}/> {new Date(ev.dateTimeUtc).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
        }
        {ev.venue && <p className="text-xs text-muted-foreground">Venue: {ev.venue}</p>}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {team?.badgeUrl ? <img src={team.badgeUrl} alt={`${team.name} badge`} className="h-6 w-6 object-contain"/> : <ShieldQuestion className="h-5 w-5 text-primary"/>}
            {team?.name || data.query?.teamName || "Sports Info"}
        </CardTitle>
        <CardDescription>
            {data.query?.queryType === "team_info" && "Team Information"}
            {data.query?.queryType === "next_game" && "Next Game"}
            {data.query?.queryType === "last_game" && "Last Game Result"}
            {team?.league && ` - ${team.league}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {data.error && <p className="text-destructive">{data.error}</p>}
        {!data.error && data.query?.queryType === "team_info" && team && (
            <div className="space-y-1">
                <p><strong>Sport:</strong> {team.sport}</p>
                {team.formedYear && <p><strong>Formed:</strong> {team.formedYear}</p>}
                {team.stadium && <p><strong>Stadium:</strong> {team.stadium} {team.stadiumLocation && `(${team.stadiumLocation})`}</p>}
                {team.description && <p className="text-xs mt-1 line-clamp-3"><strong>About:</strong> {team.description}</p>}
            </div>
        )}
        {!data.error && (data.query?.queryType === "next_game" || data.query?.queryType === "last_game") && event && (
            renderEventDetails(event)
        )}
        {!data.error && (data.query?.queryType === "next_game" || data.query?.queryType === "last_game") && !event && (
            <p className="text-muted-foreground">No {data.query?.queryType === "next_game" ? "upcoming game" : "recent game result"} found for this team.</p>
        )}
      </CardContent>
      {team?.website && (
        <CardFooter className="pt-2 border-t">
            <a href={team.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink size={12}/> Visit Team Website
            </a>
        </CardFooter>
      )}
    </Card>
  );
}