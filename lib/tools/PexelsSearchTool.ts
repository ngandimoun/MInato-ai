// FILE: lib/tools/PexelsSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { createClient, PhotosWithTotalResults, ErrorResponse as PexelsErrorResponse, Photo } from "pexels";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedImage, CachedImageList } from "@/lib/types/index";
import nodeFetch from "node-fetch"; // Ensure node-fetch is correctly imported

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

  async execute(input: PexelsSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
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