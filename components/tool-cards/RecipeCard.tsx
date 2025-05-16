//components/tool-cards/RecipeCard.tsx
"use client";

import { CachedSingleRecipe, CachedRecipe } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, ExternalLink, Youtube, Tag, Globe } from "lucide-react"; // Example icons

interface RecipeCardProps { data: CachedSingleRecipe; }

export function RecipeCard({ data }: RecipeCardProps) {
  if (!data || !data.recipe) return <p className="text-sm text-muted-foreground">No recipe data available.</p>;
  const recipe = data.recipe;

  return (
    <Card className="w-full">
      <CardHeader>
        {recipe.imageUrl && (
            <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-40 object-cover rounded-t-md mb-2"/>
        )}
        <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary"/>
            {recipe.title}
        </CardTitle>
        <CardDescription>
            {recipe.category && <span className="mr-2 inline-flex items-center gap-1"><Tag size={12}/>{recipe.category}</span>}
            {recipe.area && <span className="inline-flex items-center gap-1"><Globe size={12}/>{recipe.area}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="mb-3">
                <h4 className="text-sm font-medium mb-1">Ingredients:</h4>
                <ul className="list-disc list-inside text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
            </div>
        )}
         {recipe.instructions && recipe.instructions.length > 0 && (
            <div>
                <h4 className="text-sm font-medium mb-1">Instructions (First few steps):</h4>
                <ol className="list-decimal list-inside text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {recipe.instructions.slice(0,3).map((step, i) => <li key={i}>{step}</li>)}
                    {recipe.instructions.length > 3 && <li>...and more steps.</li>}
                </ol>
            </div>
        )}
        {data.error && <p className="text-xs text-destructive mt-2">Error: {data.error}</p>}
      </CardContent>
      <CardFooter className="flex justify-between items-center gap-2 pt-3 border-t">
        {recipe.sourceUrl && (
            <Button variant="outline" size="sm" asChild>
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3 w-3"/> View Full Recipe
                </a>
            </Button>
        )}
        {recipe.youtubeUrl && (
             <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" asChild>
                <a href={recipe.youtubeUrl} target="_blank" rel="noopener noreferrer">
                    <Youtube className="mr-1.5 h-3 w-3"/> Watch Video
                </a>
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}