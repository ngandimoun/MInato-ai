// FILE: lib/tools/PexelsSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { createClient, PhotosWithTotalResults, ErrorResponse as PexelsErrorResponse, Photo } from "pexels";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedImage, CachedImageList } from "@/lib/types/index";
import nodeFetch from "node-fetch"; // Ensure node-fetch is correctly imported
import { generateStructuredJson } from "../providers/llm_clients";

interface PexelsSearchInput extends ToolInput {
  query: string;
  limit?: number | null;
  orientation?: "landscape" | "portrait" | "square" | null; // Added orientation
  size?: "large" | "medium" | "small" | null; // Added size preference
}
type PexelsClient = ReturnType<typeof createClient>;

export class PexelsSearchTool extends BaseTool {
  name = "PexelsSearchTool";
  description = "Searches Pexels for high-quality images based on keywords. Returns a list of images with URLs and attributions.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "Keywords or description of the photo to search for. This is required." } as OpenAIToolParameterProperties,
      limit: {
        type: ["number", "null"] as const,
        description: "Maximum number of results to return (1-5). If null or not provided, defaults to 3.",
      } as OpenAIToolParameterProperties,
      orientation: {
        type: ["string", "null"] as const,
        enum: ["landscape", "portrait", "square", null],
        description: "Optional: Desired photo orientation (landscape, portrait, square). Can be null for any."
      } as OpenAIToolParameterProperties,
      size: {
        type: ["string", "null"] as const,
        enum: ["large", "medium", "small", null],
        description: "Optional: Preferred photo size. 'large' (24MP), 'medium' (12MP), 'small' (4MP). Can be null for any."
      } as OpenAIToolParameterProperties,
    },
    required: ["query", "limit", "orientation", "size"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 24;
  categories = ["search", "image", "media"];
  version = "1.0.0";
  metadata = { provider: "Pexels API", maxResults: 10 };

  private readonly pexelsClient: PexelsClient | null;
  private fetchImplementation: typeof fetch = (typeof window !== 'undefined' ? window.fetch : nodeFetch) as typeof fetch;

  constructor() {
    super();
    const apiKey = appConfig.toolApiKeys.pexels;
    if (!apiKey) {
      this.log("error", "Pexels API Key (PEXELS_API_KEY) is missing. Tool will fail.");
      this.pexelsClient = null;
    } else {
      try {
        this.pexelsClient = createClient(apiKey);
        this.log("info", "Pexels API client initialized.");
      } catch (initError: any) {
        this.log("error", "Failed to initialize Pexels client:", initError);
        this.pexelsClient = null;
      }
    }
  }

  private async extractPexelsParameters(userInput: string): Promise<Partial<PexelsSearchInput>> {
    // Enhanced extraction prompt for Pexels
    const extractionPrompt = `
You are an expert parameter extractor for Minato's PexelsSearchTool which searches for high-quality images on Pexels.

Given this user query about images: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. IMAGE QUERY IDENTIFICATION:
   - Extract the core subject or theme the user wants images of (e.g., "mountains", "happy people", "city at night")
   - Focus on the visual content desired, not incidental phrases
   - For complex requests, identify the main visual subject

2. ORIENTATION PREFERENCE DETECTION:
   - Determine if user explicitly or implicitly wants "landscape", "portrait", or "square" images
   - Look for clues like "horizontal", "vertical", "wide", "tall", etc.
   - Default to null (any orientation) if not specified

3. SIZE PREFERENCE ANALYSIS:
   - Identify if user has a preference for "large", "medium", or "small" images
   - Map expressions like "high-resolution" to "large", "medium-sized" to "medium", etc.
   - Default to null (any size) if not specified

4. RESULT LIMIT DETERMINATION:
   - Identify how many images the user wants (1-5)
   - Map expressions like "a couple" to 2, "a few" to 3, "several" to 4, etc.
   - Default to 3 if unspecified

OUTPUT FORMAT: JSON object with these fields:
- "query": (string) The core visual subject to search for
- "orientation": (string|null) One of: "landscape", "portrait", "square", or null if unspecified
- "size": (string|null) One of: "large", "medium", "small", or null if unspecified
- "limit": (number|null) Number of images (1-5) or null if unspecified

If a parameter cannot be confidently extracted, set it to null rather than guessing.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      // Define the schema for PexelsSearchInput
      const pexelsParamsSchema = {
        type: "object",
        properties: {
          query: { type: "string" },
          orientation: { type: ["string", "null"], enum: ["landscape", "portrait", "square", null] },
          size: { type: ["string", "null"], enum: ["large", "medium", "small", null] },
          limit: { type: ["number", "null"] }
        }
      };

      const extractionResult = await generateStructuredJson<Partial<PexelsSearchInput>>(
        extractionPrompt,
        userInput,
        pexelsParamsSchema,
        "PexelsSearchToolParameters",
        [], // no history context needed
        "gpt-4o-mini"
      );
      
      return extractionResult || {};
    } catch (error) {
      logger.error("[PexelsSearchTool] Parameter extraction failed:", error);
      return {};
    }
  }

  async execute(input: PexelsSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      const extractedParams = await this.extractPexelsParameters(input._rawUserInput);
      
      // Only use extracted parameters if they're not already specified
      if (extractedParams.query && !input.query) {
        input.query = extractedParams.query;
      }
      if (extractedParams.orientation !== undefined && input.orientation === undefined) {
        input.orientation = extractedParams.orientation;
      }
      if (extractedParams.size !== undefined && input.size === undefined) {
        input.size = extractedParams.size;
      }
      if (extractedParams.limit !== undefined && input.limit === undefined) {
        input.limit = extractedParams.limit;
      }
    }
    
    const { query } = input;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 3 : Math.max(1, Math.min(input.limit, 5));
    const orientation = (input.orientation === null) ? undefined : input.orientation;
    const size = (input.size === null) ? undefined : input.size;
    const userNameForResponse = input.context?.userName || "friend";

    const logPrefix = `[PexelsTool Type:photos] Query:"${query.substring(0,30)}..."`;
    const queryInputForStructuredData = { ...input, limit: effectiveLimit, orientation, size };


    if (abortSignal?.aborted) { return { error: "Pexels search cancelled.", result: "Cancelled." }; }
    if (!this.pexelsClient) { return { error: "Pexels Tool is not configured.", result: `Sorry, ${userNameForResponse}, I cannot search Pexels right now.` }; }
    if (!query?.trim()) { return { error: "Missing search query.", result: `What photos should Minato look for on Pexels, ${userNameForResponse}?` }; }

    this.log("info", `${logPrefix} Searching Pexels (Limit: ${effectiveLimit}, Orient: ${orientation || 'any'}, Size: ${size || 'any'})...`);
    let outputData: CachedImageList = {
      result_type: "image_list", source_api: "pexels_photo", query: queryInputForStructuredData, images: [], error: undefined,
    };

    try {
      const params: { query: string; per_page: number; page: number; orientation?: typeof orientation; size?: typeof size } = { 
        query: query.trim(), 
        per_page: effectiveLimit, 
        page: 1 
      };
      if (orientation) params.orientation = orientation;
      if (size) params.size = size;
      
      const response = await this.pexelsClient.photos.search(params); 

      if (abortSignal?.aborted && !(response && 'photos' in response)) {
        logger.warn(`${logPrefix} Execution aborted after Pexels API call or during.`);
        outputData.error = "Request timed out or cancelled.";
        return { error: "Pexels search cancelled.", result: "Cancelled.", structuredData: outputData };
      }

      if ("error" in response) {
        const pexelsError = response as PexelsErrorResponse;
        const sanitizedError = typeof pexelsError.error === 'string' ? pexelsError.error.replace(appConfig.toolApiKeys.pexels ?? "DUMMY_PEXELS_KEY", "***") : "Unknown Pexels API Error";
        const errorMsg = `Pexels API Error: ${sanitizedError}`;
        this.log("error", `${logPrefix} ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const photoResponse = response as PhotosWithTotalResults;
      const photos: Photo[] = photoResponse.photos || [];

      if (photos.length === 0) {
        this.log("info", `${logPrefix} No photos found.`);
        return { result: `Minato couldn't find any Pexels photos matching "${query}" for ${userNameForResponse}. Maybe try different keywords?`, structuredData: outputData };
      }
      this.log("info", `${logPrefix} Found ${photos.length} photos.`);
      const structuredResults: CachedImage[] = photos.map(img => ({
        id: String(img.id), 
        title: img.alt || `Pexels Photo by ${img.photographer || 'Unknown'} - ${img.id}`, // More descriptive title
        description: img.alt || null,
        imageUrlSmall: img.src.medium, // Pexels 'medium' is good for previews
        imageUrlRegular: img.src.large, 
        imageUrlFull: img.src.original,
        photographerName: img.photographer || null, 
        photographerUrl: img.photographer_url || null,
        sourceUrl: img.url, 
        sourcePlatform: "pexels",
        width: img.width, // Add width
        height: img.height, // Add height
        avgColor: img.avg_color || undefined // Add average color if available
      }));
      
      const textResult = `Okay, ${userNameForResponse}, Minato found ${structuredResults.length} cool photo(s) on Pexels related to "${query}". Check them out!`;
      outputData.images = structuredResults; outputData.error = undefined;
      return { result: textResult, structuredData: outputData };

    } catch (error: any) {
      const errorMessage = `Pexels search failed: ${error.message}`;
      outputData.error = errorMessage;
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        outputData.error = "Request timed out or cancelled.";
        return { error: "Pexels search timed out or cancelled.", result: `Sorry, ${userNameForResponse}, the Pexels search took too long.`, structuredData: outputData };
      }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return { error: errorMessage, result: `Sorry, ${userNameForResponse}, Minato encountered an error searching Pexels. Please try again.`, structuredData: outputData };
    }
  }
}