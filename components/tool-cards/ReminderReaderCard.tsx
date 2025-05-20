//components/tool-cards/ReminderReaderCard.tsx
"use client";

import { ReminderResult, ReminderInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRing, CalendarClock, AlertCircle, AlertTriangle, CheckCircle2, Info, ClockIcon } from "lucide-react";
import { formatDistanceToNowStrict, format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { logger } from "@/memory-framework/config"; // Import logger

// Helper function to get locale object dynamically (basic example)
const getLocaleObject = (localeCode?: string) => {
  if (!localeCode) return undefined;
  try {
    // This is a simplified way, in a real app you might need a more robust mapping
    // or ensure your build includes necessary date-fns locales.
    // Example: return require(`date-fns/locale/${localeCode}`); 
    // For client-side only, dynamic import might be an option or pre-bundling common locales.
    // For now, we'll log if it's not 'en' and rely on default date-fns behavior.
    if (localeCode.toLowerCase() !== 'en' && localeCode.toLowerCase() !== 'en-us') {
        logger.debug(`[ReminderCard] Non-default locale requested: ${localeCode}. Date formatting may use system default if locale pack not loaded.`);
    }
    return undefined; // Let date-fns handle system default or its internal fallbacks
  } catch (e) {
    logger.warn(`[ReminderCard] Could not load date-fns locale for ${localeCode}. Error:`, e);
    return undefined;
  }
};


interface ReminderItemProps { 
    reminder: ReminderInfo, 
    locale?: string,
    onMarkComplete?: (memoryId: string) => void; // Placeholder for future action
    onSnooze?: (memoryId: string) => void; // Placeholder
}

const ReminderItem: React.FC<ReminderItemProps> = ({ reminder, locale, onMarkComplete, onSnooze }) => {
    let triggerString = "Invalid Date";
    let relativeTimeString = "";
    const now = new Date();
    let triggerDateObject: Date | null = null;

    try {
        triggerDateObject = parseISO(reminder.trigger_datetime);
        if (!isNaN(triggerDateObject.getTime())) {
            const dateFnsLocale = getLocaleObject(locale);
            triggerString = format(triggerDateObject, "EEE, MMM d, yyyy 'at' h:mm a", { locale: dateFnsLocale });
            relativeTimeString = `(${formatDistanceToNowStrict(triggerDateObject, { addSuffix: true, locale: dateFnsLocale })})`;
        }
    } catch (e) {
        logger.error(`[ReminderItem] Error formatting reminder date: ${reminder.trigger_datetime}`, e);
    }
    // Calcule si le rappel est en retard
    const isActuallyOverdue = reminder.status === 'pending' && triggerDateObject && isPast(triggerDateObject);
    const recurrence = reminder.recurrence_rule ? ` (Repeats ${reminder.recurrence_rule})` : "";

    return (
        <li className={cn(
            "p-3 border rounded-lg transition-all hover:shadow-sm group", 
            isActuallyOverdue ? "border-destructive/60 bg-destructive/10" : "border-border",
            reminder.status === 'sent' && "opacity-70 bg-muted/50"
        )}>
            <p className={cn("font-medium text-sm text-foreground", reminder.status === 'sent' && "line-through text-muted-foreground")}> 
                {reminder.original_content}
            </p>
            <div className="text-xs mt-1.5 space-y-1">
                <p className={cn("flex items-center gap-1.5", isActuallyOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}> 
                    <CalendarClock size={13}/> Due: {triggerString} <span className="font-normal">{relativeTimeString}</span>
                </p>
                {recurrence && <p className="text-muted-foreground/80 text-[11px]">Repeats: {reminder.recurrence_rule}</p>}
                <p className="text-muted-foreground/70 text-[11px]">
                    Status: <span className={cn(
                        "font-medium",
                        reminder.status === 'pending' && isActuallyOverdue && "text-destructive",
                        reminder.status === 'sent' && "text-green-600",
                        reminder.status === 'error' && "text-destructive",
                        reminder.status === 'acknowledged' && "text-purple-600"
                    )}>{reminder.status}{isActuallyOverdue && reminder.status === 'pending' && " (Overdue)"}</span>
                     | ID: {reminder.memory_id.substring(0,6)}...
                </p>
            </div>
            {/* Actions (désactivées pour l'instant) */}
            {reminder.status === 'pending' && (
                <div className="mt-2 flex gap-2 items-center justify-end">
                    {/* <Button size="xs" variant="outline" className="text-xs h-6 px-2" onClick={() => onSnooze?.(reminder.memory_id)}> <ClockIcon size={12} className="mr-1"/> Snooze </Button> */}
                    {/* <Button size="xs" variant="default" className="text-xs h-6 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => onMarkComplete?.(reminder.memory_id)}> <CheckCircle2 size={12} className="mr-1"/> Done </Button> */}
                </div>
            )}
        </li>
    );
};

interface ReminderReaderCardProps { data: import("@/lib/types").ReminderResult; }

export function ReminderReaderCard({ data }: ReminderReaderCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No reminder data available.</p>;
  const userName = data.query?.context?.userName || "User";
  const userLocale = data.query?.context?.locale?.split("-")[0]; 

  const handleMarkComplete = (memoryId: string) => {
    logger.info(`[ReminderCard] TODO: Mark reminder ${memoryId} complete.`);
    // Call API to update reminder status
  };
  const handleSnooze = (memoryId: string) => {
    logger.info(`[ReminderCard] TODO: Snooze reminder ${memoryId}.`);
    // Call API to update reminder trigger time
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary"/>
            Reminders for {userName}
        </CardTitle>
        <CardDescription>
          {data.query?.daysAhead !== undefined ? 
            `Looking for reminders due in the next ${data.query.daysAhead === 0 ? '24 hours' : `${data.query.daysAhead} day(s)`}.` 
            : "Showing current reminders."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={18}/> 
                <div>
                    <p className="font-medium">Error Fetching Reminders</p>
                    <p className="text-xs">{data.error}</p>
                </div>
            </div>
        )}
        {!data.error && data.reminders && data.reminders.length > 0 ? (
          <ScrollArea className={cn("max-h-80", data.reminders.length > 3 && "pr-2")}>
            <ul className="space-y-2.5">
              {data.reminders.map(reminder => (
                <ReminderItem 
                    key={reminder.memory_id} 
                    reminder={reminder} 
                    locale={userLocale}
                    onMarkComplete={handleMarkComplete}
                    onSnooze={handleSnooze}
                />
              ))}
            </ul>
          </ScrollArea>
        ) : (
          !data.error && 
            <div className="text-center py-6 text-muted-foreground">
                <Info size={24} className="mx-auto mb-2 opacity-50"/>
                <p className="text-sm">No pending reminders found for {userName} in this timeframe.</p>
            </div>
        )}
      </CardContent>
      {data.reminders && data.reminders.length > 0 && (
        <CardFooter className="text-xs text-muted-foreground justify-center pt-3 border-t">
            Displaying {data.reminders.length} reminder(s).
        </CardFooter>
      )}
    </Card>
  );
}