// FILE: lib/tools/RecipeSearchTool.ts
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is a dependency
import { logger } from "../../memory-framework/config"; // Unified logger
import { CachedRecipe, CachedSingleRecipe } from "@/lib/types/index"; // Ensure these types are correct

// Add global type declaration for appConfig
declare global {
  // Adjust the type below to match your actual appConfig structure
  // This is a minimal example; expand as needed
  var appConfig: {
    app?: { url?: string };
    emailFromAddress?: string;
  } | undefined;
}

interface RecipeSearchInput extends ToolInput {
  query: string;
}

interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strDrinkAlternate?: string | null;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strTags?: string | null;
  strYoutube?: string | null;
  strIngredient1?: string | null;
  strMeasure1?: string | null;
  strIngredient2?: string | null;
  strMeasure2?: string | null;
  strIngredient3?: string | null;
  strMeasure3?: string | null;
  strIngredient4?: string | null;
  strMeasure4?: string | null;
  strIngredient5?: string | null;
  strMeasure5?: string | null;
  strIngredient6?: string | null;
  strMeasure6?: string | null;
  strIngredient7?: string | null;
  strMeasure7?: string | null;
  strIngredient8?: string | null;
  strMeasure8?: string | null;
  strIngredient9?: string | null;
  strMeasure9?: string | null;
  strIngredient10?: string | null;
  strMeasure10?: string | null;
  strIngredient11?: string | null;
  strMeasure11?: string | null;
  strIngredient12?: string | null;
  strMeasure12?: string | null;
  strIngredient13?: string | null;
  strMeasure13?: string | null;
  strIngredient14?: string | null;
  strMeasure14?: string | null;
  strIngredient15?: string | null;
  strMeasure15?: string | null;
  strIngredient16?: string | null;
  strMeasure16?: string | null;
  strIngredient17?: string | null;
  strMeasure17?: string | null;
  strIngredient18?: string | null;
  strMeasure18?: string | null;
  strIngredient19?: string | null;
  strMeasure19?: string | null;
  strIngredient20?: string | null;
  strMeasure20?: string | null;
  strSource?: string | null;
  strImageSource?: string | null;
  strCreativeCommonsConfirmed?: string | null;
  dateModified?: string | null;
  // Index signature to allow dynamic access to strIngredientX and strMeasureX
  [key: `strIngredient${number}`]: string | null | undefined;
  [key: `strMeasure${number}`]: string | null | undefined;
}

interface MealDbSearchResponse {
  meals: MealDbMeal[] | null;
}

