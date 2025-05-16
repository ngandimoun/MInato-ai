//components/tool-cards/PexelsCard.tsx
"use client";

import { CachedImageList, CachedImage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Image as ImageIcon, User, ExternalLink } from "lucide-react"; // Renamed Image to ImageIcon to avoid conflict

interface PexelsCardProps { data: CachedImageList; }

export function PexelsCard({ data }: PexelsCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No Pexels image data.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary"/>
            Pexels Images for "{data.query?.query || "Search"}"
        </CardTitle>
        <CardDescription>
            {data.images.length > 0 ? `Found ${data.images.length} image(s).` : "No images found."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.images && data.images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {data.images.map(img => (
              <a key={img.id} href={img.sourceUrl || img.imageUrlFull || img.imageUrlRegular} target="_blank" rel="noopener noreferrer" className="group block border rounded-md overflow-hidden hover:shadow-lg transition-shadow">
                <img src={img.imageUrlSmall} alt={img.title || `Pexels Image ${img.id}`} className="w-full h-32 object-cover group-hover:scale-105 transition-transform"/>
                <div className="p-1.5 text-xs">
                  {img.photographerName && <p className="truncate text-muted-foreground" title={`By ${img.photographerName}`}>By: {img.photographerName}</p>}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No images to display.</p>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}