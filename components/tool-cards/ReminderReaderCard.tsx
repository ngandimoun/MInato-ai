//components/tool-cards/ReminderReaderCard.tsx
"use client";

import { ReminderResult, ReminderInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BellRing, CalendarClock, AlertCircle } from "lucide-react";
import { formatDistanceToNowStrict, format } from "date-fns";


interface ReminderReaderCardProps { data: ReminderResult; }

export function ReminderReaderCard({ data }: ReminderReaderCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No reminder data available.</p>;
  const userName = data.query?.context?.userName || "User";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary"/>
            Pending Reminders for {userName}
        </CardTitle>
        <CardDescription>
          {data.query?.daysAhead !== undefined ? `Looking ahead ${data.query.daysAhead} day(s).` : "Showing current reminders."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.error && <p className="text-destructive text-sm flex items-center gap-1"><AlertCircle size={16}/> {data.error}</p>}
        {!data.error && data.reminders && data.reminders.length > 0 ? (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {data.reminders.map(reminder => {
                let triggerString = "Invalid Date";
                let relativeTimeString = "";
                try {
                    const triggerDate = new Date(reminder.trigger_datetime);
                    if (!isNaN(triggerDate.getTime())) {
                        triggerString = format(triggerDate, "MMM d, yyyy h:mm a");
                        relativeTimeString = ` (${formatDistanceToNowStrict(triggerDate, { addSuffix: true })})`;
                    }
                } catch {}
                const recurrence = reminder.recurrence_rule ? ` (Repeats ${reminder.recurrence_rule})` : "";
                return (
                    <li key={reminder.memory_id} className="p-2 border rounded-md text-sm">
                        <p className="font-medium">{reminder.original_content}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <CalendarClock size={12}/> Due: {triggerString}{relativeTimeString}{recurrence}
                        </p>
                        <p className="text-xs text-muted-foreground/70">ID: {reminder.memory_id.substring(0,6)}... | Status: {reminder.status}</p>
                    </li>
                );
            })}
          </ul>
        ) : (
          !data.error && <p className="text-sm text-muted-foreground text-center py-4">No pending reminders found for {userName}.</p>
        )}
      </CardContent>
    </Card>
  );
}