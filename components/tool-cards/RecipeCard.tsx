//components/tool-cards/RecipeCard.tsx
"use client";

import React, { useState } from "react";
import { CachedSingleRecipe, CachedRecipe } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChefHat, ExternalLink, Youtube, Tag, Globe, ListOrdered, ShoppingCart, AlertCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RecipeCardProps { data: CachedSingleRecipe; }

const ExpandableSection: React.FC<{title: string, items: string[] | undefined, type: 'ingredients' | 'instructions', initialVisibleCount?: number}> = ({ title, items, type, initialVisibleCount = 3 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!items || items.length === 0) return null;

    const visibleItems = isExpanded ? items : items.slice(0, initialVisibleCount);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="mb-3"
        >
            <div className="flex justify-between items-center mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    {type === 'ingredients' ? <ShoppingCart size={14} className="text-cyan-500"/> : <ListOrdered size={14} className="text-cyan-500"/>}
                    {title}:
                </h4>
                {items.length > initialVisibleCount && (
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs h-auto p-1">
                        {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        {isExpanded ? "Show Less" : "Show More"}
                    </Button>
                )}
            </div>
            <AnimatePresence initial={false}>
                <motion.div
                    initial={{ height: isExpanded ? "auto" : `${initialVisibleCount * 1.5}rem`, opacity: 1 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                >
                    {type === 'ingredients' ? (
                        <ul className="list-disc list-inside text-xs space-y-0.5 pl-1">
                            {visibleItems.map((ing, i) => (
                                <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + (i * 0.03) }}
                                >
                                    {ing}
                                </motion.li>
                            ))}
                        </ul>
                    ) : (
                        <ol className="list-decimal list-inside text-xs space-y-1 pl-1">
                            {visibleItems.map((step, i) => (
                                <motion.li 
                                    key={i} 
                                    className="leading-relaxed"
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + (i * 0.05) }}
                                >
                                    {step}
                                </motion.li>
                            ))}
                        </ol>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};


export function RecipeCard({ data }: RecipeCardProps) {
  if (!data || !data.recipe) {
    return (
        <Card className="w-full glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="flex items-center"
                    >
                        <ChefHat className="h-5 w-5 text-cyan-500 mr-1"/>
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                    </motion.div>
                    <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Recipe Not Found
                    </motion.span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    {data?.error ? `Error: ${data.error}` : "No recipe data available to display."}
                </p>
            </CardContent>
        </Card>
    );
  }
  const recipe = data.recipe;

  return (
    <Card className="w-full overflow-hidden glass-card">
      {/* Card accent */}
      <span className="card-accent-left from-cyan-500/20 to-cyan-400/10" />
      <span className="card-accent-top from-cyan-500/20 to-cyan-400/10" />
      
      {recipe.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full h-48 md:h-56 relative overflow-hidden minato-glow"
          >
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-300 ease-in-out hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
             <div className="absolute bottom-3 left-3 right-3">
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                >
                    <CardTitle className="text-lg md:text-xl font-bold text-white shadow-sm line-clamp-2">
                        {recipe.title}
                    </CardTitle>
                </motion.div>
            </div>
          </motion.div>
      )}
      <CardHeader className={cn(!recipe.imageUrl && "pt-4 pb-2", "pb-2")}>
        {!recipe.imageUrl && (
            <CardTitle className="flex items-center gap-2 text-base">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="flex items-center"
                >
                    <ChefHat className="h-5 w-5 text-cyan-500 mr-1"/>
                    <Sparkles className="h-3 w-3 text-cyan-400" />
                </motion.div>
                <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {recipe.title}
                </motion.span>
            </CardTitle>
        )}
        <CardDescription className="text-xs flex flex-wrap gap-x-3 gap-y-1 items-center pt-1">
            {recipe.category && <span className="memory-chip bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"><Tag size={12}/>{recipe.category}</span>}
            {recipe.area && <span className="memory-chip bg-blue-500/10 text-blue-600 dark:text-blue-400"><Globe size={12}/>{recipe.area}</span>}
            {recipe.tags && recipe.tags.length > 0 && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                    {recipe.tags.slice(0,2).join(", ")}{recipe.tags.length > 2 ? "..." : ""}
                </span>
            )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        {data.error ? (
             <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={18}/> 
                <div>
                    <p className="font-medium">Error loading recipe details</p>
                    <p className="text-xs">{data.error}</p>
                </div>
            </div>
        ) : (
        <ScrollArea className="max-h-[250px] pr-3 custom-scrollbar"> {/* Max height for content area */}
            <ExpandableSection title="Ingredients" items={recipe.ingredients} type="ingredients" initialVisibleCount={5}/>
            <ExpandableSection title="Instructions" items={recipe.instructions} type="instructions" initialVisibleCount={2}/>
        </ScrollArea>
        )}
      </CardContent>
      {(recipe.sourceUrl || recipe.youtubeUrl) && (
        <CardFooter className="flex flex-wrap justify-between items-center gap-2 pt-2 pb-3 border-t text-xs text-muted-foreground">
            <span className="text-[11px] opacity-70">{recipe.area ? `${recipe.area} cuisine` : "Recipe"}</span>
            <div className="flex gap-2">
                {recipe.sourceUrl && (
                    <Button variant="outline" size="sm" asChild className="text-xs h-7">
                        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <ExternalLink className="mr-1.5 h-3 w-3"/> Full Recipe
                        </a>
                    </Button>
                )}
                {recipe.youtubeUrl && (
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-500/10 text-xs h-7" asChild>
                        <a href={recipe.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Youtube className="mr-1.5 h-3.5 w-3.5"/> Video
                        </a>
                    </Button>
                )}
            </div>
        </CardFooter>
      )}
    </Card>
  );
}