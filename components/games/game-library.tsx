"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Star, Users, Clock, Zap, TrendingUp, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuth } from '@/context/auth-provider';
import { CreateGameRequest, DIFFICULTY_LEVELS, GameLibraryItem, GAME_ICONS } from '@/lib/types/games';
import { GAME_DATA, GAME_CATEGORIES } from '@/lib/gameData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import GameDemo from './game-demo';

// Icon mapping for dynamic imports
const iconMap: Record<string, React.ComponentType<any>> = {
  GraduationCap: require('lucide-react').GraduationCap,
  Tv: require('lucide-react').Tv,
  Users: require('lucide-react').Users,
  Eye: require('lucide-react').Eye,
  Film: require('lucide-react').Film,
  HelpCircle: require('lucide-react').HelpCircle,
  Type: require('lucide-react').Type,
  Music: require('lucide-react').Music,
  BookOpen: require('lucide-react').BookOpen,
  Camera: require('lucide-react').Camera,
  Feather: require('lucide-react').Feather,
  Scale: require('lucide-react').Scale,
  Theater: require('lucide-react').Theater,
  Heart: require('lucide-react').Heart,
  Users2: require('lucide-react').Users2,
  Clock: require('lucide-react').Clock,
  Smile: require('lucide-react').Smile,
  Key: require('lucide-react').Key,
  Sword: require('lucide-react').Sword,
  Layers: require('lucide-react').Layers,
  Lock: require('lucide-react').Lock,
  Link: require('lucide-react').Link,
  Calculator: require('lucide-react').Calculator,
  TestTube: require('lucide-react').TestTube,
  Star: require('lucide-react').Star,
  Stethoscope: require('lucide-react').Stethoscope,
  Pill: require('lucide-react').Pill,
  Dna: require('lucide-react').Dna,
  Search: require('lucide-react').Search,
  Languages: require('lucide-react').Languages,
  Palette: require('lucide-react').Palette,
  Brain: require('lucide-react').Brain,
  Mind: require('lucide-react').Brain, // Using Brain as fallback for Mind
  TrendingUp: require('lucide-react').TrendingUp,
  Map: require('lucide-react').Map,
  Gamepad2: require('lucide-react').Gamepad2,
};

function getIcon(iconName: string) {
  return iconMap[iconName] || iconMap.Gamepad2;
}

interface GameCreationModalProps {
  gameId: string;
  gameName: string;
  onClose: () => void;
  onCreateGame: (request: CreateGameRequest) => void;
}

