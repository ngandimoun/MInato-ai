"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider";
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { EnhancedTherapyMemoryIntegration } from '@/lib/core/therapy-memory-integration';
import { 
  ArrowLeft, 
  Sun, 
  Cloud, 
  CloudRain, 
  Snowflake,
  Wind,
  Zap,
  Heart,
  Brain,
  Sparkles,
  Calendar,
  TrendingUp,
  Star,
  Award,
  Target,
  Clock,
  MessageSquare,
  Book,
  Lightbulb
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub" | "escape";

interface EmotionalWeatherEntry {
  id: string;
  date: string;
  weather_type: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'windy';
  mood_rating: number;
  energy_level: number;
  stress_level: number;
  notes?: string;
  created_at: string;
}

interface MemoryVaultEntry {
  id: string;
  title: string;
  content: string;
  category: 'breakthrough' | 'strength' | 'insight' | 'achievement';
  session_id?: string;
  created_at: string;
}

interface SessionSummary {
  id: string;
  date: string;
  session_type: string;
  key_insights: string[];
  breakthrough_moments: string[];
  techniques_used: string[];
  mood_improvement: number;
  duration_minutes: number;
}

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: Zap,
  snowy: Snowflake,
  windy: Wind
};

const weatherColors = {
  sunny: 'from-yellow-400 to-orange-500',
  cloudy: 'from-gray-400 to-gray-600',
  rainy: 'from-blue-400 to-blue-600',
  stormy: 'from-purple-500 to-red-500',
  snowy: 'from-blue-200 to-white',
  windy: 'from-teal-400 to-cyan-500'
};

const categoryIcons = {
  breakthrough: Lightbulb,
  strength: Star,
  insight: Brain,
  achievement: Award
};

const categoryColors = {
  breakthrough: 'from-yellow-400 to-orange-500',
  strength: 'from-purple-400 to-pink-500',
  insight: 'from-blue-400 to-indigo-500',
  achievement: 'from-green-400 to-emerald-500'
};

