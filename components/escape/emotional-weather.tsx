import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  Snowflake, 
  Wind, 
  Rainbow,
  Sparkles,
  Calendar,
  TrendingUp,
  Heart,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface WeatherEntry {
  id: string;
  date: string;
  weather_type: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'rainbow';
  mood_score: number;
  energy_level: number;
  stress_level: number;
  notes?: string;
  session_id?: string;
}

interface EmotionalWeatherProps {
  userId?: string;
  className?: string;
}

const WEATHER_TYPES = {
  'sunny': {
    icon: Sun,
    color: 'from-yellow-400 to-orange-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'Bright and energetic',
    emoji: '☀️'
  },
  'partly-cloudy': {
    icon: Cloud,
    color: 'from-blue-300 to-gray-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Mixed feelings',
    emoji: '⛅'
  },
  'cloudy': {
    icon: Cloud,
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    description: 'Contemplative',
    emoji: '☁️'
  },
  'rainy': {
    icon: CloudRain,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Processing emotions',
    emoji: '🌧️'
  },
  'stormy': {
    icon: Zap,
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Intense feelings',
    emoji: '⛈️'
  },
  'snowy': {
    icon: Snowflake,
    color: 'from-cyan-300 to-blue-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'Peaceful and calm',
    emoji: '❄️'
  },
  'rainbow': {
    icon: Rainbow,
    color: 'from-pink-400 via-purple-400 to-indigo-400',
    bgColor: 'bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-indigo-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    description: 'Growth and hope',
    emoji: '🌈'
  }
};

