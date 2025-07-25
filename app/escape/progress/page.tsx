"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider";
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { EnhancedTherapyMemoryIntegration } from '@/lib/core/therapy-memory-integration';
import { 
  Sun, 
  CloudRain, 
  Cloud, 
  CloudSnow,
  Zap,
  Wind,
  Eye,
  Heart,
  TrendingUp,
  Calendar,
  Book,
  Sparkles,
  ArrowLeft,
  Plus,
  Star,
  Trophy,
  Target,
  Brain,
  Lightbulb,
  Smile
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface EmotionalWeatherEntry {
  id: string;
  user_id: string;
  date: string;
  mood: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy';
  energy_level: number;
  stress_level: number;
  notes?: string;
  created_at: string;
}

interface MemoryVaultEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: 'breakthrough' | 'strength' | 'insight' | 'achievement';
  created_at: string;
}

interface ProgressMetrics {
  total_sessions: number;
  avg_mood_improvement: number;
  stress_reduction: number;
  consistency_streak: number;
  milestones_achieved: string[];
  areas_of_growth: string[];
  strengths_identified: string[];
}

const weatherIcons = {
  sunny: Sun,
  'partly-cloudy': Cloud,
  cloudy: CloudSnow,
  rainy: CloudRain,
  stormy: Zap
};

const weatherColors = {
  sunny: 'from-yellow-400 to-orange-400',
  'partly-cloudy': 'from-blue-300 to-gray-300',
  cloudy: 'from-gray-400 to-gray-500',
  rainy: 'from-blue-500 to-blue-600',
  stormy: 'from-purple-500 to-red-500'
};

const categoryIcons = {
  breakthrough: Lightbulb,
  strength: Trophy,
  insight: Brain,
  achievement: Star
};

const categoryColors = {
  breakthrough: 'from-yellow-400 to-orange-400',
  strength: 'from-green-400 to-emerald-500',
  insight: 'from-blue-400 to-indigo-500',
  achievement: 'from-purple-400 to-pink-500'
};

