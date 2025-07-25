import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Zap, 
  Wind,
  Eye,
  Calendar,
  TrendingUp,
  Heart,
  Brain,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface EmotionalWeatherEntry {
  date: string;
  weather_type: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'windy';
  mood_score: number; // 1-10
  energy_level: number; // 1-10
  stress_level: number; // 1-10
  notes?: string;
  insights?: string[];
}

interface EmotionalWeatherReportProps {
  userId: string;
}

const weatherIcons = {
  sunny: Sun,
  partly_cloudy: Cloud,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: Zap,
  windy: Wind
};

const weatherColors = {
  sunny: 'from-yellow-300 to-orange-400',
  partly_cloudy: 'from-blue-200 to-gray-300',
  cloudy: 'from-gray-300 to-gray-400',
  rainy: 'from-blue-400 to-indigo-500',
  stormy: 'from-purple-500 to-red-500',
  windy: 'from-teal-300 to-cyan-400'
};

const weatherDescriptions = {
  sunny: 'Bright & Positive',
  partly_cloudy: 'Mixed Feelings',
  cloudy: 'Overcast Mood',
  rainy: 'Reflective & Calm',
  stormy: 'Intense Emotions',
  windy: 'Restless Energy'
};

export function EmotionalWeatherReport({ userId }: EmotionalWeatherReportProps) {
  const [weatherData, setWeatherData] = useState<EmotionalWeatherEntry[]>([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<EmotionalWeatherEntry | null>(null);

  useEffect(() => {
    loadWeatherData();
  }, [userId]);

  const loadWeatherData = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, this would fetch from Supabase
      // For now, we'll use sample data
      const sampleData: EmotionalWeatherEntry[] = [
        {
          date: '2025-01-20',
          weather_type: 'sunny',
          mood_score: 8,
          energy_level: 7,
          stress_level: 3,
          notes: 'Had a great therapy session today',
          insights: ['Feeling more confident', 'Breathing exercises helped']
        },
        {
          date: '2025-01-19',
          weather_type: 'partly_cloudy',
          mood_score: 6,
          energy_level: 5,
          stress_level: 6,
          notes: 'Mixed day with ups and downs',
          insights: ['Need to practice self-compassion']
        },
        {
          date: '2025-01-18',
          weather_type: 'rainy',
          mood_score: 4,
          energy_level: 3,
          stress_level: 8,
          notes: 'Feeling overwhelmed with work',
          insights: ['Identified stress triggers', 'Used grounding technique']
        },
        {
          date: '2025-01-17',
          weather_type: 'stormy',
          mood_score: 3,
          energy_level: 2,
          stress_level: 9,
          notes: 'Difficult day, anxiety was high',
          insights: ['Reached out for support', 'Crisis resources helpful']
        },
        {
          date: '2025-01-16',
          weather_type: 'windy',
          mood_score: 7,
          energy_level: 8,
          stress_level: 4,
          notes: 'Restless but productive energy',
          insights: ['Exercise helped mood', 'Found new coping strategy']
        },
        {
          date: '2025-01-15',
          weather_type: 'sunny',
          mood_score: 9,
          energy_level: 9,
          stress_level: 2,
          notes: 'Amazing breakthrough in therapy',
          insights: ['Major self-discovery', 'Feeling hopeful about future']
        },
        {
          date: '2025-01-14',
          weather_type: 'cloudy',
          mood_score: 5,
          energy_level: 4,
          stress_level: 6,
          notes: 'Neutral day, processing emotions',
          insights: ['Mindfulness practice helpful']
        }
      ];
      
      setWeatherData(sampleData);
    } catch (error) {
      console.error('Error loading weather data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentWeekData = () => {
    const startIndex = currentWeek * 7;
    return weatherData.slice(startIndex, startIndex + 7);
  };

  const getAverageScores = (data: EmotionalWeatherEntry[]) => {
    if (data.length === 0) return { mood: 0, energy: 0, stress: 0 };
    
    const total = data.reduce(
      (acc, entry) => ({
        mood: acc.mood + entry.mood_score,
        energy: acc.energy + entry.energy_level,
        stress: acc.stress + entry.stress_level
      }),
      { mood: 0, energy: 0, stress: 0 }
    );

    return {
      mood: Math.round(total.mood / data.length),
      energy: Math.round(total.energy / data.length),
      stress: Math.round(total.stress / data.length)
    };
  };

  const getTrendDirection = (current: number, previous: number) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  };

  const currentWeekData = getCurrentWeekData();
  const previousWeekData = weatherData.slice((currentWeek + 1) * 7, (currentWeek + 2) * 7);
  const currentAverages = getAverageScores(currentWeekData);
  const previousAverages = getAverageScores(previousWeekData);

  const moodTrend = getTrendDirection(currentAverages.mood, previousAverages.mood);
  const energyTrend = getTrendDirection(currentAverages.energy, previousAverages.energy);
  const stressTrend = getTrendDirection(currentAverages.stress, previousAverages.stress);

  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center justify-center p-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-slate-600 dark:text-slate-300">Loading your emotional weather...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Your Emotional Weather
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          A gentle view of your emotional patterns and growth
        </p>
      </motion.div>

      {/* Week Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeek(Math.min(currentWeek + 1, Math.floor(weatherData.length / 7)))}
          disabled={currentWeek >= Math.floor(weatherData.length / 7)}
          className="border-blue-200 hover:bg-blue-50"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous Week
        </Button>
        
        <div className="text-center">
          <Badge variant="outline" className="px-4 py-2 border-blue-200">
            <Calendar className="w-4 h-4 mr-2" />
            Week of {currentWeekData[0]?.date ? new Date(currentWeekData[0].date).toLocaleDateString() : 'Current'}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeek(Math.max(currentWeek - 1, 0))}
          disabled={currentWeek <= 0}
          className="border-blue-200 hover:bg-blue-50"
        >
          Next Week
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </motion.div>

      {/* Weather Garden */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="overflow-hidden bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-slate-800/50 dark:to-slate-700/50 border-white/20 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="w-5 h-5 text-blue-500" />
              Your Emotional Landscape
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4 mb-6">
              {currentWeekData.map((entry, index) => {
                const WeatherIcon = weatherIcons[entry.weather_type];
                const isSelected = selectedEntry?.date === entry.date;
                
                return (
                  <motion.div
                    key={entry.date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`relative cursor-pointer ${isSelected ? 'scale-110' : ''}`}
                    onClick={() => setSelectedEntry(entry)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${weatherColors[entry.weather_type]} 
                      flex items-center justify-center shadow-lg border-2 
                      ${isSelected ? 'border-white shadow-xl' : 'border-white/30'} 
                      transition-all duration-300`}>
                      <WeatherIcon className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(entry.date).getDate()}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Selected Entry Details */}
            <AnimatePresence>
              {selectedEntry && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 border border-white/30"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${weatherColors[selectedEntry.weather_type]} 
                      flex items-center justify-center shadow-lg`}>
                      {React.createElement(weatherIcons[selectedEntry.weather_type], {
                        className: "w-6 h-6 text-white"
                      })}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                        {weatherDescriptions[selectedEntry.weather_type]}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(selectedEntry.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Heart className="w-5 h-5 text-red-400 mr-1" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mood</span>
                      </div>
                      <div className="text-2xl font-bold text-red-500">{selectedEntry.mood_score}/10</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Zap className="w-5 h-5 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Energy</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-500">{selectedEntry.energy_level}/10</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Brain className="w-5 h-5 text-purple-400 mr-1" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Stress</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-500">{selectedEntry.stress_level}/10</div>
                    </div>
                  </div>

                  {selectedEntry.notes && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Notes</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                          "{selectedEntry.notes}"
                        </p>
                      </div>
                    </>
                  )}

                  {selectedEntry.insights && selectedEntry.insights.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          Insights
                        </h4>
                        <div className="space-y-2">
                          {selectedEntry.insights.map((insight, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-2"
                            >
                              <div className="w-2 h-2 bg-blue-400 rounded-full" />
                              <p className="text-sm text-slate-600 dark:text-slate-400">{insight}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-800/50 dark:to-slate-700/50 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <Heart className="w-6 h-6 text-red-400 mr-2" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Average Mood</span>
                </div>
                <div className="text-3xl font-bold text-red-500 mb-2">{currentAverages.mood}/10</div>
                <div className="flex items-center justify-center gap-1">
                  {moodTrend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                  {moodTrend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                  {moodTrend === 'stable' && <span className="w-4 h-4 bg-gray-400 rounded-full" />}
                  <span className={`text-sm font-medium ${
                    moodTrend === 'up' ? 'text-green-600' : 
                    moodTrend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {moodTrend === 'up' ? 'Improving' : 
                     moodTrend === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-yellow-400 mr-2" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Average Energy</span>
                </div>
                <div className="text-3xl font-bold text-yellow-500 mb-2">{currentAverages.energy}/10</div>
                <div className="flex items-center justify-center gap-1">
                  {energyTrend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                  {energyTrend === 'down' && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                  {energyTrend === 'stable' && <span className="w-4 h-4 bg-gray-400 rounded-full" />}
                  <span className={`text-sm font-medium ${
                    energyTrend === 'up' ? 'text-green-600' : 
                    energyTrend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {energyTrend === 'up' ? 'Increasing' : 
                     energyTrend === 'down' ? 'Decreasing' : 'Stable'}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <Brain className="w-6 h-6 text-purple-400 mr-2" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Average Stress</span>
                </div>
                <div className="text-3xl font-bold text-purple-500 mb-2">{currentAverages.stress}/10</div>
                <div className="flex items-center justify-center gap-1">
                  {stressTrend === 'down' && <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />}
                  {stressTrend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                  {stressTrend === 'stable' && <span className="w-4 h-4 bg-gray-400 rounded-full" />}
                  <span className={`text-sm font-medium ${
                    stressTrend === 'down' ? 'text-green-600' : 
                    stressTrend === 'up' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stressTrend === 'down' ? 'Improving' : 
                     stressTrend === 'up' ? 'Increasing' : 'Stable'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights Panel */}
      {currentWeekData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-green-50/50 to-teal-50/50 dark:from-slate-800/50 dark:to-slate-700/50 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-green-500" />
                Weekly Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-green-200/50">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      This week you experienced{' '}
                      <span className="font-medium text-green-600">
                        {currentWeekData.filter(d => d.weather_type === 'sunny').length}
                      </span>{' '}
                      sunny days and showed resilience during{' '}
                      <span className="font-medium text-blue-600">
                        {currentWeekData.filter(d => ['rainy', 'stormy'].includes(d.weather_type)).length}
                      </span>{' '}
                      challenging moments.
                    </p>
                  </div>
                </div>

                {currentAverages.mood >= 7 && (
                  <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-green-200/50">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Your mood has been consistently positive this week. Keep up the practices that are working for you!
                      </p>
                    </div>
                  </div>
                )}

                {currentAverages.stress <= 4 && (
                  <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-green-200/50">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Your stress levels have been well-managed this week. Your coping strategies are effective.
                      </p>
                    </div>
                  </div>
                )}

                {moodTrend === 'up' && (
                  <div className="flex items-start gap-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-green-200/50">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Your mood is trending upward compared to last week. This shows great progress in your mental health journey.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
} 