export default function TherapyJournalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>('escape');
  const [isLoading, setIsLoading] = useState(true);
  const [emotionalWeather, setEmotionalWeather] = useState<EmotionalWeatherEntry[]>([]);
  const [memoryVault, setMemoryVault] = useState<MemoryVaultEntry[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryVaultEntry | null>(null);

  useEffect(() => {
    if (user) {
      loadJournalData();
    }
  }, [user]);

  const loadJournalData = async () => {
    try {
      setIsLoading(true);
      const supabase = getBrowserSupabaseClient();
      const memoryIntegration = new EnhancedTherapyMemoryIntegration();

      // Load emotional weather history
      const weatherHistory = await memoryIntegration.getEmotionalWeatherHistory("month") as any; // Last 30 days
      setEmotionalWeather(weatherHistory || []);

      // Load memory vault
      const vault = await memoryIntegration.getMemoryVault(user!.id) as any;
      setMemoryVault(vault || []);

      // Load session summaries (simplified for now)
      const { data: sessions } = await supabase
        .from('therapy_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessions) {
        const summaries = await Promise.all(
          sessions.map(async (session: any) => {
            const summary = await memoryIntegration.getSessionSummary(session.id, user!.id) as any;
            return {
              id: session.id,
              date: session.created_at,
              session_type: session.therapy_type || 'General Therapy',
              key_insights: summary?.key_insights || [],
              breakthrough_moments: summary?.breakthrough_moments || [],
              techniques_used: summary?.techniques_used || [],
              mood_improvement: summary?.mood_improvement || 0,
              duration_minutes: Math.round((new Date(session.ended_at || session.created_at).getTime() - new Date(session.created_at).getTime()) / 60000)
            };
          })
        );
        setSessionSummaries(summaries);
      }
    } catch (error) {
      console.error('Error loading journal data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWeatherIcon = (weatherType: string) => {
    const IconComponent = weatherIcons[weatherType as keyof typeof weatherIcons] || Sun;
    return IconComponent;
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Star;
    return IconComponent;
  };

  const renderEmotionalWeatherGarden = () => {
    const last7Days = emotionalWeather.slice(0, 7);
    
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Your Emotional Weather
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A gentle view of your recent emotional landscape
          </p>
        </div>

        {/* Weather Garden Visualization */}
        <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-3xl p-8 border border-white/20">
          <div className="grid grid-cols-7 gap-4">
            {last7Days.map((entry, index) => {
              const WeatherIcon = getWeatherIcon(entry.weather_type);
              const colorClass = weatherColors[entry.weather_type as keyof typeof weatherColors];
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center space-y-2"
                >
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${colorClass} flex items-center justify-center shadow-lg`}>
                    <WeatherIcon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDate(entry.date)}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">
                      Mood: {entry.mood_rating}/10
                    </div>
                    <div className="text-xs text-slate-500">
                      Energy: {entry.energy_level}/10
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Weather Insights */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Average Mood</div>
              <div className="text-2xl font-bold text-green-600">
                {emotionalWeather.length > 0 
                  ? (emotionalWeather.reduce((sum, entry) => sum + entry.mood_rating, 0) / emotionalWeather.length).toFixed(1)
                  : '0.0'
                }
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20">
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Average Energy</div>
              <div className="text-2xl font-bold text-yellow-600">
                {emotionalWeather.length > 0 
                  ? (emotionalWeather.reduce((sum, entry) => sum + entry.energy_level, 0) / emotionalWeather.length).toFixed(1)
                  : '0.0'
                }
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20">
            <CardContent className="p-4 text-center">
              <Heart className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Stress Level</div>
              <div className="text-2xl font-bold text-blue-600">
                {emotionalWeather.length > 0 
                  ? (emotionalWeather.reduce((sum, entry) => sum + entry.stress_level, 0) / emotionalWeather.length).toFixed(1)
                  : '0.0'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderMemoryVault = () => {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Your Memory Vault
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A collection of your insights, strengths, and breakthrough moments
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {memoryVault.map((memory, index) => {
              const CategoryIcon = getCategoryIcon(memory.category);
              const colorClass = categoryColors[memory.category as keyof typeof categoryColors];
              
              return (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/30 hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${colorClass} flex items-center justify-center`}>
                          <CategoryIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {memory.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {memory.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                        {memory.content}
                      </p>
                      <div className="mt-3 text-xs text-slate-500">
                        {formatDate(memory.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {memoryVault.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
              Your Memory Vault is Ready
            </h3>
            <p className="text-sm text-slate-500">
              As you have therapy sessions, your insights and breakthroughs will be saved here.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderSessionSummaries = () => {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Your Session History
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Beautifully organized snapshots of your therapy journey
          </p>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {sessionSummaries.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="cursor-pointer"
              >
                <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-700 dark:text-slate-300">
                            {session.session_type}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.date)}
                            <Clock className="w-4 h-4 ml-2" />
                            {session.duration_minutes}m
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          +{session.mood_improvement} mood
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {session.techniques_used.length} techniques
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {session.key_insights.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                          Key Insights
                        </h5>
                        <div className="space-y-1">
                          {session.key_insights.slice(0, 2).map((insight, i) => (
                            <div key={i} className="text-sm text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                              {insight}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {session.breakthrough_moments.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                          Breakthrough Moments
                        </h5>
                        <div className="space-y-1">
                          {session.breakthrough_moments.slice(0, 1).map((moment, i) => (
                            <div key={i} className="text-sm text-slate-700 dark:text-slate-300 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2">
                              {moment}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {sessionSummaries.length === 0 && (
          <div className="text-center py-12">
            <Book className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
              Your Journey Begins Here
            </h3>
            <p className="text-sm text-slate-500">
              Start your first therapy session to begin building your personal library.
            </p>
            <Button 
              onClick={() => router.push('/escape')}
              className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              Begin Your First Session
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <main className="pt-20 pb-8">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMemory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${categoryColors[selectedMemory.category as keyof typeof categoryColors]} flex items-center justify-center`}>
                  {React.createElement(getCategoryIcon(selectedMemory.category), { className: "w-6 h-6 text-white" })}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                    {selectedMemory.title}
                  </h2>
                  <Badge variant="outline">{selectedMemory.category}</Badge>
                </div>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedMemory.content}
                </p>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-500">
                  Saved on {formatDate(selectedMemory.created_at)}
                </div>
              </div>
              
              <Button
                onClick={() => setSelectedMemory(null)}
                className="mt-6 w-full"
                variant="outline"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-20 pb-8">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Button
              variant="ghost"
              onClick={() => router.push('/escape')}
              className="mb-6 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Escape
            </Button>
            
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Your Personal Library
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              A beautifully organized space to review your progress, insights, and emotional journey.
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="weather" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="weather" className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Emotional Weather
                </TabsTrigger>
                <TabsTrigger value="vault" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Memory Vault
                </TabsTrigger>
                <TabsTrigger value="sessions" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  My Sessions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="weather">
                {renderEmotionalWeatherGarden()}
              </TabsContent>

              <TabsContent value="vault">
                {renderMemoryVault()}
              </TabsContent>

              <TabsContent value="sessions">
                {renderSessionSummaries()}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
} 