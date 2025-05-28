"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Loader2, CheckCircle2, Lightbulb, Clock, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Reminder {
  memory_id: string;
  content: string;
  read: boolean;
  metadata?: {
    reminder_details?: {
      due_at: string;
    };
  };
}

interface Suggestion {
  id: string;
  message: string;
  read: boolean;
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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
          // Add read property if it doesn't exist
          const processedReminders = (data.reminders || []).map((r: any) => ({
            ...r,
            read: r.read || false
          }));
          
          const processedSuggestions = (data.suggestions || []).map((s: any, i: number) => ({
            ...s,
            id: s.id || `suggestion-${i}`,
            read: s.read || false
          }));
          
          setReminders(processedReminders);
          setSuggestions(processedSuggestions);
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

  const markAsRead = async (type: 'reminder' | 'suggestion', id: string) => {
    try {
      // Optimistically update UI
      if (type === 'reminder') {
        setReminders(prev => 
          prev.map(r => r.memory_id === id ? {...r, read: true} : r)
        );
      } else {
        setSuggestions(prev => 
          prev.map(s => s.id === id ? {...s, read: true} : s)
        );
      }
      
      // Update on server
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const snoozeNotification = async (type: 'reminder' | 'suggestion', id: string, duration: number) => {
    try {
      // Optimistically update UI by removing the snoozed item
      if (type === 'reminder') {
        setReminders(prev => prev.filter(r => r.memory_id !== id));
      } else {
        setSuggestions(prev => prev.filter(s => s.id !== id));
      }
      
      // Update on server
      await fetch("/api/notifications/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, duration }),
      });
      
      toast({
        title: "Notification snoozed",
        description: `You'll be reminded again in ${duration} minutes`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to snooze notification",
        variant: "destructive",
      });
    }
  };

  const dismissNotification = async (type: 'reminder' | 'suggestion', id: string) => {
    try {
      // Optimistically update UI
      if (type === 'reminder') {
        setReminders(prev => prev.filter(r => r.memory_id !== id));
      } else {
        setSuggestions(prev => prev.filter(s => s.id !== id));
      }
      
      // Update on server
      await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to dismiss notification",
        variant: "destructive",
      });
    }
  };

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
              <Card 
                key={reminder.memory_id} 
                className={`flex items-start gap-3 p-3 transition-colors duration-200 hover:bg-muted/50 cursor-pointer ${!reminder.read ? 'border-l-4 border-l-primary' : ''}`}
                onClick={() => markAsRead('reminder', reminder.memory_id)}
              >
                <CheckCircle2 className="text-green-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className={`font-medium ${!reminder.read ? 'font-semibold' : ''}`}>
                    {reminder.content}
                  </div>
                  {reminder.metadata?.reminder_details?.due_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(reminder.metadata.reminder_details.due_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 items-center ml-auto">
                  <Badge variant="secondary" className="flex-shrink-0">
                    Reminder
                  </Badge>
                  <div className="flex flex-col gap-1 ml-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification('reminder', reminder.memory_id);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Dismiss</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>Dismiss</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <DropdownMenu>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="sr-only">Snooze</span>
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Snooze</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          snoozeNotification('reminder', reminder.memory_id, 15);
                        }}>
                          15 minutes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          snoozeNotification('reminder', reminder.memory_id, 60);
                        }}>
                          1 hour
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          snoozeNotification('reminder', reminder.memory_id, 1440); // 24 hours
                        }}>
                          Tomorrow
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
            {suggestions.map((suggestion) => (
              <Card 
                key={suggestion.id} 
                className={`flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 transition-colors duration-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 cursor-pointer ${!suggestion.read ? 'border-l-4 border-l-yellow-500' : ''}`}
                onClick={() => markAsRead('suggestion', suggestion.id)}
              >
                <Lightbulb className="text-yellow-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className={`font-medium ${!suggestion.read ? 'font-semibold' : ''}`}>
                    {suggestion.message}
                  </div>
                </div>
                <div className="flex gap-1 items-center ml-auto">
                  <Badge variant="outline" className="flex-shrink-0">
                    Suggestion
                  </Badge>
                  <div className="flex flex-col gap-1 ml-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification('suggestion', suggestion.id);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Dismiss</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>Dismiss</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
} 