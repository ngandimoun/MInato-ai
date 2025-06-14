//components/tool-cards/ReminderReaderCard.tsx
"use client";

import { ReminderResult, ReminderInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRing, CalendarClock, AlertCircle, AlertTriangle, CheckCircle2, Info, ClockIcon, Sparkles } from "lucide-react";
import { formatDistanceToNowStrict, format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { logger } from "@/memory-framework/config"; 
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

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
    onMarkComplete?: (memoryId: string) => void; 
    onSnooze?: (memoryId: string) => void;
    index: number;
}

const ReminderItem: React.FC<ReminderItemProps> = ({ reminder, locale, onMarkComplete, onSnooze, index }) => {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    
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
    
    // Calculate if reminder is overdue
    const isActuallyOverdue = reminder.status === 'pending' && triggerDateObject && isPast(triggerDateObject);
    const recurrence = reminder.recurrence_rule ? ` (Repeats ${reminder.recurrence_rule})` : "";

    // Animation for snooze/done buttons when dragging
    const dragConstraints = { left: 0, right: 80 };
    
    const handleMarkCompleteClick = () => {
        onMarkComplete?.(reminder.memory_id);
        toast({
            title: "Reminder completed! 🎉",
            description: "Well done!",
            duration: 3000,
        });
    };

    const getPriorityColor = () => {
        if (isActuallyOverdue) return "from-red-500/20 to-red-400/10"; 
        if (reminder.status === 'sent') return "from-green-500/20 to-green-400/10";
        return "from-cyan-500/20 to-cyan-400/10";
    };

    return (
        <motion.li
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, ease: 'easeOut' }}
            className="relative"
        >
            <motion.div
                drag="x"
                dragConstraints={dragConstraints}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                className={cn(
                    "glass-card relative p-3 my-2 first:mt-0 last:mb-0 rounded-xl transition-all", 
                    isActuallyOverdue && "border-destructive/40",
                    isActuallyOverdue && "minato-glow",
                    reminder.status === 'sent' && "opacity-70 bg-muted/50"
                )}
            >
                {/* Left accent - pulsing if overdue */}
                <span className={cn(
                    "card-accent-left",
                    getPriorityColor(),
                    isActuallyOverdue && "animate-pulse"
                )}/>
                
                {/* Top accent (mobile) */}
                <span className={cn(
                    "card-accent-top",
                    getPriorityColor(),
                    isActuallyOverdue && "animate-pulse"
                )}/>
                
                <p className={cn(
                    "font-medium text-sm text-foreground", 
                    reminder.status === 'sent' && "line-through text-muted-foreground"
                )}> 
                    {reminder.original_content}
                </p>
                <div className="text-xs mt-1.5 space-y-1">
                    <p className={cn(
                        "flex items-center gap-1.5", 
                        isActuallyOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                    )}> 
                        <CalendarClock size={13}/> Due: {triggerString} <span className="font-normal">{relativeTimeString}</span>
                    </p>
                    {recurrence && <p className="text-muted-foreground/80 text-[11px]">Repeats: {reminder.recurrence_rule}</p>}
                    <p className="text-muted-foreground/70 text-[11px]">
                        Status: <span className={cn(
                            "memory-chip font-medium inline-block",
                            reminder.status === 'pending' && isActuallyOverdue && "status-overdue",
                            reminder.status === 'sent' && "status-latest",
                            reminder.status === 'error' && "status-overdue",
                            reminder.status === 'acknowledged' && "bg-purple-500/10 text-purple-600"
                        )}>{reminder.status}{isActuallyOverdue && reminder.status === 'pending' && " (Overdue)"}</span>
                    </p>
                </div>
                
                {/* Visible actions for pending reminders */}
                {reminder.status === 'pending' && (
                    <div className="mt-2 flex gap-2 items-center justify-end">
                        <Button 
                            size="sm"
                            variant="outline" 
                            className="text-xs h-6 px-2 opacity-80 hover:opacity-100" 
                            onClick={() => onSnooze?.(reminder.memory_id)}
                        > 
                            <ClockIcon size={12} className="mr-1"/> Snooze 
                        </Button>
                        <Button 
                            size="sm"
                            variant="default" 
                            className="text-xs h-6 px-2 bg-green-600 hover:bg-green-700 text-white" 
                            onClick={handleMarkCompleteClick}
                        > 
                            <CheckCircle2 size={12} className="mr-1"/> Done 
                        </Button>
                    </div>
                )}
            </motion.div>
            
            {/* Drag indicators - slide actions */}
            <motion.div 
                className="absolute top-0 right-0 bottom-0 flex items-center bg-muted rounded-r-xl overflow-hidden"
                style={{ width: isDragging ? 80 : 0 }}
                initial={false}
                animate={{ width: isDragging ? 80 : 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
            >
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-full rounded-none w-full text-green-600 hover:text-green-700 hover:bg-green-100/30"
                    onClick={handleMarkCompleteClick}
                >
                    <CheckCircle2 size={16} />
                </Button>
            </motion.div>
        </motion.li>
    );
};