export default function EmotionalWeather({ userId, className = "" }: EmotionalWeatherProps) {
  const [weatherHistory, setWeatherHistory] = useState<WeatherEntry[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddWeather, setShowAddWeather] = useState(false);
  const [trends, setTrends] = useState({
    moodTrend: 0,
    energyTrend: 0,
    stressTrend: 0
  });

  useEffect(() => {
    loadWeatherHistory();
  }, [userId]);

  useEffect(() => {
    if (weatherHistory.length > 1) {
      calculateTrends();
    }
  }, [weatherHistory]);

  const loadWeatherHistory = async () => {
    try {
      setIsLoading(true);
      
      // Simulate loading weather history
      // In a real implementation, this would fetch from the database
      const mockData: WeatherEntry[] = [
        {
          id: '1',
          date: new Date(Date.now() - 86400000 * 6).toISOString(),
          weather_type: 'rainy',
          mood_score: 4,
          energy_level: 3,
          stress_level: 7,
          notes: 'Feeling overwhelmed with work'
        },
        {
          id: '2',
          date: new Date(Date.now() - 86400000 * 5).toISOString(),
          weather_type: 'cloudy',
          mood_score: 5,
          energy_level: 4,
          stress_level: 6,
          notes: 'Better after talking'
        },
        {
          id: '3',
          date: new Date(Date.now() - 86400000 * 3).toISOString(),
          weather_type: 'partly-cloudy',
          mood_score: 6,
          energy_level: 6,
          stress_level: 4,
          notes: 'Making progress'
        },
        {
          id: '4',
          date: new Date(Date.now() - 86400000 * 1).toISOString(),
          weather_type: 'sunny',
          mood_score: 8,
          energy_level: 7,
          stress_level: 3,
          notes: 'Feeling much more confident'
        }
      ];

      setWeatherHistory(mockData);
      setCurrentWeather(mockData[mockData.length - 1]);
    } catch (error) {
      console.error('Error loading weather history:', error);
      // Fallback to empty state
      setWeatherHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTrends = () => {
    if (weatherHistory.length < 2) return;

    const recent = weatherHistory.slice(-3);
    const older = weatherHistory.slice(-6, -3);

    const avgRecent = {
      mood: recent.reduce((sum, entry) => sum + entry.mood_score, 0) / recent.length,
      energy: recent.reduce((sum, entry) => sum + entry.energy_level, 0) / recent.length,
      stress: recent.reduce((sum, entry) => sum + entry.stress_level, 0) / recent.length
    };

    const avgOlder = {
      mood: older.reduce((sum, entry) => sum + entry.mood_score, 0) / older.length,
      energy: older.reduce((sum, entry) => sum + entry.energy_level, 0) / older.length,
      stress: older.reduce((sum, entry) => sum + entry.stress_level, 0) / older.length
    };

    setTrends({
      moodTrend: avgRecent.mood - avgOlder.mood,
      energyTrend: avgRecent.energy - avgOlder.energy,
      stressTrend: avgOlder.stress - avgRecent.stress // Lower stress is better
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0.5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < -0.5) return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
    return <ArrowRight className="w-4 h-4 text-gray-400" />;
  };

  const getTrendText = (trend: number) => {
    if (trend > 0.5) return 'Improving';
    if (trend < -0.5) return 'Needs attention';
    return 'Stable';
  };

  if (isLoading) {
    return (
      <Card className={`${className} border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Current Weather Display */}
      {currentWeather && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Heart className="w-6 h-6 text-pink-500" />
                Your Emotional Weather
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Weather Display */}
              <div className="flex items-center gap-6">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`w-20 h-20 rounded-full bg-gradient-to-r ${WEATHER_TYPES[currentWeather.weather_type].color} flex items-center justify-center shadow-lg`}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="text-3xl"
                  >
                    {WEATHER_TYPES[currentWeather.weather_type].emoji}
                  </motion.div>
                </motion.div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
                    {WEATHER_TYPES[currentWeather.weather_type].description}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {formatDate(currentWeather.date)}
                  </p>
                  {currentWeather.notes && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      "{currentWeather.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                  <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    {currentWeather.mood_score}/10
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Mood</div>
                  <div className="flex items-center justify-center mt-1">
                    {getTrendIcon(trends.moodTrend)}
                    <span className="text-xs ml-1">{getTrendText(trends.moodTrend)}</span>
                  </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {currentWeather.energy_level}/10
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Energy</div>
                  <div className="flex items-center justify-center mt-1">
                    {getTrendIcon(trends.energyTrend)}
                    <span className="text-xs ml-1">{getTrendText(trends.energyTrend)}</span>
                  </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {currentWeather.stress_level}/10
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Stress</div>
                  <div className="flex items-center justify-center mt-1">
                    {getTrendIcon(trends.stressTrend)}
                    <span className="text-xs ml-1">{getTrendText(trends.stressTrend)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Weather History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Recent Weather Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weatherHistory.slice(-7).reverse().map((entry, index) => {
                const weather = WEATHER_TYPES[entry.weather_type];
                const WeatherIcon = weather.icon;
                
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-white/50 to-slate-50/50 dark:from-slate-700/50 dark:to-slate-600/50 hover:shadow-md transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${weather.color} flex items-center justify-center shadow-md`}>
                      <WeatherIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {weather.description}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {entry.weather_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(entry.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Mood: {entry.mood_score}/10
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        Energy: {entry.energy_level} • Stress: {entry.stress_level}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Weather Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-700/60">
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                  Your Sunshine Streak
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  You've had {weatherHistory.filter(w => w.weather_type === 'sunny' || w.weather_type === 'rainbow').length} bright days this month. 
                  Your emotional resilience is growing! ☀️
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-700/60">
                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Growth Through Storms
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Even on rainy days, you're building emotional strength. 
                  Each storm helps your inner garden grow. 🌱
                </p>
              </div>
            </div>
            
            {trends.moodTrend > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border border-pink-200 dark:border-pink-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                  <span className="font-semibold text-pink-700 dark:text-pink-300">Mood Improving</span>
                </div>
                <p className="text-sm text-pink-600 dark:text-pink-400">
                  Your overall mood has been trending upward. Keep nurturing this positive momentum! 🌈
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 