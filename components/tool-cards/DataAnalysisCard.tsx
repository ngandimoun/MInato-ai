//components/tool-cards/DataAnalysisCard.tsx
'use client'
import { AnalysisTableResult, AnalysisChartResult, AnalysisSummaryResult, AnalysisResultData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, LineChart, PieChart } from "lucide-react"; // Example icons

interface DataAnalysisCardProps {
  data: AnalysisTableResult | AnalysisChartResult | AnalysisSummaryResult;
  analysisResult: AnalysisResultData; // Pass the original analysisResult for richer display
}

export function DataAnalysisCard({ data, analysisResult }: DataAnalysisCardProps) {
  if (!data || !analysisResult) return <p className="text-sm text-muted-foreground">No analysis data to display.</p>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{data.analysis?.title || analysisResult.title || "Data Analysis Result"}</CardTitle>
        <CardDescription>{data.analysis?.description || analysisResult.description || "Analysis performed on your data."}</CardDescription>
      </CardHeader>
      <CardContent>
        {(() => {
          if (data.result_type === "analysis_table" && data.analysis?.type === "table" && Array.isArray(data.analysis.data)) {
            const tableData = data.analysis.data as Record<string, any>[];
            const headers = tableData.length > 0 ? Object.keys(tableData[0]) : [];
            return (
              <>
                {headers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((header: string) => <TableHead key={header}>{header}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.slice(0, 10).map((row: Record<string, any>, rowIndex: number) => (
                        <TableRow key={rowIndex}>
                          {headers.map((header: string) => <TableCell key={header}>{String(row[header] ?? '')}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p>No data in table.</p>}
                {tableData.length > 10 && <p className="text-xs text-muted-foreground mt-2">Showing first 10 rows of {tableData.length} total.</p>}
              </>
            );
          } else if (data.result_type === "analysis_chart" && data.analysis?.chartSpec) {
            let IconComponent = BarChart;
            if (data.analysis.chartSpec?.mark === 'line') IconComponent = LineChart;
            if (data.analysis.chartSpec?.mark === 'arc') IconComponent = PieChart;
            return (
              <div className="flex flex-col items-center text-center p-4 border border-dashed rounded-md">
                <IconComponent className="h-12 w-12 text-primary mb-2" />
                <p className="text-sm font-medium">{data.analysis?.title || "Chart Data"}</p>
                <p className="text-xs text-muted-foreground">
                  {data.analysis?.description || `Chart type: ${data.analysis.chartSpec?.mark || 'Unknown'}`}
                </p>
                <details className="mt-2 text-left w-full">
                  <summary className="text-xs cursor-pointer">View Chart Specification (JSON)</summary>
                  <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-40 mt-1">
                    {JSON.stringify(data.analysis.chartSpec, null, 2)}
                  </pre>
                </details>
              </div>
            );
          } else if (data.result_type === "analysis_summary" && data.analysis?.type === "summary") {
            return <p className="text-sm whitespace-pre-wrap">{String(data.analysis.data) || "No summary available."}</p>;
          }
          return <p className="text-sm text-muted-foreground">Unsupported analysis data format for display.</p>;
        })()}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
    </Card>
  );
}