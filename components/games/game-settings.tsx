"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-provider';
import { 
  Settings, 
  Globe, 
  Bot, 
  BookOpen, 
  Save, 
  RotateCcw, 
  Sparkles,
  Languages,
  Brain,
  Target
} from 'lucide-react';

interface GamePreferences {
  language: string;
  ai_personality: string;
  topic_focus: string;
  preferred_difficulty: string;
  preferred_mode: 'solo' | 'multiplayer';
  preferred_rounds: number;
}

export default function GameSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<GamePreferences>({
    language: 'en',
    ai_personality: 'friendly',
    topic_focus: 'general',
    preferred_difficulty: 'medium',
    preferred_mode: 'solo',
    preferred_rounds: 10
  });
  
  const [customTopic, setCustomTopic] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const languages = [
    { code: 'en', name: '🇺🇸 English', flag: '🇺🇸' },
    { code: 'es', name: '🇪🇸 Español', flag: '🇪🇸' },
    { code: 'fr', name: '🇫🇷 Français', flag: '🇫🇷' },
    { code: 'de', name: '🇩🇪 Deutsch', flag: '🇩🇪' },
    { code: 'it', name: '🇮🇹 Italiano', flag: '🇮🇹' },
    { code: 'pt', name: '🇵🇹 Português', flag: '🇵🇹' },
    { code: 'ru', name: '🇷🇺 Русский', flag: '🇷🇺' },
    { code: 'ja', name: '🇯🇵 日本語', flag: '🇯🇵' },
    { code: 'ko', name: '🇰🇷 한국어', flag: '🇰🇷' },
    { code: 'zh', name: '🇨🇳 中文', flag: '🇨🇳' },
    { code: 'ar', name: '🇸🇦 العربية', flag: '🇸🇦' },
    { code: 'hi', name: '🇮🇳 हिन्दी', flag: '🇮🇳' },
    { code: 'th', name: '🇹🇭 ไทย', flag: '🇹🇭' },
    { code: 'vi', name: '🇻🇳 Tiếng Việt', flag: '🇻🇳' },
    { code: 'tr', name: '🇹🇷 Türkçe', flag: '🇹🇷' },
    { code: 'pl', name: '🇵🇱 Polski', flag: '🇵🇱' },
    { code: 'nl', name: '🇳🇱 Nederlands', flag: '🇳🇱' },
    { code: 'sv', name: '🇸🇪 Svenska', flag: '🇸🇪' },
    { code: 'da', name: '🇩🇰 Dansk', flag: '🇩🇰' },
    { code: 'no', name: '🇳🇴 Norsk', flag: '🇳🇴' },
    { code: 'fi', name: '🇫🇮 Suomi', flag: '🇫🇮' },
    { code: 'el', name: '🇬🇷 Ελληνικά', flag: '🇬🇷' },
    { code: 'he', name: '🇮🇱 עברית', flag: '🇮🇱' },
    { code: 'cs', name: '🇨🇿 Čeština', flag: '🇨🇿' },
    { code: 'hu', name: '🇭🇺 Magyar', flag: '🇭🇺' },
    { code: 'ro', name: '🇷🇴 Română', flag: '🇷🇴' },
    { code: 'bg', name: '🇧🇬 Български', flag: '🇧🇬' },
    { code: 'hr', name: '🇭🇷 Hrvatski', flag: '🇭🇷' },
    { code: 'sk', name: '🇸🇰 Slovenčina', flag: '🇸🇰' },
    { code: 'sl', name: '🇸🇮 Slovenščina', flag: '🇸🇮' },
    { code: 'et', name: '🇪🇪 Eesti', flag: '🇪🇪' },
    { code: 'lv', name: '🇱🇻 Latviešu', flag: '🇱🇻' },
    { code: 'lt', name: '🇱🇹 Lietuvių', flag: '🇱🇹' },
    { code: 'uk', name: '🇺🇦 Українська', flag: '🇺🇦' },
    { code: 'id', name: '🇮🇩 Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: '🇲🇾 Bahasa Melayu', flag: '🇲🇾' },
    { code: 'tl', name: '🇵🇭 Filipino', flag: '🇵🇭' },
    { code: 'sw', name: '🇰🇪 Kiswahili', flag: '🇰🇪' },
    { code: 'af', name: '🇿🇦 Afrikaans', flag: '🇿🇦' },
    { code: 'is', name: '🇮🇸 Íslenska', flag: '🇮🇸' },
    { code: 'mt', name: '🇲🇹 Malti', flag: '🇲🇹' },
    { code: 'ga', name: '🇮🇪 Gaeilge', flag: '🇮🇪' },
    { code: 'cy', name: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
    { code: 'eu', name: '🇪🇸 Euskera', flag: '🇪🇸' },
    { code: 'ca', name: '🇪🇸 Català', flag: '🇪🇸' }
  ];

  const aiPersonalities = [
    { value: 'friendly', label: '😊 Friendly & Encouraging', description: 'Warm, supportive, and motivating' },
    { value: 'professional', label: '🎯 Professional & Focused', description: 'Clear, direct, and educational' },
    { value: 'humorous', label: '😄 Funny & Witty', description: 'Playful with jokes and puns' },
    { value: 'dramatic', label: '🎭 Dramatic & Theatrical', description: 'Expressive and entertaining' },
    { value: 'mysterious', label: '🔮 Mysterious & Enigmatic', description: 'Intriguing and thought-provoking' },
    { value: 'enthusiastic', label: '⚡ High Energy & Excited', description: 'Energetic and passionate' },
    { value: 'wise', label: '🧙‍♂️ Wise & Philosophical', description: 'Thoughtful and insightful' },
    { value: 'casual', label: '😎 Casual & Relaxed', description: 'Laid-back and conversational' }
  ];

  const gameTopics = [
    { value: 'general', label: '🌍 General Knowledge', description: 'Wide variety of topics' },
    { value: 'science', label: '🔬 Science & Technology', description: 'Scientific discoveries and tech' },
    { value: 'history', label: '📚 History & Culture', description: 'Historical events and cultures' },
    { value: 'entertainment', label: '🎬 Movies & Entertainment', description: 'Films, TV shows, and celebrities' },
    { value: 'sports', label: '⚽ Sports & Athletics', description: 'Sports, games, and competitions' },
    { value: 'nature', label: '🌿 Nature & Animals', description: 'Wildlife, plants, and environment' },
    { value: 'food', label: '🍕 Food & Cooking', description: 'Cuisine, recipes, and cooking' },
    { value: 'travel', label: '✈️ Travel & Geography', description: 'Places, landmarks, and cultures' },
    { value: 'music', label: '🎵 Music & Arts', description: 'Musicians, art, and creativity' },
    { value: 'literature', label: '📖 Books & Literature', description: 'Authors, novels, and poetry' },
    { value: 'business', label: '💼 Business & Finance', description: 'Economics, companies, and money' },
    { value: 'custom', label: '✨ Custom Topic', description: 'Specify your own topic' }
  ];

  const difficulties = [
    { value: 'beginner', label: '🌱 Beginner', description: 'Very easy questions' },
    { value: 'easy', label: '😊 Easy', description: 'Simple questions' },
    { value: 'medium', label: '⚡ Medium', description: 'Moderate challenge' },
    { value: 'hard', label: '🔥 Hard', description: 'Challenging questions' },
    { value: 'expert', label: '🏆 Expert', description: 'Very difficult questions' }
  ];

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/games/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
          if (data.preferences.topic_focus && !gameTopics.find(t => t.value === data.preferences.topic_focus)) {
            setCustomTopic(data.preferences.topic_focus);
            setPreferences(prev => ({ ...prev, topic_focus: 'custom' }));
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const finalTopic = preferences.topic_focus === 'custom' ? customTopic : preferences.topic_focus;
      
      const response = await fetch('/api/games/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...preferences,
          topic_focus: finalTopic,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "✅ Settings Saved!",
          description: "Your game preferences have been updated successfully.",
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "❌ Save Failed",
        description: "Unable to save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences({
      language: 'en',
      ai_personality: 'friendly',
      topic_focus: 'general',
      preferred_difficulty: 'medium',
      preferred_mode: 'solo',
      preferred_rounds: 10
    });
    setCustomTopic('');
    toast({
      title: "🔄 Settings Reset",
      description: "All preferences have been reset to defaults.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Game Preferences
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your default game experience across all 35+ games
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language & Localization */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <CardTitle>Language & Localization</CardTitle>
            </div>
            <CardDescription>
              Choose your preferred language for all game content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="language" className="text-sm font-medium">
                Game Language
              </Label>
              <Select 
                value={preferences.language} 
                onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Questions, answers, and AI responses will be in this language
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Personality */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              <CardTitle>AI Personality</CardTitle>
            </div>
            <CardDescription>
              How Minato AI will behave and communicate during games
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="personality" className="text-sm font-medium">
                AI Behavior Style
              </Label>
              <Select 
                value={preferences.ai_personality} 
                onValueChange={(value) => setPreferences(prev => ({ ...prev, ai_personality: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiPersonalities.map((personality) => (
                    <SelectItem key={personality.value} value={personality.value}>
                      <div className="flex flex-col">
                        <span>{personality.label}</span>
                        <span className="text-xs text-gray-500">{personality.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Topic Focus */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <CardTitle>Topic Focus</CardTitle>
            </div>
            <CardDescription>
              Default topic area for AI-generated questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="topic" className="text-sm font-medium">
                Preferred Topic Area
              </Label>
              <Select 
                value={preferences.topic_focus} 
                onValueChange={(value) => setPreferences(prev => ({ ...prev, topic_focus: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gameTopics.map((topic) => (
                    <SelectItem key={topic.value} value={topic.value}>
                      <div className="flex flex-col">
                        <span>{topic.label}</span>
                        <span className="text-xs text-gray-500">{topic.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {preferences.topic_focus === 'custom' && (
                <div className="mt-2">
                  <Input
                    placeholder="Enter your custom topic (e.g., 'Space exploration', 'Cooking techniques')"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Game Defaults */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              <CardTitle>Game Defaults</CardTitle>
            </div>
            <CardDescription>
              Your preferred difficulty, mode, and game length
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty Level
                </Label>
                <Select 
                  value={preferences.preferred_difficulty} 
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_difficulty: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((diff) => (
                      <SelectItem key={diff.value} value={diff.value}>
                        <div className="flex flex-col">
                          <span>{diff.label}</span>
                          <span className="text-xs text-gray-500">{diff.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mode" className="text-sm font-medium">
                  Game Mode
                </Label>
                <Select 
                  value={preferences.preferred_mode} 
                  onValueChange={(value: 'solo' | 'multiplayer') => setPreferences(prev => ({ ...prev, preferred_mode: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">🤖 Solo Play (vs AI)</SelectItem>
                    <SelectItem value="multiplayer">👫 Multiplayer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rounds" className="text-sm font-medium">
                  Number of Questions
                </Label>
                <Select 
                  value={preferences.preferred_rounds.toString()} 
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_rounds: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Questions (Quick)</SelectItem>
                    <SelectItem value="10">10 Questions (Standard)</SelectItem>
                    <SelectItem value="15">15 Questions (Extended)</SelectItem>
                    <SelectItem value="20">20 Questions (Marathon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <Card className="glass-card border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Preference Preview
            </CardTitle>
          </div>
          <CardDescription>
            How your games will be configured by default
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Languages className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Language</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {languages.find(l => l.code === preferences.language)?.name}
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Brain className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">AI Style</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {aiPersonalities.find(p => p.value === preferences.ai_personality)?.label}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Topic</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {preferences.topic_focus === 'custom' 
                  ? customTopic || 'Custom topic' 
                  : gameTopics.find(t => t.value === preferences.topic_focus)?.label
                }
              </p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Target className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium">Difficulty</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {difficulties.find(d => d.value === preferences.preferred_difficulty)?.label}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button 
          variant="outline" 
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving || (preferences.topic_focus === 'custom' && !customTopic.trim())}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 