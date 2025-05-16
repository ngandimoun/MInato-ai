//components/tool-cards/DataProfilingCard.tsx
'use client'
import { DataProfileOutput, DataProfile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

interface DataProfilingCardProps { data: DataProfileOutput; }

export function DataProfilingCard({ data }: DataProfilingCardProps) {
  if (!data || !data.data) return <p className="text-sm text-muted-foreground">No profiling data available.</p>;
  const profile = data.data;
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary"/>
            Data Profile: {profile.fileName || "Dataset"}
        </CardTitle>
        <CardDescription>Rows: {profile.rowCount}, Columns: {profile.columnCount}</CardDescription>
      </CardHeader>
      <CardContent>
        {profile.warnings && profile.warnings.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium text-amber-600">Warnings:</p>
            <ul className="list-disc list-inside text-xs">
              {profile.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
        <p className="text-sm font-medium mb-1">Column Insights (Sample):</p>
        <div className="max-h-40 overflow-y-auto space-y-1 text-xs border p-2 rounded-md">
            {Object.entries(profile.columnDetails).slice(0,3).map(([colName, details]) => ( // Show first 3 columns
                <div key={colName}>
                    <strong>{details.originalHeader}:</strong> Type - {details.inferredType}, Missing - {details.missingValues ?? 'N/A'}, Unique - {details.uniqueValues ?? 'N/A'}
                </div>
            ))}
            {Object.keys(profile.columnDetails).length > 3 && <div>...and more columns.</div>}
        </div>
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}