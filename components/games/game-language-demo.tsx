"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, Star, Zap, Play } from 'lucide-react';
import { GameLanguageProvider, useGameLanguage } from '@/context/game-language-context';
import { GameLanguageSelector } from './game-language-selector';
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

function LanguageDemoContent() {
  const { currentLanguage, setLanguage, isTranslating } = useGameLanguage();

  const sampleGame = {
    id: 'demo_game',
    display_name: 'Classic Academia Quiz',
    description: 'Test your knowledge in History, Geography, Science, and Mathematics. From Ancient Rome to Astrophysics.',
    category: 'trivia',
    min_players: 1,
    max_players: 8,
    estimated_duration_minutes: 15,
    difficulty_levels: ['easy', 'medium', 'hard'],
    is_popular: true,
    is_new: false,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Language Selector */}
      <div className="flex items-center justify-between">
        <TranslatableHeading level={2} className="text-2xl font-bold">
          🎮 AI Game Library Language Demo
        </TranslatableHeading>
        <GameLanguageSelector 
          value={currentLanguage}
          onValueChange={setLanguage}
          isTranslating={isTranslating}
          variant="expanded"
        />
      </div>

      {/* Demo Info */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <TranslatableText className="font-semibold">🌍 Language Translation Demo:</TranslatableText>
          <span> </span>
          <TranslatableText>
            This demo shows how the AI Game Library interface adapts to different languages. All UI text is automatically translated while maintaining the original functionality.
          </TranslatableText>
        </p>
      </div>

      {/* Sample UI Elements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sample Game Card */}
        <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center">
                <span className="text-xl">🎓</span>
              </div>
              <div className="flex gap-1">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Star className="h-3 w-3 mr-1" />
                  <TranslatableText>Popular</TranslatableText>
                </Badge>
              </div>
            </div>
            
            <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <TranslatableText>{sampleGame.display_name}</TranslatableText>
            </CardTitle>
            <TranslatableDescription className="text-sm line-clamp-2" maxLength={120}>
              {sampleGame.description}
            </TranslatableDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <TranslatableText>
                  {sampleGame.min_players === sampleGame.max_players 
                    ? `${sampleGame.min_players} players`
                    : `${sampleGame.min_players}-${sampleGame.max_players} players`
                  }
                </TranslatableText>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <TranslatableText>{sampleGame.estimated_duration_minutes}min</TranslatableText>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {sampleGame.difficulty_levels.map((level: string) => (
                <Badge key={level} variant="outline" className="text-xs">
                  <DifficultyText difficulty={level} />
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Play className="h-4 w-4 mr-1" />
                <TranslatableButtonText>Demo</TranslatableButtonText>
              </Button>
              <Button className="flex-1 group-hover:bg-blue-600 transition-colors">
                🎯 <TranslatableButtonText>Play Now</TranslatableButtonText>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Translation Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🌐</span>
              <TranslatableText>Translation Status</TranslatableText>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <TranslatableText>Current Language:</TranslatableText>
                <Badge variant="outline">
                  {currentLanguage === 'en' ? '🇺🇸 English' : `${currentLanguage.toUpperCase()}`}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <TranslatableText>Translation Status:</TranslatableText>
                <Badge variant={isTranslating ? "secondary" : "default"}>
                  {isTranslating ? (
                    <TranslatableText>Translating...</TranslatableText>
                  ) : (
                    <TranslatableText>Ready</TranslatableText>
                  )}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <TranslatableText className="font-medium">Sample Categories:</TranslatableText>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline"><GameCategoryText category="trivia" /></Badge>
                <Badge variant="outline"><GameCategoryText category="puzzle" /></Badge>
                <Badge variant="outline"><GameCategoryText category="creative" /></Badge>
                <Badge variant="outline"><GameCategoryText category="educational" /></Badge>
              </div>
            </div>

            <div className="space-y-2">
              <TranslatableText className="font-medium">Sample Difficulties:</TranslatableText>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline"><DifficultyText difficulty="beginner" /></Badge>
                <Badge variant="outline"><DifficultyText difficulty="easy" /></Badge>
                <Badge variant="outline"><DifficultyText difficulty="medium" /></Badge>
                <Badge variant="outline"><DifficultyText difficulty="hard" /></Badge>
                <Badge variant="outline"><DifficultyText difficulty="expert" /></Badge>
              </div>
            </div>

            <div className="pt-2 border-t">
              <TranslatableText className="text-sm text-muted-foreground">
                Language preference is automatically saved and will persist across sessions.
              </TranslatableText>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>
            <TranslatableText>✨ Translation Features</TranslatableText>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl mb-2">🚀</div>
              <TranslatableText className="font-medium">Real-time Translation</TranslatableText>
              <p className="text-sm text-muted-foreground mt-1">
                <TranslatableText>
                  AI-powered translation with instant updates
                </TranslatableText>
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl mb-2">💾</div>
              <TranslatableText className="font-medium">Persistent Preferences</TranslatableText>
              <p className="text-sm text-muted-foreground mt-1">
                <TranslatableText>
                  Your language choice is saved automatically
                </TranslatableText>
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl mb-2">🌍</div>
              <TranslatableText className="font-medium">32+ Languages</TranslatableText>
              <p className="text-sm text-muted-foreground mt-1">
                <TranslatableText>
                  Comprehensive language support worldwide
                </TranslatableText>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GameLanguageDemo() {
  return (
    <GameLanguageProvider>
      <LanguageDemoContent />
    </GameLanguageProvider>
  );
} 