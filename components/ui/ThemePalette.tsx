import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { themes, ThemeType } from "@/contexts/ThemeContext";

interface ThemePaletteProps {
  currentThemeClass: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
}

export const ThemePalette: React.FC<ThemePaletteProps> = ({
  currentThemeClass,
  onThemeChange,
}) => {
  // Group themes by base color
  const groupedThemes: { [key: string]: typeof themes } = {};
  themes.forEach(theme => {
    const baseColor = theme.id.split("-")[1];
    if (!groupedThemes[baseColor]) {
      groupedThemes[baseColor] = [];
    }
    groupedThemes[baseColor].push(theme);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedThemes).map(([baseColor, themeGroup]) => (
        <div key={baseColor} className="space-y-2">
          <h3 className="text-sm font-medium capitalize">{baseColor}</h3>
          <div className="grid grid-cols-2 gap-3">
            {themeGroup.map((theme) => {
              const isActive = theme.id === currentThemeClass;
              
              return (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`
                    relative h-16 rounded-lg transition-all duration-200
                    ${theme.id} 
                    border-2 
                    ${isActive 
                      ? "border-primary ring-2 ring-primary shadow-md" 
                      : "border-transparent hover:border-muted-foreground/30"
                    }
                  `}
                  aria-label={`${theme.name} theme`}
                  title={theme.name}
                >
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-sm"
                    >
                      <Check className="h-5 w-5" />
                    </motion.div>
                  )}
                  
                  <div className="absolute inset-0 pointer-events-none rounded-lg opacity-100 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)),transparent)]" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};