// FILE: lib/tools/RecipeSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is imported
import { logger } from "../../memory-framework/config";
import { CachedRecipe, CachedSingleRecipe } from "@/lib/types/index";
import { appConfig } from "../config";

interface RecipeSearchInput extends ToolInput {
  query: string; // Required
}

interface MealDbMeal {
  idMeal: string; strMeal: string; strDrinkAlternate?: string | null; strCategory?: string; strArea?: string;
  strInstructions?: string; strMealThumb?: string; strTags?: string | null; strYoutube?: string | null;
  strIngredient1?: string | null; strMeasure1?: string | null; strIngredient2?: string | null; strMeasure2?: string | null;
  strIngredient3?: string | null; strMeasure3?: string | null; strIngredient4?: string | null; strMeasure4?: string | null;
  strIngredient5?: string | null; strMeasure5?: string | null; strIngredient6?: string | null; strMeasure6?: string | null;
  strIngredient7?: string | null; strMeasure7?: string | null; strIngredient8?: string | null; strMeasure8?: string | null;
  strIngredient9?: string | null; strMeasure9?: string | null; strIngredient10?: string | null; strMeasure10?: string | null;
  strIngredient11?: string | null; strMeasure11?: string | null; strIngredient12?: string | null; strMeasure12?: string | null;
  strIngredient13?: string | null; strMeasure13?: string | null; strIngredient14?: string | null; strMeasure14?: string | null;
  strIngredient15?: string | null; strMeasure15?: string | null; strIngredient16?: string | null; strMeasure16?: string | null;
  strIngredient17?: string | null; strMeasure17?: string | null; strIngredient18?: string | null; strMeasure18?: string | null;
  strIngredient19?: string | null; strMeasure19?: string | null; strIngredient20?: string | null; strMeasure20?: string | null;
  strSource?: string | null; strImageSource?: string | null; strCreativeCommonsConfirmed?: string | null; dateModified?: string | null;
  [key: `strIngredient${number}`]: string | null | undefined;
  [key: `strMeasure${number}`]: string | null | undefined;
}
interface MealDbSearchResponse { meals: MealDbMeal[] | null; }

