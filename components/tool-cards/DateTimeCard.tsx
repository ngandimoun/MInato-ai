//components/tool-cards/DateTimeCard.tsx
'use client'
import { DateTimeStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface DateTimeCardProps { data: DateTimeStructuredOutput; }

export function DateTimeCard({ data }: DateTimeCardProps) {
    if (!data || !data.primaryLocation) return <p className="text-sm text-muted-foreground">No date/time data available.</p>;
    const loc = data.primaryLocation;
    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary"/>
                    Time for {loc.inputLocation}
                </CardTitle>
                {loc.resolvedTimezone && <CardDescription>Timezone: {loc.resolvedTimezone} (UTC{loc.utcOffset})</CardDescription>}
            </CardHeader>
            <CardContent>
                {loc.error ? (
                    <p className="text-destructive text-sm">{loc.error}</p>
                ) : (
                    <>
                        <p className="text-3xl font-semibold">{loc.currentTime}</p>
                        <p className="text-sm text-muted-foreground">{loc.dayOfWeek}, {loc.currentDate}</p>
                    </>
                )}
                {data.allRequestedLocations && data.allRequestedLocations.length > 1 && (
                    <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium mb-1">Other Locations:</p>
                        {data.allRequestedLocations.filter(l => l.inputLocation !== loc.inputLocation).map((otherLoc, idx) => (
                            <div key={idx} className="text-xs">
                                <strong>{otherLoc.inputLocation}:</strong> {otherLoc.currentTime || otherLoc.error}
                            </div>
                        ))}
                    </div>
                )}
                {data.error && !loc.error && <p className="text-xs text-destructive mt-2">Overall Error: {data.error}</p>}
            </CardContent>
        </Card>
    );
}