//components/tool-cards/HabitTrackerCard.tsx
"use client";

import { HabitTrackerStructuredOutput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, ListChecks, AlertCircle } from "lucide-react"; // Example icons

interface HabitTrackerCardProps { data: HabitTrackerStructuredOutput; }

export function HabitTrackerCard({ data }: HabitTrackerCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No habit data available.</p>;

  const renderContent = () => {
    if (data.status === "error" && data.errorMessage) {
      return <p className="text-destructive text-sm flex items-center gap-1"><AlertCircle size={16}/> {data.errorMessage}</p>;
    }
    if (data.action === "log" || data.action === "check") {
      return (
        <>
          <p className="text-sm"><strong>Habit:</strong> {data.habit || "N/A"}</p>
          <p className="text-sm"><strong>Date:</strong> {data.date || "N/A"}</p>
          <p className="text-sm"><strong>Status:</strong> {data.message || data.status}</p>
          {data.status === "logged" && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={16}/>Logged successfully!</p>}
          {data.status === "already_logged" && <p className="text-amber-600 text-sm flex items-center gap-1"><CheckCircle size={16}/>Already logged.</p>}
          {data.status === "completed" && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={16}/>Completed!</p>}
          {data.status === "not_completed" && <p className="text-sm">Not yet logged.</p>}
        </>
      );
    }
    if (data.action === "status" && data.loggedHabits) {
      const habits = Object.entries(data.loggedHabits);
      if (habits.length === 0) return <p className="text-sm">No habits logged for {data.period || "this period"}.</p>;
      return (
        <ul className="space-y-1 text-sm max-h-60 overflow-y-auto">
          {habits.map(([habitName, dates]) => (
            <li key={habitName}>
              <strong>{habitName}:</strong> Completed {dates.length} time(s)
              {data.period !== "today" && dates.length > 0 && ` (Last: ${dates[0]})`}
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm">{data.message || "Habit tracker updated."}</p>;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary"/>
            Habit Tracker
        </CardTitle>
        <CardDescription>Action: {data.action}{data.period && `, Period: ${data.period}`}</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}