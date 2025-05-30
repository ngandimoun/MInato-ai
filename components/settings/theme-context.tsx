// components/settings/theme-context.tsx
// (Content from finalcodebase.txt - verified)
"use client"

import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from "react" // Added useLayoutEffect

export type Theme = "light" | "dark" | "system"
export type ColorPalette =
  | "arctic-dawn" | "sakura-blossom" | "emerald-forest" | "cyber-neon" | "monochrome-ink"
  | "sunset-gold" | "lavender-mist" | "ocean-depths" | "desert-sand" | "midnight-galaxy"
  | "autumn-harvest" | "spring-meadow" | "royal-purple" | "tropical-paradise" | "ruby-red"
  | "midnight-blue" | "forest-green" | "sunset-orange" | "slate-gray" | "turquoise-sea"
  | "chocolate-brown" | "electric-blue" | "olive-green" | "coral-reef"
  | "velvet-purple" | "cosmic-blue" | "rose-gold" | "mint-fresh" | "cherry-blossom"
  | "golden-hour" | "mystic-violet" | "neon-lime" | "honey-amber" | "deep-crimson"
  | "aqua-marine" | "peach-cream" | "steel-blue" | "matcha-green" | "silver-moon"
  | "sunset-pink" | "ocean-blue" | "morning-mist" | "twilight-haze" | "citrus-lime"
  | "berry-punch" | "coffee-mocha" | "bamboo-green" | "flamingo-pink"

const PALETTE_CLASSES = [
  "palette-arctic-dawn", "palette-sakura-blossom", "palette-emerald-forest", "palette-cyber-neon", "palette-monochrome-ink",
  "palette-sunset-gold", "palette-lavender-mist", "palette-ocean-depths", "palette-desert-sand", "palette-midnight-galaxy",
  "palette-autumn-harvest", "palette-spring-meadow", "palette-royal-purple", "palette-tropical-paradise", "palette-ruby-red",
  "palette-midnight-blue", "palette-forest-green", "palette-sunset-orange", "palette-slate-gray", "palette-turquoise-sea",
  "palette-chocolate-brown", "palette-electric-blue", "palette-olive-green", "palette-coral-reef",
  "palette-velvet-purple", "palette-cosmic-blue", "palette-rose-gold", "palette-mint-fresh", "palette-cherry-blossom",
  "palette-golden-hour", "palette-mystic-violet", "palette-neon-lime", "palette-honey-amber", "palette-deep-crimson",
  "palette-aqua-marine", "palette-peach-cream", "palette-steel-blue", "palette-matcha-green", "palette-silver-moon",
  "palette-sunset-pink", "palette-ocean-blue", "palette-morning-mist", "palette-twilight-haze", "palette-citrus-lime",
  "palette-berry-punch", "palette-coffee-mocha", "palette-bamboo-green", "palette-flamingo-pink"
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
  defaultColorPalette = "arctic-dawn",
  storageKeyTheme = "minato-theme",
  storageKeyPalette = "minato-palette",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => (typeof window !== 'undefined' ? localStorage.getItem(storageKeyTheme) as Theme : defaultTheme) || defaultTheme)
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>(() => (typeof window !== 'undefined' ? localStorage.getItem(storageKeyPalette) as ColorPalette : defaultColorPalette) || defaultColorPalette)

  // Use useLayoutEffect to apply theme/palette before browser paints to avoid FOUC
  useLayoutEffect(() => {
    const root = window.document.documentElement

    // --- Palette Handling ---
    // Remove any existing palette classes first
    root.classList.remove(...PALETTE_CLASSES);
    // Add the current palette class
    if (colorPalette) {
      root.classList.add(`palette-${colorPalette}`);
    }

    // --- Theme Handling ---
    root.classList.remove("light", "dark");
    let effectiveTheme = theme;
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      effectiveTheme = systemTheme;
    }
    root.classList.add(effectiveTheme);

  }, [theme, colorPalette]); // Apply immediately on change

  // Update state and localStorage
  const setTheme = (newTheme: Theme) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyTheme, newTheme);
    }
    setThemeState(newTheme);
  };

  const setColorPalette = (newPalette: ColorPalette) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(storageKeyPalette, newPalette);
    }
    setColorPaletteState(newPalette);
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