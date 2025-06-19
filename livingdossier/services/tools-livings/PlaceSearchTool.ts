//livingdossier/services/tools-livings/PlaceSearchTool.ts
// Correction: Ajout de `result_type` discriminant dans `outputStructuredData`.
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";

// Define local types since imports are failing
interface CachedPlace {
  displayName: string;
  latitude: number;
  longitude: number;
  address?: Record<string, string>;
  category: string;
  osmId: string;
  sourcePlatform: string;
}

interface CachedSinglePlace {
  result_type: "place";
  source_api: string;
  query: any;
  place: CachedPlace | null;
  error?: string;
}

interface PlaceSearchInput extends ToolInput {
  query: string;
}

// Structure matching OpenStreetMap Nominatim JSON response (keep internal)
interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  boundingbox: [string, string, string, string]; // [south_lat, north_lat, west_lon, east_lon]
  lat: string;
  lon: string;
  display_name: string;
  class: string; // Broad category (e.g., 'highway', 'amenity', 'shop')
  type: string; // Specific type (e.g., 'restaurant', 'cafe', 'residential')
  importance: number;
  icon?: string; // URL to an icon representing the place type
  address?: {
    // Breakdown of the address components
    amenity?: string;
    shop?: string;
    building?: string;
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    borough?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    [key: string]: string | undefined;
  };
}

