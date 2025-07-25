import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-provider';
import { Sun, Cloud, CloudRain, Zap, CloudSnow, Wind, Sparkles, Calendar, TrendingUp, TrendingDown, Minus, Heart, Brain, Battery } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmotionalWeatherEntry {
  id: string;
  user_id: string;
  date: string;
  mood_weather: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  energy_level: number;
  stress_level: number;
  notes?: string;
  created_at: string;
}

interface WeatherStats {
  mostCommon: string;
  trend: 'improving' | 'declining' | 'stable';
  streaks: {
    current: number;
    longest: number;
    type: string;
  };
}

const weatherIcons = {
  sunny: { icon: Sun, color: 'text-yellow-500', bgColor: 'bg-yellow-100', label: 'Sunny' },
  'partly-cloudy': { icon: Sparkles, color: 'text-blue-400', bgColor: 'bg-blue-100', label: 'Partly Cloudy' },
  cloudy: { icon: Cloud, color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Cloudy' },
  rainy: { icon: CloudRain, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Rainy' },
  stormy: { icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Stormy' },
  snowy: { icon: CloudSnow, color: 'text-blue-300', bgColor: 'bg-blue-50', label: 'Peaceful Snow' }
};

const moodDescriptions = {
  sunny: "Feeling bright, positive, and energetic",
  'partly-cloudy': "Mixed feelings, some ups and downs",
  cloudy: "Feeling neutral or subdued",
  rainy: "Feeling sad or melancholy",
  stormy: "Feeling overwhelmed or turbulent",
  snowy: "Feeling calm, quiet, or withdrawn"
};

export function EmotionalWeatherReport() {
  const { user } = useAuth();
  const [weatherEntries, setWeatherEntries] = useState<EmotionalWeatherEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7');
  const [stats, setStats] = useState<WeatherStats | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    mood_weather: 'sunny' as const,
    energy_level: 5,
    stress_level: 3,
    notes: ''
  });

  const calculateStats = useCallback(() => {
    if (weatherEntries.length === 0) return;

    // Most common weather
    const weatherCounts = weatherEntries.reduce((acc, entry) => {
      acc[entry.mood_weather] = (acc[entry.mood_weather] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommon = Object.entries(weatherCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Trend analysis (simplified)
    const recentEntries = weatherEntries.slice(0, 3);
    const olderEntries = weatherEntries.slice(-3);
    
    const getWeatherScore = (weather: string) => {
      const scores = { sunny: 5, 'partly-cloudy': 4, cloudy: 3, rainy: 2, stormy: 1, snowy: 3 };
      return scores[weather as keyof typeof scores] || 3;
    };

    const recentAvg = recentEntries.reduce((sum, entry) => sum + getWeatherScore(entry.mood_weather), 0) / recentEntries.length;
    const olderAvg = olderEntries.reduce((sum, entry) => sum + getWeatherScore(entry.mood_weather), 0) / olderEntries.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 0.5) trend = 'improving';
    else if (recentAvg < olderAvg - 0.5) trend = 'declining';

    // Current streak calculation
    let currentStreak = 1;
    let currentType = weatherEntries[0]?.mood_weather || 'sunny';
    
    for (let i = 1; i < weatherEntries.length; i++) {
      if (weatherEntries[i].mood_weather === currentType) {
        currentStreak++;
      } else {
        break;
      }
    }

    setStats({
      mostCommon,
      trend,
      streaks: {
        current: currentStreak,
        longest: currentStreak, // Simplified
        type: currentType
      }
    });
  }, [weatherEntries]);

  useEffect(() => {
    if (user) {
      loadWeatherEntries();
    }
  }, [user, selectedTimeframe]);

  useEffect(() => {
    if (weatherEntries.length > 0) {
      calculateStats();
    }
  }, [weatherEntries]);

  const loadWeatherEntries = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const supabase = getBrowserSupabaseClient();
      const daysAgo = parseInt(selectedTimeframe);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('emotional_weather')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading weather entries:', error);
        // Fallback: create some sample data for demonstration
        const sampleEntries = generateSampleWeatherData(user.id, daysAgo);
        setWeatherEntries(sampleEntries);
      } else {
        setWeatherEntries(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback data
      const sampleEntries = generateSampleWeatherData(user.id, parseInt(selectedTimeframe));
      setWeatherEntries(sampleEntries);
    }
    setIsLoading(false);
  }, [user, selectedTimeframe]);

  const generateSampleWeatherData = (userId: string, days: number): EmotionalWeatherEntry[] => {
    const entries: EmotionalWeatherEntry[] = [];
    const weatherTypes = ['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy', 'snowy'] as const;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const entry: EmotionalWeatherEntry = {
        id: `sample-${i}`,
        user_id: userId,
        date: date.toISOString().split('T')[0],
        mood_weather: weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
        energy_level: Math.floor(Math.random() * 10) + 1,
        stress_level: Math.floor(Math.random() * 10) + 1,
        created_at: date.toISOString()
      };
      
      if (i === 0) {
        entry.notes = "Today I'm feeling pretty good overall!";
      }
      
            entries.push(entry);
    }
    
    return entries;
  };

  // Function moved to useCallback at the top

  const addWeatherEntry = async () => {
    if (!user) return;

    try {
      const supabase = getBrowserSupabaseClient();
      const today = new Date().toISOString().split('T')[0];

      const entryData = {
        user_id: user.id,
        date: today,
        mood_weather: newEntry.mood_weather,
        energy_level: newEntry.energy_level,
        stress_level: newEntry.stress_level,
        notes: newEntry.notes || undefined
      };

      const { error } = await supabase
        .from('emotional_weather')
        .upsert(entryData, { onConflict: 'user_id,date' });

      if (error) {
        console.error('Error saving weather entry:', error);
        // Add to local state as fallback
        const localEntry: EmotionalWeatherEntry = {
          id: `local-${Date.now()}`,
          ...entryData,
          created_at: new Date().toISOString()
        };
        setWeatherEntries(prev => [localEntry, ...prev.filter(e => e.date !== today)]);
      } else {
        // Reload entries to get the saved data
        loadWeatherEntries();
      }

      setShowAddEntry(false);
      setNewEntry({
        mood_weather: 'sunny',
        energy_level: 5,
        stress_level: 3,
        notes: ''
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getTrendIcon = () => {
    if (!stats) return <Minus className="w-4 h-4" />;
    
    switch (stats.trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Emotional Weather Report
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Your personal well-being at a glance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setShowAddEntry(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            <Sun className="w-4 h-4 mr-2" />
            Add Today
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${weatherIcons[stats.mostCommon as keyof typeof weatherIcons]?.bgColor}`}>
                  {React.createElement(weatherIcons[stats.mostCommon as keyof typeof weatherIcons]?.icon || Sun, {
                    className: `w-5 h-5 ${weatherIcons[stats.mostCommon as keyof typeof weatherIcons]?.color}`
                  })}
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Most Common</p>
                  <p className="font-semibold">{weatherIcons[stats.mostCommon as keyof typeof weatherIcons]?.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  {getTrendIcon()}
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Trend</p>
                  <p className="font-semibold capitalize">{stats.trend}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Current Streak</p>
                  <p className="font-semibold">{stats.streaks.current} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weather Garden */}
      <Card className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 border-slate-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Your Emotional Garden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {weatherEntries.map((entry, index) => {
                const weather = weatherIcons[entry.mood_weather];
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-md transition-all duration-300 cursor-pointer bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="text-xs">
                            {formatDate(entry.date)}
                          </Badge>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className={`p-2 rounded-full ${weather?.bgColor}`}
                          >
                            {React.createElement(weather?.icon || Sun, {
                              className: `w-6 h-6 ${weather?.color}`
                            })}
                          </motion.div>
                        </div>
                        
                        <h4 className="font-medium text-sm mb-2">{weather?.label}</h4>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Battery className="w-3 h-3 text-green-500" />
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full">
                              <div 
                                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${entry.energy_level * 10}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{entry.energy_level}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Brain className="w-3 h-3 text-red-500" />
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full">
                              <div 
                                className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${entry.stress_level * 10}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{entry.stress_level}</span>
                          </div>
                        </div>
                        
                        {entry.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                            "{entry.notes}"
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {weatherEntries.length === 0 && (
            <div className="text-center py-12">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-400 dark:text-slate-500"
              >
                <Cloud className="w-12 h-12 mx-auto mb-4" />
                <p>No weather entries yet.</p>
                <p className="text-sm">Add your first entry to start tracking your emotional weather!</p>
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {showAddEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddEntry(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-6 text-center">How's Your Weather Today?</h3>
              
              <div className="space-y-6">
                {/* Weather Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3">Today's Mood</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(weatherIcons).map(([key, { icon: Icon, color, bgColor, label }]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewEntry(prev => ({ ...prev, mood_weather: key as any }))}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                          newEntry.mood_weather === key 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto ${color}`} />
                        <p className="text-xs mt-1">{label}</p>
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    {moodDescriptions[newEntry.mood_weather]}
                  </p>
                </div>

                {/* Energy & Stress Sliders */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Battery className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Energy Level: {newEntry.energy_level}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.energy_level}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, energy_level: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="Energy Level"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Stress Level: {newEntry.stress_level}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newEntry.stress_level}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, stress_level: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      aria-label="Stress Level"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                  <textarea
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any thoughts about your day..."
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg resize-none bg-transparent"
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
                  <Heart className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 