export class RecipeSearchTool extends BaseTool {
  name = "RecipeSearchTool";
  description =
    "Searches for recipes by dish name or main ingredient using TheMealDB (a free recipe database).";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "The name of the dish or a key ingredient to search recipes for (e.g., 'Chicken Alfredo', 'avocado toast', 'chocolate chip cookies').",
      },
    },
    required: ["query"],
  };
  cacheTTLSeconds = 3600 * 24; // Cache for 1 day

  private readonly API_BASE = "https://www.themealdb.com/api/json/v1/1";
  // USER_AGENT should include contact info for API compliance.
  // Assuming appConfig is correctly imported and unified.
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${
    global.appConfig?.app?.url || "https://minato.dev"
  }; mailto:${global.appConfig?.emailFromAddress || "support@minato.dev"})`;

  constructor() {
    super();
    this.log(
      "info",
      "Recipe Tool initialized using TheMealDB (Free Tier API Key '1')."
    );
    if (
      this.USER_AGENT.includes("support@minato.dev") ||
      this.USER_AGENT.includes("https://minato.dev")
    ) {
      this.log(
        "warn",
        "Update USER_AGENT in RecipeSearchTool with actual contact/app URL if defaults are used."
      );
    }
  }

  private extractIngredients(meal: MealDbMeal): string[] {
    const ingredients: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}` as keyof MealDbMeal];
      const measure = meal[`strMeasure${i}` as keyof MealDbMeal];
      if (ingredient && ingredient.trim()) {
        ingredients.push(
          `${measure ? measure.trim() : ""} ${ingredient.trim()}`.trim()
        );
      } else {
        break; // Stop if ingredient is empty or null
      }
    }
    return ingredients;
  }

  // This function now returns an object matching the structure of CachedRecipe's *content fields*,
  // not the full CachedRecipe which includes result_type and source_api.
  private mapMealToAppRecipeContent(
    meal: MealDbMeal
  ): Omit<CachedRecipe, "result_type" | "source_api"> {
    const ingredients = this.extractIngredients(meal);
    const instructions =
      meal.strInstructions
        ?.split(/[\n\r]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0) || [];

    return {
      // id: meal.idMeal, // Add if your CachedRecipe type needs an ID from the source
      title: meal.strMeal,
      sourceName: meal.strSource || "TheMealDB.com",
      sourceUrl:
        meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
      imageUrl: meal.strMealThumb || null,
      ingredients: ingredients,
      instructions: instructions,
      readyInMinutes: null, // TheMealDB doesn't provide this directly
      servings: null, // TheMealDB doesn't provide this directly
      category: meal.strCategory || undefined,
      area: meal.strArea || undefined,
      tags:
        meal.strTags
          ?.split(",")
          .map((t) => t.trim())
          .filter((t) => t) || [],
      youtubeUrl: meal.strYoutube || undefined,
      query: undefined, // query is not part of the recipe content itself
      error: undefined, // error is not part of the recipe content itself
      // query and error are not part of the recipe content itself
    };
  }

  async execute(
    input: RecipeSearchInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { query } = input;
    const logPrefix = `[RecipeTool] Query:"${query.substring(0, 30)}..."`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "Recipe search cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!query?.trim()) {
      return {
        error: "Missing search query.",
        result: "What recipe should I look for?",
        structuredData: undefined,
      };
    }

    const url = `${this.API_BASE}/search.php?s=${encodeURIComponent(
      query.trim()
    )}`;
    this.log("info", `${logPrefix} Searching TheMealDB: ${url}...`);

    // Initialize the structured data wrapper
    let outputStructuredData: CachedSingleRecipe = {
      result_type: "recipe",
      source_api: "themealdb",
      query: input, // Store the original input for context
      recipe: null, // Will be filled if a recipe is found
      error: undefined,
    };

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: abortSignal ?? AbortSignal.timeout(8000), // 8-second timeout
      });

      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after TheMealDB API call.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return {
          error: "Recipe search cancelled.",
          result: "Cancelled.",
          structuredData: outputStructuredData,
        };
      }

      if (!response.ok) {
        let errorDetail = `TheMealDB API request failed: ${response.status} ${response.statusText}.`;
        try {
          const errorBody = await response.text();
          errorDetail += ` Response: ${errorBody.substring(0, 150)}`;
        } catch {}
        this.log("error", `${logPrefix} ${errorDetail}`);
        throw new Error(errorDetail);
      }

      const data: MealDbSearchResponse =
        (await response.json()) as MealDbSearchResponse;
      const mealsApi = data.meals;

      if (!mealsApi || !Array.isArray(mealsApi) || mealsApi.length === 0) {
        this.log(
          "info",
          `${logPrefix} No recipes found on TheMealDB for query: "${query}".`
        );
        const resultText = `I couldn't find any recipes matching "${query}" on TheMealDB.`;
        // outputStructuredData.error is already undefined, .recipe is null
        return { result: resultText, structuredData: outputStructuredData };
      }

      const firstMeal = mealsApi[0];
      this.log(
        "info",
        `${logPrefix} Found ${mealsApi.length} recipes. Selecting first: "${firstMeal.strMeal}" (ID: ${firstMeal.idMeal})`
      );

      // Map the API response to the content part of CachedRecipe
      const recipeContent = this.mapMealToAppRecipeContent(firstMeal);

      // Construct the full CachedRecipe object for the 'recipe' field of CachedSingleRecipe
      const structuredRecipe: CachedRecipe = {
        ...recipeContent, // Spread the content fields
        result_type: "recipe_detail", // Internal type if CachedRecipe needs it for polymorphism
        source_api: "themealdb_detail", // Specific source for the detail
        query: input, // Optional: include query that led to this specific recipe
        error: undefined,
      };

      outputStructuredData.recipe = structuredRecipe;
      outputStructuredData.error = undefined;

      const resultString = `Found a recipe for "${structuredRecipe.title}"${
        structuredRecipe.category ? ` (${structuredRecipe.category})` : ""
      }${
        structuredRecipe.area ? `, a ${structuredRecipe.area} dish` : ""
      }. I can show you the ingredients and link.`;

      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Recipe search failed: ${error.message}`;
      outputStructuredData.error = errorMsg; // Store error in the structured data
      if (error.name === "AbortError") {
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        outputStructuredData.error = "Request timed out."; // More specific error for structured data
        return {
          error: "Recipe search timed out or cancelled.",
          result: "Sorry, the recipe search took too long.",
          structuredData: outputStructuredData,
        };
      }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return {
        error: errorMsg,
        result: "Sorry, I encountered an error searching for recipes.",
        structuredData: outputStructuredData,
      };
    }
  }
}
