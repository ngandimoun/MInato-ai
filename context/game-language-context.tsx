"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { GAME_LANGUAGES } from '@/components/games/game-language-selector';

interface GameLanguageContextType {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  translateText: (text: string) => Promise<string>;
  translateArray: (texts: string[]) => Promise<string[]>;
  isTranslating: boolean;
  getSupportedLanguages: () => typeof GAME_LANGUAGES;
  getLanguageInfo: (code: string) => typeof GAME_LANGUAGES[0] | undefined;
}

const GameLanguageContext = createContext<GameLanguageContextType | undefined>(undefined);

interface GameLanguageProviderProps {
  children: ReactNode;
}

export function GameLanguageProvider({ children }: GameLanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const { translateText: baseTranslateText, translateArray: baseTranslateArray, isTranslating } = useTranslation();

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('game-language');
    if (savedLanguage && GAME_LANGUAGES.find(lang => lang.code === savedLanguage)) {
      console.log('Loading saved language:', savedLanguage);
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  const setLanguage = (language: string) => {
    console.log('Setting language:', language);
    setCurrentLanguage(language);
    // Persist language preference
    localStorage.setItem('game-language', language);
  };

  const translateText = async (text: string): Promise<string> => {
    if (currentLanguage === 'en' || !text.trim()) {
      return text;
    }
    
    console.log('Translating:', text, 'to', currentLanguage);
    try {
      // Correct parameter order: text, targetLanguage, sourceLanguage
      const result = await baseTranslateText(text, currentLanguage, 'en');
      console.log('Translation result:', result);
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const translateArray = async (texts: string[]): Promise<string[]> => {
    if (currentLanguage === 'en' || texts.length === 0) {
      return texts;
    }
    
    try {
      // Correct parameter order: texts, targetLanguage, sourceLanguage  
      return await baseTranslateArray(texts, currentLanguage, 'en');
    } catch (error) {
      console.error('Array translation error:', error);
      return texts;
    }
  };

  const getSupportedLanguages = () => GAME_LANGUAGES;

  const getLanguageInfo = (code: string) => {
    return GAME_LANGUAGES.find(lang => lang.code === code);
  };

  const value: GameLanguageContextType = {
    currentLanguage,
    setLanguage,
    translateText,
    translateArray,
    isTranslating,
    getSupportedLanguages,
    getLanguageInfo,
  };

  return (
    <GameLanguageContext.Provider value={value}>
      {children}
    </GameLanguageContext.Provider>
  );
}

export function useGameLanguage() {
  const context = useContext(GameLanguageContext);
  if (context === undefined) {
    throw new Error('useGameLanguage must be used within a GameLanguageProvider');
  }
  return context;
}

// Hook for translating specific text with caching
export function useGameTranslation(text: string) {
  const { translateText, currentLanguage, isTranslating } = useGameLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use a ref to track the current text to avoid stale closures
  const currentTextRef = useRef(text);
  currentTextRef.current = text;

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const translate = async () => {
      // If English, just set the text immediately
      if (currentLanguage === 'en') {
        if (isMounted) {
          setTranslatedText(text);
          setIsLoading(false);
        }
        return;
      }

      // Don't translate empty or very short strings
      if (!text || text.trim().length < 2) {
        if (isMounted) {
          setTranslatedText(text);
          setIsLoading(false);
        }
        return;
      }

      // Debounce translation requests
      timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        
        setIsLoading(true);
        try {
          const result = await translateText(text);
          if (isMounted && currentTextRef.current === text) {
            setTranslatedText(result);
          }
        } catch (error) {
          console.error('Translation failed:', error);
          if (isMounted && currentTextRef.current === text) {
            setTranslatedText(text); // Fallback to original text
          }
        } finally {
          if (isMounted && currentTextRef.current === text) {
            setIsLoading(false);
          }
        }
      }, 100); // Small debounce delay
    };

    translate();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [text, currentLanguage]); // Remove translateText from dependencies to prevent loops

  return {
    translatedText: translatedText || text,
    isLoading: isLoading,
    originalText: text,
  };
} 