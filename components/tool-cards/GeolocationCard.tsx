//components/tool-cards/GeolocationCard.tsx
"use client";

import { GeolocationStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Globe, Wifi } from "lucide-react";

interface GeolocationCardProps { data: GeolocationStructuredOutput; }

export function GeolocationCard({ data }: GeolocationCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No geolocation data.</p>;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary"/>
            Approximate Location
        </CardTitle>
        <CardDescription>Based on IP: {data.queryIP || "N/A"}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {data.status === "success" ? (
            <>
                <p><strong>City:</strong> {data.city || "N/A"}</p>
                <p><strong>Region:</strong> {data.regionName || "N/A"} ({data.regionCode || "N/A"})</p>
                <p><strong>Country:</strong> {data.countryName || "N/A"} ({data.countryCode || "N/A"})</p>
                <p><strong>Zip:</strong> {data.zipCode || "N/A"}</p>
                <p><strong>Coordinates:</strong> {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</p>
                <p><strong>Timezone:</strong> {data.timezone || "N/A"}</p>
                <p className="text-xs text-muted-foreground pt-2">
                    <Wifi className="inline h-3 w-3 mr-1"/> ISP: {data.isp || "N/A"} | Org: {data.organization || "N/A"}
                </p>
            </>
        ) : (
            <p className={data.status === "local_ip" ? "text-amber-600" : "text-destructive"}>
                Status: {data.status}. {data.errorMessage || "Could not determine location."}
            </p>
        )}
      </CardContent>
    </Card>
  );
}