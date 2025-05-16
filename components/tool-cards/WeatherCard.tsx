//componetnts/tool-cards/WeatherCard.tsx
"use client";

import { CachedWeather } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sun, Cloud, Wind, Droplets } from "lucide-react"; // Example icons

interface WeatherCardProps { data: CachedWeather; }

export function WeatherCard({ data }: WeatherCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No weather data available.</p>;
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {/* Basic icon logic - can be expanded */}
          {data.iconCode?.includes("01") ? <Sun className="h-6 w-6 text-yellow-500" /> : <Cloud className="h-6 w-6 text-blue-400" />}
          {data.locationName}
        </CardTitle>
        <CardDescription>{data.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">Temperature</p>
          <p>{data.temperatureCelsius?.toFixed(1)}°C / {data.temperatureFahrenheit?.toFixed(1)}°F</p>
        </div>
        <div>
          <p className="font-medium">Feels Like</p>
          <p>{data.feelsLikeCelsius?.toFixed(1)}°C / {data.feelsLikeFahrenheit?.toFixed(1)}°F</p>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">Wind</p>
            <p>{data.windSpeedKph} km/h {data.windDirection}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Droplets className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium">Humidity</p>
            <p>{data.humidityPercent}%</p>
          </div>
        </div>
        <p className="col-span-2 text-xs text-muted-foreground text-right">
          Observed: {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "N/A"}
        </p>
      </CardContent>
    </Card>
  );
}