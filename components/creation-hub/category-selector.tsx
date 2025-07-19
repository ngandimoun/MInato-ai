"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Share2, 
  Zap, 
  Monitor, 
  Megaphone, 
  Image as ImageIcon, 
  BarChart3, 
  Palette, 
  Package, 
  FileText, 
  User,
  ArrowRight,
  Sparkles,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CATEGORY_INFO, type ImageCategory } from './category-types';

interface CategorySelectorProps {
  onSelectCategory: (category: ImageCategory) => void;
  onClose?: () => void;
  selectedCategory?: ImageCategory | null;
  className?: string;
  titleText?: string;
  subtitleText?: string;
  searchPlaceholder?: string;
  translatedCategories?: Record<string, {name: string, description: string}>;
}

const ICON_MAP = {
  Share2,
  Zap,
  Monitor,
  Megaphone,
  Image: ImageIcon,
  BarChart3,
  Palette,
  Package,
  FileText,
  User
};

export function CategorySelector({ 
  onSelectCategory, 
  onClose, 
  selectedCategory,
  className,
  titleText = "Choose Creation Type",
  subtitleText = "Select a category to unlock specialized tools and enhanced prompts",
  searchPlaceholder = "Search categories...",
  translatedCategories = {}
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<ImageCategory | null>(null);

  const categories = Object.values(CATEGORY_INFO);

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (translatedCategories[category.id]?.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (translatedCategories[category.id]?.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCategorySelect = (categoryId: ImageCategory) => {
    onSelectCategory(categoryId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-background/95 backdrop-blur-xl border border-border/50 rounded-sm shadow-2xl overflow-hidden",
        "max-h-[90vh] flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-pink-500/10 p-4 sm:p-6 border-b border-border/30 flex-shrink-0">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent truncate">
                {titleText}
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                {subtitleText}
              </p>
              <p className="text-muted-foreground text-xs sm:hidden">
                Select a category for specialized tools
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-white/10 transition-colors flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-3 sm:mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 rounded-xl focus:border-violet-500/50 transition-all duration-200 hover:bg-background/70 focus:shadow-lg focus:shadow-violet-500/10"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {filteredCategories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No categories match your search</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            >
              {filteredCategories.map((category, index) => {
                const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP];
                const isSelected = selectedCategory === category.id;
                const isHovered = hoveredCategory === category.id;
                
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onHoverStart={() => setHoveredCategory(category.id)}
                    onHoverEnd={() => setHoveredCategory(null)}
                  >
                    <Card
                      className={cn(
                        "relative overflow-hidden border-2 transition-all duration-300 cursor-pointer group",
                        "hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30",
                        "bg-gradient-to-br from-background to-background/50",
                        "active:scale-[0.98] active:shadow-lg",
                        "touch-manipulation", // Better touch interactions
                        isSelected && "border-purple-500 shadow-lg shadow-purple-500/20",
                        isHovered && "sm:scale-[1.02] border-purple-400/50" // Only scale on non-touch devices
                      )}
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      {/* Background Gradient */}
                      <div 
                        className={cn(
                          "absolute inset-0 opacity-0 transition-opacity duration-300",
                          `bg-gradient-to-br ${category.gradient}`,
                          (isHovered || isSelected) && "opacity-5"
                        )}
                      />
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="w-2 h-2 bg-white rounded-full"
                          />
                        </motion.div>
                      )}

                      <CardContent className="p-4 sm:p-6 relative">
                        {/* Icon */}
                        <div className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-300",
                          `bg-gradient-to-br ${category.gradient}`,
                          "group-hover:scale-110 group-hover:shadow-lg group-active:scale-105"
                        )}>
                          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>

                        {/* Content */}
                        <div className="space-y-2 sm:space-y-3">
                          <div>
                            <h3 className="font-semibold text-base sm:text-lg text-foreground group-hover:text-purple-600 transition-colors leading-tight">
                              {translatedCategories[category.id]?.name || category.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                              {translatedCategories[category.id]?.description || category.description}
                            </p>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {category.tags.slice(0, 3).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-xs bg-muted/50 hover:bg-muted transition-colors"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {category.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs bg-muted/50">
                                +{category.tags.length - 3}
                              </Badge>
                            )}
                          </div>

                          {/* Examples */}
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            <span className="font-medium">Examples: </span>
                            {category.examples.slice(0, 2).join(', ')}
                          </div>
                        </div>

                        {/* Hover Arrow */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ 
                            opacity: isHovered ? 1 : 0,
                            x: isHovered ? 0 : -10
                          }}
                          transition={{ duration: 0.2 }}
                          className="absolute bottom-4 right-4"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <ArrowRight className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-shrink-0 border-t border-border/30 bg-background/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filteredCategories.length} of {categories.length} categories
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline">Enhanced AI prompts for each category</span>
            <span className="sm:hidden">Enhanced prompts</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Background Grid Pattern Component
const GridPattern = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern
        id="grid-pattern"
        width="20"
        height="20"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 20 0 L 0 0 0 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
  </svg>
);

// Add grid pattern to the component
const GridPatternStyle = () => (
  <style jsx>{`
    .bg-grid-pattern {
      background-image: 
        linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
    }
  `}</style>
); 