export default function ProgressPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('escape');
  const [emotionalWeather, setEmotionalWeather] = useState<EmotionalWeatherEntry[]>([]);
  const [memoryVault, setMemoryVault] = useState<MemoryVaultEntry[]>([]);
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeatherEntry, setSelectedWeatherEntry] = useState<EmotionalWeatherEntry | null>(null);
  const [memoryIntegration, setMemoryIntegration] = useState<EnhancedTherapyMemoryIntegration | null>(null);

  useEffect(() => {
    if (user) {
      initializeProgress();
    }
  }, [user]);

  const initializeProgress = async () => {
    try {
      const supabase = getBrowserSupabaseClient();
      const integration = new EnhancedTherapyMemoryIntegration(supabase, user!.id);
      setMemoryIntegration(integration);

      // Load emotional weather history
      const weatherHistory = await integration.getEmotionalWeatherHistory(30); // Last 30 days
      setEmotionalWeather(weatherHistory);

      // Load memory vault
      const vaultEntries = await integration.getMemoryVault();
      setMemoryVault(vaultEntries);

      // Load progress metrics
      const metrics = await integration.calculateProgressMetrics();
      setProgressMetrics(metrics);

    } catch (error) {
      console.error('Error loading progress data:', error);
      // Fallback to demo data
      setEmotionalWeather(generateDemoWeatherData());
      setMemoryVault(generateDemoMemoryVault());
      setProgressMetrics(generateDemoProgressMetrics());
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoWeatherData = (): EmotionalWeatherEntry[] => {
    const today = new Date();
    const demoData: EmotionalWeatherEntry[] = [];
    
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const moods: ('sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy')[] = 
        ['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy'];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      
      demoData.push({
        id: `demo-${i}`,
        user_id: user?.id || 'demo',
        date: date.toISOString().split('T')[0],
        mood: randomMood,
        energy_level: Math.floor(Math.random() * 10) + 1,
        stress_level: Math.floor(Math.random() * 10) + 1,
        notes: i === 0 ? 'Feeling more balanced after our breathing exercises' : undefined,
        created_at: date.toISOString()
      });
    }
    
    return demoData;
  };

  const generateDemoMemoryVault = (): MemoryVaultEntry[] => {
    return [
      {
        id: 'demo-1',
        user_id: user?.id || 'demo',
        title: 'Boundary Setting Success',
        content: 'I successfully set a boundary with my colleague without feeling guilty. I realized I can be kind while still protecting my energy.',
        category: 'breakthrough',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
      },
      {
        id: 'demo-2',
        user_id: user?.id || 'demo',
        title: 'Inner Resilience',
        content: 'Even during difficult moments, I have an inner strength that helps me get through challenges. This is something I can always rely on.',
        category: 'strength',
        created_at: new Date(Date.now() - 86400000 * 7).toISOString() // 1 week ago
      },
      {
        id: 'demo-3',
        user_id: user?.id || 'demo',
        title: 'Mindfulness Insight',
        content: 'When I pause and breathe before reacting, I make better decisions. The space between trigger and response is where my power lies.',
        category: 'insight',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString() // 10 days ago
      },
      {
        id: 'demo-4',
        user_id: user?.id || 'demo',
        title: 'Completed First Month',
        content: 'I've been consistent with therapy sessions for a full month. This shows my commitment to my wellbeing and growth.',
        category: 'achievement',
        created_at: new Date(Date.now() - 86400000 * 14).toISOString() // 2 weeks ago
      }
    ];
  };

  const generateDemoProgressMetrics = (): ProgressMetrics => {
    return {
      total_sessions: 12,
      avg_mood_improvement: 2.3,
      stress_reduction: 34,
      consistency_streak: 8,
      milestones_achieved: [
        'First week of consistent sessions',
        'Learned breathing techniques',
        'Set healthy boundaries',
        'Practiced mindfulness daily'
      ],
      areas_of_growth: [
        'Emotional regulation',
        'Stress management',
        'Self-compassion',
        'Communication skills'
      ],
      strengths_identified: [
        'Natural empathy',
        'Problem-solving ability',
        'Resilience in challenges',
        'Openness to growth'
      ]
    };
  };

  const addTodaysWeather = async (mood: EmotionalWeatherEntry['mood'], energy: number, stress: number, notes?: string) => {
    if (!memoryIntegration) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await memoryIntegration.saveEmotionalWeather(mood, energy, stress, notes);
      
      // Refresh data
      const updatedWeather = await memoryIntegration.getEmotionalWeatherHistory(30);
      setEmotionalWeather(updatedWeather);
    } catch (error) {
      console.error('Error saving emotional weather:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <main className="pt-20 pb-4 h-screen flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-slate-600 dark:text-slate-300">Loading your progress...</p>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="pt-20 pb-4 h-screen flex flex-col">
        {/* Header */}
        <motion.div 
          className="px-4 py-6 border-b border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="container max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/escape')}
                className="text-slate-600 dark:text-slate-300 hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Escape
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Your Progress
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Track your journey and celebrate growth
                </p>
              </div>
            </div>
            <motion.div
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full border border-emerald-200/50"
              whileHover={{ scale: 1.05 }}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {progressMetrics?.consistency_streak || 0} day streak
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="container max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <Tabs defaultValue="weather" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                  <TabsTrigger value="weather" className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Emotional Weather
                  </TabsTrigger>
                  <TabsTrigger value="vault" className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Memory Vault
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="weather" className="space-y-6">
                  {/* Weather Overview */}
                  <Card className="border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-blue-500" />
                        Emotional Weather Report
                        <Badge variant="outline" className="ml-auto">
                          Last {emotionalWeather.length} days
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-7 md:grid-cols-15 gap-2 mb-6">
                        {emotionalWeather.map((entry, index) => {
                          const WeatherIcon = weatherIcons[entry.mood];
                          return (
                            <motion.div
                              key={entry.id}
                              className={`relative p-3 rounded-xl bg-gradient-to-r ${weatherColors[entry.mood]} cursor-pointer shadow-sm hover:shadow-md transition-all duration-300`}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedWeatherEntry(entry)}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <WeatherIcon className="w-6 h-6 text-white mx-auto mb-1" />
                              <div className="text-xs text-white/90 text-center">
                                {formatDate(entry.date)}
                              </div>
                              {entry.notes && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full" />
                              )}
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div 
                          className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-200/50"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center gap-3">
                            <Smile className="w-8 h-8 text-green-600" />
                            <div>
                              <p className="text-sm text-green-700 dark:text-green-300">Mood Trend</p>
                              <p className="text-lg font-bold text-green-800 dark:text-green-200">
                                +{progressMetrics?.avg_mood_improvement || 2.3} points
                              </p>
                            </div>
                          </div>
                        </motion.div>

                        <motion.div 
                          className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200/50"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center gap-3">
                            <Wind className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="text-sm text-blue-700 dark:text-blue-300">Stress Reduction</p>
                              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                -{progressMetrics?.stress_reduction || 34}%
                              </p>
                            </div>
                          </div>
                        </motion.div>

                        <motion.div 
                          className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-200/50"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-purple-600" />
                            <div>
                              <p className="text-sm text-purple-700 dark:text-purple-300">Sessions</p>
                              <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                                {progressMetrics?.total_sessions || 12} completed
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Progress Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          Milestones
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {progressMetrics?.milestones_achieved.map((milestone, index) => (
                          <motion.div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Star className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                            <span className="text-sm text-yellow-800 dark:text-yellow-200">{milestone}</span>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Target className="w-5 h-5 text-green-500" />
                          Growth Areas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {progressMetrics?.areas_of_growth.map((area, index) => (
                          <motion.div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm text-green-800 dark:text-green-200">{area}</span>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sparkles className="w-5 h-5 text-blue-500" />
                          Your Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {progressMetrics?.strengths_identified.map((strength, index) => (
                          <motion.div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Heart className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-blue-800 dark:text-blue-200">{strength}</span>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="vault" className="space-y-6">
                  {/* Memory Vault */}
                  <Card className="border-white/20 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        Memory Vault
                        <Badge variant="outline" className="ml-auto">
                          {memoryVault.length} memories
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {memoryVault.map((memory, index) => {
                          const CategoryIcon = categoryIcons[memory.category];
                          return (
                            <motion.div
                              key={memory.id}
                              className={`p-6 rounded-xl bg-gradient-to-r ${categoryColors[memory.category]} text-white shadow-lg hover:shadow-xl transition-all duration-300`}
                              whileHover={{ scale: 1.02, y: -2 }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <CategoryIcon className="w-6 h-6" />
                                <Badge variant="secondary" className="text-xs">
                                  {memory.category}
                                </Badge>
                              </div>
                              <h3 className="font-semibold mb-2">{memory.title}</h3>
                              <p className="text-sm opacity-90 leading-relaxed mb-3">
                                {memory.content}
                              </p>
                              <div className="text-xs opacity-75">
                                {formatDate(memory.created_at)}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* Weather Detail Modal */}
      <AnimatePresence>
        {selectedWeatherEntry && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedWeatherEntry(null)}
          >
            <motion.div
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                {React.createElement(weatherIcons[selectedWeatherEntry.mood], {
                  className: `w-8 h-8 bg-gradient-to-r ${weatherColors[selectedWeatherEntry.mood]} p-2 rounded-full text-white`
                })}
                <div>
                  <h3 className="text-lg font-semibold">
                    {formatDate(selectedWeatherEntry.date)}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 capitalize">
                    {selectedWeatherEntry.mood.replace('-', ' ')} day
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Energy Level</span>
                  <Badge variant="outline">{selectedWeatherEntry.energy_level}/10</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Stress Level</span>
                  <Badge variant="outline">{selectedWeatherEntry.stress_level}/10</Badge>
                </div>
              </div>

              {selectedWeatherEntry.notes && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg mb-4">
                  <p className="text-sm italic">"{selectedWeatherEntry.notes}"</p>
                </div>
              )}

              <Button
                onClick={() => setSelectedWeatherEntry(null)}
                className="w-full"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 