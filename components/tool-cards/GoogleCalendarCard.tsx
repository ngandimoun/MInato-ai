//components/tool-cards/GoogleCalendarCard.tsx
"use client";
import { CalendarEventList, CalendarEvent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Clock, MapPin, Users, ExternalLink, AlertCircle, Info } from "lucide-react";
import { format, parseISO, isToday, isPast, differenceInMinutes } from 'date-fns';
import { cn } from "@/lib/utils";
interface GoogleCalendarCardProps { data: CalendarEventList; }
const EventItem: React.FC<{ event: CalendarEvent, userLocale?: string, userTimezone?: string }> = ({ event, userLocale, userTimezone }) => {
const now = new Date();
const eventStart = event.start ? parseISO(event.start) : null;
const eventEnd = event.end ? parseISO(event.end) : null;
const isCurrentlyHappening = eventStart && eventEnd && now >= eventStart && now <= eventEnd;
const isUpcomingToday = eventStart && isToday(eventStart) && now < eventStart;
const isPastToday = eventStart && isToday(eventStart) && now > eventStart && !isCurrentlyHappening;
let timeDisplay = event.formattedTime || "Time TBD";
if (event.isAllDay) timeDisplay = "All Day";
else if (eventStart && eventEnd) {
    const startFormatted = format(eventStart, "p", { locale: undefined });
    const endFormatted = format(eventEnd, "p", { locale: undefined });
    if (isToday(eventStart) && isToday(eventEnd) && differenceInMinutes(eventEnd, eventStart) < 24 * 60) {
         timeDisplay = `${startFormatted} - ${endFormatted}`;
    } else {
        timeDisplay = `${format(eventStart, "MMM d, p", { locale: undefined })} - ${format(eventEnd, "MMM d, p", { locale: undefined })}`;
    }
} else if (eventStart) {
    timeDisplay = format(eventStart, "MMM d, p", { locale: undefined });
}


return (
    <li className={cn(
        "p-3 border rounded-lg transition-all hover:shadow-md",
        isCurrentlyHappening ? "bg-primary/10 border-primary/50" : "bg-card",
        isPastToday && "opacity-60"
    )}>
        <div className="flex justify-between items-start gap-2">
            <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{event.summary}</h4>
            {event.url && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary -mr-1 -mt-1" asChild>
                    <a href={event.url} target="_blank" rel="noopener noreferrer" title="Open in Google Calendar">
                        <ExternalLink size={14}/>
                    </a>
                </Button>
            )}
        </div>
        <div className="text-xs mt-0.5 space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
                <Clock className={cn("h-3 w-3", isCurrentlyHappening && "text-primary animate-pulse")}/> {timeDisplay}
                {isCurrentlyHappening && <span className="text-primary font-medium text-[10px]">(Happening Now)</span>}
                {isUpcomingToday && !isCurrentlyHappening && <span className="text-blue-600 font-medium text-[10px]">(Upcoming)</span>}
            </p>
            {event.location && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/>{event.location}</p>}
            {event.attendees && event.attendees.length > 0 && (
                <p className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3"/> {event.attendees.slice(0,2).join(", ")}{event.attendees.length > 2 ? ` & ${event.attendees.length - 2} more` : ""}
                </p>
            )}
        </div>
    </li>
);
};
export function GoogleCalendarCard({ data }: GoogleCalendarCardProps) {
if (!data) return <p className="text-sm text-muted-foreground">No calendar data available.</p>;
const userName = data.query?.context?.userName || "User";
const userLocale = data.query?.context?.locale?.split("-")[0];
const userTimezone = data.query?.context?.timezone;
return (
<Card className="w-full">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<CalendarDays className="h-5 w-5 text-primary"/>
{userName}'s Google Calendar - Today
</CardTitle>
<CardDescription>
  {data.events.length > 0 ? `You have ${data.events.length} event(s) today.` : "Your calendar is clear for today!"}
  {data.query && data.query.calendarId && data.query.calendarId !== 'primary' && ` Calendar: ${data.query.calendarId}`}
</CardDescription>
</CardHeader>
<CardContent>
{data.error && (
<div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
<AlertCircle size={18}/>
<div>
<p className="font-medium">Calendar Error</p>
<p className="text-xs">{data.error}</p>
</div>
</div>
)}
{!data.error && data.events && data.events.length > 0 ? (
<ScrollArea className="max-h-80 pr-2"> {/* Added pr for scrollbar */}
<ul className="space-y-2.5">
{data.events.map(event => (
<EventItem key={event.id} event={event} userLocale={userLocale} userTimezone={userTimezone}/>
))}
</ul>
</ScrollArea>
) : (
!data.error &&
<div className="text-center py-6 text-muted-foreground">
<Info size={24} className="mx-auto mb-2 opacity-50"/>
<p className="text-sm">No events scheduled for today in this calendar.</p>
</div>
)}
</CardContent>
{data.events && data.events.length > 0 && (
<CardFooter className="text-xs text-muted-foreground justify-center pt-3 border-t">
Displaying events for today.
</CardFooter>
)}
</Card>
);
}