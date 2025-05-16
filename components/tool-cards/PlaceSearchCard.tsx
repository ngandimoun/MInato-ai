//components/tool-cards/PlaceSearchCard.tsx
"use client";

import { CachedSinglePlace, CachedPlace } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Tag, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";

interface PlaceSearchCardProps { data: CachedSinglePlace; }

export function PlaceSearchCard({ data }: PlaceSearchCardProps) {
  if (!data || !data.place) return <p className="text-sm text-muted-foreground">No place data available.</p>;
  const place = data.place;
  const nominatimLink = `https://nominatim.openstreetmap.org/ui/details.html?osmtype=${place.osmId?.split('/')[0][0].toUpperCase()}&osmid=${place.osmId?.split('/')[1]}`;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary"/>
            Location: {place.displayName.split(',')[0]}
        </CardTitle>
        <CardDescription>Full: {place.displayName}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <p><strong>Coordinates:</strong> {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</p>
        {place.category && <p className="flex items-center gap-1"><Tag size={14}/> <strong>Category:</strong> {place.category}</p>}
        {place.address && Object.keys(place.address).length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium">Address Details:</p>
            <ul className="list-disc list-inside text-xs pl-2">
              {Object.entries(place.address).slice(0,3).map(([key, value]) => <li key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {value}</li>)}
              {Object.keys(place.address).length > 3 && <li>...and more</li>}
            </ul>
          </div>
        )}
        {place.osmId && (
            <Button variant="link" asChild className="text-xs p-0 h-auto mt-2">
                 <a href={nominatimLink} target="_blank" rel="noopener noreferrer">View on OpenStreetMap <ExternalLink size={12} className="ml-1"/></a>
            </Button>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}