export class PlaceSearchTool extends BaseTool {
  name = "PlaceSearchTool";
  description =
    "Searches for places (points of interest, addresses, cities) using OpenStreetMap Nominatim to find details like coordinates, address components, and category.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "The address, place name, or point of interest to search for (e.g., 'Eiffel Tower', '1600 Amphitheatre Parkway, Mountain View, CA', 'restaurants near me').",
      },
    },
    required: ["query"],
    additionalProperties: false as const,
  };
  cacheTTLSeconds = 3600 * 24; // Cache place lookups for a day

  // IMPORTANT: Replace with your actual contact info / app identifier for Nominatim policy compliance
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.appUrl}; contact: renemakoule@gmail.com)`;
  private readonly API_BASE = "https://nominatim.openstreetmap.org/search";

  constructor() {
    super();
    if (this.USER_AGENT.includes("renemakoule@gmail.com")) {
      this.log(
        "warn",
        "Nominatim USER_AGENT requires contact info. Please update in PlaceSearchTool constructor."
      );
    }
  }

  private mapNominatimToAppPlace(place: NominatimResult): CachedPlace | null {
    try {
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      if (isNaN(lat) || isNaN(lon)) {
        this.log(
          "warn",
          `Invalid coordinates in Nominatim result ID ${place.place_id}: Lat=${place.lat}, Lon=${place.lon}`
        );
        return null;
      }
      return {
        displayName: place.display_name,
        latitude: lat,
        longitude: lon,
        // Ensure address is an object or undefined, filtering out non-string values if necessary
        address: place.address
          ? (Object.fromEntries(
              Object.entries(place.address).filter(
                ([_, v]) => typeof v === "string"
              )
            ) as Record<string, string>)
          : undefined,
        category: `${place.class}/${place.type}`, // Combine class and type for category
        osmId: `${place.osm_type}/${place.osm_id}`, // Combine OSM type and ID
        sourcePlatform: "nominatim",
      };
    } catch (e: any) {
      this.log(
        "error",
        `Error mapping Nominatim result ID ${place.place_id}:`,
        e.message
      );
      return null;
    }
  }

  async execute(
    input: PlaceSearchInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    // Added abortSignal
    const { query } = input;
    const logPrefix = `[PlaceTool] Query:"${query.substring(0, 30)}..."`;

    // Check abort signal early
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return { error: "Place search cancelled.", result: "Cancelled." };
    }

    if (!query?.trim()) {
      return {
        error: "Missing search query.",
        result: "What place should I look up?",
      };
    }

    let searchQuery = query.trim();
    let viewboxParam = "";
    // Handle "near me" specifically
    if (
      searchQuery.toLowerCase().includes("near me") ||
      searchQuery.toLowerCase().includes("nearby")
    ) {
      if (
        typeof input.context?.latitude === "number" &&
        typeof input.context?.longitude === "number"
      ) {
        const lat = input.context.latitude;
        const lon = input.context.longitude;
        // Define a reasonable bounding box (e.g., ~10-20km radius, adjust delta as needed)
        const delta = 0.1; // Approx 11km latitude, varies with longitude
        viewboxParam = `&viewbox=${lon - delta},${lat + delta},${lon + delta},${
          lat - delta
        }&bounded=1`;
        searchQuery =
          searchQuery.replace(/near me|nearby/i, "").trim() || "place"; // Fallback query if only "near me" was said
        this.log(
          "info",
          `${logPrefix} Using context coords ${lat.toFixed(4)},${lon.toFixed(
            4
          )} for nearby search. Viewbox: ${viewboxParam}`
        );
      } else {
        this.log(
          "warn",
          `${logPrefix} 'near me' used, but no location context available. Performing global search.`
        );
        // Remove "near me" but search globally as context is missing
        searchQuery = searchQuery.replace(/near me|nearby/i, "").trim();
        if (!searchQuery)
          // If the query was *only* "near me"
          return {
            error: "Cannot search 'near me' without location context.",
            result:
              "I need your location to find places near you. Can you share it or provide a city?",
            structuredData: {
              // Return structure with error
              result_type: "place",
              source_api: "nominatim",
              query: input,
              place: null,
              error: "Cannot search 'near me' without location context.",
            } as CachedSinglePlace,
          };
      }
    }

    // Prepare API request parameters
    const params = new URLSearchParams({
      q: searchQuery,
      format: "json", // Request JSON format
      addressdetails: "1", // Request detailed address breakdown
      limit: "3", // Limit results (usually the first is most relevant)
      // Optional: Add language preference if available
      ...(input.context?.locale && { "accept-language": input.context.locale }),
    });
    const url = `${this.API_BASE}?${params.toString()}${viewboxParam}`;
    this.log(
      "info",
      `${logPrefix} Searching Nominatim: ${url.split("?")[0]}...`
    );

    // Initialize structured data with discriminant type
    let outputStructuredData: CachedSinglePlace = {
      result_type: "place", // Add discriminant
      source_api: "nominatim",
      query: input,
      place: null, // Initialize place as null
      error: undefined, // Initialize error
    };

    try {
      // Execute fetch request with timeout/abort signal
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT }, // IMPORTANT: Provide contact info in USER_AGENT
        signal: abortSignal ?? AbortSignal.timeout(7000), // Use provided signal or default timeout
      });

      // Check abort signal *after* the call
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after Nominatim API call.`);
        return { error: "Place search cancelled.", result: "Cancelled." };
      }

      if (!response.ok) {
        let errorDetail = `Nominatim API request failed: ${response.status} ${response.statusText}.`;
        try {
          const errorBody = await response.text();
          errorDetail += ` Response: ${errorBody.substring(0, 150)}`;
        } catch {}
        this.log("error", `${logPrefix} ${errorDetail}`);
        throw new Error(errorDetail); // Throw specific error
      }

      const data: NominatimResult[] =
        (await response.json()) as NominatimResult[];

      if (!Array.isArray(data) || data.length === 0) {
        this.log(
          "info",
          `${logPrefix} No places found for query "${searchQuery}".`
        );
        // Update structure to indicate not found
        outputStructuredData.place = null;
        return {
          result: `I couldn't find any places matching "${searchQuery}".`,
          structuredData: outputStructuredData,
        };
      }

      // Process the first (most relevant) result
      const place = this.mapNominatimToAppPlace(data[0]);

      if (!place) {
        this.log(
          "error",
          `${logPrefix} Failed to parse the primary Nominatim result.`
        );
        throw new Error("Failed to process location data from Nominatim.");
      }

      this.log("info", `${logPrefix} Found place: ${place.displayName}`);
      const resultString = `Found location information for "${searchQuery}": ${
        place.displayName
      } (Category: ${place.category}). Coordinates: ${place.latitude.toFixed(
        4
      )}, ${place.longitude.toFixed(4)}.`;

      // Populate structured data with the successful result
      outputStructuredData.place = place; // Embed the single best result structure
      outputStructuredData.error = undefined; // Clear error on success

      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Place search failed: ${error.message}`;
      // Handle AbortError specifically
      if (error.name === "AbortError") {
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        outputStructuredData.error = "Request timed out.";
        return {
          error: "Place search timed out or cancelled.",
          result: "Sorry, the place search took too long.",
          structuredData: outputStructuredData, // Include error in structure
        };
      }
      // Handle other errors
      this.log("error", `${logPrefix} Failed:`, error.message);
      outputStructuredData.error = errorMsg; // Include error in structure
      return {
        error: errorMsg,
        result: "Sorry, I encountered an error searching for that place.",
        structuredData: outputStructuredData,
      };
    }
  }
}