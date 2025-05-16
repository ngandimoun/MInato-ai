//components/tool-cards/DataParsingCard.tsx
'use client'
import { DataParsedOutput, ParsedDataObject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";

interface DataParsingCardProps { data: DataParsedOutput; }

export function DataParsingCard({ data }: DataParsingCardProps) {
  if (!data || !data.data) return <p className="text-sm text-muted-foreground">No parsing data available.</p>;
  const parsedInfo = data.data;
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary"/>
            File Parsed: {parsedInfo.fileName || "Unknown File"}
        </CardTitle>
        <CardDescription>Type: {parsedInfo.fileType || "N/A"}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Rows: {parsedInfo.rowCount}, Columns: {parsedInfo.columnCount}</p>
        {parsedInfo.headers && parsedInfo.headers.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mt-2 mb-1">Headers:</p>
            <p className="text-xs bg-muted p-2 rounded-md">{parsedInfo.headers.slice(0,5).join(", ")}{parsedInfo.headers.length > 5 ? "..." : ""}</p>
          </>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}