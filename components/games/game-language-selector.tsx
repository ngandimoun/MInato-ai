"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Comprehensive language support
export const GAME_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'Americas' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Europe' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'Europe' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'Europe' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'Europe' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'Europe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'Europe' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'Asia' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'Asia' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'Asia' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Middle East' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'Asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'Asia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'Asia' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'Europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'Europe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'Europe' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', region: 'Europe' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', region: 'Europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', region: 'Europe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', region: 'Europe' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', region: 'Middle East' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', region: 'Europe' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', region: 'Europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', region: 'Europe' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', region: 'Europe' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', region: 'Europe' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', region: 'Europe' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', region: 'Europe' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', region: 'Europe' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', region: 'Europe' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', region: 'Europe' },
];

// Popular languages for quick access
export const POPULAR_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'ru', 'pt', 'ar'];

interface GameLanguageSelectorProps {
  value: string;
  onValueChange: (language: string) => void;
  isTranslating?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'expanded';
  showBadge?: boolean;
}

export function GameLanguageSelector({
  value,
  onValueChange,
  isTranslating = false,
  className,
  variant = 'default',
  showBadge = true
}: GameLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLanguage = GAME_LANGUAGES.find(lang => lang.code === value);

  // Group languages by region for better organization
  const languagesByRegion = GAME_LANGUAGES.reduce((acc, lang) => {
    if (!acc[lang.region]) {
      acc[lang.region] = [];
    }
    acc[lang.region].push(lang);
    return acc;
  }, {} as Record<string, typeof GAME_LANGUAGES>);

  if (variant === 'compact') {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={isTranslating}>
        <SelectTrigger className={cn("w-[140px] h-8", className)}>
          <div className="flex items-center gap-2">
            {isTranslating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Globe className="h-3 w-3" />
            )}
            <SelectValue>
              {selectedLanguage ? (
                <span className="text-xs">
                  {selectedLanguage.flag} {selectedLanguage.name}
                </span>
              ) : (
                "Language"
              )}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {POPULAR_LANGUAGES.map((langCode) => {
            const lang = GAME_LANGUAGES.find(l => l.code === langCode);
            if (!lang) return null;
            return (
              <SelectItem key={lang.code} value={lang.code}>
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  {lang.code === value && <Check className="h-3 w-3 ml-auto" />}
                </div>
              </SelectItem>
            );
          })}
          <SelectItem value="more" disabled className="opacity-50">
            <span className="text-xs">— More Languages —</span>
          </SelectItem>
          {GAME_LANGUAGES.filter(lang => !POPULAR_LANGUAGES.includes(lang.code)).map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
                {lang.code === value && <Check className="h-3 w-3 ml-auto" />}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === 'expanded') {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Game Language</h3>
            {showBadge && (
              <Badge variant="secondary" className="text-xs">
                UI Translation
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {/* Popular Languages */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Popular</h4>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_LANGUAGES.slice(0, 6).map((langCode) => {
                  const lang = GAME_LANGUAGES.find(l => l.code === langCode);
                  if (!lang) return null;
                  return (
                    <Button
                      key={lang.code}
                      variant={value === lang.code ? "default" : "outline"}
                      size="sm"
                      onClick={() => onValueChange(lang.code)}
                      disabled={isTranslating}
                      className="justify-start h-8"
                    >
                      <span className="mr-2">{lang.flag}</span>
                      <span className="text-xs">{lang.name}</span>
                      {value === lang.code && <Check className="h-3 w-3 ml-auto" />}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* All Languages Dropdown */}
            <Select value={value} onValueChange={onValueChange} disabled={isTranslating}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  {isTranslating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  <SelectValue>
                    {selectedLanguage ? (
                      <span>
                        {selectedLanguage.flag} {selectedLanguage.nativeName}
                      </span>
                    ) : (
                      "Select Language"
                    )}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {Object.entries(languagesByRegion).map(([region, languages]) => (
                  <div key={region}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {region}
                    </div>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2 w-full">
                          <span>{lang.flag}</span>
                          <div className="flex flex-col items-start">
                            <span className="text-sm">{lang.name}</span>
                            <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
                          </div>
                          {lang.code === value && <Check className="h-3 w-3 ml-auto" />}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language Info */}
          {selectedLanguage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">{selectedLanguage.flag}</span>
                <div>
                  <div className="font-medium">{selectedLanguage.nativeName}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLanguage.name} • {selectedLanguage.region}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Game interface will be translated to this language using AI.
              </div>
            </motion.div>
          )}

          {isTranslating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Translating interface...</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={value} onValueChange={onValueChange} disabled={isTranslating}>
        <SelectTrigger className="w-[180px]">
          <div className="flex items-center gap-2">
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            <SelectValue>
              {selectedLanguage ? (
                <span>
                  {selectedLanguage.flag} {selectedLanguage.name}
                </span>
              ) : (
                "Select Language"
              )}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {/* Popular Languages Section */}
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
            Popular
          </div>
          {POPULAR_LANGUAGES.map((langCode) => {
            const lang = GAME_LANGUAGES.find(l => l.code === langCode);
            if (!lang) return null;
            return (
              <SelectItem key={lang.code} value={lang.code}>
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  {lang.code === value && <Check className="h-3 w-3 ml-auto" />}
                </div>
              </SelectItem>
            );
          })}
          
          {/* All Languages by Region */}
          {Object.entries(languagesByRegion).map(([region, languages]) => {
            const nonPopularLanguages = languages.filter(lang => !POPULAR_LANGUAGES.includes(lang.code));
            if (nonPopularLanguages.length === 0) return null;
            
            return (
              <div key={region}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {region}
                </div>
                {nonPopularLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {lang.code === value && <Check className="h-3 w-3 ml-auto" />}
                    </div>
                  </SelectItem>
                ))}
              </div>
            );
          })}
        </SelectContent>
      </Select>
      
      {showBadge && (
        <Badge variant="secondary" className="text-xs">
          UI Only
        </Badge>
      )}
    </div>
  );
} 