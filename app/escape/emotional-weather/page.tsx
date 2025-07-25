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
  CloudSnow,
  Wind,
  Sparkles,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  BarChart3,
  Heart
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type View = "chat" | "settings" | "memory" | "dashboard" | "games" | "listening" | "insights" | "creation-hub" | "escape";

interface EmotionalWeatherEntry {
  id: string;
  user_id: string;
  date: string;
  mood: number;
  energy: number;
  stress: number;
  weather_type: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy';
  notes?: string;
  created_at: string;
}

interface WeatherStats {
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
  trendMood: 'up' | 'down' | 'stable';
  trendEnergy: 'up' | 'down' | 'stable';
  trendStress: 'up' | 'down' | 'stable';
  bestDays: EmotionalWeatherEntry[];
  challengingDays: EmotionalWeatherEntry[];
}

const weatherIcons = {
  sunny: Sun,
  'partly-cloudy': Cloud,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: CloudSnow
};

const weatherColors = {
  sunny: 'from-yellow-400 to-orange-400',
  'partly-cloudy': 'from-blue-300 to-gray-300',
  cloudy: 'from-gray-400 to-gray-500',
  rainy: 'from-blue-500 to-blue-600',
  stormy: 'from-purple-500 to-indigo-600'
};

const weatherDescriptions = {
  sunny: 'Bright and energetic',
  'partly-cloudy': 'Mixed emotions',
  cloudy: 'Feeling subdued',
  rainy: 'Going through challenges',
  stormy: 'Intense emotions'
};