function GameCreationModal({ gameId, gameName, onClose, onCreateGame }: GameCreationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [difficulty, setDifficulty] = useState<'beginner' | 'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [mode, setMode] = useState<'solo' | 'multiplayer'>('solo');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [rounds, setRounds] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  
  // New state for language and AI customization
  const [gameLanguage, setGameLanguage] = useState('en');
  const [aiPersonality, setAiPersonality] = useState('friendly');
  const [gameTopic, setGameTopic] = useState('general');
  const [customTopic, setCustomTopic] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Load user preferences on mount
  React.useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/games/preferences');
        if (response.ok) {
          const data = await response.json();
          const prefs = data.preferences;
          
          setGameLanguage(prefs.language || 'en');
          setAiPersonality(prefs.ai_personality || 'friendly');
          setGameTopic(prefs.topic_focus || 'general');
          setDifficulty(prefs.preferred_difficulty || 'medium');
          setMode(prefs.preferred_mode || 'solo');
          setRounds(prefs.preferred_rounds || 10);
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      } finally {
        setIsLoadingPreferences(false);
      }
    };
    
    loadUserPreferences();
  }, [user]);

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

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const finalTopic = gameTopic === 'custom' ? customTopic : gameTopic;
      
      // Save user preferences for future games
      try {
        await fetch('/api/games/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language: gameLanguage,
            ai_personality: aiPersonality,
            topic_focus: finalTopic,
            preferred_difficulty: difficulty,
            preferred_mode: mode,
            preferred_rounds: rounds,
          }),
        });
      } catch (error) {
        console.error('Failed to save preferences:', error);
        // Don't block game creation if preference saving fails
      }
      
      onCreateGame({
        game_type: gameId,
        difficulty,
        max_players: maxPlayers,
        rounds,
        mode,
        settings: {
          auto_advance: true,
          show_explanations: true,
          time_per_question: 30,
          // New AI customization settings
          language: gameLanguage,
          ai_personality: aiPersonality,
          topic_focus: finalTopic,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoadingPreferences) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Loading Your Preferences
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Setting up your personalized game experience...
            </p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎮 Create {gameName} Game
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">🎯 Difficulty</label>
              <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">👥 Game Mode</label>
              <Select value={mode} onValueChange={(value: any) => setMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">🤖 Solo Play (vs AI)</SelectItem>
                  <SelectItem value="multiplayer">👫 Multiplayer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'multiplayer' && (
            <div>
              <label className="block text-sm font-medium mb-2">👥 Max Players</label>
              <Select value={maxPlayers.toString()} onValueChange={(value) => setMaxPlayers(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Players
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">❓ Number of Questions</label>
            <Select value={rounds.toString()} onValueChange={(value) => setRounds(parseInt(value))}>
              <SelectTrigger>
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

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">🌍 Game Language</label>
            <Select value={gameLanguage} onValueChange={setGameLanguage}>
              <SelectTrigger>
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

          {/* AI Personality */}
          <div>
            <label className="block text-sm font-medium mb-2">🤖 AI Personality</label>
            <Select value={aiPersonality} onValueChange={setAiPersonality}>
              <SelectTrigger>
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
            <p className="text-xs text-gray-500 mt-1">
              How Minato AI will behave and communicate during the game
            </p>
          </div>

          {/* Topic Focus */}
          <div>
            <label className="block text-sm font-medium mb-2">📚 Topic Focus</label>
            <Select value={gameTopic} onValueChange={setGameTopic}>
              <SelectTrigger>
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
            {gameTopic === 'custom' && (
              <div className="mt-2">
                <Input
                  placeholder="Enter your custom topic (e.g., 'Space exploration', 'Cooking techniques')"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              AI will focus questions around this topic area
            </p>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between"
            >
              <span>⚙️ Advanced Settings</span>
              <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </Button>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium mb-2">🎯 Customization Preview:</p>
                  <div className="space-y-1 text-xs">
                    <p><strong>Language:</strong> {languages.find(l => l.code === gameLanguage)?.name}</p>
                    <p><strong>AI Style:</strong> {aiPersonalities.find(p => p.value === aiPersonality)?.label}</p>
                    <p><strong>Topic:</strong> {gameTopic === 'custom' ? customTopic || 'Custom topic' : gameTopics.find(t => t.value === gameTopic)?.label}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>💡 Pro Tip:</strong> These settings will be saved as your preferences for future games. 
                    You can always change them in each new game session!
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || (gameTopic === 'custom' && !customTopic.trim())}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              '🚀 Create Game'
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function GameLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Use static data for now
  const games = GAME_DATA;
  const categories = GAME_CATEGORIES;
  const isLoading = false;
  const error = null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'popularity' | 'duration'>('name');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [demoGame, setDemoGame] = useState<string | null>(null);

  const filteredAndSortedGames = useMemo(() => {
    let filtered = games.filter((game: GameLibraryItem) => {
      const matchesSearch = game.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           game.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort games
    filtered.sort((a: GameLibraryItem, b: GameLibraryItem) => {
      switch (sortBy) {
        case 'popularity':
          return (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0);
        case 'duration':
          return a.estimated_duration_minutes - b.estimated_duration_minutes;
        case 'name':
        default:
          return a.display_name.localeCompare(b.display_name);
      }
    });

    return filtered;
  }, [games, searchTerm, selectedCategory, sortBy]);

  const handleCreateGame = async (request: CreateGameRequest) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a game.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "🎮 Creating Game...",
        description: `Setting up ${request.game_type} with AI-generated questions...`,
      });

      // Create the game via API route
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create game');
      }

      const result = await response.json();

      toast({
        title: "🚀 Game Created Successfully!",
        description: `Your ${request.game_type} game is ready with personalized AI questions in ${result.settings_applied.language === 'en' ? 'English' : result.settings_applied.language}.`,
      });

      console.log('Game created:', result);
      
      // Navigate to Active Games tab with refresh parameter
      if (typeof window !== 'undefined') {
        // Use a small delay to ensure the game is fully created
        setTimeout(() => {
          window.location.href = '/games?tab=active&refresh=true';
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to create game:', error);
      toast({
        title: "❌ Game Creation Failed",
        description: error instanceof Error ? error.message : "There was an error creating your game. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getColorClasses = (colorTheme: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-700 text-white',
      purple: 'from-purple-500 to-purple-700 text-white',
      green: 'from-green-500 to-green-700 text-white',
      orange: 'from-orange-500 to-orange-700 text-white',
      red: 'from-red-500 to-red-700 text-white',
      pink: 'from-pink-500 to-pink-700 text-white',
      indigo: 'from-indigo-500 to-indigo-700 text-white',
      teal: 'from-teal-500 to-teal-700 text-white',
    };
    return colors[colorTheme as keyof typeof colors] || colors.blue;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading games</div>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎮 AI Game Library
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredAndSortedGames.length} games available
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-semibold">🤖 AI-Powered Games:</span> Each game features dynamically generated content, 
            personalized difficulty, and intelligent responses. From classic trivia to creative storytelling!
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category: string) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAndSortedGames.map((game: GameLibraryItem) => {
            const IconComponent = getIcon(game.icon_name);
            
            return (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                        getColorClasses(game.color_theme)
                      )}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex gap-1">
                        {game.is_popular && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Star className="h-3 w-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                        {game.is_new && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            <Zap className="h-3 w-3 mr-1" />
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {game.display_name}
                    </CardTitle>
                    <CardDescription className="text-sm line-clamp-2">
                      {game.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {game.min_players === game.max_players 
                          ? `${game.min_players} players`
                          : `${game.min_players}-${game.max_players} players`
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {game.estimated_duration_minutes}min
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {game.difficulty_levels.slice(0, 3).map((level: string) => (
                        <Badge key={level} variant="outline" className="text-xs">
                          {level}
                        </Badge>
                      ))}
                      {game.difficulty_levels.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{game.difficulty_levels.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDemoGame(game.display_name)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Demo
                      </Button>
                      <Button 
                        className="flex-1 group-hover:bg-blue-600 transition-colors"
                        onClick={() => setSelectedGame(game.id)}
                      >
                        🎯 Play Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredAndSortedGames.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No games found</div>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Game Creation Modal */}
      <AnimatePresence>
        {selectedGame && (
          <GameCreationModal
            gameId={selectedGame}
            gameName={games.find((g: GameLibraryItem) => g.id === selectedGame)?.display_name || 'Game'}
            onClose={() => setSelectedGame(null)}
            onCreateGame={handleCreateGame}
          />
        )}
      </AnimatePresence>

      {/* Game Demo Modal */}
      <AnimatePresence>
        {demoGame && (
          <GameDemo
            gameType={demoGame}
            onClose={() => setDemoGame(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 