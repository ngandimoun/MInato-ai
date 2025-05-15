// FILE: lib/tools/PexelsSearchTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import {
  createClient,
  PhotosWithTotalResults,
  ErrorResponse as PexelsErrorResponse,
  Videos,
  Photo,
  Video,
} from "pexels";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  CachedImage,
  CachedImageList,
  CachedVideoList,
  CachedYouTubeVideo,
} from "@/lib/types/index";
import nodeFetch from "node-fetch";

interface PexelsSearchInput extends ToolInput {
  query: string;
  type?: "photos" | "videos";
  limit?: number;
}
type PexelsClient = ReturnType<typeof createClient>;

export class PexelsSearchTool extends BaseTool {
  name = "PexelsSearchTool";
  description =
    "Searches Pexels for high-quality, royalty-free photos or videos based on keywords or a description.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Keywords or description of the photo/video to search for.",
      },
      type: {
        type: "string",
        enum: ["photos", "videos"],
        description: "Specify 'photos' or 'videos'. Defaults to 'photos'.",
        default: "photos",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 5,
        description:
          "Maximum number of results to return (1-5). Defaults to 3.",
        default: 3,
      },
    },
    required: ["query"],
  };
  cacheTTLSeconds = 3600 * 24;

  private readonly pexelsClient: PexelsClient | null;
  private fetchImplementation: typeof fetch;

  constructor() {
    super();
    const apiKey = appConfig.toolApiKeys.pexels;
    this.fetchImplementation = (
      typeof window === "undefined" ? nodeFetch : window.fetch
    ) as typeof fetch;
    if (!apiKey) {
      this.log(
        "error",
        "Pexels API Key (PEXELS_API_KEY) is missing. Tool will fail."
      );
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

  async execute(
    input: PexelsSearchInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { query, limit = 3 } = input;
    const searchType = input.type || "photos";
    const logPrefix = `[PexelsTool Type:${searchType}] Query:"${query.substring(
      0,
      30
    )}..."`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "Pexels search cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!this.pexelsClient) {
      return {
        error: "Pexels Tool is not configured.",
        result: "Sorry, I cannot search Pexels right now.",
        structuredData: undefined,
      };
    }
    if (!query?.trim()) {
      return {
        error: "Missing search query.",
        result: `What ${searchType} should I look for on Pexels?`,
        structuredData: undefined,
      };
    }
    this.log("info", `${logPrefix} Searching Pexels (Limit: ${limit})...`);

    try {
      let response: PhotosWithTotalResults | Videos | PexelsErrorResponse;
      const params = {
        query: query.trim(),
        per_page: Math.max(1, Math.min(limit, 5)),
        page: 1,
      };
      // Timeout handled by orchestrator/fetch signal
      if (searchType === "videos") {
        response = await this.pexelsClient.videos.search(params);
      } else {
        response = await this.pexelsClient.photos.search(params);
      }
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after Pexels API call.`);
        return {
          error: "Pexels search cancelled.",
          result: "Cancelled.",
          structuredData: undefined,
        };
      }

      if ("error" in response) {
        const pexelsError = response as PexelsErrorResponse;
        const sanitizedError =
          typeof pexelsError.error === "string"
            ? pexelsError.error.replace(
                appConfig.apiKey.pexels ?? "DUMMY_KEY",
                "***"
              )
            : "Unknown Pexels API Error";
        const errorMsg = `Pexels API Error: ${sanitizedError}`;
        this.log("error", `${logPrefix} ${errorMsg}`);
        throw new Error(errorMsg);
      }

      if (searchType === "videos") {
        const videoResponse = response as Videos;
        const videos: Video[] = videoResponse.videos || [];
        let outputData: CachedVideoList = {
          result_type: "video_list",
          source_api: "pexels_video",
          query: input,
          videos: [],
          error: undefined,
        };
        if (videos.length === 0) {
          this.log("info", `${logPrefix} No videos found.`);
          return {
            result: `I couldn't find any Pexels videos matching "${query}".`,
            structuredData: outputData,
          };
        }
        this.log("info", `${logPrefix} Found ${videos.length} videos.`);
        const structuredResults: CachedYouTubeVideo[] = videos.map((vid) => ({
          videoId: String(vid.id),
          title: query,
          description: `Video from Pexels by ${vid.user?.name || "Unknown"}`,
          channelTitle: vid.user?.name || null,
          publishedAt: null,
          thumbnailUrl: vid.image || null,
          videoUrl: vid.url,
        }));
        const textResult = `Okay, I found ${structuredResults.length} video(s) on Pexels related to "${query}".`;
        outputData.videos = structuredResults;
        outputData.error = undefined;
        return { result: textResult, structuredData: outputData };
      } else {
        const photoResponse = response as PhotosWithTotalResults;
        const photos: Photo[] = photoResponse.photos || [];
        let outputData: CachedImageList = {
          result_type: "image_list",
          source_api: "pexels_photo",
          query: input,
          images: [],
          error: undefined,
        };
        if (photos.length === 0) {
          this.log("info", `${logPrefix} No photos found.`);
          return {
            result: `I couldn't find any Pexels photos matching "${query}".`,
            structuredData: outputData,
          };
        }
        this.log("info", `${logPrefix} Found ${photos.length} photos.`);
        const structuredResults: CachedImage[] = photos.map((img) => ({
          id: String(img.id),
          title: img.alt || `Pexels Photo ${img.id}`,
          description: img.alt || null,
          imageUrlSmall: img.src.medium,
          imageUrlRegular: img.src.large,
          imageUrlFull: img.src.original,
          photographerName: img.photographer || null,
          photographerUrl: img.photographer_url || null,
          sourceUrl: img.url,
          sourcePlatform: "pexels",
        }));
        const textResult = `Okay, I found ${structuredResults.length} photo(s) on Pexels related to "${query}".`;
        outputData.images = structuredResults;
        outputData.error = undefined;
        return { result: textResult, structuredData: outputData };
      }
    } catch (error: any) {
      const errorMessage = `Pexels search failed: ${error.message}`;
      const errorType = searchType === "videos" ? "video_list" : "image_list";
      const errorSourceApi =
        searchType === "videos" ? "pexels_video" : "pexels_photo";
      let errorStructuredData: CachedImageList | CachedVideoList = {
        result_type: errorType,
        source_api: errorSourceApi,
        query: input,
        images: [],
        videos: [],
        error: errorMessage,
      }; // Use union based on errorType? Needs careful typing.
      if (error.name === "AbortError") {
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        errorStructuredData.error = "Request timed out or cancelled.";
        return {
          error: "Pexels search timed out or cancelled.",
          result: "Sorry, the Pexels search took too long.",
          structuredData: errorStructuredData,
        };
      }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return {
        error: errorMessage,
        result: "Sorry, I encountered an error searching Pexels.",
        structuredData: errorStructuredData,
      };
    }
  }
}
