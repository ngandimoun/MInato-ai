// FILE: lib/tools/RecipeSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is imported
import { logger } from "../../memory-framework/config";
import { CachedRecipe, CachedSingleRecipe } from "@/lib/types/index";
import { appConfig } from "../config";
import { generateStructuredJson } from "../providers/llm_clients";

interface RecipeSearchInput extends ToolInput {
  query: string; // Required
  random?: boolean;
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
  description = "Searches for recipes by keyword, ingredient, or cuisine. Returns recipe details, ingredients, and instructions.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "The name of the dish or a key ingredient to search recipes for (e.g., 'Chicken Alfredo', 'avocado toast', 'chocolate chip cookies'). This is required unless 'random' is true." } as OpenAIToolParameterProperties,
      random: { type: "boolean" as const, description: "If true, returns a random recipe. If true, 'query' is ignored.", default: false } as OpenAIToolParameterProperties,
    },
    required: ["query"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 24; // Cache recipes for a day
  categories = ["search", "recipe", "food"];
  version = "1.0.0";
  metadata = { provider: "TheMealDB", cuisineSupport: true };

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

  private async extractRecipeParameters(userInput: string): Promise<Partial<RecipeSearchInput>> {
    // Enhanced extraction prompt for Recipes
    const extractionPrompt = `
You are an expert parameter extractor for Minato's RecipeSearchTool which searches for cooking recipes.

Given this user query about recipes: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. RECIPE QUERY IDENTIFICATION:
   - Extract the core dish, ingredient, or cuisine the user wants a recipe for
   - Focus on the food item or meal type they're looking for (e.g., "chicken parmesan", "vegan dessert", "quick breakfast")
   - For complex requests, identify the main dish or ingredient
   - If user just wants any recipe with no preference, set random to true instead of a query

2. RANDOM RECIPE DETECTION:
   - Determine if user specifically wants a random/surprise recipe
   - Look for indicators like "any recipe", "surprise me", "random dish", "whatever", etc.
   - Set random to true if these indicators are present, otherwise false

OUTPUT FORMAT: JSON object with these fields:
- "query": (string) The core dish, ingredient, or cuisine to search for, or empty string if random is true
- "random": (boolean) Whether user wants a random recipe suggestion

If a parameter cannot be confidently extracted, use a default value instead of guessing.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      // Define the schema for RecipeSearchInput
      const recipeParamsSchema = {
        type: "object",
        properties: {
          query: { type: "string" },
          random: { type: "boolean" }
        }
      };

      const extractionResult = await generateStructuredJson<Partial<RecipeSearchInput>>(
        extractionPrompt,
        userInput,
        recipeParamsSchema,
        "RecipeSearchToolParameters",
        [], // no history context needed
        "gpt-4o-mini"
      );
      
      return extractionResult || {};
    } catch (error) {
      logger.error("[RecipeSearchTool] Parameter extraction failed:", error);
      return {};
    }
  }

  async execute(input: RecipeSearchInput & { random?: boolean }, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      const extractedParams = await this.extractRecipeParameters(input._rawUserInput);
      
      // Only use extracted parameters if they're not already specified
      if (extractedParams.query && !input.query) {
        input.query = extractedParams.query;
      }
      if (extractedParams.random !== undefined && input.random === undefined) {
        input.random = extractedParams.random;
      }
    }
    
    // Apply user recipe preferences if available
    if (input.context?.userState?.workflow_preferences) {
      const prefs = input.context.userState.workflow_preferences;
      
      // Apply preferred cuisines to the query if user hasn't specified a specific dish
      if (prefs.recipePreferredCuisines && 
          prefs.recipePreferredCuisines.length > 0 && 
          !input.random && 
          input.query) {
        // Check if the query doesn't already include cuisine-specific terms
        const hasSpecificCuisine = prefs.recipePreferredCuisines.some(cuisine => 
          input.query.toLowerCase().includes(cuisine.toLowerCase())
        );
        
        if (!hasSpecificCuisine) {
          // Add the first preferred cuisine to the query to bias results
          const preferredCuisine = prefs.recipePreferredCuisines[0];
          input.query = `${preferredCuisine} ${input.query}`;
          this.log("debug", `[RecipeSearchTool] Applied preferred cuisine: ${preferredCuisine}`);
        }
      }
      
      // Apply skill level preference to the query
      if (prefs.recipeSkillLevel && 
          prefs.recipeSkillLevel !== "any" && 
          !input.random && 
          input.query) {
        switch (prefs.recipeSkillLevel) {
          case "beginner":
            input.query = `${input.query} easy simple quick`;
            this.log("debug", `[RecipeSearchTool] Applied skill level: beginner (easy recipes)`);
            break;
          case "intermediate":
            input.query = `${input.query} moderate`;
            this.log("debug", `[RecipeSearchTool] Applied skill level: intermediate`);
            break;
          case "advanced":
            input.query = `${input.query} gourmet complex chef`;
            this.log("debug", `[RecipeSearchTool] Applied skill level: advanced`);
            break;
        }
      }
      
      // Apply max cooking time preference to the query
      if (prefs.recipeMaxCookingTime && 
          prefs.recipeMaxCookingTime > 0 && 
          !input.random && 
          input.query) {
        if (prefs.recipeMaxCookingTime <= 30) {
          input.query = `${input.query} quick fast 30 minutes`;
          this.log("debug", `[RecipeSearchTool] Applied max cooking time: ≤30 minutes (quick recipes)`);
        } else if (prefs.recipeMaxCookingTime <= 60) {
          input.query = `${input.query} one hour`;
          this.log("debug", `[RecipeSearchTool] Applied max cooking time: ≤60 minutes`);
        }
        // For longer times, don't add specific modifiers to avoid limiting results
      }
    }
    
    const { query, random } = input;
    const userNameForResponse = input.context?.userName || "friend";
    const logPrefix = `[RecipeTool] Query:"${query ? query.substring(0, 30) : ''}..." Random:${!!random}`;
    const queryInputForStructuredData = { ...input };

    if (abortSignal?.aborted) { return { error: "Recipe search cancelled.", result: "Cancelled." }; }

    // If random is true, fetch a random recipe
    if (random === true) {
      const url = `${this.API_BASE}/random.php`;
      this.log("info", `${logPrefix} Fetching random recipe: ${url}...`);
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
          const resultText = `Minato couldn't find any random recipes for ${userNameForResponse}. Perhaps try again?`;
          return { result: resultText, structuredData: outputStructuredData };
        }
        const firstMeal = mealsApi[0];
        this.log("info", `${logPrefix} Found random recipe: "${firstMeal.strMeal}" (ID: ${firstMeal.idMeal})`);
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
        let resultString = `Okay ${userNameForResponse}, Minato found a random recipe: "${structuredRecipeForUi.title}"!`;
        if (structuredRecipeForUi.category) resultString += ` It's a type of ${structuredRecipeForUi.category} dish`;
        if (structuredRecipeForUi.area) resultString += `, popular in ${structuredRecipeForUi.area} cuisine`;
        resultString += ". It looks delicious! I can show you the details.";
        return { result: resultString, structuredData: outputStructuredData };
      } catch (error: any) {
        const errorMsg = `Random recipe search failed: ${error.message}`;
        outputStructuredData.error = errorMsg;
        if (error.name === 'AbortError') { outputStructuredData.error = "Request timed out."; return { error: "Recipe search timed out.", result: `Sorry, ${userNameForResponse}, the recipe search took too long.`, structuredData: outputStructuredData }; }
        this.log("error", `${logPrefix} Failed:`, error.message);
        return { error: errorMsg, result: `Sorry, ${userNameForResponse}, Minato encountered an error searching for a random recipe. Please try again.`, structuredData: outputStructuredData };
      }
    }

    // If not random, use the current search logic
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