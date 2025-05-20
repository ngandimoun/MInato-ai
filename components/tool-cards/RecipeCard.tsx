//components/tool-cards/RecipeCard.tsx
"use client";

import React, { useState } from "react";
import { CachedSingleRecipe, CachedRecipe } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"; // For long lists
import { ChefHat, ExternalLink, Youtube, Tag, Globe, ListOrdered, ShoppingCart, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RecipeCardProps { data: CachedSingleRecipe; }

const ExpandableSection: React.FC<{title: string, items: string[] | undefined, type: 'ingredients' | 'instructions', initialVisibleCount?: number}> = ({ title, items, type, initialVisibleCount = 3 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!items || items.length === 0) return null;

    const visibleItems = isExpanded ? items : items.slice(0, initialVisibleCount);

    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    {type === 'ingredients' ? <ShoppingCart size={14} className="text-primary/80"/> : <ListOrdered size={14} className="text-primary/80"/>}
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
                    initial={{ height: isExpanded ? "auto" : `${initialVisibleCount * 1.5}rem`, opacity: 1 }} // Estimate initial height
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                >
                    {type === 'ingredients' ? (
                        <ul className="list-disc list-inside text-xs space-y-0.5 pl-1">
                            {visibleItems.map((ing, i) => <li key={i}>{ing}</li>)}
                        </ul>
                    ) : (
                        <ol className="list-decimal list-inside text-xs space-y-1 pl-1">
                            {visibleItems.map((step, i) => <li key={i} className="leading-relaxed">{step}</li>)}
                        </ol>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};


export function RecipeCard({ data }: RecipeCardProps) {
  if (!data || !data.recipe) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <ChefHat className="h-5 w-5"/> Recipe Not Found
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
    <Card className="w-full overflow-hidden">
      {recipe.imageUrl && (
          <div className="w-full h-48 md:h-56 relative overflow-hidden">
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
             <div className="absolute bottom-3 left-3 right-3">
                <CardTitle className="text-lg md:text-xl font-bold text-white shadow-sm line-clamp-2">
                    {recipe.title}
                </CardTitle>
            </div>
          </div>
      )}
      <CardHeader className={cn(!recipe.imageUrl && "pt-6")}>
        {!recipe.imageUrl && (
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <ChefHat className="h-6 w-6 text-primary"/>
                {recipe.title}
            </CardTitle>
        )}
        <CardDescription className="text-xs flex flex-wrap gap-x-3 gap-y-1 items-center pt-1">
            {recipe.category && <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"><Tag size={12}/>{recipe.category}</span>}
            {recipe.area && <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"><Globe size={12}/>{recipe.area}</span>}
            {recipe.tags && recipe.tags.length > 0 && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Tags: {recipe.tags.slice(0,2).join(", ")}{recipe.tags.length > 2 ? "..." : ""}
                </span>
            )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {data.error ? (
             <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertCircle size={18}/> 
                <div>
                    <p className="font-medium">Error loading recipe details</p>
                    <p className="text-xs">{data.error}</p>
                </div>
            </div>
        ) : (
        <ScrollArea className="max-h-[250px] pr-3"> {/* Max height for content area */}
            <ExpandableSection title="Ingredients" items={recipe.ingredients} type="ingredients" initialVisibleCount={5}/>
            <ExpandableSection title="Instructions" items={recipe.instructions} type="instructions" initialVisibleCount={3}/>
        </ScrollArea>
        )}
      </CardContent>
      {(recipe.sourceUrl || recipe.youtubeUrl) && (
        <CardFooter className="flex flex-wrap justify-start items-center gap-2 pt-3 border-t">
            {recipe.sourceUrl && (
                <Button variant="outline" size="sm" asChild className="text-xs">
                    <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <ExternalLink className="mr-1.5 h-3 w-3"/> View Full Recipe
                    </a>
                </Button>
            )}
            {recipe.youtubeUrl && (
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-500/10 text-xs" asChild>
                    <a href={recipe.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <Youtube className="mr-1.5 h-3.5 w-3.5"/> Watch Video Tutorial
                    </a>
                </Button>
            )}
        </CardFooter>
      )}
    </Card>
  );
}