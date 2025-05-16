//components/tool-cards/PublicHolidayCard.tsx
"use client";

import { PublicHolidayStructuredOutput, HolidayData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarCheck2, CalendarDays } from "lucide-react";

interface PublicHolidayCardProps { data: PublicHolidayStructuredOutput; }

export function PublicHolidayCard({ data }: PublicHolidayCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No holiday data available.</p>;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-primary"/>
            Public Holidays: {data.location}
        </CardTitle>
        {data.year && <CardDescription>For the year {data.year}</CardDescription>}
        {data.queryDate && <CardDescription>Checking date: {new Date(data.queryDate + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.error && <p className="text-destructive text-sm">{data.error}</p>}
        {!data.error && data.queryDate && (
            data.isHoliday && data.holiday ? (
                <div>
                    <p className="text-green-600 font-semibold text-sm">Yes, it's a holiday!</p>
                    <p className="text-sm"><strong>{data.holiday.name}</strong> ({data.holiday.type})</p>
                </div>
            ) : (
                <p className="text-sm">Not a public holiday.</p>
            )
        )}
        {!data.error && data.year && data.holidays && data.holidays.length > 0 && (
             <ul className="space-y-1 text-sm max-h-60 overflow-y-auto">
                {data.holidays.map(h => (
                    <li key={h.date + h.name}>
                        <strong>{new Date(h.date + "T00:00:00").toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}:</strong> {h.name}
                    </li>
                ))}
            </ul>
        )}
        {!data.error && data.year && (!data.holidays || data.holidays.length === 0) && !data.queryDate && (
            <p className="text-sm text-muted-foreground">No public holidays listed for {data.year}.</p>
        )}
      </CardContent>
    </Card>
  );
}