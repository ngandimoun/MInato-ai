import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { createClient, PhotosWithTotalResults, ErrorResponse as PexelsErrorResponse, Photo } from "pexels";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedImage, CachedImageList } from "@/lib/types/index";
import nodeFetch from "node-fetch"; // Keep for Node.js environment

interface PexelsSearchInput extends ToolInput {
  query: string;
  limit?: number | null; // Allow null
}
type PexelsClient = ReturnType<typeof createClient>;

export class PexelsSearchTool extends BaseTool {
  name = "PexelsSearchTool";
  description = "Searches Pexels for high-quality, royalty-free photos based on keywords or a description.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "Keywords or description of the photo to search for." },
      limit: { type: ["number", "null"], minimum: 1, maximum: 5, description: "Maximum number of results to return (1-5). Defaults to 3.", default: 3 },
    },
    required: ["query", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 24;

  private readonly pexelsClient: PexelsClient | null;
  // Use a type assertion for fetch as it can be window.fetch or node-fetch
  private fetchImplementation: typeof fetch = (typeof window !== 'undefined' ? window.fetch : nodeFetch) as typeof fetch;


  constructor() {
    super();
    const apiKey = appConfig.toolApiKeys.pexels;
    if (!apiKey) {
      this.log("error", "Pexels API Key (PEXELS_API_KEY) is missing. Tool will fail.");
      this.pexelsClient = null;
    } else {
      try {
        // Pexels client does not take a fetch implementation directly.
        // It uses the global fetch or a polyfill if in Node without one.
        // Ensure node-fetch is available in Node or use a polyfill.
        this.pexelsClient = createClient(apiKey);
        this.log("info", "Pexels API client initialized.");
      } catch (initError: any) {
        this.log("error", "Failed to initialize Pexels client:", initError);
        this.pexelsClient = null;
      }
    }
  }

  async execute(input: PexelsSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { query, limit } = input;
    const effectiveLimit = limit ?? 3;
    const logPrefix = `[PexelsTool Type:photos] Query:"${query.substring(0,30)}..."`;
    const queryInputForStructuredData = { ...input, limit: effectiveLimit };


    if (abortSignal?.aborted) { /* ... */ return { error: "Pexels search cancelled.", result: "Cancelled." }; }
    if (!this.pexelsClient) { /* ... */ return { error: "Pexels Tool is not configured.", result: `Sorry, ${input.context?.userName || "User"}, I cannot search Pexels right now.` }; }
    if (!query?.trim()) { /* ... */ return { error: "Missing search query.", result: `What photos should Minato look for on Pexels, ${input.context?.userName || "User"}?` }; }

    this.log("info", `${logPrefix} Searching Pexels (Limit: ${effectiveLimit})...`);
    let outputData: CachedImageList = {
      result_type: "image_list", source_api: "pexels_photo", query: queryInputForStructuredData, images: [], error: undefined,
    };

    try {
      const params = { query: query.trim(), per_page: Math.max(1, Math.min(effectiveLimit, 5)), page: 1 };
      
      // Pexels client doesn't directly support AbortSignal in its method signature.
      // The timeout will be handled by the Orchestrator or higher-level fetch wrapper if one exists.
      // For direct fetch, we'd need to wrap this.pexelsClient.photos.search if it uses fetch internally
      // or handle timeout at a higher level. For now, we rely on Orchestrator's timeout.
      const response = await this.pexelsClient.photos.search(params);

      if (abortSignal?.aborted && !(response && 'photos' in response)) { // Check if aborted before response received or if response indicates failure
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
        return { result: `Minato couldn't find any Pexels photos matching "${query}" for ${input.context?.userName || "you"}.`, structuredData: outputData };
      }
      this.log("info", `${logPrefix} Found ${photos.length} photos.`);
      const structuredResults: CachedImage[] = photos.map(img => ({
        id: String(img.id), title: img.alt || `Pexels Photo ${img.id}`, description: img.alt || null,
        imageUrlSmall: img.src.medium, imageUrlRegular: img.src.large, imageUrlFull: img.src.original,
        photographerName: img.photographer || null, photographerUrl: img.photographer_url || null,
        sourceUrl: img.url, sourcePlatform: "pexels",
      }));
      const textResult = `Okay, ${input.context?.userName || "User"}, Minato found ${structuredResults.length} photo(s) on Pexels related to "${query}".`;
      outputData.images = structuredResults; outputData.error = undefined;
      return { result: textResult, structuredData: outputData };

    } catch (error: any) {
      const errorMessage = `Pexels search failed: ${error.message}`;
      outputData.error = errorMessage;
      if (error.name === 'AbortError' || abortSignal?.aborted) { // Check AbortError specifically
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        outputData.error = "Request timed out or cancelled.";
        return { error: "Pexels search timed out or cancelled.", result: `Sorry, ${input.context?.userName || "User"}, the Pexels search took too long.`, structuredData: outputData };
      }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return { error: errorMessage, result: `Sorry, ${input.context?.userName || "User"}, Minato encountered an error searching Pexels.`, structuredData: outputData };
    }
  }
}