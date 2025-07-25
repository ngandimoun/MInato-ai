"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-provider";
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { EnhancedTherapyMemoryIntegration } from '@/lib/core/therapy-memory-integration';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Zap, 
  Heart, 
  TrendingUp, 
  Calendar, 
  Sparkles,
  Lightbulb,
  Target,
  Star,
  Award,
  ArrowLeft,
  Plus,
  Edit3,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub" | "escape";

interface EmotionalWeatherEntry {
  id: string;
  mood: string;
  energy: number;
  stress: number;
  notes?: string;
  created_at: string;
}

interface MemoryVaultEntry {
  id: string;
  content: string;
  category: 'insight' | 'breakthrough' | 'strength' | 'technique';
  created_at: string;
}

interface ProgressMetrics {
  totalSessions: number;
  sessionStreak: number;
  topStrengths: string[];
  areasOfGrowth: string[];
  milestonesAchieved: string[];
}

const WEATHER_MOODS = [
  { id: 'sunny', label: 'Sunny', icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-100', description: 'Feeling bright and positive' },
  { id: 'partly-cloudy', label: 'Partly Cloudy', icon: Cloud, color: 'text-blue-400', bg: 'bg-blue-100', description: 'Mixed feelings, some clouds' },
  { id: 'cloudy', label: 'Cloudy', icon: Cloud, color: 'text-gray-500', bg: 'bg-gray-100', description: 'Feeling a bit heavy or unclear' },
  { id: 'rainy', label: 'Rainy', icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-200', description: 'Feeling sad or down' },
  { id: 'stormy', label: 'Stormy', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100', description: 'Intense emotions or stress' }
];

export default function EscapeInsightsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<View>('escape');
  const [emotionalWeather, setEmotionalWeather] = useState<EmotionalWeatherEntry[]>([]);
  const [memoryVault, setMemoryVault] = useState<MemoryVaultEntry[]>([]);
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics>({
    totalSessions: 0,
    sessionStreak: 0,
    topStrengths: [],
    areasOfGrowth: [],
    milestonesAchieved: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'weather' | 'vault' | 'progress'>('weather');
  const [isAddingWeather, setIsAddingWeather] = useState(false);
  const [newWeatherEntry, setNewWeatherEntry] = useState({
    mood: '',
    energy: [5],
    stress: [3],
    notes: ''
  });

  useEffect(() => {
    loadInsightsData();
  }, [user]);

  const loadInsightsData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const memoryIntegration = new EnhancedTherapyMemoryIntegration();

      // Load all insights data
      const [weatherData, vaultData, metrics] = await Promise.all([
        memoryIntegration.getEmotionalWeatherHistory("month") as any,
        memoryIntegration.getMemoryVault(user.id) as any,
        memoryIntegration.calculateProgressMetrics(user.id, "month") as any
      ]);

      setEmotionalWeather(weatherData || []);
      setMemoryVault(vaultData || []);
      setProgressMetrics(metrics || {
        totalSessions: 0,
        sessionStreak: 0,
        topStrengths: [],
        areasOfGrowth: [],
        milestonesAchieved: []
      });
    } catch (error) {
      console.error('Error loading insights data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addWeatherEntry = async () => {
    if (!user || !newWeatherEntry.mood) return;

    try {
      const memoryIntegration = new EnhancedTherapyMemoryIntegration();
      await memoryIntegration.saveEmotionalWeather({
        mood: newWeatherEntry.mood,
        energy: newWeatherEntry.energy[0],
        stress: newWeatherEntry.stress[0],
        notes: newWeatherEntry.notes
      } as any);

      // Reload data
      await loadInsightsData();
      setIsAddingWeather(false);
      setNewWeatherEntry({ mood: '', energy: [5], stress: [3], notes: '' });
    } catch (error) {
      console.error('Error adding weather entry:', error);
    }
  };

  const getWeatherIcon = (mood: string) => {
    const weatherMood = WEATHER_MOODS.find(m => m.id === mood);
    return weatherMood || WEATHER_MOODS[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <main className="pt-20 pb-8">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div 
              className="flex items-center justify-center min-h-[60vh]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <motion.div
                  className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-slate-600 dark:text-slate-300">Loading your insights...</p>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="pt-20 pb-8">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/escape')}
                className="text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Escape
              </Button>
            </div>
            
            <div className="text-center">
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Your Journey Insights
              </motion.h1>
              <motion.p 
                className="text-lg text-slate-600 dark:text-slate-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Track your emotional weather, celebrate growth, and reflect on your progress
              </motion.p>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex justify-center">
              <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
                {[
                  { id: 'weather', label: 'Emotional Weather', icon: Cloud },
                  { id: 'vault', label: 'Memory Vault', icon: Heart },
                  { id: 'progress', label: 'Progress', icon: TrendingUp }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Content based on active tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'weather' && (
              <motion.div
                key="weather"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Add Weather Entry */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Emotional Weather Report
                      </CardTitle>
                      <Button
                        onClick={() => setIsAddingWeather(!isAddingWeather)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Entry
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AnimatePresence>
                      {isAddingWeather && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50"
                        >
                          <h3 className="font-semibold mb-4">How are you feeling right now?</h3>
                          
                          {/* Mood Selection */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Your emotional weather</label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {WEATHER_MOODS.map((mood) => (
                                <button
                                  key={mood.id}
                                  onClick={() => setNewWeatherEntry({ ...newWeatherEntry, mood: mood.id })}
                                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                    newWeatherEntry.mood === mood.id
                                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                      : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-slate-700'
                                  }`}
                                >
                                  <mood.icon className={`w-8 h-8 mx-auto mb-2 ${mood.color}`} />
                                  <p className="text-sm font-medium">{mood.label}</p>
                                  <p className="text-xs text-slate-500 mt-1">{mood.description}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Energy Level */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                              Energy Level: {newWeatherEntry.energy[0]}/10
                            </label>
                            <Slider
                              value={newWeatherEntry.energy}
                              onValueChange={(value) => setNewWeatherEntry({ ...newWeatherEntry, energy: value })}
                              max={10}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                          </div>

                          {/* Stress Level */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                              Stress Level: {newWeatherEntry.stress[0]}/10
                            </label>
                            <Slider
                              value={newWeatherEntry.stress}
                              onValueChange={(value) => setNewWeatherEntry({ ...newWeatherEntry, stress: value })}
                              max={10}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                          </div>

                          {/* Notes */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                            <Textarea
                              value={newWeatherEntry.notes}
                              onChange={(e) => setNewWeatherEntry({ ...newWeatherEntry, notes: e.target.value })}
                              placeholder="What's contributing to how you feel today?"
                              className="min-h-[80px]"
                            />
                          </div>

                          <div className="flex gap-3">
                            <Button 
                              onClick={addWeatherEntry}
                              disabled={!newWeatherEntry.mood}
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                            >
                              Save Entry
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsAddingWeather(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Weather History */}
                    <div className="grid gap-4">
                      {emotionalWeather.length === 0 ? (
                        <div className="text-center py-12">
                          <Cloud className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                          <p className="text-slate-500 mb-4">No weather entries yet</p>
                          <p className="text-sm text-slate-400">Start tracking your emotional journey!</p>
                        </div>
                      ) : (
                        emotionalWeather.slice(0, 10).map((entry, index) => {
                          const weather = getWeatherIcon(entry.mood);
                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-4 p-4 bg-white/50 dark:bg-slate-700/50 rounded-xl border border-white/20"
                            >
                              <div className={`p-3 rounded-full ${weather.bg}`}>
                                <weather.icon className={`w-6 h-6 ${weather.color}`} />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-medium">{weather.label}</h3>
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      Energy: {entry.energy}/10
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      Stress: {entry.stress}/10
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-500">{formatDate(entry.created_at)}</p>
                                {entry.notes && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">
                                    "{entry.notes}"
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'vault' && (
              <motion.div
                key="vault"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Memory Vault
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Your collection of insights, breakthroughs, and moments of strength
                    </p>
                  </CardHeader>
                  <CardContent>
                    {memoryVault.length === 0 ? (
                      <div className="text-center py-12">
                        <Heart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 mb-4">Your memory vault is building</p>
                        <p className="text-sm text-slate-400">
                          As you have therapy sessions, meaningful insights and breakthroughs will be saved here
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {memoryVault.map((memory, index) => (
                          <motion.div
                            key={memory.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200/50 shadow-sm"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              {memory.category === 'insight' && <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />}
                              {memory.category === 'breakthrough' && <Star className="w-5 h-5 text-blue-500 mt-1" />}
                              {memory.category === 'strength' && <Award className="w-5 h-5 text-green-500 mt-1" />}
                              {memory.category === 'technique' && <Target className="w-5 h-5 text-purple-500 mt-1" />}
                              <Badge variant="outline" className="text-xs">
                                {memory.category}
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed mb-3">{memory.content}</p>
                            <p className="text-xs text-slate-500">{formatDate(memory.created_at)}</p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'progress' && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Progress Overview */}
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{progressMetrics.totalSessions}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Total Sessions</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{progressMetrics.sessionStreak}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Day Streak</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{progressMetrics.milestonesAchieved.length}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Milestones</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Strengths & Growth Areas */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        Top Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressMetrics.topStrengths.length === 0 ? (
                        <p className="text-slate-500 text-sm">Strengths will appear as you progress</p>
                      ) : (
                        <div className="space-y-3">
                          {progressMetrics.topStrengths.map((strength, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg"
                            >
                              <Sparkles className="w-4 h-4 text-green-500" />
                              <span className="text-sm">{strength}</span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Areas of Growth
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {progressMetrics.areasOfGrowth.length === 0 ? (
                        <p className="text-slate-500 text-sm">Growth areas will be identified through sessions</p>
                      ) : (
                        <div className="space-y-3">
                          {progressMetrics.areasOfGrowth.map((area, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg"
                            >
                              <Target className="w-4 h-4 text-blue-500" />
                              <span className="text-sm">{area}</span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Milestones */}
                {progressMetrics.milestonesAchieved.length > 0 && (
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-500" />
                        Milestones Achieved
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-2">
                        {progressMetrics.milestonesAchieved.map((milestone, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200/50"
                          >
                            <Award className="w-5 h-5 text-purple-500" />
                            <span className="text-sm font-medium">{milestone}</span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
} 