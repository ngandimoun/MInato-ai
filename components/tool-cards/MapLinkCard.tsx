//components/tool-cards/MapLinkCard.tsx
"use client";

import { MapLinkStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Pin, Navigation } from "lucide-react"; // Example icons

interface MapLinkCardProps { data: MapLinkStructuredOutput; }

export function MapLinkCard({ data }: MapLinkCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No map data available.</p>;

  const title = data.type === 'directions'
    ? `Directions: ${data.origin || 'Current Location'} to ${data.destination || 'Destination'}`
    : `Location: ${data.location || 'Selected Point'}`;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {data.type === 'directions' ? <Navigation className="h-5 w-5 text-primary"/> : <Pin className="h-5 w-5 text-primary"/>}
            Map Link
        </CardTitle>
        <CardDescription>{title} via {data.mapProvider === 'apple' ? "Apple Maps" : "Google Maps"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {data.mapUrl ? (
            <Button asChild variant="default" className="w-full">
                <a href={data.mapUrl} target="_blank" rel="noopener noreferrer">
                    <Map className="mr-2 h-4 w-4" /> Open in {data.mapProvider === 'apple' ? "Apple Maps" : "Google Maps"}
                </a>
            </Button>
        ) : (
            <p className="text-sm text-destructive">Map URL not available.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}