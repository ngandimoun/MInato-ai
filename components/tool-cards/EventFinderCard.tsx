//components/tool-cards/EventFinderCard.tsx
'use client'
import { EventFinderStructuredOutput, TicketmasterEvent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

interface EventFinderCardProps { data: EventFinderStructuredOutput; }

export function EventFinderCard({ data }: EventFinderCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No event data available.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary"/>
            Events Found {data.locationDescription ? `near ${data.locationDescription}` : ""}
        </CardTitle>
        <CardDescription>
            {data.count > 0 ? `Showing ${data.count} of ${data.totalFound || data.count} events.` : "No events found matching your criteria."}
            {data.query?.keyword && ` For query: "${data.query.keyword}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.events && data.events.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {data.events.map(event => (
              <li key={event.id} className="p-3 border rounded-md hover:bg-muted/50">
                <a href={event.url || "#"} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{event.name}</a>
                {event._embedded?.venues?.[0]?.name && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3"/>
                    {event._embedded.venues[0].name}
                    {event._embedded.venues[0].city?.name && `, ${event._embedded.venues[0].city.name}`}
                  </p>
                )}
                {event.dates?.start?.localDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3"/>
                    {new Date(event.dates.start.localDate + (event.dates.start.localTime ? `T${event.dates.start.localTime}` : 'T00:00:00')).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: event.dates.start.localTime ? 'numeric' : undefined, minute: event.dates.start.localTime ? '2-digit' : undefined })}
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