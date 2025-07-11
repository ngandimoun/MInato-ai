"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useGameTranslation } from '@/context/game-language-context';
import { cn } from '@/lib/utils';

interface TranslatableTextProps {
  children: string;
  className?: string;
  fallback?: React.ReactNode;
  showLoader?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export function TranslatableText({ 
  children, 
  className, 
  fallback,
  showLoader = true,
  as: Component = 'span',
  ...props
}: TranslatableTextProps) {
  const { translatedText, isLoading } = useGameTranslation(children);

  if (isLoading && showLoader) {
    return (
      <Component className={cn("inline-flex items-center gap-1", className)} {...props}>
        <Loader2 className="h-3 w-3 animate-spin opacity-50" />
        {fallback || children}
      </Component>
    );
  }

  return (
    <Component className={className} {...props}>
      {translatedText}
    </Component>
  );
}

interface TranslatableHeadingProps {
  children: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  showLoader?: boolean;
}

export function TranslatableHeading({ 
  children, 
  level = 2, 
  className,
  showLoader = true,
  ...props
}: TranslatableHeadingProps) {
  const { translatedText, isLoading } = useGameTranslation(children);
  const Component = `h${level}` as keyof JSX.IntrinsicElements;

  if (isLoading && showLoader) {
    return (
      <Component className={cn("flex items-center gap-2", className)} {...props}>
        <Loader2 className="h-4 w-4 animate-spin opacity-50" />
        {children}
      </Component>
    );
  }

  return (
    <Component className={className} {...props}>
      {translatedText}
    </Component>
  );
}

interface TranslatableDescriptionProps {
  children: string;
  className?: string;
  maxLength?: number;
  showLoader?: boolean;
}

export function TranslatableDescription({ 
  children, 
  className,
  maxLength,
  showLoader = true,
  ...props
}: TranslatableDescriptionProps) {
  const { translatedText, isLoading } = useGameTranslation(children);

  let displayText = translatedText;
  if (maxLength && displayText.length > maxLength) {
    displayText = displayText.substring(0, maxLength) + '...';
  }

  if (isLoading && showLoader) {
    return (
      <p className={cn("flex items-center gap-1 text-muted-foreground", className)} {...props}>
        <Loader2 className="h-3 w-3 animate-spin opacity-50" />
        {children.length > (maxLength || 100) ? children.substring(0, maxLength || 100) + '...' : children}
      </p>
    );
  }

  return (
    <p className={cn("text-muted-foreground", className)} {...props}>
      {displayText}
    </p>
  );
}

interface TranslatableBadgeProps {
  children: string;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  showLoader?: boolean;
}

export function TranslatableBadge({ 
  children, 
  className,
  variant = "secondary",
  showLoader = false, // Badges usually don't need loaders
  ...props
}: TranslatableBadgeProps) {
  const { translatedText, isLoading } = useGameTranslation(children);
  
  // For badges, we'll show the original text while loading to avoid layout shift
  const displayText = isLoading ? children : translatedText;

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "destructive" && "bg-destructive text-destructive-foreground",
        variant === "outline" && "border border-input bg-background",
        className
      )} 
      {...props}
    >
      {displayText}
    </span>
  );
}

interface TranslatableButtonTextProps {
  children: string;
  className?: string;
  showLoader?: boolean;
}

export function TranslatableButtonText({ 
  children, 
  className,
  showLoader = false, // Buttons usually don't need loaders to avoid layout shift
  ...props
}: TranslatableButtonTextProps) {
  const { translatedText, isLoading } = useGameTranslation(children);
  
  return (
    <span className={className} {...props}>
      {isLoading && showLoader ? children : translatedText}
    </span>
  );
}

// Specialized component for game category translations
interface GameCategoryTextProps {
  category: string;
  className?: string;
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'trivia': 'Trivia',
  'puzzle': 'Puzzle',
  'strategy': 'Strategy',
  'creative': 'Creative',
  'social': 'Social',
  'educational': 'Educational',
  'action': 'Action',
  'adventure': 'Adventure',
  'simulation': 'Simulation',
  'casual': 'Casual',
  'competitive': 'Competitive',
  'cooperative': 'Cooperative',
};

export function GameCategoryText({ category, className }: GameCategoryTextProps) {
  const displayText = CATEGORY_TRANSLATIONS[category.toLowerCase()] || category;
  const { translatedText } = useGameTranslation(displayText);

  return (
    <span className={className}>
      {translatedText}
    </span>
  );
}

// Specialized component for difficulty level translations
interface DifficultyTextProps {
  difficulty: string;
  className?: string;
}

const DIFFICULTY_TRANSLATIONS: Record<string, string> = {
  'beginner': 'Beginner',
  'easy': 'Easy',
  'medium': 'Medium',
  'hard': 'Hard',
  'expert': 'Expert',
  'nightmare': 'Nightmare',
};

export function DifficultyText({ difficulty, className }: DifficultyTextProps) {
  const displayText = DIFFICULTY_TRANSLATIONS[difficulty.toLowerCase()] || difficulty;
  const { translatedText } = useGameTranslation(displayText);

  return (
    <span className={className}>
      {translatedText}
    </span>
  );
} 