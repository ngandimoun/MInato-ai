"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GameLibrary from "@/components/games/game-library";
import ActiveGames from "@/components/games/active-games";
import { GameInvites } from "@/components/games/game-invites";
import { GameStats } from "@/components/games/game-stats";
import { Leaderboards } from "@/components/games/leaderboards";
import { DailyQuests } from "@/components/games/daily-quests";
import Tournaments from "@/components/games/tournaments";
import AICoach from "@/components/games/ai-coach";
import GameSettings from "@/components/games/game-settings";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Trophy, Users, Zap, Sparkles, Target, Crown, Brain, Settings } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useNavigation } from "@/context/navigation-context";
import { Suspense } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

type TabValue = "library" | "active" | "invites" | "stats" | "leaderboards" | "quests" | "tournaments" | "ai-coach" | "settings";
type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub";

const FloatingParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-primary/30 to-accent/30 blur-sm"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, -10, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5"
        animate={{
          background: [
            "linear-gradient(135deg, rgb(59 130 246 / 0.05) 0%, rgb(147 51 234 / 0.1) 50%, rgb(236 72 153 / 0.05) 100%)",
            "linear-gradient(135deg, rgb(147 51 234 / 0.05) 0%, rgb(236 72 153 / 0.1) 50%, rgb(59 130 246 / 0.05) 100%)",
            "linear-gradient(135deg, rgb(236 72 153 / 0.05) 0%, rgb(59 130 246 / 0.1) 50%, rgb(147 51 234 / 0.05) 100%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
    </div>
  );
};

export default function GamesPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <GamesPage />
    </Suspense>
  );
}

function GamesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("library");
  const { user, profile } = useAuth();
  const { navigateWithLoading } = useNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab') as TabValue;
    if (tab && ['library', 'active', 'invites', 'stats', 'leaderboards', 'quests', 'tournaments', 'ai-coach', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleViewChange = (view: View) => {
    if (view === "games") {
      return;
    } else if (view === "dashboard") {
      navigateWithLoading("/dashboard", "Loading dashboard...");
    } else if (view === "listening") {
      navigateWithLoading("/listening", "Loading listening...");
    } else if (view === "insights") {
      navigateWithLoading("/insights", "Loading insights...");
    } else if (view === "creation-hub") {
      navigateWithLoading("/creation-hub", "Loading creation hub...");
    } else {
      navigateWithLoading(`/chat?view=${view}`, `Loading ${view}...`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass-card max-w-md">
            <CardHeader className="text-center">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Gamepad2 className="w-8 h-8 text-primary" />
              </motion.div>
              <CardTitle className="text-2xl">Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to access Minato AI Games and compete with friends!
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-background overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />
      <Header currentView="games" onViewChange={handleViewChange} />

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-6xl h-full max-h-[calc(100vh-5rem)] bg-card border rounded-sm shadow-lg flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Panel Header with all original animations restored */}
          <div className="relative overflow-hidden border-b h-20">
            <AnimatedBackground />
            <FloatingParticles />
            <div className="relative container max-w-6xl mx-auto h-full flex items-center justify-between px-4">

              {/* PARTIE GAUCHE : Identité */}
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 bg-primary/10 rounded-full backdrop-blur-sm flex items-center justify-center w-10 h-10"
                  animate={{ rotate: [0, 360], scale: [1, 1.05, 1] }}
                  transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
                >
                  <Gamepad2 className="w-5 h-5 text-primary" />
                </motion.div>
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                  </motion.div>

                <motion.h1
                  className="text-2xl font-bold"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  <motion.span
                    className="bg-gradient-to-r from-primary via-emerald-400 to-pink-500 bg-clip-text text-transparent"
                    animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    style={{ backgroundSize: "200% 200%" }}
                  >
                    Minato AI Games
                  </motion.span>
                </motion.h1>
              </div>

              {/* PARTIE DROITE : Fonctionnalités clés (Badges) */}
              <motion.div
                className="hidden md:flex flex-wrap justify-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                {[
                  { icon: Zap, text: "AI-Powered Questions", delay: 0.1 },
                  { icon: Users, text: "Multiplayer Battles", delay: 0.2 },
                  { icon: Trophy, text: "Leaderboards & XP", delay: 0.3 },
                ].map((badge) => (
                  <motion.div
                    key={badge.text}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 + badge.delay }}
                    whileHover={{ scale: 1.05, y: -2, transition: { duration: 0.2 } }}
                  >
                    <Badge variant="secondary" className="text-xs px-3 py-1.5 backdrop-blur-sm">
                      <badge.icon className="w-4 h-4 mr-2" />
                      {badge.text}
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Panel Content (Scrollable) */}
          <ScrollArea className="h-[700px]">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <TabsList className="grid w-full grid-cols-9 lg:grid-cols-9 max-w-6xl mx-auto bg-muted/50 border border-border/50 backdrop-blur-sm">
                    {[
                      { value: "library", icon: Gamepad2, label: "Library", shortLabel: "Play" },
                      { value: "active", icon: Zap, label: "Active", shortLabel: "Live" },
                      { value: "tournaments", icon: Trophy, label: "Tournaments", shortLabel: "Tour" },
                      { value: "ai-coach", icon: Brain, label: "AI Coach", shortLabel: "Coach" },
                      { value: "settings", icon: Settings, label: "Settings", shortLabel: "Prefs" },
                      { value: "invites", icon: Users, label: "Invites", shortLabel: "Join" },
                      { value: "quests", icon: Target, label: "Quests", shortLabel: "Daily" },
                      { value: "leaderboards", icon: Crown, label: "Ranks", shortLabel: "Top" },
                      { value: "stats", icon: Trophy, label: "Stats", shortLabel: "Me" },
                    ].map((tab, index) => (
                      <motion.div
                        key={tab.value}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                        whileHover={{ y: -1 }}
                      >
                        <TabsTrigger
                          value={tab.value}
                          className="relative transition-all duration-200 hover:bg-primary/10"
                        >
                          <motion.div
                            className="flex items-center gap-1"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            <tab.icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="hidden">{tab.shortLabel}</span>
                          </motion.div>
                          {activeTab === tab.value && (
                            <motion.div
                              className="absolute inset-0 bg-primary/10 rounded-md -z-10"
                              layoutId="activeGameTab"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                        </TabsTrigger>
                      </motion.div>
                    ))}
                  </TabsList>
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TabsContent value="library" className="space-y-6 mt-0">
                      <GameLibrary />
                    </TabsContent>
                    <TabsContent value="active" className="space-y-6 mt-0">
                      <ActiveGames />
                    </TabsContent>
                    <TabsContent value="tournaments" className="space-y-6 mt-0">
                      <Tournaments />
                    </TabsContent>
                    <TabsContent value="ai-coach" className="space-y-6 mt-0">
                      <AICoach />
                    </TabsContent>
                    <TabsContent value="settings" className="space-y-6 mt-0">
                      <GameSettings />
                    </TabsContent>
                    <TabsContent value="invites" className="space-y-6 mt-0">
                      <GameInvites />
                    </TabsContent>
                    <TabsContent value="quests" className="space-y-6 mt-0">
                      <DailyQuests />
                    </TabsContent>
                    <TabsContent value="leaderboards" className="space-y-6 mt-0">
                      <Leaderboards />
                    </TabsContent>
                    <TabsContent value="stats" className="space-y-6 mt-0">
                      <GameStats />
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </main>
  );
}