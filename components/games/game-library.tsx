"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Star, Users, Clock, Zap, TrendingUp, Play, Globe } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { useGameMutations } from '@/hooks/useGames';
import { UserSelector } from './user-selector';
import { GameLanguageProvider, useGameLanguage } from '@/context/game-language-context';
import { GameLanguageSelector } from './game-language-selector';
import { FeatureGuard } from '@/components/subscription/feature-guard';
import { 
  TranslatableText, 
  TranslatableHeading, 
  TranslatableDescription, 
  TranslatableBadge,
  TranslatableButtonText,
  GameCategoryText,
  DifficultyText
} from './translatable-text';
import { SimpleTranslatableText } from './simple-translatable-text';

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
  Trophy: require('lucide-react').Trophy,
  Code: require('lucide-react').Code,
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
  const router = useRouter();

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
  
  // State for multiplayer user selection
  const [selectedUsers, setSelectedUsers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    display_name: string;
  }>>([]);

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

  // Dynamic topic focus generation based on game type
  const getGameSpecificTopics = (gameId: string) => {
    const topicMap: Record<string, Array<{value: string, label: string, description: string}>> = {
      // Creative Games
      'ai_improv': [
        { value: 'comedy_sketches', label: '😂 Comedy Sketches', description: 'Funny scenes and comedic situations' },
        { value: 'drama_scenes', label: '🎭 Drama Scenes', description: 'Emotional and dramatic moments' },
        { value: 'character_development', label: '👤 Character Development', description: 'Building unique personalities' },
        { value: 'historical_scenarios', label: '🏛️ Historical Scenarios', description: 'Scenes from different eras' },
        { value: 'fantasy_adventure', label: '🗡️ Fantasy Adventure', description: 'Magical and mythical settings' },
        { value: 'workplace_situations', label: '💼 Workplace Situations', description: 'Office and professional scenarios' },
        { value: 'family_dynamics', label: '👨‍👩‍👧‍👦 Family Dynamics', description: 'Family relationships and interactions' },
        { value: 'sci_fi_scenarios', label: '🚀 Sci-Fi Scenarios', description: 'Future and space-themed scenes' }
      ],
      'story_chain': [
        { value: 'adventure_tales', label: '🗺️ Adventure Tales', description: 'Epic journeys and quests' },
        { value: 'mystery_stories', label: '🔍 Mystery Stories', description: 'Suspenseful and investigative plots' },
        { value: 'romance_narratives', label: '💕 Romance Narratives', description: 'Love stories and relationships' },
        { value: 'horror_thrillers', label: '👻 Horror Thrillers', description: 'Scary and suspenseful tales' },
        { value: 'fairy_tale_retellings', label: '🧚‍♀️ Fairy Tale Retellings', description: 'Classic stories with new twists' },
        { value: 'urban_legends', label: '🌃 Urban Legends', description: 'Modern myths and folklore' },
        { value: 'superhero_sagas', label: '🦸‍♂️ Superhero Sagas', description: 'Powers and heroic adventures' },
        { value: 'time_travel_plots', label: '⏰ Time Travel Plots', description: 'Stories across different time periods' }
      ],
      'haiku_battle': [
        { value: 'nature_seasons', label: '🌸 Nature & Seasons', description: 'Traditional nature themes' },
        { value: 'emotions_feelings', label: '💭 Emotions & Feelings', description: 'Inner thoughts and emotions' },
        { value: 'urban_life', label: '🏙️ Urban Life', description: 'City experiences and modern life' },
        { value: 'love_relationships', label: '❤️ Love & Relationships', description: 'Romance and human connections' },
        { value: 'philosophy_wisdom', label: '🧘‍♂️ Philosophy & Wisdom', description: 'Deep thoughts and life lessons' },
        { value: 'humor_wordplay', label: '😄 Humor & Wordplay', description: 'Funny and clever verses' },
        { value: 'technology_digital', label: '💻 Technology & Digital', description: 'Modern tech and digital life' },
        { value: 'food_culture', label: '🍜 Food & Culture', description: 'Culinary experiences and traditions' }
      ],
      'pitch_movie': [
        { value: 'action_adventure', label: '🎬 Action & Adventure', description: 'High-octane thrills and excitement' },
        { value: 'romantic_comedy', label: '💕 Romantic Comedy', description: 'Love stories with humor' },
        { value: 'sci_fi_fantasy', label: '🚀 Sci-Fi & Fantasy', description: 'Futuristic and magical worlds' },
        { value: 'horror_thriller', label: '😱 Horror & Thriller', description: 'Suspense and scary scenarios' },
        { value: 'family_animation', label: '👨‍👩‍👧‍👦 Family & Animation', description: 'All-ages entertainment' },
        { value: 'historical_drama', label: '🏛️ Historical Drama', description: 'Period pieces and true stories' },
        { value: 'documentary_style', label: '📹 Documentary Style', description: 'Real-world subjects and issues' },
        { value: 'indie_experimental', label: '🎨 Indie & Experimental', description: 'Artistic and unconventional films' }
      ],
      // Trivia Games
      'classic_academia_quiz': [
        { value: 'world_history', label: '🏛️ World History', description: 'Historical events and civilizations' },
        { value: 'science_physics', label: '🔬 Science & Physics', description: 'Scientific discoveries and laws' },
        { value: 'mathematics', label: '📐 Mathematics', description: 'Mathematical concepts and problems' },
        { value: 'literature_classics', label: '📚 Literature & Classics', description: 'Famous books and authors' },
        { value: 'geography_capitals', label: '🌍 Geography & Capitals', description: 'Countries, cities, and landmarks' },
        { value: 'art_culture', label: '🎨 Art & Culture', description: 'Artistic movements and cultural heritage' },
        { value: 'philosophy_ethics', label: '🤔 Philosophy & Ethics', description: 'Philosophical thoughts and moral questions' },
        { value: 'languages_linguistics', label: '🗣️ Languages & Linguistics', description: 'Language origins and structures' }
      ],
      'pop_culture_trivia': [
        { value: 'movies_tv', label: '🎬 Movies & TV Shows', description: 'Entertainment industry and celebrities' },
        { value: 'music_artists', label: '🎵 Music & Artists', description: 'Songs, albums, and musicians' },
        { value: 'social_media', label: '📱 Social Media & Memes', description: 'Internet culture and viral trends' },
        { value: 'gaming_esports', label: '🎮 Gaming & eSports', description: 'Video games and competitive gaming' },
        { value: 'fashion_style', label: '👗 Fashion & Style', description: 'Trends, designers, and fashion history' },
        { value: 'celebrities_gossip', label: '⭐ Celebrities & News', description: 'Celebrity news and entertainment gossip' },
        { value: 'anime_manga', label: '🇯🇵 Anime & Manga', description: 'Japanese animation and comics' },
        { value: 'streaming_platforms', label: '📺 Streaming & Content', description: 'Netflix, YouTube, and digital content' }
      ],
      // Puzzle Games
      'guess_the_entity': [
        { value: 'historical_figures', label: '👑 Historical Figures', description: 'Famous people from history' },
        { value: 'world_landmarks', label: '🗼 World Landmarks', description: 'Famous buildings and monuments' },
        { value: 'animals_wildlife', label: '🦁 Animals & Wildlife', description: 'Creatures from around the world' },
        { value: 'inventions_discoveries', label: '💡 Inventions & Discoveries', description: 'Important innovations and findings' },
        { value: 'mythical_creatures', label: '🐉 Mythical Creatures', description: 'Legendary beings and folklore' },
        { value: 'cities_capitals', label: '🏙️ Cities & Capitals', description: 'Major cities and capital cities' },
        { value: 'brands_companies', label: '🏢 Brands & Companies', description: 'Famous businesses and logos' },
        { value: 'natural_wonders', label: '🏔️ Natural Wonders', description: 'Amazing natural formations' }
      ],
      'mystery_detective': [
        { value: 'murder_mysteries', label: '🔪 Murder Mysteries', description: 'Classic whodunit scenarios' },
        { value: 'theft_heists', label: '💎 Theft & Heists', description: 'Stolen goods and elaborate plans' },
        { value: 'missing_persons', label: '👤 Missing Persons', description: 'Disappearances and investigations' },
        { value: 'corporate_crimes', label: '🏢 Corporate Crimes', description: 'White-collar criminal activities' },
        { value: 'historical_cases', label: '📜 Historical Cases', description: 'Real historical mysteries' },
        { value: 'paranormal_unexplained', label: '👻 Paranormal & Unexplained', description: 'Strange and supernatural events' },
        { value: 'cyber_crimes', label: '💻 Cyber Crimes', description: 'Digital age criminal activities' },
        { value: 'art_forgery', label: '🎨 Art Forgery & Fraud', description: 'Fake artworks and cultural crimes' }
      ],
      // Social Games
      'couples_challenge': [
        { value: 'childhood_memories', label: '🧸 Childhood Memories', description: 'Early life experiences and stories' },
        { value: 'future_dreams', label: '✨ Future Dreams', description: 'Goals and aspirations together' },
        { value: 'preferences_habits', label: '💭 Preferences & Habits', description: 'Daily routines and likes/dislikes' },
        { value: 'relationship_milestones', label: '💕 Relationship Milestones', description: 'Important moments together' },
        { value: 'family_friends', label: '👥 Family & Friends', description: 'People important to both of you' },
        { value: 'travel_adventures', label: '✈️ Travel & Adventures', description: 'Places visited and dream destinations' },
        { value: 'values_beliefs', label: '🤝 Values & Beliefs', description: 'Core principles and worldviews' },
        { value: 'fun_quirks', label: '😄 Fun & Quirks', description: 'Unique traits and funny habits' }
      ],
      // Strategy Games
      'strategy_showdown': [
        { value: 'resource_management', label: '📊 Resource Management', description: 'Allocation and optimization challenges' },
        { value: 'military_tactics', label: '⚔️ Military Tactics', description: 'Battle strategies and warfare' },
        { value: 'business_empire', label: '🏢 Business Empire', description: 'Corporate strategy and expansion' },
        { value: 'city_building', label: '🏗️ City Building', description: 'Urban planning and development' },
        { value: 'diplomatic_negotiations', label: '🤝 Diplomatic Negotiations', description: 'International relations and treaties' },
        { value: 'survival_scenarios', label: '🏕️ Survival Scenarios', description: 'Wilderness and emergency situations' },
        { value: 'space_colonization', label: '🚀 Space Colonization', description: 'Galactic expansion and exploration' },
        { value: 'economic_markets', label: '📈 Economic Markets', description: 'Trading and financial strategies' }
      ],
      // Word Games
      'hangman_themed': [
        { value: 'movie_titles', label: '🎬 Movie Titles', description: 'Famous films and cinema' },
        { value: 'book_authors', label: '📚 Books & Authors', description: 'Literature and famous writers' },
        { value: 'countries_capitals', label: '🌍 Countries & Capitals', description: 'Geography and world knowledge' },
        { value: 'programming_terms', label: '💻 Programming Terms', description: 'Coding and tech vocabulary' },
        { value: 'song_titles', label: '🎵 Song Titles', description: 'Music hits and artists' },
        { value: 'food_dishes', label: '🍕 Food & Dishes', description: 'Cuisine from around the world' },
        { value: 'animal_species', label: '🦁 Animal Species', description: 'Wildlife and nature' },
        { value: 'space_astronomy', label: '🌟 Space & Astronomy', description: 'Celestial bodies and space exploration' }
      ],
      'guess_the_song': [
        { value: 'pop_hits', label: '🎤 Pop Hits', description: 'Mainstream popular music' },
        { value: 'rock_classics', label: '🎸 Rock Classics', description: 'Rock and metal anthems' },
        { value: 'hip_hop_rap', label: '🎧 Hip Hop & Rap', description: 'Urban music and rap culture' },
        { value: 'country_folk', label: '🤠 Country & Folk', description: 'Traditional and country music' },
        { value: 'electronic_dance', label: '🕺 Electronic & Dance', description: 'EDM and electronic music' },
        { value: 'jazz_blues', label: '🎺 Jazz & Blues', description: 'Classic jazz and blues standards' },
        { value: 'movie_soundtracks', label: '🎬 Movie Soundtracks', description: 'Film and TV show music' },
        { value: 'indie_alternative', label: '🎶 Indie & Alternative', description: 'Independent and alternative music' }
      ],
      'guess_the_title': [
        { value: 'blockbuster_movies', label: '🎬 Blockbuster Movies', description: 'Popular Hollywood films' },
        { value: 'tv_series', label: '📺 TV Series', description: 'Popular television shows' },
        { value: 'anime_shows', label: '🇯🇵 Anime Shows', description: 'Japanese animated series' },
        { value: 'classic_literature', label: '📚 Classic Literature', description: 'Famous books and novels' },
        { value: 'video_games', label: '🎮 Video Games', description: 'Popular gaming titles' },
        { value: 'broadway_musicals', label: '🎭 Broadway Musicals', description: 'Theater and stage productions' },
        { value: 'documentaries', label: '📹 Documentaries', description: 'Non-fiction films and series' },
        { value: 'graphic_novels', label: '📖 Graphic Novels', description: 'Comics and graphic storytelling' }
      ],
      // Educational Games
      'language_learning_games': [
        { value: 'vocabulary_basics', label: '📝 Vocabulary Basics', description: 'Essential words and phrases' },
        { value: 'grammar_rules', label: '📖 Grammar Rules', description: 'Language structure and syntax' },
        { value: 'conversational_phrases', label: '💬 Conversational Phrases', description: 'Everyday communication' },
        { value: 'cultural_expressions', label: '🌍 Cultural Expressions', description: 'Idioms and cultural context' },
        { value: 'business_language', label: '💼 Business Language', description: 'Professional communication' },
        { value: 'travel_phrases', label: '✈️ Travel Phrases', description: 'Essential travel vocabulary' },
        { value: 'academic_terminology', label: '🎓 Academic Terminology', description: 'Educational and scholarly language' },
        { value: 'pronunciation_practice', label: '🗣️ Pronunciation Practice', description: 'Speaking and accent training' }
      ],
      'coding_challenge': [
        { value: 'algorithms_basics', label: '🧮 Algorithms Basics', description: 'Fundamental programming concepts' },
        { value: 'data_structures', label: '📊 Data Structures', description: 'Arrays, lists, trees, and graphs' },
        { value: 'web_development', label: '🌐 Web Development', description: 'HTML, CSS, JavaScript challenges' },
        { value: 'database_queries', label: '💾 Database Queries', description: 'SQL and database management' },
        { value: 'machine_learning', label: '🤖 Machine Learning', description: 'AI and ML programming' },
        { value: 'mobile_development', label: '📱 Mobile Development', description: 'App development challenges' },
        { value: 'cybersecurity', label: '🔒 Cybersecurity', description: 'Security and encryption problems' },
        { value: 'system_design', label: '🏗️ System Design', description: 'Architecture and scalability' }
      ],
      // Adventure Games
      'time_machine_adventures': [
        { value: 'ancient_civilizations', label: '🏛️ Ancient Civilizations', description: 'Egypt, Rome, Greece, and more' },
        { value: 'medieval_times', label: '⚔️ Medieval Times', description: 'Knights, castles, and kingdoms' },
        { value: 'industrial_revolution', label: '🏭 Industrial Revolution', description: 'Steam power and innovation' },
        { value: 'world_wars', label: '🪖 World Wars', description: 'Major historical conflicts' },
        { value: 'space_age', label: '🚀 Space Age', description: 'Moon landing and space exploration' },
        { value: 'digital_age', label: '💻 Digital Age', description: 'Internet and computer revolution' },
        { value: 'prehistoric_era', label: '🦕 Prehistoric Era', description: 'Dinosaurs and early life' },
        { value: 'future_scenarios', label: '🔮 Future Scenarios', description: 'Speculative future timelines' }
      ],
      'alien_first_contact': [
        { value: 'peaceful_diplomacy', label: '🕊️ Peaceful Diplomacy', description: 'Friendly alien encounters' },
        { value: 'trade_negotiations', label: '🤝 Trade Negotiations', description: 'Resource and technology exchange' },
        { value: 'cultural_exchange', label: '🌍 Cultural Exchange', description: 'Sharing knowledge and traditions' },
        { value: 'territorial_disputes', label: '🗺️ Territorial Disputes', description: 'Space and planetary boundaries' },
        { value: 'scientific_collaboration', label: '🔬 Scientific Collaboration', description: 'Joint research and discovery' },
        { value: 'military_tensions', label: '⚔️ Military Tensions', description: 'Defense and conflict scenarios' },
        { value: 'environmental_concerns', label: '🌱 Environmental Concerns', description: 'Planetary protection and ecology' },
        { value: 'communication_protocols', label: '📡 Communication Protocols', description: 'Language and signal exchange' }
      ],
      
      // NEW: GEN Z FOCUSED GAMES TOPICS
      'viral_challenge': [
        { value: 'tiktok_trends', label: '📱 TikTok Trends', description: 'Popular challenges and viral dances' },
        { value: 'instagram_reels', label: '📸 Instagram Reels', description: 'Short-form video content and trends' },
        { value: 'youtube_shorts', label: '▶️ YouTube Shorts', description: 'Quick video challenges and memes' },
        { value: 'social_movements', label: '✊ Social Movements', description: 'Viral activism and awareness campaigns' },
        { value: 'meme_challenges', label: '😂 Meme Challenges', description: 'Internet humor and viral formats' },
        { value: 'fitness_trends', label: '💪 Fitness Trends', description: 'Workout challenges and health trends' },
        { value: 'creative_content', label: '🎨 Creative Content', description: 'Art, music, and creative viral content' },
        { value: 'gaming_trends', label: '🎮 Gaming Trends', description: 'Viral gaming moments and challenges' }
      ],
      'meme_battle': [
        { value: 'classic_memes', label: '🗿 Classic Memes', description: 'Iconic internet memes from 2000s-2010s' },
        { value: 'modern_memes', label: '📱 Modern Memes', description: 'Current TikTok and Twitter viral content' },
        { value: 'platform_specific', label: '🌐 Platform Specific', description: 'Reddit, Discord, and platform memes' },
        { value: 'reaction_gifs', label: '😎 Reaction GIFs', description: 'Popular reaction images and GIFs' },
        { value: 'format_evolution', label: '🔄 Format Evolution', description: 'How meme formats change and spread' },
        { value: 'internet_culture', label: '💻 Internet Culture', description: 'Digital native humor and references' },
        { value: 'viral_moments', label: '⚡ Viral Moments', description: 'Moments that became internet famous' },
        { value: 'meme_history', label: '📚 Meme History', description: 'Origins and evolution of meme culture' }
      ],
      'aesthetic_quiz': [
        { value: 'cottagecore', label: '🌿 Cottagecore', description: 'Rural, cozy, and nature-inspired aesthetics' },
        { value: 'dark_academia', label: '📚 Dark Academia', description: 'Scholarly, vintage, and intellectual vibes' },
        { value: 'y2k_revival', label: '💿 Y2K Revival', description: 'Early 2000s nostalgic aesthetics' },
        { value: 'minimalism', label: '⬜ Minimalism', description: 'Clean, simple, and uncluttered design' },
        { value: 'kawaii_culture', label: '🌸 Kawaii Culture', description: 'Cute Japanese-inspired aesthetics' },
        { value: 'grunge_alt', label: '🖤 Grunge & Alt', description: 'Alternative and edgy visual styles' },
        { value: 'retro_vintage', label: '📼 Retro Vintage', description: '70s, 80s, and 90s inspired looks' },
        { value: 'cyberpunk', label: '🌃 Cyberpunk', description: 'Futuristic, neon, and tech aesthetics' }
      ],
      'social_dilemma': [
        { value: 'privacy_protection', label: '🔒 Privacy Protection', description: 'Digital privacy and data security' },
        { value: 'online_etiquette', label: '🤝 Online Etiquette', description: 'Digital manners and social norms' },
        { value: 'screen_time', label: '⏰ Screen Time', description: 'Digital wellness and healthy habits' },
        { value: 'cyberbullying', label: '🛡️ Cyberbullying', description: 'Online harassment and protection' },
        { value: 'fake_news', label: '📰 Fake News', description: 'Media literacy and fact-checking' },
        { value: 'digital_footprint', label: '👣 Digital Footprint', description: 'Online reputation management' },
        { value: 'social_pressure', label: '😰 Social Pressure', description: 'Peer pressure and social media stress' },
        { value: 'healthy_boundaries', label: '🚧 Healthy Boundaries', description: 'Setting limits in digital spaces' }
      ],
      'gen_z_slang': [
        { value: 'current_terms', label: '🔥 Current Terms', description: 'Latest slang like bussin, no cap, slay' },
        { value: 'platform_lingo', label: '📱 Platform Lingo', description: 'TikTok, Twitter, and app-specific terms' },
        { value: 'abbreviations', label: '📝 Abbreviations', description: 'Text speak and internet acronyms' },
        { value: 'cultural_context', label: '🌍 Cultural Context', description: 'Origins and meanings behind slang' },
        { value: 'generational_divide', label: '👥 Generational Divide', description: 'How language evolves across ages' },
        { value: 'viral_phrases', label: '⚡ Viral Phrases', description: 'Catchphrases that took off online' },
        { value: 'emoji_meanings', label: '😊 Emoji Meanings', description: 'Modern emoji usage and hidden meanings' },
        { value: 'slang_evolution', label: '🔄 Slang Evolution', description: 'How internet language changes' }
      ],
      'sustainability_quest': [
        { value: 'climate_science', label: '🌡️ Climate Science', description: 'Understanding climate change and impacts' },
        { value: 'renewable_energy', label: '☀️ Renewable Energy', description: 'Solar, wind, and clean energy solutions' },
        { value: 'sustainable_living', label: '♻️ Sustainable Living', description: 'Eco-friendly lifestyle choices' },
        { value: 'environmental_activism', label: '✊ Environmental Activism', description: 'Climate movements and advocacy' },
        { value: 'green_technology', label: '🔋 Green Technology', description: 'Innovations for environmental protection' },
        { value: 'waste_reduction', label: '🗑️ Waste Reduction', description: 'Zero waste and circular economy' },
        { value: 'biodiversity', label: '🦋 Biodiversity', description: 'Protecting ecosystems and wildlife' },
        { value: 'future_planet', label: '🌍 Future Planet', description: 'Solutions for environmental challenges' }
      ],
      'mental_health_check': [
        { value: 'stress_management', label: '😌 Stress Management', description: 'Healthy coping strategies' },
        { value: 'emotional_intelligence', label: '🧠 Emotional Intelligence', description: 'Understanding and managing emotions' },
        { value: 'self_care_practices', label: '🛁 Self-Care Practices', description: 'Mental wellness routines' },
        { value: 'mindfulness', label: '🧘‍♀️ Mindfulness', description: 'Meditation and present-moment awareness' },
        { value: 'social_anxiety', label: '👥 Social Anxiety', description: 'Managing social situations and fears' },
        { value: 'depression_awareness', label: '💙 Depression Awareness', description: 'Understanding and recognizing depression' },
        { value: 'therapy_resources', label: '🗣️ Therapy Resources', description: 'When and how to seek professional help' },
        { value: 'mental_health_stigma', label: '🚫 Mental Health Stigma', description: 'Breaking barriers and normalizing support' }
      ],
      'crypto_nft_challenge': [
        { value: 'crypto_basics', label: '₿ Crypto Basics', description: 'Bitcoin, Ethereum, and cryptocurrency fundamentals' },
        { value: 'blockchain_tech', label: '⛓️ Blockchain Tech', description: 'How blockchain technology works' },
        { value: 'nft_culture', label: '🎨 NFT Culture', description: 'Digital art, collectibles, and ownership' },
        { value: 'defi_protocols', label: '🏦 DeFi Protocols', description: 'Decentralized finance and lending' },
        { value: 'wallet_security', label: '🔐 Wallet Security', description: 'Protecting digital assets and keys' },
        { value: 'trading_strategies', label: '📈 Trading Strategies', description: 'Investment approaches and risk management' },
        { value: 'metaverse_economy', label: '🌐 Metaverse Economy', description: 'Virtual worlds and digital economies' },
        { value: 'crypto_regulation', label: '⚖️ Crypto Regulation', description: 'Legal aspects and government policies' }
      ],
      
      // More Trivia Games
      'niche_hobbyist_corner': [
        { value: 'mythology_folklore', label: '🐉 Mythology & Folklore', description: 'Ancient myths and cultural legends' },
        { value: 'world_cuisine', label: '🍜 World Cuisine', description: 'International foods and cooking traditions' },
        { value: 'internet_history', label: '💻 Internet History', description: 'Digital culture and online evolution' },
        { value: 'fashion_history', label: '👗 Fashion History', description: 'Style trends and fashion evolution' },
        { value: 'rare_collectibles', label: '💎 Rare Collectibles', description: 'Antiques, coins, and valuable items' },
        { value: 'obscure_sports', label: '🥏 Obscure Sports', description: 'Unusual and niche sporting activities' },
        { value: 'urban_legends', label: '🌃 Urban Legends', description: 'Modern folklore and mysterious tales' },
        { value: 'nerd_culture', label: '🤓 Nerd Culture', description: 'Comics, sci-fi, and geek interests' }
      ],
      'twenty_questions': [
        { value: 'fictional_universes', label: '🌟 Fictional Universes', description: 'Characters from movies, books, games' },
        { value: 'historical_objects', label: '🏺 Historical Objects', description: 'Ancient artifacts and historical items' },
        { value: 'modern_inventions', label: '💡 Modern Inventions', description: 'Contemporary gadgets and innovations' },
        { value: 'natural_phenomena', label: '🌪️ Natural Phenomena', description: 'Weather, geology, and natural events' },
        { value: 'fantasy_creatures', label: '🦄 Fantasy Creatures', description: 'Mythical beings and magical creatures' },
        { value: 'space_objects', label: '🌌 Space Objects', description: 'Celestial bodies and cosmic phenomena' },
        { value: 'everyday_items', label: '🏠 Everyday Items', description: 'Common household and daily objects' },
        { value: 'abstract_concepts', label: '💭 Abstract Concepts', description: 'Ideas, emotions, and philosophical concepts' }
      ],
      // Social Games
      'courtroom_drama': [
        { value: 'silly_crimes', label: '🤡 Silly Crimes', description: 'Absurd and humorous legal cases' },
        { value: 'relationship_disputes', label: '💔 Relationship Disputes', description: 'Dating and friendship conflicts' },
        { value: 'workplace_conflicts', label: '💼 Workplace Conflicts', description: 'Office drama and professional disputes' },
        { value: 'neighbor_troubles', label: '🏠 Neighbor Troubles', description: 'Community and residential issues' },
        { value: 'internet_drama', label: '📱 Internet Drama', description: 'Social media and online conflicts' },
        { value: 'family_feuds', label: '👨‍👩‍👧‍👦 Family Feuds', description: 'Household and family disagreements' },
        { value: 'pet_problems', label: '🐕 Pet Problems', description: 'Animal-related legal troubles' },
        { value: 'food_fights', label: '🍕 Food Fights', description: 'Culinary conflicts and restaurant disputes' }
      ],
      'two_sides_story': [
        { value: 'shared_vacations', label: '✈️ Shared Vacations', description: 'Travel memories and experiences' },
        { value: 'first_meetings', label: '👋 First Meetings', description: 'How relationships began' },
        { value: 'memorable_events', label: '🎉 Memorable Events', description: 'Special occasions and celebrations' },
        { value: 'funny_mishaps', label: '😂 Funny Mishaps', description: 'Embarrassing and amusing incidents' },
        { value: 'learning_moments', label: '📚 Learning Moments', description: 'Educational and growth experiences' },
        { value: 'adventures_together', label: '🗺️ Adventures Together', description: 'Shared explorations and discoveries' },
        { value: 'challenges_overcome', label: '💪 Challenges Overcome', description: 'Difficulties faced and conquered' },
        { value: 'daily_routines', label: '☕ Daily Routines', description: 'Everyday moments and habits' }
      ],
      'memory_lane': [
        { value: 'childhood_stories', label: '🧸 Childhood Stories', description: 'Early memories and growing up' },
        { value: 'school_days', label: '🎓 School Days', description: 'Educational experiences and friends' },
        { value: 'family_traditions', label: '👨‍👩‍👧‍👦 Family Traditions', description: 'Cultural customs and celebrations' },
        { value: 'career_journey', label: '💼 Career Journey', description: 'Professional growth and achievements' },
        { value: 'life_milestones', label: '🏆 Life Milestones', description: 'Important achievements and moments' },
        { value: 'seasonal_memories', label: '🌸 Seasonal Memories', description: 'Holidays and seasonal experiences' },
        { value: 'friendship_bonds', label: '🤝 Friendship Bonds', description: 'Social connections and relationships' },
        { value: 'personal_growth', label: '🌱 Personal Growth', description: 'Self-improvement and development' }
      ],
      'dare_or_describe': [
        { value: 'appreciation_dares', label: '💕 Appreciation Dares', description: 'Express gratitude and love' },
        { value: 'creative_challenges', label: '🎨 Creative Challenges', description: 'Artistic and imaginative tasks' },
        { value: 'physical_activities', label: '🤸‍♀️ Physical Activities', description: 'Safe movement and exercise' },
        { value: 'skill_demonstrations', label: '🎭 Skill Demonstrations', description: 'Show talents and abilities' },
        { value: 'communication_games', label: '💬 Communication Games', description: 'Verbal and non-verbal expression' },
        { value: 'memory_sharing', label: '🧠 Memory Sharing', description: 'Tell stories and experiences' },
        { value: 'future_planning', label: '🔮 Future Planning', description: 'Dreams and goal-setting' },
        { value: 'personality_reveals', label: '🎪 Personality Reveals', description: 'Character traits and preferences' }
      ],
      // Puzzle and Logic Games
      'escape_room': [
        { value: 'haunted_mansion', label: '👻 Haunted Mansion', description: 'Spooky supernatural mysteries' },
        { value: 'space_station', label: '🚀 Space Station', description: 'Sci-fi technology puzzles' },
        { value: 'ancient_temple', label: '🏛️ Ancient Temple', description: 'Archaeological adventure puzzles' },
        { value: 'detective_office', label: '🔍 Detective Office', description: 'Crime-solving investigations' },
        { value: 'wizard_tower', label: '🧙‍♂️ Wizard Tower', description: 'Magical and fantasy puzzles' },
        { value: 'pirate_ship', label: '🏴‍☠️ Pirate Ship', description: 'Nautical adventure challenges' },
        { value: 'laboratory', label: '🧪 Laboratory', description: 'Scientific experiment puzzles' },
        { value: 'time_machine', label: '⏰ Time Machine', description: 'Temporal paradox challenges' }
      ],
      'solo_adventure': [
        { value: 'fantasy_realm', label: '🗡️ Fantasy Realm', description: 'Magic, dragons, and epic quests' },
        { value: 'cyberpunk_city', label: '🌃 Cyberpunk City', description: 'Futuristic urban adventures' },
        { value: 'post_apocalypse', label: '☢️ Post-Apocalypse', description: 'Survival in ruined worlds' },
        { value: 'space_exploration', label: '🚀 Space Exploration', description: 'Galactic adventures and alien worlds' },
        { value: 'historical_setting', label: '🏛️ Historical Setting', description: 'Adventures in past eras' },
        { value: 'modern_thriller', label: '🕴️ Modern Thriller', description: 'Contemporary action and suspense' },
        { value: 'supernatural_horror', label: '👻 Supernatural Horror', description: 'Paranormal and scary encounters' },
        { value: 'detective_noir', label: '🔍 Detective Noir', description: 'Mystery solving in dark settings' }
      ],
      'five_levels_challenge': [
        { value: 'science_concepts', label: '🔬 Science Concepts', description: 'Physics, chemistry, biology explained' },
        { value: 'technology_topics', label: '💻 Technology Topics', description: 'AI, internet, and digital concepts' },
        { value: 'philosophical_ideas', label: '🤔 Philosophical Ideas', description: 'Ethics, existence, and meaning' },
        { value: 'economic_principles', label: '💰 Economic Principles', description: 'Markets, money, and trade systems' },
        { value: 'historical_events', label: '📚 Historical Events', description: 'Major moments in human history' },
        { value: 'art_movements', label: '🎨 Art Movements', description: 'Creative styles and cultural periods' },
        { value: 'mathematical_concepts', label: '📐 Mathematical Concepts', description: 'Numbers, patterns, and calculations' },
        { value: 'psychological_phenomena', label: '🧠 Psychological Phenomena', description: 'Human behavior and mental processes' }
      ],
      'code_breaker': [
        { value: 'cipher_puzzles', label: '🔐 Cipher Puzzles', description: 'Secret codes and encryption challenges' },
        { value: 'logic_riddles', label: '🧩 Logic Riddles', description: 'Deductive reasoning problems' },
        { value: 'pattern_recognition', label: '🔢 Pattern Recognition', description: 'Sequence and pattern challenges' },
        { value: 'mathematical_codes', label: '📐 Mathematical Codes', description: 'Number-based puzzles and sequences' },
        { value: 'word_ciphers', label: '📝 Word Ciphers', description: 'Language and letter-based codes' },
        { value: 'visual_puzzles', label: '👁️ Visual Puzzles', description: 'Image and symbol decoding' },
        { value: 'historical_codes', label: '📜 Historical Codes', description: 'Famous encryption methods' },
        { value: 'mastermind_games', label: '🎯 Mastermind Games', description: 'Color and symbol deduction' }
      ],
      'connect_dots': [
        { value: 'historical_connections', label: '📚 Historical Connections', description: 'Link events across time periods' },
        { value: 'scientific_discoveries', label: '🔬 Scientific Discoveries', description: 'Connect research and innovations' },
        { value: 'cultural_influences', label: '🌍 Cultural Influences', description: 'Trace cultural exchange and impact' },
        { value: 'technological_evolution', label: '💻 Technological Evolution', description: 'Follow tech development chains' },
        { value: 'artistic_movements', label: '🎨 Artistic Movements', description: 'Connect creative periods and styles' },
        { value: 'philosophical_threads', label: '🤔 Philosophical Threads', description: 'Trace ideas and thinkers' },
        { value: 'economic_systems', label: '💰 Economic Systems', description: 'Connect trade and financial concepts' },
        { value: 'language_etymology', label: '🗣️ Language Etymology', description: 'Word origins and linguistic connections' }
      ],
      // Educational & Academic Games
      'math_physics_challenge': [
        { value: 'basic_arithmetic', label: '🔢 Basic Arithmetic', description: 'Addition, subtraction, multiplication, division' },
        { value: 'algebra_geometry', label: '📐 Algebra & Geometry', description: 'Equations, shapes, and spatial reasoning' },
        { value: 'calculus_analysis', label: '📊 Calculus & Analysis', description: 'Derivatives, integrals, and functions' },
        { value: 'classical_physics', label: '⚽ Classical Physics', description: 'Mechanics, thermodynamics, waves' },
        { value: 'quantum_physics', label: '🌌 Quantum Physics', description: 'Atomic and subatomic phenomena' },
        { value: 'relativity_cosmology', label: '🚀 Relativity & Cosmology', description: 'Space-time and universe structure' },
        { value: 'applied_mathematics', label: '🛠️ Applied Mathematics', description: 'Statistics, probability, engineering math' },
        { value: 'theoretical_concepts', label: '🤔 Theoretical Concepts', description: 'Abstract mathematical and physical ideas' }
      ],
      'chemistry_lab': [
        { value: 'periodic_table', label: '🧪 Periodic Table', description: 'Elements, properties, and periodic trends' },
        { value: 'chemical_reactions', label: '⚗️ Chemical Reactions', description: 'Bonding, equations, and reaction types' },
        { value: 'organic_chemistry', label: '🧬 Organic Chemistry', description: 'Carbon compounds and biochemistry' },
        { value: 'laboratory_techniques', label: '🔬 Laboratory Techniques', description: 'Equipment, procedures, and safety' },
        { value: 'molecular_structure', label: '⚛️ Molecular Structure', description: 'Atomic structure and chemical bonding' },
        { value: 'acid_base_chemistry', label: '🧽 Acid-Base Chemistry', description: 'pH, titrations, and ionic solutions' },
        { value: 'thermochemistry', label: '🔥 Thermochemistry', description: 'Energy changes in chemical reactions' },
        { value: 'environmental_chemistry', label: '🌱 Environmental Chemistry', description: 'Pollution, sustainability, and green chemistry' }
      ],
      'astronomy_explorer': [
        { value: 'solar_system', label: '🪐 Solar System', description: 'Planets, moons, and celestial mechanics' },
        { value: 'stellar_evolution', label: '⭐ Stellar Evolution', description: 'Star formation, life cycles, and death' },
        { value: 'galaxies_universe', label: '🌌 Galaxies & Universe', description: 'Cosmic structure and cosmology' },
        { value: 'space_exploration', label: '🚀 Space Exploration', description: 'Missions, spacecraft, and space technology' },
        { value: 'exoplanets', label: '🌍 Exoplanets', description: 'Planets beyond our solar system' },
        { value: 'black_holes', label: '🕳️ Black Holes', description: 'Extreme gravity and spacetime phenomena' },
        { value: 'astrobiology', label: '👽 Astrobiology', description: 'Search for life in the universe' },
        { value: 'observation_techniques', label: '🔭 Observation Techniques', description: 'Telescopes and astronomical instruments' }
      ],
      'medical_mysteries': [
        { value: 'human_anatomy', label: '🫀 Human Anatomy', description: 'Body systems and organ functions' },
        { value: 'disease_diagnosis', label: '🩺 Disease Diagnosis', description: 'Symptoms, conditions, and medical detection' },
        { value: 'medical_history', label: '📚 Medical History', description: 'Historical breakthroughs and discoveries' },
        { value: 'pharmacology', label: '💊 Pharmacology', description: 'Drug actions, interactions, and treatments' },
        { value: 'surgical_procedures', label: '🏥 Surgical Procedures', description: 'Operations and medical interventions' },
        { value: 'public_health', label: '🌍 Public Health', description: 'Epidemiology, prevention, and global health' },
        { value: 'medical_technology', label: '🔬 Medical Technology', description: 'Equipment, imaging, and innovations' },
        { value: 'genetic_medicine', label: '🧬 Genetic Medicine', description: 'DNA, heredity, and genetic disorders' }
      ],
      'pharmacy_knowledge': [
        { value: 'drug_classifications', label: '💊 Drug Classifications', description: 'Medication categories and therapeutic uses' },
        { value: 'pharmaceutical_chemistry', label: '⚗️ Pharmaceutical Chemistry', description: 'Drug composition and molecular structure' },
        { value: 'drug_interactions', label: '⚠️ Drug Interactions', description: 'Medication compatibility and safety' },
        { value: 'dosage_administration', label: '💉 Dosage & Administration', description: 'Proper medication use and delivery' },
        { value: 'side_effects', label: '🤒 Side Effects', description: 'Adverse reactions and monitoring' },
        { value: 'pharmaceutical_history', label: '📚 Pharmaceutical History', description: 'Drug discovery and development' },
        { value: 'regulatory_aspects', label: '📋 Regulatory Aspects', description: 'FDA approval and drug safety' },
        { value: 'clinical_trials', label: '🧪 Clinical Trials', description: 'Research and testing procedures' }
      ],
      'biology_quest': [
        { value: 'cell_biology', label: '🔬 Cell Biology', description: 'Cellular structure, function, and processes' },
        { value: 'genetics_heredity', label: '🧬 Genetics & Heredity', description: 'DNA, genes, and inheritance patterns' },
        { value: 'evolution', label: '🦕 Evolution', description: 'Natural selection and species development' },
        { value: 'ecology_environment', label: '🌿 Ecology & Environment', description: 'Ecosystems, biodiversity, and conservation' },
        { value: 'human_biology', label: '👨‍⚕️ Human Biology', description: 'Physiology and body systems' },
        { value: 'microbiology', label: '🦠 Microbiology', description: 'Bacteria, viruses, and microorganisms' },
        { value: 'plant_biology', label: '🌱 Plant Biology', description: 'Botany, photosynthesis, and plant life' },
        { value: 'marine_biology', label: '🐠 Marine Biology', description: 'Ocean life and aquatic ecosystems' }
      ],
      'history_detective': [
        { value: 'ancient_civilizations', label: '🏛️ Ancient Civilizations', description: 'Egypt, Greece, Rome, and early societies' },
        { value: 'medieval_period', label: '🏰 Medieval Period', description: 'Middle Ages, knights, and feudalism' },
        { value: 'world_wars', label: '⚔️ World Wars', description: 'Global conflicts and their impact' },
        { value: 'historical_mysteries', label: '🔍 Historical Mysteries', description: 'Unsolved events and lost civilizations' },
        { value: 'cultural_movements', label: '🎭 Cultural Movements', description: 'Renaissance, Enlightenment, and cultural shifts' },
        { value: 'exploration_discovery', label: '🗺️ Exploration & Discovery', description: 'Age of exploration and new worlds' },
        { value: 'revolution_reform', label: '✊ Revolution & Reform', description: 'Political and social transformations' },
        { value: 'biographical_figures', label: '👤 Biographical Figures', description: 'Famous historical personalities' }
      ],

      'art_appreciation': [
        { value: 'classical_art', label: '🏛️ Classical Art', description: 'Ancient Greek and Roman artistic traditions' },
        { value: 'renaissance_masters', label: '🎨 Renaissance Masters', description: 'Da Vinci, Michelangelo, and artistic revolution' },
        { value: 'modern_movements', label: '🖼️ Modern Movements', description: 'Impressionism, cubism, and contemporary art' },
        { value: 'sculpture_3d', label: '🗿 Sculpture & 3D', description: 'Three-dimensional artistic expressions' },
        { value: 'art_techniques', label: '🖌️ Art Techniques', description: 'Painting methods, materials, and styles' },
        { value: 'cultural_art', label: '🌍 Cultural Art', description: 'Non-Western and indigenous artistic traditions' },
        { value: 'digital_art', label: '💻 Digital Art', description: 'Contemporary digital and multimedia art' },
        { value: 'art_history', label: '📚 Art History', description: 'Artistic periods and cultural context' }
      ],
      'philosophy_cafe': [
        { value: 'ethical_dilemmas', label: '⚖️ Ethical Dilemmas', description: 'Moral philosophy and ethical reasoning' },
        { value: 'existence_reality', label: '🌌 Existence & Reality', description: 'Metaphysics and nature of reality' },
        { value: 'knowledge_truth', label: '🧠 Knowledge & Truth', description: 'Epistemology and ways of knowing' },
        { value: 'political_philosophy', label: '🏛️ Political Philosophy', description: 'Government, justice, and social contracts' },
        { value: 'consciousness_mind', label: '💭 Consciousness & Mind', description: 'Philosophy of mind and consciousness' },
        { value: 'ancient_philosophy', label: '📜 Ancient Philosophy', description: 'Greek, Roman, and Eastern philosophical traditions' },
        { value: 'modern_philosophy', label: '🎓 Modern Philosophy', description: 'Enlightenment and contemporary philosophical thought' },
        { value: 'thought_experiments', label: '🧪 Thought Experiments', description: 'Hypothetical scenarios and philosophical puzzles' }
      ],
      'psychology_insights': [
        { value: 'cognitive_biases', label: '🧠 Cognitive Biases', description: 'Mental shortcuts and thinking errors' },
        { value: 'behavioral_psychology', label: '👥 Behavioral Psychology', description: 'Human behavior patterns and conditioning' },
        { value: 'developmental_psychology', label: '👶 Developmental Psychology', description: 'Human growth and life stages' },
        { value: 'social_psychology', label: '👫 Social Psychology', description: 'Group behavior and social influence' },
        { value: 'mental_health', label: '💚 Mental Health', description: 'Psychological well-being and disorders' },
        { value: 'famous_experiments', label: '🔬 Famous Experiments', description: 'Landmark psychological studies' },
        { value: 'personality_psychology', label: '🎭 Personality Psychology', description: 'Individual differences and traits' },
        { value: 'neuroscience_brain', label: '🧠 Neuroscience & Brain', description: 'Brain function and neurological basis of behavior' }
      ],
      'economics_game': [
        { value: 'market_dynamics', label: '📈 Market Dynamics', description: 'Supply, demand, and price mechanisms' },
        { value: 'financial_concepts', label: '💰 Financial Concepts', description: 'Banking, investing, and financial markets' },
        { value: 'economic_history', label: '📚 Economic History', description: 'Historical economic events and systems' },
        { value: 'personal_finance', label: '💳 Personal Finance', description: 'Budgeting, saving, and money management' },
        { value: 'global_economics', label: '🌍 Global Economics', description: 'International trade and economic relations' },
        { value: 'economic_theory', label: '🎓 Economic Theory', description: 'Keynesian, classical, and modern economic thought' },
        { value: 'behavioral_economics', label: '🧠 Behavioral Economics', description: 'Psychology and decision-making in economics' },
        { value: 'cryptocurrency_tech', label: '₿ Cryptocurrency & Tech', description: 'Digital currencies and financial technology' }
      ],
      'geography_explorer': [
        { value: 'world_capitals', label: '🏛️ World Capitals', description: 'Capital cities and political geography' },
        { value: 'natural_wonders', label: '🏔️ Natural Wonders', description: 'Mountains, rivers, and geological features' },
        { value: 'cultural_landmarks', label: '🗿 Cultural Landmarks', description: 'Famous monuments and cultural sites' },
        { value: 'climate_weather', label: '🌤️ Climate & Weather', description: 'Weather patterns and climate zones' },
        { value: 'countries_flags', label: '🏳️ Countries & Flags', description: 'Nations, borders, and national symbols' },
        { value: 'population_demographics', label: '👥 Population & Demographics', description: 'Human geography and population patterns' },
        { value: 'economic_geography', label: '💼 Economic Geography', description: 'Resources, trade, and economic regions' },
        { value: 'geographical_phenomena', label: '🌋 Geographical Phenomena', description: 'Earthquakes, volcanoes, and natural processes' }
      ],

      // NEW GAMES TOPIC MAPPINGS
      'sport_guru': [
        { value: 'football_soccer', label: '⚽ Football/Soccer', description: 'World football, FIFA, leagues, and legendary players' },
        { value: 'american_football', label: '🏈 American Football', description: 'NFL, college football, rules, and history' },
        { value: 'basketball', label: '🏀 Basketball', description: 'NBA, international basketball, rules, and stars' },
        { value: 'rugby', label: '🏉 Rugby', description: 'Rugby union, league, World Cup, and techniques' },
        { value: 'tennis', label: '🎾 Tennis', description: 'Grand Slams, ATP, WTA, and tennis legends' },
        { value: 'baseball', label: '⚾ Baseball', description: 'MLB, World Series, rules, and baseball history' },
        { value: 'cricket', label: '🏏 Cricket', description: 'Test cricket, ODI, T20, and cricket nations' },
        { value: 'olympic_sports', label: '🏅 Olympic Sports', description: 'Summer and Winter Olympics, records, and athletes' }
      ],
      'global_linguist': [
        { value: 'english_language', label: '🇬🇧 English Language', description: 'Grammar, vocabulary, literature, and linguistics' },
        { value: 'french_language', label: '🇫🇷 French Language', description: 'Français grammar, vocabulary, and culture' },
        { value: 'spanish_language', label: '🇪🇸 Spanish Language', description: 'Español grammar, vocabulary, and dialects' },
        { value: 'german_language', label: '🇩🇪 German Language', description: 'Deutsch grammar, vocabulary, and structure' },
        { value: 'italian_language', label: '🇮🇹 Italian Language', description: 'Italiano grammar, vocabulary, and culture' },
        { value: 'portuguese_language', label: '🇵🇹 Portuguese Language', description: 'Português grammar, vocabulary, and dialects' },
        { value: 'russian_language', label: '🇷🇺 Russian Language', description: 'Русский grammar, vocabulary, and literature' },
        { value: 'japanese_language', label: '🇯🇵 Japanese Language', description: 'Hiragana, katakana, kanji, and Japanese culture' },
        { value: 'chinese_language', label: '🇨🇳 Chinese Language', description: 'Mandarin, characters, tones, and Chinese culture' },
        { value: 'korean_language', label: '🇰🇷 Korean Language', description: '한국어 grammar, Hangul, and Korean culture' },
        { value: 'arabic_language', label: '🇸🇦 Arabic Language', description: 'العربية grammar, calligraphy, and culture' },
        { value: 'hindi_language', label: '🇮🇳 Hindi Language', description: 'हिन्दी grammar, vocabulary, and Indian culture' },
        { value: 'thai_language', label: '🇹🇭 Thai Language', description: 'ไทย grammar, script, and Thai culture' },
        { value: 'vietnamese_language', label: '🇻🇳 Vietnamese Language', description: 'Tiếng Việt grammar, tones, and culture' },
        { value: 'turkish_language', label: '🇹🇷 Turkish Language', description: 'Türkçe grammar, vocabulary, and culture' },
        { value: 'polish_language', label: '🇵🇱 Polish Language', description: 'Polski grammar, vocabulary, and culture' },
        { value: 'dutch_language', label: '🇳🇱 Dutch Language', description: 'Nederlands grammar, vocabulary, and culture' },
        { value: 'swedish_language', label: '🇸🇪 Swedish Language', description: 'Svenska grammar, vocabulary, and culture' },
        { value: 'norwegian_language', label: '🇳🇴 Norwegian Language', description: 'Norsk grammar, vocabulary, and culture' },
        { value: 'finnish_language', label: '🇫🇮 Finnish Language', description: 'Suomi grammar, vocabulary, and culture' },
        { value: 'latin_classical', label: '🏛️ Latin & Classical', description: 'Latin grammar, classical languages, and etymology' },
        { value: 'linguistics_theory', label: '📚 Linguistics Theory', description: 'Language families, syntax, phonetics, and morphology' }
      ],
      'programming_challenge': [
        { value: 'javascript', label: '🟨 JavaScript', description: 'ES6+, Node.js, frameworks, and web development' },
        { value: 'python', label: '🐍 Python', description: 'Syntax, libraries, data science, and applications' },
        { value: 'java', label: '☕ Java', description: 'OOP, Spring, enterprise development, and JVM' },
        { value: 'cpp_c', label: '⚙️ C/C++', description: 'System programming, memory management, and performance' },
        { value: 'react_frontend', label: '⚛️ React & Frontend', description: 'Components, hooks, state management, and UI' },
        { value: 'algorithms', label: '🧮 Algorithms', description: 'Sorting, searching, complexity, and problem solving' },
        { value: 'data_structures', label: '📊 Data Structures', description: 'Arrays, trees, graphs, and optimization' },
        { value: 'web_development', label: '🌐 Web Development', description: 'Full-stack, APIs, databases, and deployment' }
      ],
      'retro_nostalgia': [
        { value: 'retro_gaming', label: '🕹️ Retro Gaming', description: 'Classic consoles, arcade games, and gaming history' },
        { value: 'classic_anime', label: '📺 Classic Anime', description: 'Vintage anime series, studios, and iconic characters' },
        { value: 'vintage_manga', label: '📖 Vintage Manga', description: 'Classic manga series, artists, and storytelling' },
        { value: 'retro_music', label: '🎵 Retro Music', description: '70s, 80s, 90s hits, bands, and musical movements' },
        { value: 'classic_movies', label: '🎬 Classic Movies', description: 'Vintage cinema, directors, and film history' },
        { value: 'retro_culture', label: '🌈 Retro Culture', description: 'Fashion, trends, technology, and lifestyle' },
        { value: 'vintage_cities', label: '🏙️ Vintage Cities', description: 'Urban development, architecture, and city history' },
        { value: 'nostalgic_stories', label: '📚 Nostalgic Stories', description: 'Classic tales, folklore, and cultural narratives' }
      ],
      'strategy_thinker': [
        { value: 'game_theory', label: '🎯 Game Theory', description: 'Nash equilibrium, strategic decisions, and economics' },
        { value: 'chess_strategy', label: '♟️ Chess Strategy', description: 'Openings, tactics, endgames, and chess masters' },
        { value: 'business_strategy', label: '💼 Business Strategy', description: 'Corporate tactics, market analysis, and competition' },
        { value: 'military_strategy', label: '⚔️ Military Strategy', description: 'Historical battles, tactics, and strategic thinking' },
        { value: 'decision_making', label: '🧠 Decision Making', description: 'Cognitive biases, rational choice, and psychology' },
        { value: 'negotiation_tactics', label: '🤝 Negotiation Tactics', description: 'Persuasion, diplomacy, and conflict resolution' },
        { value: 'strategic_planning', label: '📋 Strategic Planning', description: 'Long-term thinking, resource allocation, and goals' },
        { value: 'competitive_analysis', label: '📊 Competitive Analysis', description: 'Market positioning, SWOT analysis, and advantages' }
      ]
    };

    return topicMap[gameId] || [
      { value: 'general', label: '🌍 General Knowledge', description: 'Wide variety of topics' },
      { value: 'custom', label: '✨ Custom Topic', description: 'Specify your own topic' }
    ];
  };

  const gameTopics = getGameSpecificTopics(gameId);

  const handleCreate = async () => {
    // Validate Topic Focus is selected
    const finalTopic = gameTopic === 'custom' ? customTopic : gameTopic;
    
    if (!finalTopic || finalTopic === 'general' || (gameTopic === 'custom' && !customTopic.trim())) {
      toast({
        title: "Topic Focus Required",
        description: "Please select a topic focus for your game before creating.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreating(true);
    try {
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
      
      const gameRequest = {
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
        // Add selected users for multiplayer invitations
        invited_users: mode === 'multiplayer' ? selectedUsers : undefined,
      };
      
      onCreateGame(gameRequest);
      onClose();
    } catch (error) {
      console.error('Failed to create game:', error);
      toast({
        title: "Game Creation Failed",
        description: "Could not create the game. Please try again.",
        variant: "destructive",
      });
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
                  <FeatureGuard feature="game_multiplayer" fallback={
                    <SelectItem value="multiplayer" disabled className="opacity-50 cursor-not-allowed">
                      👫 Multiplayer (Pro Plan Required)
                    </SelectItem>
                  }>
                    <SelectItem value="multiplayer">👫 Multiplayer</SelectItem>
                  </FeatureGuard>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'multiplayer' && (
            <>
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
              
              {/* User Selection for Multiplayer */}
              <div>
                <label className="block text-sm font-medium mb-2">🎯 Invite Players</label>
                <UserSelector
                  selectedUsers={selectedUsers}
                  onUsersChange={setSelectedUsers}
                  maxUsers={maxPlayers - 1} // Minus 1 for the host
                />
              </div>
            </>
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

          {/* Topic Focus - REQUIRED */}
          <div>
            <label className="block text-sm font-medium mb-2">
              📚 Topic Focus <span className="text-red-500">*</span>
            </label>
            <Select value={gameTopic} onValueChange={setGameTopic} required>
              <SelectTrigger className={`${!gameTopic || gameTopic === 'general' ? 'border-red-300 focus:border-red-500' : ''}`}>
                <SelectValue placeholder="🎯 Choose a topic focus for your game" />
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
                  className={`${!customTopic.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                  required
                />
              </div>
            )}
            <p className="text-xs text-red-600 mt-1 font-medium">
              ⚠️ AI will focus questions around this topic area (Required)
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
          <FeatureGuard feature={mode === 'solo' ? 'game_solo' : 'game_multiplayer'}>
            <Button 
              onClick={handleCreate} 
              disabled={
                isCreating || 
                !gameTopic || 
                gameTopic === 'general' || 
                (gameTopic === 'custom' && !customTopic.trim())
              }
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </FeatureGuard>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GameLibraryContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { createGameWithQuestions } = useGameMutations();
  const { currentLanguage, setLanguage, isTranslating } = useGameLanguage();

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
  const [isCreating, setIsCreating] = useState(false);

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
    setIsCreating(true);
    
    // Show animated loading toast with visual effects
    const loadingToast = toast({
      title: "🎮 Creating Your Amazing Game Experience...",
      description: "🚀 Setting up • 🤖 AI Configuration • 📚 Content Generation • ⚡ Almost Ready...",
      duration: Infinity,
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
        backgroundSize: '200% 200%',
        color: 'white',
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        animation: 'shimmer 3s ease-in-out infinite, gameLoadingPulse 2s ease-in-out infinite alternate, gameGlow 2.5s ease-in-out infinite',
        transform: 'translateZ(0)', // Force hardware acceleration
        willChange: 'transform, opacity, box-shadow'
      }
    });
    
    try {
      const result = await createGameWithQuestions(request);
      
      if (result.success && result.game_id) {
        // Send invitations for multiplayer games
        if (request.mode === 'multiplayer' && request.invited_users && request.invited_users.length > 0) {
          try {
            const inviteResponse = await fetch('/api/games/invite', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                room_id: result.room_id || result.game_id,
                invited_user_ids: request.invited_users.map(user => user.id),
                message: `Join my ${request.game_type.replace(/_/g, ' ')} game!`,
              }),
            });

            if (inviteResponse.ok) {
              const inviteData = await inviteResponse.json();
              toast({
                title: "🎮 Game Created & Invitations Sent!",
                description: `Game created successfully! ${inviteData.message}`,
                duration: 3000,
              });
            } else {
              // Game created but invitations failed
              toast({
                title: "🎮 Game Created!",
                description: "Game created successfully, but some invitations failed to send.",
                duration: 3000,
              });
            }
          } catch (inviteError) {
            console.error('Failed to send invitations:', inviteError);
            toast({
              title: "🎮 Game Created!",
              description: "Game created successfully, but invitations failed to send.",
              duration: 3000,
            });
          }
        } else {
          // Show appropriate toast based on game mode and auto-start status
          if (request.mode === 'solo') {
            toast({
              title: "🎮 Solo Game Started!",
              description: "Game started immediately. Redirecting to play...",
              duration: 3000,
            });
          } else {
            toast({
              title: "🎮 Multiplayer Game Created!",
              description: "Game lobby created! Invite friends to join or start playing.",
              duration: 3000,
            });
          }
        }
        
        setSelectedGame(null);
        
        // For solo games, redirect immediately to the game
        if (result.auto_started) {
          setTimeout(() => {
            router.push(`/games/play/${result.game_id}`);
          }, 1000); // Brief delay to show the toast
        } else {
          // For multiplayer games, redirect to active games tab or lobby
          setTimeout(() => {
            if (request.mode === 'multiplayer') {
              // Redirect to the game lobby
              router.push(`/games/play/${result.game_id}`);
            } else {
              router.push('/games?tab=active&refresh=true');
            }
          }, 1000);
        }
      } else {
        toast({
          title: "❌ Failed to Create Game",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Game creation error:', error);
      toast({
        title: "❌ Game Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      // Dismiss the loading toast
      if (loadingToast && loadingToast.dismiss) {
        loadingToast.dismiss();
      }
      setIsCreating(false);
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
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
              />
            </motion.div>
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
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h2
            className="text-2xl font-bold text-gray-900 dark:text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
              className="inline-block"
            >
              🎮
            </motion.span>
            {" "}
            <SimpleTranslatableText>AI Game Library</SimpleTranslatableText>
          </motion.h2>
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <GameLanguageSelector 
                value={currentLanguage}
                onValueChange={setLanguage}
                isTranslating={isTranslating}
                variant="compact"
                className="ml-auto"
              />
            </motion.div>
            <motion.div
              className="text-sm text-gray-600 dark:text-gray-400"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              <SimpleTranslatableText>
                {`${filteredAndSortedGames.length} games available`}
              </SimpleTranslatableText>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
        >
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"
            animate={{
              background: [
                "linear-gradient(90deg, rgb(59 130 246 / 0.05) 0%, rgb(147 51 234 / 0.05) 100%)",
                "linear-gradient(90deg, rgb(147 51 234 / 0.05) 0%, rgb(59 130 246 / 0.05) 100%)",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          
          <motion.p
            className="text-sm text-blue-700 dark:text-blue-300 relative z-10"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <motion.span
              className="font-semibold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
            >
              <TranslatableText>🤖 AI-Powered Games:</TranslatableText>
            </motion.span>
            <span> </span>
            <TranslatableText>
              Each game features dynamically generated content, personalized difficulty, and intelligent responses. From classic trivia to creative storytelling!
            </TranslatableText>
          </motion.p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.div
            className="relative flex-1"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              animate={{ 
                rotate: searchTerm ? [0, 360] : 0,
                scale: searchTerm ? [1, 1.2, 1] : 1
              }}
              transition={{ 
                duration: 0.5,
                ease: "easeInOut"
              }}
            >
              <Search className="h-4 w-4" />
            </motion.div>
            <Input
              placeholder="Search games..." // Note: placeholder translation requires special handling
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
            {searchTerm && (
              <motion.div
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </motion.div>
          
                     <motion.div
             whileHover={{ scale: 1.01 }}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.5, delay: 0.4 }}
           >
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 transition-all duration-300 hover:bg-muted/50">
                <motion.div
                  className="flex items-center"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ rotate: selectedCategory !== "all" ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                  </motion.div>
                  <SelectValue placeholder="Category" />
                </motion.div>
              </SelectTrigger>
              <SelectContent>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SelectItem value="all">
                    <TranslatableText>All Categories</TranslatableText>
                  </SelectItem>
                  {categories.map((category: string, index: number) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <SelectItem value={category}>
                        <GameCategoryText category={category} />
                      </SelectItem>
                    </motion.div>
                  ))}
                </motion.div>
              </SelectContent>
            </Select>
          </motion.div>

                     <motion.div
             whileHover={{ scale: 1.01 }}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.5, delay: 0.5 }}
           >
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-40 transition-all duration-300 hover:bg-muted/50">
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <SelectValue />
                </motion.div>
              </SelectTrigger>
              <SelectContent>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {[
                    { value: "name", label: "Name" },
                    { value: "popularity", label: "Popularity" },
                    { value: "duration", label: "Duration" },
                  ].map((option, index) => (
                    <motion.div
                      key={option.value}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <SelectItem value={option.value}>
                        <TranslatableText>{option.label}</TranslatableText>
                      </SelectItem>
                    </motion.div>
                  ))}
                </motion.div>
              </SelectContent>
            </Select>
          </motion.div>
        </motion.div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAndSortedGames.map((game: GameLibraryItem, index: number) => {
            const IconComponent = getIcon(game.icon_name);
            
            return (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ 
                  duration: 0.4,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                whileHover={{ 
                  y: -8,
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="h-full group cursor-pointer border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm relative overflow-hidden">
                  {/* Animated background gradient on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  {/* Shine effect on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />

                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex items-start justify-between">
                      <motion.div
                        className={cn(
                          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
                          getColorClasses(game.color_theme)
                        )}
                        whileHover={{ 
                          rotate: [0, -10, 10, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{ 
                          duration: 0.5,
                          ease: "easeInOut"
                        }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ 
                            duration: 20, 
                            repeat: Infinity, 
                            ease: "linear",
                            repeatDelay: 2
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                        />
                        <IconComponent className="h-6 w-6 relative z-10" />
                      </motion.div>
                      
                      <div className="flex gap-1">
                        {game.is_popular && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ 
                              scale: 1.1,
                              rotate: [0, -5, 5, 0],
                              transition: { duration: 0.3 }
                            }}
                          >
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              >
                                <Star className="h-3 w-3 mr-1" />
                              </motion.div>
                              <TranslatableText>Popular</TranslatableText>
                            </Badge>
                          </motion.div>
                        )}
                        {game.is_new && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            whileHover={{ 
                              scale: 1.1,
                              transition: { duration: 0.2 }
                            }}
                          >
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                              <motion.div
                                animate={{ 
                                  scale: [1, 1.2, 1],
                                  rotate: [0, 180, 360]
                                }}
                                transition={{ 
                                  duration: 1.5, 
                                  repeat: Infinity, 
                                  ease: "easeInOut",
                                  repeatDelay: 1
                                }}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                              </motion.div>
                              <TranslatableText>New</TranslatableText>
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        <motion.div
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TranslatableText>{game.display_name}</TranslatableText>
                        </motion.div>
                      </CardTitle>
                      <motion.div
                        initial={{ opacity: 0.7 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TranslatableDescription className="text-sm line-clamp-2" maxLength={120}>
                          {game.description}
                        </TranslatableDescription>
                      </motion.div>
                    </motion.div>
                  </CardHeader>

                  <CardContent className="space-y-4 relative z-10">
                    <motion.div
                      className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.div
                        className="flex items-center gap-1"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            repeatDelay: 3
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </motion.div>
                        <TranslatableText>
                          {game.min_players === game.max_players 
                            ? `${game.min_players} players`
                            : `${game.min_players}-${game.max_players} players`
                          }
                        </TranslatableText>
                      </motion.div>
                      <motion.div
                        className="flex items-center gap-1"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ 
                            duration: 8, 
                            repeat: Infinity, 
                            ease: "linear"
                          }}
                        >
                          <Clock className="h-4 w-4" />
                        </motion.div>
                        <TranslatableText>{`${game.estimated_duration_minutes}min`}</TranslatableText>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      className="flex flex-wrap gap-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {game.difficulty_levels.slice(0, 3).map((level: string, levelIndex: number) => (
                        <motion.div
                          key={level}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + levelIndex * 0.1 }}
                          whileHover={{ 
                            scale: 1.05,
                            y: -1,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <Badge variant="outline" className="text-xs">
                            <DifficultyText difficulty={level} />
                          </Badge>
                        </motion.div>
                      ))}
                      {game.difficulty_levels.length > 3 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7 }}
                          whileHover={{ 
                            scale: 1.05,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <Badge variant="outline" className="text-xs">
                            <TranslatableText>{`+${game.difficulty_levels.length - 3} more`}</TranslatableText>
                          </Badge>
                        </motion.div>
                      )}
                    </motion.div>

                    <motion.div
                      className="flex gap-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg group-hover:shadow-xl transition-all duration-300"
                          onClick={() => setSelectedGame(game.id)}
                        >
                          <motion.div
                            className="flex items-center gap-2"
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <motion.span
                              animate={{ rotate: [0, 360] }}
                              transition={{ 
                                duration: 2, 
                                repeat: Infinity, 
                                ease: "linear",
                                repeatDelay: 3
                              }}
                            >
                              🎯
                            </motion.span>
                            <TranslatableButtonText>Play Now</TranslatableButtonText>
                          </motion.div>
                        </Button>
                      </motion.div>
                    </motion.div>
                  </CardContent>

                  {/* Hover glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 -z-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredAndSortedGames.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="text-gray-400 mb-4"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              🎮
            </motion.div>
            <TranslatableText>No games found</TranslatableText>
          </motion.div>
          <motion.p
            className="text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <TranslatableText>Try adjusting your search or filter criteria</TranslatableText>
          </motion.p>
        </motion.div>
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

// Main component wrapped with language provider
export default function GameLibrary() {
  return (
    <GameLanguageProvider>
      <GameLibraryContent />
    </GameLanguageProvider>
  );
} 