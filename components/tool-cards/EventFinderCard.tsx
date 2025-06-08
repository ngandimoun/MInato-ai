//components/tool-cards/EventFinderCard.tsx
'use client'
import React, { useState } from "react";
import { EventFinderStructuredOutput, TicketmasterEvent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Ticket, ExternalLink, ChevronDown, ChevronUp, Users, Palette, Building, Music, Info, Globe, Image as ImageIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EventFinderCardProps { data: EventFinderStructuredOutput; }

const EventItem: React.FC<{ event: TicketmasterEvent; isExpanded: boolean; onToggleExpand: () => void; }> = ({ event, isExpanded, onToggleExpand }) => {
    const venue = event._embedded?.venues?.[0];
    const classification = event.classifications?.[0];
    const mainImage = event.images && event.images.length > 0 ? event.images[0] : undefined;

    let eventDateStr = "Date TBD";
    if (event.dates?.start?.localDate) {
        try {
            eventDateStr = format(parseISO(event.dates.start.localDate), "EEEE, MMMM do, yyyy");
            if (event.dates.start.localTime) {
                eventDateStr += ` at ${format(parseISO(`1970-01-01T${event.dates.start.localTime}`), "h:mm a")}`;
            }
        } catch (e) { console.error("Error parsing event date:", e); }
    }

    return (
        <motion.li
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="p-3 border rounded-lg hover:shadow-md transition-shadow"
        >
            <div className="flex flex-col sm:flex-row gap-3">
                {mainImage && (
                    <div className="flex-shrink-0 w-full sm:w-32 h-32 sm:h-auto rounded-md overflow-hidden relative">
                        <img src={mainImage.url} alt={event.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        {event.priceRanges && event.priceRanges.length > 0 && (
                            <span className="absolute bottom-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-sm font-medium">
                                From {event.priceRanges[0].currency} {event.priceRanges[0].min.toFixed(2)}
                            </span>
                        )}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <a href={event.url || "#"} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline text-base line-clamp-2" title={event.name}>
                        {event.name}
                    </a>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <CalendarDays className="h-3 w-3"/> {eventDateStr}
                    </p>
                    {venue?.name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3"/>
                            {venue.name}{venue.city?.name && `, ${venue.city.name}`}
                        </p>
                    )}
                    {classification?.genre?.name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                           <Palette className="h-3 w-3" /> Genre: {classification.genre.name} {classification.subGenre?.name && `/ ${classification.subGenre.name}`}
                        </p>
                    )}
                </div>
            </div>
            <AnimatePresence>
            {isExpanded && event._embedded?.attractions && event._embedded.attractions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-dashed text-xs space-y-1"
                >
                    <h5 className="font-medium text-muted-foreground">Attractions:</h5>
                    <ul className="list-disc list-inside pl-2">
                        {event._embedded.attractions.map(attr => (
                            <li key={attr.name}>{attr.name}</li>
                        ))}
                    </ul>
                </motion.div>
            )}
            </AnimatePresence>
            <div className="flex justify-end mt-2">
                <Button variant="ghost" size="sm" onClick={onToggleExpand} className="text-xs text-muted-foreground">
                    {isExpanded ? <ChevronUp size={14} className="mr-1"/> : <ChevronDown size={14} className="mr-1"/>}
                    {isExpanded ? "Show Less" : "Show More"}
                </Button>
                {event.url && (
                    <Button variant="link" size="sm" asChild className="text-xs">
                        <a href={event.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={12} className="mr-1"/> View on Ticketmaster
                        </a>
                    </Button>
                )}
            </div>
        </motion.li>
    );
};


export function EventFinderCard({ data }: EventFinderCardProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  if (!data) return <p className="text-sm text-muted-foreground">No event data available.</p>;

  const toggleExpand = (eventId: string) => {
    setExpandedEventId(prevId => (prevId === eventId ? null : eventId));
  };
  
  const iconForQuery = () => {
      const query = data.query?.classificationName?.toLowerCase() || data.query?.keyword?.toLowerCase();
      if (query?.includes("music") || query?.includes("concert")) return <Music className="h-5 w-5 text-primary"/>;
      if (query?.includes("sport")) return <Users className="h-5 w-5 text-primary"/>; // Using Users for sports as an example
      if (query?.includes("art") || query?.includes("theatre")) return <Palette className="h-5 w-5 text-primary"/>;
      if (query?.includes("family")) return <ImageIcon className="h-5 w-5 text-primary"/>; // Example for Family
      if (data.query?.location || data.query?.countryCode) return <Globe className="h-5 w-5 text-primary"/>;
      return <Ticket className="h-5 w-5 text-primary"/>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {iconForQuery()}
            Events {data.locationDescription ? `near ${data.locationDescription}` : ""}
        </CardTitle>
        <CardDescription>
            {data.count > 0 ? `Showing ${data.count} of ${data.totalFound || data.count} relevant events.` : "No events found matching your criteria."}
            {data.query?.keyword && ` For query: "${data.query.keyword}"`}
            {data.query?.classificationName && ` in Category: ${data.query.classificationName}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.events && data.events.length > 0 ? (
          <ScrollArea className={cn("h-[600px]", data.events.length > 3 ? "pr-3" : "")}>
            <ul className="grid grid-cols-1 md:grid-col -2 gap-3">
              {data.events.map(event => (
                <EventItem 
                    key={event.id} 
                    event={event}
                    isExpanded={expandedEventId === event.id}
                    onToggleExpand={() => toggleExpand(event.id)}
                />
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No events to display based on current filters.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
      {data.events && data.events.length > 0 && data.totalFound && data.totalFound > data.events.length && (
        <CardFooter className="text-xs text-muted-foreground justify-center pt-3 border-t">
            Showing {data.events.length} of {data.totalFound} total events.
        </CardFooter>
      )}
    </Card>
  );
}