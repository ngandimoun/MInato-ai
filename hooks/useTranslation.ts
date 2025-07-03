import { useState, useCallback, useRef } from "react";

interface TranslationCache {
  [key: string]: string;
}

interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  wasTranslated: boolean;
}

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const cacheRef = useRef<TranslationCache>({});

  const translateText = useCallback(async (
    text: string,
    targetLanguage: string,
    sourceLanguage: string = "en"
  ): Promise<string> => {
    if (!text || !targetLanguage) return text;

    // Return original text if target is English or same as source
    if (targetLanguage === "en" || targetLanguage === sourceLanguage) {
      return text;
    }

    // Create cache key
    const cacheKey = `${text}:${sourceLanguage}:${targetLanguage}`;
    
    // Check cache first
    if (cacheRef.current[cacheKey]) {
      return cacheRef.current[cacheKey];
    }

    setIsTranslating(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const result: TranslationResult = await response.json();
      
      // Cache the result
      cacheRef.current[cacheKey] = result.translatedText;
      
      return result.translatedText;
    } catch (error) {
      console.error("Translation error:", error);
      // Return original text on error
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const translateArray = useCallback(async (
    items: string[],
    targetLanguage: string,
    sourceLanguage: string = "en"
  ): Promise<string[]> => {
    if (!items.length || targetLanguage === "en" || targetLanguage === sourceLanguage) {
      return items;
    }

    const translations = await Promise.all(
      items.map(item => translateText(item, targetLanguage, sourceLanguage))
    );

    return translations;
  }, [translateText]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  return {
    translateText,
    translateArray,
    isTranslating,
    clearCache,
  };
} 