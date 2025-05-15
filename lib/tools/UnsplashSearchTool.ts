// FILE: lib/tools/UnsplashSearchTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { createApi } from "unsplash-js";
import type { ApiResponse } from "unsplash-js/dist/helpers/response";
import type { Basic as UnsplashPhotoBasic } from "unsplash-js/dist/methods/photos/types";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedImage, CachedImageList } from "@/lib/types/index";
import nodeFetch from "node-fetch";

interface UnsplashSearchInput extends ToolInput {
  query: string;
  limit?: number;
}
type UnsplashApi = ReturnType<typeof createApi>;

export class UnsplashSearchTool extends BaseTool {
  name = "UnsplashSearchTool";
  description =
    "Searches Unsplash for high-quality, royalty-free photos based on keywords or a description.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Keywords or description of the photo to search for.",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 5,
        description: "Maximum number of photos to return (1-5). Defaults to 3.",
        default: 3,
      },
    },
    required: ["query"],
  };
  cacheTTLSeconds = 3600 * 24;

  private readonly unsplash: UnsplashApi | null;
  private fetchImplementation: typeof fetch;

  constructor() {
    super();
    const accessKey = appConfig.toolApiKeys.unsplash;
    this.fetchImplementation = (
      typeof window === "undefined" ? nodeFetch : window.fetch
    ) as typeof fetch;
    if (!accessKey) {
      this.log(
        "error",
        "Unsplash Access Key (UNSPLASH_ACCESS_KEY) is missing. Tool will fail."
      );
      this.unsplash = null;
    } else {
      try {
        this.unsplash = createApi({
          accessKey: accessKey,
          fetch: this.fetchImplementation,
        });
        this.log("info", "Unsplash API client initialized.");
      } catch (initError: any) {
        logger.error("Failed to initialize Unsplash client:", initError);
        this.unsplash = null;
      }
    }
  }

  async execute(
    input: UnsplashSearchInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { query, limit = 3 } = input;
    const logPrefix = `[UnsplashTool] Query:"${query.substring(0, 30)}..."`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "Unsplash search cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!this.unsplash) {
      return {
        error: "Unsplash Tool is not configured.",
        result: "Sorry, I cannot search Unsplash right now.",
        structuredData: undefined,
      };
    }
    if (!query?.trim()) {
      return {
        error: "Missing search query.",
        result: "What kind of photo should I look for on Unsplash?",
        structuredData: undefined,
      };
    }

    this.log("info", `${logPrefix} Searching Unsplash (Limit: ${limit})...`);
    let outputData: CachedImageList = {
      result_type: "image_list",
      source_api: "unsplash",
      query: input,
      images: [],
      error: undefined,
    };

    try {
      const response: ApiResponse<{
        results: UnsplashPhotoBasic[];
        total: number;
        total_pages: number;
      }> = await this.unsplash.search.getPhotos({
        query: query.trim(),
        page: 1,
        perPage: Math.max(1, Math.min(limit, 5)),
        orientation: "landscape",
      });
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after Unsplash API call.`);
        outputData.error = "Request timed out or cancelled.";
        return {
          error: "Unsplash search cancelled.",
          result: "Cancelled.",
          structuredData: outputData,
        };
      }

      if (
        response.type === "error" ||
        response.errors ||
        response.status !== 200 ||
        !response.response?.results
      ) {
        const errorMessages = response.errors
          ? response.errors.join("; ")
          : `Unsplash API Error (${response.status})`;
        const detailedError = `${logPrefix} Failed: ${errorMessages}`;
        this.log("error", detailedError);
        throw new Error(errorMessages);
      }

      const images = response.response.results;
      if (images.length === 0) {
        this.log("info", `${logPrefix} No images found.`);
        return {
          result: `I couldn't find any Unsplash photos matching "${query}".`,
          structuredData: outputData,
        };
      }

      this.log("info", `${logPrefix} Found ${images.length} images.`);
      const structuredResults: CachedImage[] = images.map((img) => ({
        id: img.id,
        title:
          img.description || img.alt_description || `Unsplash Photo ${img.id}`,
        description: img.alt_description || img.description || null,
        imageUrlSmall: img.urls.small,
        imageUrlRegular: img.urls.regular,
        imageUrlFull: img.urls.full,
        photographerName: img.user.name || null,
        photographerUrl: img.user.links?.html || null,
        sourceUrl: img.links.html,
        sourcePlatform: "unsplash",
      }));
      const textResult = `Okay, I found ${structuredResults.length} photo(s) on Unsplash related to "${query}".`;
      outputData.images = structuredResults;
      outputData.error = undefined;
      return { result: textResult, structuredData: outputData };
    } catch (error: any) {
      const errorMessage = `Unsplash search failed: ${error.message}`;
      outputData.error = errorMessage;
      if (error.name === "AbortError") {
        this.log(
          "error",
          `${logPrefix} Request timed out or aborted during fetch.`
        );
        outputData.error = "Request timed out or cancelled.";
        return {
          error: "Unsplash search timed out or cancelled.",
          result: "Sorry, the Unsplash search took too long.",
          structuredData: outputData,
        };
      }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return {
        error: errorMessage,
        result: "Sorry, I encountered an error searching Unsplash.",
        structuredData: outputData,
      };
    }
  }
}
