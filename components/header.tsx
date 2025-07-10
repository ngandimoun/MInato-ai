// FILE: components/header.tsx
"use client"

import React, { createContext } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Settings, Brain, Bell, ShoppingBag, Gamepad2, Mic, BarChart3, Menu, X, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NotificationsPanel } from "@/components/ui/notifications-panel"
import { useAuth } from "@/context/auth-provider"
import { ModeToggle } from "@/components/mode-toggle"

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub"; // Added listening, insights, and creation-hub views

interface HeaderProps {
  currentView: View
  onViewChange: (view: View) => void
}

interface NotificationContextType {
  notifCount: number
  setNotifCount: React.Dispatch<React.SetStateAction<number>>
  decrementCount: () => void
}

export const NotificationContext = createContext<NotificationContextType>({
  notifCount: 0,
  setNotifCount: () => {},
  decrementCount: () => {},
})

export function Header({ currentView, onViewChange }: HeaderProps) {
  const { user, profile } = useAuth()
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [notifCount, setNotifCount] = React.useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Function to decrement count immediately for optimistic updates
  const decrementCount = () => {
    setNotifCount((prevCount) => Math.max(0, prevCount - 1))
  }

  // Function to fetch notification count
  const fetchNotifCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/subscribe")
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const data = await res.json()
      const count = (data.reminders?.length || 0) + (data.suggestions?.length || 0)
      setNotifCount(count)
    } catch {
      setNotifCount(0)
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    fetchNotifCount()

    const interval = setInterval(() => {
      if (isMounted) fetchNotifCount()
    }, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [fetchNotifCount])

  const navItems: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: "chat", icon: <MessageSquare size={20} />, label: "Chat" },
    { id: "memory", icon: <Brain size={20} />, label: "Memory" },
    { id: "creation-hub", icon: <Palette size={20} />, label: "Creation" }, // Added Creation Hub nav item
   // { id: "insights", icon: <BarChart3 size={20} />, label: "Insights" }, // Added Insights nav item
    { id: "listening", icon: <Mic size={20} />, label: "Listening" }, // Added Listening nav item
    { id: "games", icon: <Gamepad2 size={20} />, label: "Games" }, // Added Games nav item
    { id: "dashboard", icon: <ShoppingBag size={20} />, label: "Dashboard" }, // Added Dashboard nav item
    { id: "settings", icon: <Settings size={20} />, label: "Settings" },
  ]

  const handleMobileNavClick = (view: View) => {
    onViewChange(view)
    setMobileMenuOpen(false)
  }

  // Context value
  const notificationContextValue = {
    notifCount,
    setNotifCount,
    decrementCount,
  }

  return (
    <NotificationContext.Provider value={notificationContextValue}>
      <header className="fixed top-0 left-0 right-0 z-20 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
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

            {/* Desktop Navigation */}
            <nav className="hidden md:flex flex-1 justify-center">
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
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.icon}
                      <span className="sr-only sm:not-sr-only sm:ml-1.5 hidden lg:inline">{item.label}</span>
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

            {/* Right side actions */}
            <div className="flex items-center space-x-2">
              <ModeToggle />

              {/* Notifications */}
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
                  <NotificationsPanel onClose={() => setNotifOpen(false)} onCountChange={fetchNotifCount} />
                </PopoverContent>
              </Popover>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t border-border bg-background/95 backdrop-blur-md"
            >
              <div className="container max-w-5xl mx-auto px-4 py-4">
                <motion.nav
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  exit={{ y: -20 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <ul className="space-y-2">
                    {navItems.map((item, index) => (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleMobileNavClick(item.id)}
                          className={cn(
                            "w-full justify-start rounded-lg px-4 py-3 text-left transition-colors",
                            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            currentView === item.id
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="mr-3">{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                          {currentView === item.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto w-2 h-2 bg-primary rounded-full"
                            />
                          )}
                        </Button>
                      </motion.li>
                    ))}
                  </ul>
                </motion.nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </NotificationContext.Provider>
  )
}
