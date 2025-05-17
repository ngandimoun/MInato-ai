// FILE: components/header.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Settings, Brain, Bell } from "lucide-react"; // Removed Phone icon
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationsPanel } from "@/components/ui/notifications-panel";
import { useAuth } from "@/context/auth-provider"; // Optional for user info

type View = "chat" | "settings" | "memory"; // "call" view is removed

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { user, profile } = useAuth(); // Optional
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifCount, setNotifCount] = React.useState(0);

  React.useEffect(() => {
    // Notification count fetching logic (remains the same)
    let isMounted = true;
    async function fetchNotifCount() {
      try {
        const res = await fetch("/api/notifications/subscribe");
        if (!res.ok) throw new Error("Failed to fetch notifications");
        const data = await res.json();
        const count = (data.reminders?.length || 0) + (data.suggestions?.length || 0);
        if (isMounted) setNotifCount(count);
      } catch {
        if (isMounted) setNotifCount(0);
      }
    }
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const navItems: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: "chat", icon: <MessageSquare size={20} />, label: "Chat" },
    // { id: "call", icon: <Phone size={20} />, label: "Call" }, // REMOVED
    { id: "memory", icon: <Brain size={20} />, label: "Memory" },
    { id: "settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center space-x-2">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="font-semibold text-lg text-foreground flex items-center gap-2"
            >
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-pink-500 bg-clip-text text-transparent font-bold">
                Minato
              </span>
            </motion.div>
          </div>

          <nav className="flex-1 flex justify-center">
            <ul className="flex space-x-1 sm:space-x-2 bg-muted/50 border border-border/50 p-1 rounded-full">
              {navItems.map((item) => (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    size="sm" 
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "relative flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors h-8", 
                      "hover:bg-background/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring", 
                      currentView === item.id
                        ? "text-primary bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground" 
                    )}
                  >
                    {item.icon}
                    <span className="sr-only sm:not-sr-only sm:ml-1.5 hidden md:inline">
                      {item.label}
                    </span>
                    {currentView === item.id && (
                      <motion.div
                        layoutId="activeTabIndicator" 
                        className="absolute inset-0 bg-primary/10 rounded-full -z-10" 
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center space-x-2">
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full text-xs w-5 h-5 flex items-center justify-center border-2 border-background animate-bounce">
                      {notifCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="p-0 w-[350px] max-w-full border-none shadow-none bg-transparent">
                <NotificationsPanel onClose={() => setNotifOpen(false)} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}