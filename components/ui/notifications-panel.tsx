"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Loader2, CheckCircle2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll every 30s (or use SWR for revalidation)
  useEffect(() => {
    let isMounted = true;
    async function fetchNotifications() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/notifications/subscribe");
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const data = await res.json();
        if (isMounted) {
          setReminders(data.reminders || []);
          setSuggestions(data.suggestions || []);
        }
      } catch (e: any) {
        setError(e.message || "Error loading notifications");
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-background border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col h-[calc(100vh-6.5rem)] w-[350px] max-w-full"
    >
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notifications
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onClose}
        >
          <span className="sr-only">Close</span>✕
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}
            {!loading && !error && reminders.length === 0 && suggestions.length === 0 && (
              <div className="text-muted-foreground text-sm text-center py-8">
                No notifications or reminders yet!
              </div>
            )}
            {reminders.map((reminder) => (
              <Card key={reminder.memory_id} className="flex items-center gap-3 p-3">
                <CheckCircle2 className="text-green-500" />
                <div>
                  <div className="font-medium">{reminder.content}</div>
                  {reminder.metadata?.reminder_details?.due_at && (
                    <div className="text-xs text-muted-foreground">
                      Due: {new Date(reminder.metadata.reminder_details.due_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="ml-auto">
                  Reminder
                </Badge>
              </Card>
            ))}
            {suggestions.map((s, i) => (
              <Card key={i} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20">
                <Lightbulb className="text-yellow-500" />
                <div>
                  <div className="font-medium">{s.message}</div>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Suggestion
                </Badge>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
} 