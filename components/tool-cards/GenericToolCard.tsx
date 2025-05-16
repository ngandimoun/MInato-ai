//components/tool-cards/GenericToolCard.tsx
'use client'
import { AnyToolStructuredData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, AlertCircle, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GenericToolCardProps { data: AnyToolStructuredData; }

export function GenericToolCard({ data }: GenericToolCardProps) {
  if (!data) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <Info className="h-5 w-5"/>
                    No Data
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">No structured data was provided to display.</p>
            </CardContent>
        </Card>
    );
  }

  const title = (data as any).title || (data as any).query?.action || (data as any).result_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Tool Result";
  const description = (data as any).description || (data as any).query?.query || `Data from: ${(data as any).source_api || "Unknown Source"}`;
  const displayData = { ...(data as any) };
  // Remove common wrapper fields from the detailed JSON display if they are already in title/desc
  delete displayData.result_type;
  delete displayData.source_api;
  delete displayData.query;
  delete displayData.title;
  delete displayData.description;


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary"/>
            {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {Object.keys(displayData).length > 0 && !data.error && (
            <>
                <p className="text-xs text-muted-foreground mb-1">Details:</p>
                <ScrollArea className="max-h-60 w-full rounded-md border bg-muted/30 p-2">
                    <pre className="text-xs whitespace-pre-wrap break-all">
                        {JSON.stringify(displayData, null, 2)}
                    </pre>
                </ScrollArea>
            </>
        )}
        {data.error && (
            <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded-md">
                <p className="text-sm font-medium flex items-center gap-1"><AlertCircle size={16}/> Error:</p>
                <p className="text-xs">{String(data.error)}</p>
            </div>
        )}
        {!data.error && Object.keys(displayData).length === 0 && (
            <p className="text-sm text-muted-foreground">No specific details to display for this result.</p>
        )}
      </CardContent>
    </Card>
  );
}