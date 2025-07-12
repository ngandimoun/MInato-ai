//app/games/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

type TabValue = "library" | "active" | "invites" | "stats" | "leaderboards" | "quests" | "tournaments" | "ai-coach" | "settings";
type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub";

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

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab') as TabValue;
    if (tab && ['library', 'active', 'invites', 'stats', 'leaderboards', 'quests', 'tournaments', 'ai-coach', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleViewChange = (view: View) => {
    if (view === "games") {
      // Already on games page, do nothing
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
      // Navigate to chat page with the specified view
      navigateWithLoading(`/chat?view=${view}`, `Loading ${view}...`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="glass-card max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access Minato AI Games and compete with friends!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background z-[-1]" />

      <Header currentView="games" onViewChange={handleViewChange} />

      <div className="flex-1 pt-16 md:pt-20">
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          {/* Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
            <div className="relative container max-w-6xl mx-auto px-4 py-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Gamepad2 className="w-8 h-8 text-primary" />
                  </div>
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-emerald-400 to-pink-500 bg-clip-text text-transparent mb-4">
                  Minato AI Games
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                  Challenge your mind with AI-powered trivia, compete with friends, and climb the leaderboards 
                  in our collection of intelligent games.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Zap className="w-4 h-4 mr-1" />
                    AI-Powered Questions
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Users className="w-4 h-4 mr-1" />
                    Multiplayer Battles
                  </Badge>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Trophy className="w-4 h-4 mr-1" />
                    Leaderboards & XP
                  </Badge>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Main Content */}
          <div className="container max-w-6xl mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-6">
                <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9 max-w-6xl mx-auto bg-muted/50 border border-border/50">
                  <TabsTrigger value="library" className="relative">
                    <Gamepad2 className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Library</span>
                    <span className="sm:hidden">Play</span>
                  </TabsTrigger>
                  <TabsTrigger value="active" className="relative">
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Active</span>
                    <span className="sm:hidden">Live</span>
                  </TabsTrigger>
                  <TabsTrigger value="tournaments" className="relative">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Tournaments</span>
                    <span className="sm:hidden">Tour</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-coach" className="relative">
                    <Brain className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">AI Coach</span>
                    <span className="sm:hidden">Coach</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="relative">
                    <Settings className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Settings</span>
                    <span className="sm:hidden">Prefs</span>
                  </TabsTrigger>
                  <TabsTrigger value="invites" className="relative lg:flex hidden">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Invites</span>
                    <span className="sm:hidden">Join</span>
                  </TabsTrigger>
                  <TabsTrigger value="quests" className="relative lg:flex hidden">
                    <Target className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Quests</span>
                    <span className="sm:hidden">Daily</span>
                  </TabsTrigger>
                  <TabsTrigger value="leaderboards" className="relative lg:flex hidden">
                    <Crown className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Ranks</span>
                    <span className="sm:hidden">Top</span>
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="relative lg:flex hidden">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Stats</span>
                    <span className="sm:hidden">Me</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="library" className="space-y-6">
                  <GameLibrary />
                </TabsContent>

                <TabsContent value="active" className="space-y-6">
                  <ActiveGames />
                </TabsContent>

                <TabsContent value="tournaments" className="space-y-6">
                  <Tournaments />
                </TabsContent>

                <TabsContent value="ai-coach" className="space-y-6">
                  <AICoach />
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <GameSettings />
                </TabsContent>

                <TabsContent value="invites" className="space-y-6">
                  <GameInvites />
                </TabsContent>

                <TabsContent value="quests" className="space-y-6">
                  <DailyQuests />
                </TabsContent>

                <TabsContent value="leaderboards" className="space-y-6">
                  <Leaderboards />
                </TabsContent>

                <TabsContent value="stats" className="space-y-6">
                  <GameStats />
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
} 