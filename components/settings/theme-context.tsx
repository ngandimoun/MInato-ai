// components/settings/theme-context.tsx
// (Content from finalcodebase.txt - verified)
"use client"

import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from "react" // Added useLayoutEffect

export type Theme = "light" | "dark" | "system"
export type ColorPalette =
  | "aki-no-mori" | "sakura-breeze" | "komorebi-path" | "neo-kyoto-glow" | "setsugen-whisper"
  | "yugure-sky" | "kaguya-moon" | "shinkai-depths" | "fuji-sunrise" | "tanabata-wish"
  | "kitsune-fire" | "ghibli-meadow" | "ryujin-palace" | "umi-no-iro" | "tengu-mountain"
  | "hotaru-night" | "matcha-garden" | "kamikakushi-hues" | "shonen-spirit" | "maho-shojo-sparkle"
  | "tsuchi-earth" | "raijin-spark" | "take-grove" | "sango-reef"
  | "murasaki-silk" | "hoshi-cosmos" | "sakura-gold" | "wakaba-mint" | "hanami-bloom"
  | "kiniro-hour" | "onmyoji-violet" | "midori-neon" | "mitsu-amber" | "akane-crimson"
  | "mizu-aqua" | "momo-cream" | "hagane-steel" | "ocha-green" | "tsuki-silver"
  | "yuuhi-pink" | "kaiyou-blue" | "asagiri-mist" | "tasogare-haze" | "yuzu-citrus"
  | "ichigo-punch" | "kohi-mocha" | "take-bamboo" | "tsuru-pink"

const PALETTE_CLASSES = [
  "palette-aki-no-mori", "palette-sakura-breeze", "palette-komorebi-path", "palette-neo-kyoto-glow", "palette-setsugen-whisper",
  "palette-yugure-sky", "palette-kaguya-moon", "palette-shinkai-depths", "palette-fuji-sunrise", "palette-tanabata-wish",
  "palette-kitsune-fire", "palette-ghibli-meadow", "palette-ryujin-palace", "palette-umi-no-iro", "palette-tengu-mountain",
  "palette-hotaru-night", "palette-matcha-garden", "palette-kamikakushi-hues", "palette-shonen-spirit", "palette-maho-shojo-sparkle",
  "palette-tsuchi-earth", "palette-raijin-spark", "palette-take-grove", "palette-sango-reef",
  "palette-murasaki-silk", "palette-hoshi-cosmos", "palette-sakura-gold", "palette-wakaba-mint", "palette-hanami-bloom",
  "palette-kiniro-hour", "palette-onmyoji-violet", "palette-midori-neon", "palette-mitsu-amber", "palette-akane-crimson",
  "palette-mizu-aqua", "palette-momo-cream", "palette-hagane-steel", "palette-ocha-green", "palette-tsuki-silver",
  "palette-yuuhi-pink", "palette-kaiyou-blue", "palette-asagiri-mist", "palette-tasogare-haze", "palette-yuzu-citrus",
  "palette-ichigo-punch", "palette-kohi-mocha", "palette-take-bamboo", "palette-tsuru-pink"
];

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultColorPalette?: ColorPalette
  storageKeyTheme?: string
  storageKeyPalette?: string
}

interface ThemeContextType {
  theme: Theme
  colorPalette: ColorPalette
  setTheme: (theme: Theme) => void
  setColorPalette: (palette: ColorPalette) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultColorPalette = "komorebi-path",
  storageKeyTheme = "minato-theme",
  storageKeyPalette = "minato-palette",
}: ThemeProviderProps) {
  // Initialize with default values to prevent hydration mismatch
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>(defaultColorPalette)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load saved values from localStorage after hydration
  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKeyTheme) as Theme
    const savedPalette = localStorage.getItem(storageKeyPalette) as ColorPalette
    
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system")) {
      setThemeState(savedTheme)
    }
    
    if (savedPalette && PALETTE_CLASSES.includes(`palette-${savedPalette}`)) {
      setColorPaletteState(savedPalette)
    }
    
    setIsHydrated(true)
  }, [storageKeyTheme, storageKeyPalette])

  // Use useLayoutEffect to apply theme/palette before browser paints to avoid FOUC
  useLayoutEffect(() => {
    if (!isHydrated) return // Don't apply until hydrated to prevent mismatch
    
    const root = window.document.documentElement

    // --- Palette Handling ---
    // Remove any existing palette classes first
    root.classList.remove(...PALETTE_CLASSES);
    // Add the current palette class
    if (colorPalette) {
      root.classList.add(`palette-${colorPalette}`);
      console.log(`Applied palette class: palette-${colorPalette}`, root.classList.toString());
    }

    // --- Theme Handling ---
    root.classList.remove("light", "dark");
    let effectiveTheme = theme;
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      effectiveTheme = systemTheme;
    }
    root.classList.add(effectiveTheme);
    console.log(`Applied theme: ${effectiveTheme}, classes:`, root.classList.toString());

  }, [theme, colorPalette, isHydrated]); // Apply immediately on change

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system" || !isHydrated) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Re-apply theme when system preference changes
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      root.classList.add(systemTheme);
      console.log(`System theme changed to: ${systemTheme}`);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, isHydrated]);

  // Update state and localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (isHydrated) {
      localStorage.setItem(storageKeyTheme, newTheme);
    }
  };

  const setColorPalette = (newPalette: ColorPalette) => {
    setColorPaletteState(newPalette);
    if (isHydrated) {
      localStorage.setItem(storageKeyPalette, newPalette);
    }
  };

  const value = {
    theme,
    colorPalette,
    setTheme,
    setColorPalette,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}