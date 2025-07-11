"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useGameLanguage } from '@/context/game-language-context';
import { cn } from '@/lib/utils';

interface SimpleTranslatableTextProps {
  children: React.ReactNode;
  className?: string;
  showLoader?: boolean;
}

export function SimpleTranslatableText({ 
  children, 
  className,
  showLoader = true,
}: SimpleTranslatableTextProps) {
  const { currentLanguage, translateText } = useGameLanguage();
  const [translatedText, setTranslatedText] = useState(children);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Ensure children is a string
    const textToTranslate = typeof children === 'string' ? children : String(children || '');
    
    // If English, just use original text
    if (currentLanguage === 'en') {
      setTranslatedText(textToTranslate);
      setIsLoading(false);
      return;
    }

    // Don't translate very short or empty strings
    if (!textToTranslate || textToTranslate.trim().length < 3) {
      setTranslatedText(textToTranslate);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const doTranslation = async () => {
      try {
        console.log('Simple translating:', textToTranslate);
        const result = await translateText(textToTranslate);
        if (isMounted) {
          setTranslatedText(result);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Simple translation failed:', error);
        if (isMounted) {
          setTranslatedText(textToTranslate);
          setIsLoading(false);
        }
      }
    };

    // Add a small delay to prevent too many simultaneous requests
    const timeoutId = setTimeout(doTranslation, 50);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [children, currentLanguage]); // Only depend on these two values

  // Ensure we have a string for display
  const displayText = typeof children === 'string' ? children : String(children || '');

  if (isLoading && showLoader) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <Loader2 className="h-3 w-3 animate-spin opacity-50" />
        {displayText}
      </span>
    );
  }

  return (
    <span className={className}>
      {translatedText}
    </span>
  );
} 