export class RecipeSearchTool extends BaseTool {
  name = "RecipeSearchTool";
  description = "Searches for recipes by dish name or main ingredient using TheMealDB (a free recipe database). Provides details like ingredients, instructions, and image.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "The name of the dish or a key ingredient to search recipes for (e.g., 'Chicken Alfredo', 'avocado toast', 'chocolate chip cookies'). This is required." } as OpenAIToolParameterProperties,
    },
    required: ["query"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 24; // Cache recipes for a day

  private readonly API_BASE = "https://www.themealdb.com/api/json/v1/1";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    this.log("info", "Recipe Tool initialized using TheMealDB (Free Tier API Key '1').");
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update USER_AGENT in RecipeSearchTool with actual contact/app URL if defaults are used.");
    }
  }

  private extractIngredients(meal: MealDbMeal): string[] {
    const ingredients: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const ingredientKey = `strIngredient${i}` as keyof MealDbMeal;
      const measureKey = `strMeasure${i}` as keyof MealDbMeal;
      const ingredient = meal[ingredientKey];
      const measure = meal[measureKey];
      if (ingredient && String(ingredient).trim()) { // Ensure ingredient is treated as string
        ingredients.push(`${measure ? String(measure).trim() : ""} ${String(ingredient).trim()}`.trim());
      } else { break; } 
    }
    return ingredients;
  }

  private mapMealToAppRecipeContent(meal: MealDbMeal): Omit<CachedRecipe, "result_type" | "source_api" | "query" | "error"> {
    const ingredients = this.extractIngredients(meal);
    // Keep instructions as an array of strings for easier UI rendering and to preserve steps
    const instructionsArray = meal.strInstructions?.split(/(\r\n|\n|\r)/) // Split by any newline sequence
        .map(s => s.trim())
        .filter(s => s.length > 0 && !/^\d+\.$/.test(s) && !/^STEP \d+$/i.test(s)) // Filter out empty lines and "STEP X" type lines
        .map(s => s.startsWith(".") ? s.substring(1).trim() : s) // Remove leading dots if any
        .filter(s => s.length > 5) // Filter out very short/noise lines
        || [];

    return {
      title: meal.strMeal, 
      sourceName: meal.strSource || "TheMealDB.com",
      sourceUrl: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
      imageUrl: meal.strMealThumb || null, 
      ingredients: ingredients, 
      instructions: instructionsArray, // Store as array of strings
      readyInMinutes: null, 
      servings: null, 
      category: meal.strCategory || undefined,
      area: meal.strArea || undefined,
      tags: meal.strTags?.split(",").map(t => t.trim()).filter(t => t) || [],
      youtubeUrl: meal.strYoutube || undefined,
    };
  }

  async execute(input: RecipeSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { query } = input; 
    const userNameForResponse = input.context?.userName || "friend";
    const logPrefix = `[RecipeTool] Query:"${query.substring(0, 30)}..."`;
    const queryInputForStructuredData = { ...input };

    if (abortSignal?.aborted) { return { error: "Recipe search cancelled.", result: "Cancelled." }; }
    if (!query?.trim()) { return { error: "Missing search query.", result: `What recipe should Minato look for, ${userNameForResponse}?`, structuredData: { result_type: "recipe", source_api: "themealdb", query: queryInputForStructuredData, recipe: null, error: "Missing search query." } }; }

    const url = `${this.API_BASE}/search.php?s=${encodeURIComponent(query.trim())}`;
    this.log("info", `${logPrefix} Searching TheMealDB: ${url}...`);
    let outputStructuredData: CachedSingleRecipe = {
      result_type: "recipe", source_api: "themealdb", query: queryInputForStructuredData, recipe: null, error: undefined,
    };

    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(8000) });
      if (abortSignal?.aborted) { outputStructuredData.error = "Request timed out or cancelled."; return { error: "Recipe search cancelled.", result: "Cancelled.", structuredData: outputStructuredData }; }
      if (!response.ok) { throw new Error(`TheMealDB API request failed: ${response.status} ${response.statusText}`); }
      const data: MealDbSearchResponse = await response.json() as MealDbSearchResponse;
      const mealsApi = data.meals;

      if (!mealsApi || !Array.isArray(mealsApi) || mealsApi.length === 0) {
        const resultText = `Minato couldn't find any recipes matching "${query}" on TheMealDB for ${userNameForResponse}. Perhaps try a different ingredient or dish name?`;
        return { result: resultText, structuredData: outputStructuredData };
      }
      const firstMeal = mealsApi[0]; 
      this.log("info", `${logPrefix} Found ${mealsApi.length} recipes. Selecting first: "${firstMeal.strMeal}" (ID: ${firstMeal.idMeal})`);
      const recipeContent = this.mapMealToAppRecipeContent(firstMeal);

      const structuredRecipeForUi: CachedRecipe = {
        ...recipeContent,
        result_type: "recipe_detail", 
        source_api: "themealdb_detail",
        query: queryInputForStructuredData, 
        error: undefined,
      };
      outputStructuredData.recipe = structuredRecipeForUi;
      outputStructuredData.error = undefined;

      let resultString = `Okay ${userNameForResponse}, Minato found a recipe for "${structuredRecipeForUi.title}"!`;
      if (structuredRecipeForUi.category) resultString += ` It's a type of ${structuredRecipeForUi.category} dish`;
      if (structuredRecipeForUi.area) resultString += `, popular in ${structuredRecipeForUi.area} cuisine`;
      resultString += ". It looks delicious! I can show you the details.";
      
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Recipe search failed: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === 'AbortError') { outputStructuredData.error = "Request timed out."; return { error: "Recipe search timed out.", result: `Sorry, ${userNameForResponse}, the recipe search took too long.`, structuredData: outputStructuredData }; }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return { error: errorMsg, result: `Sorry, ${userNameForResponse}, Minato encountered an error searching for recipes. Please try again.`, structuredData: outputStructuredData };
    }
  }
}