interface ReminderReaderCardProps { data: import("@/lib/types").ReminderResult; }

export function ReminderReaderCard({ data }: ReminderReaderCardProps) {
  if (!data) return <p className="text-sm text-muted-foreground">No reminder data available.</p>;
  const userName = data.query?.context?.userName || "User";
  const userLocale = data.query?.context?.locale?.split("-")[0]; 
  const { toast } = useToast();

  const handleMarkComplete = (memoryId: string) => {
    logger.info(`[ReminderCard] TODO: Mark reminder ${memoryId} complete.`);
    // Call API to update reminder status
    toast({
        title: "Reminder marked complete! 🎉",
        description: "Great job completing your task!",
        duration: 3000,
    });
  };
  
  const handleSnooze = (memoryId: string) => {
    logger.info(`[ReminderCard] TODO: Snooze reminder ${memoryId}.`);
    // Call API to update reminder trigger time
    toast({
        title: "Reminder snoozed ⏰",
        description: "I'll remind you again later",
        duration: 2000,
    });
  };


  return (
    <Card className="w-full glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex items-center"
            >
                <BellRing className="h-5 w-5 text-cyan-500 mr-1"/>
                <Sparkles className="h-3 w-3 text-cyan-400" />
            </motion.div>
            <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                Reminders
            </motion.span>
        </CardTitle>
        <CardDescription className="flex items-center text-xs">
          <span className="font-medium">
            {data.query?.daysAhead !== undefined ? 
              `Next ${data.query.daysAhead === 0 ? '24 hours' : `${data.query.daysAhead} day(s)`}` 
              : "Current reminders"}
          </span>
          <span className="mx-1.5">•</span>
          <span className="italic">For {userName}</span>
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
          <ScrollArea className="h-[30vh] md:h-80 pr-2 custom-scrollbar">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.reminders.map((reminder, index) => (
                <ReminderItem 
                    key={reminder.memory_id} 
                    reminder={reminder} 
                    locale={userLocale}
                    onMarkComplete={handleMarkComplete}
                    onSnooze={handleSnooze}
                    index={index}
                />
              ))}
            </ul>
          </ScrollArea>
        ) : (
          !data.error && 
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg"
            >
                <Info size={24} className="mx-auto mb-2 opacity-50"/>
                <p className="text-sm">No pending reminders for {userName}.</p>
            </motion.div>
        )}
      </CardContent>
      {data.reminders && data.reminders.length > 0 && (
        <CardFooter className="text-xs text-muted-foreground justify-center pt-2 pb-3 border-t">
            <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70">Found {data.reminders.length} reminder(s)</span>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs flex gap-1 items-center"
                >
                    <ClockIcon className="h-3 w-3" /> New reminder
                </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}