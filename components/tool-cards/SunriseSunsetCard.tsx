//components/tool-cards/SunriseSunsetCard.tsx
"use client";

import { SunriseSunsetStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sunrise, Sunset, MapPin, AlertCircle } from "lucide-react";

interface SunriseSunsetCardProps { data: SunriseSunsetStructuredOutput; }

export function SunriseSunsetCard({ data }: SunriseSunsetCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No sun times data available.</p>;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Sunrise className="h-5 w-5 text-primary"/>
            Sun Times for {data.resolvedLocation || "Selected Location"}
        </CardTitle>
        <CardDescription>
            Date: {data.date ? new Date(data.date + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
            {data.timezone && ` (Timezone: ${data.timezone})`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {data.error ? (
             <p className="text-destructive flex items-center gap-1"><AlertCircle size={16}/> {data.error}</p>
        ) : (
            <>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="flex items-center gap-1"><Sunrise size={16} className="text-amber-500"/> Sunrise:</span>
                    <span className="font-medium">{data.sunriseLocal || (data.sunriseISO ? `${new Date(data.sunriseISO).toLocaleTimeString()} UTC` : "N/A")}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="flex items-center gap-1"><Sunset size={16} className="text-orange-600"/> Sunset:</span>
                    <span className="font-medium">{data.sunsetLocal || (data.sunsetISO ? `${new Date(data.sunsetISO).toLocaleTimeString()} UTC` : "N/A")}</span>
                </div>
            </>
        )}
        {(data.resolvedLat !== null && data.resolvedLon !== null) &&
            <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1"><MapPin size={12}/> Coords: {data.resolvedLat.toFixed(4)}, {data.resolvedLon.toFixed(4)} ({data.coordSource})</p>
        }
      </CardContent>
    </Card>
  );
}