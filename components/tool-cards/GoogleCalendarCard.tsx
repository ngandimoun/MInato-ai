//components/tool-cards/GoogleCalendarCard.tsx
"use client";

import { CalendarEventList, CalendarEvent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin, Users, ExternalLink } from "lucide-react";

interface GoogleCalendarCardProps { data: CalendarEventList; }

export function GoogleCalendarCard({ data }: GoogleCalendarCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No calendar data available.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary"/>
          Today's Calendar Events
        </CardTitle>
        <CardDescription>
          {data.events.length > 0 ? `You have ${data.events.length} event(s) today.` : "Your calendar is clear for today!"}
          {data.query?.calendarId && ` (From calendar: ${data.query.calendarId})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.events && data.events.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {data.events.map(event => (
              <li key={event.id} className="p-3 border rounded-md hover:bg-muted/50">
                <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">{event.summary}</h4>
                    {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline"><ExternalLink size={14}/></a>}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3"/> {event.formattedTime || (event.isAllDay ? "All day" : "Time TBD")}
                </p>
                {event.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/>{event.location}</p>}
                {event.attendees && event.attendees.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3"/> {event.attendees.slice(0,2).join(", ")}{event.attendees.length > 2 ? ` & ${event.attendees.length - 2} more` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No events to display.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}