export default function EmotionalWeatherPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>('escape');
  const [weatherHistory, setWeatherHistory] = useState<EmotionalWeatherEntry[]>([]);
  const [stats, setStats] = useState<WeatherStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    mood: 5,
    energy: 5,
    stress: 5,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      loadWeatherHistory();
    }
  }, [user, selectedPeriod]);

  const loadWeatherHistory = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const memoryIntegration = new EnhancedTherapyMemoryIntegration();
      const history = await memoryIntegration.getEmotionalWeatherHistory("month") as any;
      setWeatherHistory(history || []);
      calculateStats(history || []);
    } catch (error) {
      console.error('Error loading weather history:', error);
      // Fallback to sample data for demo
      const sampleData = generateSampleWeatherData();
      setWeatherHistory(sampleData);
      calculateStats(sampleData);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleWeatherData = (): EmotionalWeatherEntry[] => {
    const data: EmotionalWeatherEntry[] = [];
    const now = new Date();
    
    for (let i = parseInt(selectedPeriod) - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const mood = Math.floor(Math.random() * 5) + 3; // 3-7
      const energy = Math.floor(Math.random() * 5) + 3; // 3-7
      const stress = Math.floor(Math.random() * 5) + 2; // 2-6
      
      let weather_type: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy';
      if (mood >= 7 && energy >= 6 && stress <= 3) weather_type = 'sunny';
      else if (mood >= 5 && energy >= 4 && stress <= 5) weather_type = 'partly-cloudy';
      else if (mood >= 4 && energy >= 3 && stress <= 6) weather_type = 'cloudy';
      else if (mood >= 3 && stress >= 5) weather_type = 'rainy';
      else weather_type = 'stormy';

      data.push({
        id: `sample-${i}`,
        user_id: user?.id || 'demo',
        date: date.toISOString().split('T')[0],
        mood,
        energy,
        stress,
        weather_type,
        notes: `Sample entry for ${date.toLocaleDateString()}`,
        created_at: date.toISOString()
      });
    }
    
    return data;
  };

  const calculateStats = (history: EmotionalWeatherEntry[]) => {
    if (history.length === 0) return;

    const avgMood = history.reduce((sum, entry) => sum + entry.mood, 0) / history.length;
    const avgEnergy = history.reduce((sum, entry) => sum + entry.energy, 0) / history.length;
    const avgStress = history.reduce((sum, entry) => sum + entry.stress, 0) / history.length;

    // Calculate trends (compare first half vs second half)
    const halfPoint = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, halfPoint);
    const secondHalf = history.slice(halfPoint);

    const firstMood = firstHalf.reduce((sum, entry) => sum + entry.mood, 0) / firstHalf.length;
    const secondMood = secondHalf.reduce((sum, entry) => sum + entry.mood, 0) / secondHalf.length;
    const moodDiff = secondMood - firstMood;

    const firstEnergy = firstHalf.reduce((sum, entry) => sum + entry.energy, 0) / firstHalf.length;
    const secondEnergy = secondHalf.reduce((sum, entry) => sum + entry.energy, 0) / secondHalf.length;
    const energyDiff = secondEnergy - firstEnergy;

    const firstStress = firstHalf.reduce((sum, entry) => sum + entry.stress, 0) / firstHalf.length;
    const secondStress = secondHalf.reduce((sum, entry) => sum + entry.stress, 0) / secondHalf.length;
    const stressDiff = secondStress - firstStress;

    // Best and challenging days
    const sortedByMood = [...history].sort((a, b) => b.mood - a.mood);
    const bestDays = sortedByMood.slice(0, 3);
    const challengingDays = sortedByMood.slice(-3).reverse();

    setStats({
      averageMood: avgMood,
      averageEnergy: avgEnergy,
      averageStress: avgStress,
      trendMood: Math.abs(moodDiff) < 0.3 ? 'stable' : moodDiff > 0 ? 'up' : 'down',
      trendEnergy: Math.abs(energyDiff) < 0.3 ? 'stable' : energyDiff > 0 ? 'up' : 'down',
      trendStress: Math.abs(stressDiff) < 0.3 ? 'stable' : stressDiff > 0 ? 'up' : 'down',
      bestDays,
      challengingDays
    });
  };

  const addWeatherEntry = async () => {
    if (!user) return;

    try {
      const memoryIntegration = new EnhancedTherapyMemoryIntegration();
      
      // Determine weather type based on mood, energy, stress
      let weather_type: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy';
      if (newEntry.mood >= 7 && newEntry.energy >= 6 && newEntry.stress <= 3) {
        weather_type = 'sunny';
      } else if (newEntry.mood >= 5 && newEntry.energy >= 4 && newEntry.stress <= 5) {
        weather_type = 'partly-cloudy';
      } else if (newEntry.mood >= 4 && newEntry.energy >= 3 && newEntry.stress <= 6) {
        weather_type = 'cloudy';
      } else if (newEntry.mood >= 3 && newEntry.stress >= 5) {
        weather_type = 'rainy';
      } else {
        weather_type = 'stormy';
      }

      await memoryIntegration.saveEmotionalWeather({
        mood: newEntry.mood,
        energy: newEntry.energy,
        stress: newEntry.stress,
        notes: newEntry.notes
      } as any);

      setShowAddEntry(false);
      setNewEntry({ mood: 5, energy: 5, stress: 5, notes: '' });
      loadWeatherHistory();
    } catch (error) {
      console.error('Error adding weather entry:', error);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        <main className="pt-20 pb-4 h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-4"
            />
            <p className="text-slate-600 dark:text-slate-300">Loading your emotional weather...</p>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="pt-20 pb-8">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="text-slate-600 dark:text-slate-300 hover:bg-white/50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Emotional Weather Report
                  </h1>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    Track your emotional landscape over time
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedPeriod} onValueChange={(value: '7' | '30' | '90') => setSelectedPeriod(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setShowAddEntry(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Overview */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            >
              <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    Mood
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-pink-600">
                        {stats.averageMood.toFixed(1)}/10
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                        {getTrendIcon(stats.trendMood)}
                        {stats.trendMood === 'stable' ? 'Stable' : 
                         stats.trendMood === 'up' ? 'Improving' : 'Declining'}
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 flex items-center justify-center">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Energy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.averageEnergy.toFixed(1)}/10
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                        {getTrendIcon(stats.trendEnergy)}
                        {stats.trendEnergy === 'stable' ? 'Stable' : 
                         stats.trendEnergy === 'up' ? 'Increasing' : 'Decreasing'}
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wind className="w-5 h-5 text-purple-500" />
                    Stress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {stats.averageStress.toFixed(1)}/10
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                        {getTrendIcon(stats.trendStress === 'up' ? 'down' : stats.trendStress === 'down' ? 'up' : 'stable')}
                        {stats.trendStress === 'stable' ? 'Stable' : 
                         stats.trendStress === 'up' ? 'Increasing' : 'Decreasing'}
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center justify-center">
                      <Wind className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Weather Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Your Emotional Weather
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {weatherHistory.slice(-24).map((entry, index) => {
                    const WeatherIcon = weatherIcons[entry.weather_type];
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="text-center group cursor-pointer"
                      >
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${weatherColors[entry.weather_type]} mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                          <WeatherIcon className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(entry.date)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {weatherDescriptions[entry.weather_type]}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Best and Challenging Days */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Sun className="w-5 h-5" />
                    Your Best Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.bestDays.map((day, index) => {
                    const WeatherIcon = weatherIcons[day.weather_type];
                    return (
                      <motion.div
                        key={day.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      >
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${weatherColors[day.weather_type]} flex items-center justify-center`}>
                          <WeatherIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {formatDate(day.date)}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Mood: {day.mood}/10, Energy: {day.energy}/10, Stress: {day.stress}/10
                          </div>
                          {day.notes && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              "{day.notes}"
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          #{index + 1}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <CloudRain className="w-5 h-5" />
                    Growth Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.challengingDays.map((day, index) => {
                    const WeatherIcon = weatherIcons[day.weather_type];
                    return (
                      <motion.div
                        key={day.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center gap-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      >
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${weatherColors[day.weather_type]} flex items-center justify-center`}>
                          <WeatherIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {formatDate(day.date)}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Mood: {day.mood}/10, Energy: {day.energy}/10, Stress: {day.stress}/10
                          </div>
                          {day.notes && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              "{day.notes}"
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Learn
                        </Badge>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {showAddEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                How are you feeling today?
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Mood (1-10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.mood}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, mood: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="w-8 text-center font-medium">{newEntry.mood}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Energy (1-10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.energy}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, energy: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="w-8 text-center font-medium">{newEntry.energy}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Stress (1-10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.stress}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, stress: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="w-8 text-center font-medium">{newEntry.stress}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Notes (optional)
                  </label>
                  <textarea
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="What's on your mind today?"
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAddEntry(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addWeatherEntry}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  Add Entry
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 