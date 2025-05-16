//components/tool-cards/WaterIntakeCard.tsx
"use client";

import { WaterIntakeStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Droplet, ListPlus, AlertCircle, CheckCircle2 } from "lucide-react";

interface WaterIntakeCardProps { data: WaterIntakeStructuredOutput; }

export function WaterIntakeCard({ data }: WaterIntakeCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No water intake data.</p>;
  const userName = data.query?.context?.userName || "User";

  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-primary"/>
            Water Intake
        </CardTitle>
        <CardDescription>For {userName} on {data.date || "selected date"}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {data.status === "error" && data.errorMessage && (
            <p className="text-destructive flex items-center gap-1"><AlertCircle size={16}/> {data.errorMessage}</p>
        )}
        {data.status === "logged" && (
            <>
                <p className="text-green-600 flex items-center gap-1"><CheckCircle2 size={16}/> Logged: {data.amountLoggedMl}ml</p>
                {data.totalTodayMl !== undefined && <p>Today's Total: {data.totalTodayMl}ml (~{data.totalTodayOz}oz)</p>}
            </>
        )}
        {data.status === "retrieved_total" && (
            <>
                <p>Total Logged: {data.totalQueriedMl}ml (~{data.totalQueriedOz}oz)</p>
            </>
        )}
         {data.message && data.status !== "error" && <p className="text-xs text-muted-foreground mt-2">{data.message}</p>}
      </CardContent>
    </Card>
  );
}