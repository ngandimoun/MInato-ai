import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedPlace, CachedSinglePlace } from "@/lib/types/index";

interface PlaceSearchInput extends ToolInput {
  query: string; // Made non-optional as it's the primary search term
}

interface NominatimResult {
  place_id: number; licence: string; osm_type: "node" | "way" | "relation"; osm_id: number;
  boundingbox: [string, string, string, string]; lat: string; lon: string; display_name: string;
  class: string; type: string; importance: number; icon?: string;
  address?: {
    amenity?: string; shop?: string; building?: string; house_number?: string; road?: string;
    neighbourhood?: string; suburb?: string; borough?: string; city?: string; municipality?: string;
    county?: string; state?: string; postcode?: string; country?: string; country_code?: string;
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
      query: { type: "string", description: "The address, place name, or point of interest to search for (e.g., 'Eiffel Tower', '1600 Amphitheatre Parkway, Mountain View, CA', 'restaurants near me')." },
    },
    required: ["query"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 24;

  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;
  private readonly API_BASE = "https://nominatim.openstreetmap.org/search";

  constructor() {
    super();
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update PlaceSearchTool USER_AGENT contact info with actual details for Nominatim compliance.");
    }
  }

  private mapNominatimToAppPlace(place: NominatimResult): CachedPlace | null {
    try {
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      if (isNaN(lat) || isNaN(lon)) { this.log("warn", `Invalid coordinates in Nominatim result ID ${place.place_id}: Lat=${place.lat}, Lon=${place.lon}`); return null; }
      return {
        displayName: place.display_name, latitude: lat, longitude: lon,
        address: place.address ? (Object.fromEntries(Object.entries(place.address).filter(([_, v]) => typeof v === 'string')) as Record<string, string>) : undefined,
        category: `${place.class}/${place.type}`, osmId: `${place.osm_type}/${place.osm_id}`, sourcePlatform: "nominatim",
      };
    } catch (e: any) { this.log("error", `Error mapping Nominatim result ID ${place.place_id}:`, e.message); return null; }
  }

  async execute(input: PlaceSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { query } = input;
    const logPrefix = `[PlaceTool] Query:"${query.substring(0,30)}..."`;
    const queryInputForStructuredData = { ...input };


    if (abortSignal?.aborted) { /* ... */ return { error: "Place search cancelled.", result: "Cancelled." }; }
    if (!query?.trim()) { /* ... */ return { error: "Missing search query.", result: "What place should Minato look up?", structuredData: { result_type: "place", source_api: "nominatim", query: queryInputForStructuredData, place: null, error: "Missing search query." } }; }

    let searchQuery = query.trim();
    let viewboxParam = "";
    if (searchQuery.toLowerCase().includes("near me") || searchQuery.toLowerCase().includes("nearby")) {
      if (typeof input.context?.latitude === 'number' && typeof input.context?.longitude === 'number') {
        const lat = input.context.latitude; const lon = input.context.longitude; const delta = 0.1;
        viewboxParam = `&viewbox=${lon-delta},${lat+delta},${lon+delta},${lat-delta}&bounded=1`;
        searchQuery = searchQuery.replace(/near me|nearby/i, "").trim() || "place";
        this.log("info", `${logPrefix} Using context coords ${lat.toFixed(4)},${lon.toFixed(4)} for nearby. Viewbox: ${viewboxParam}`);
      } else {
        this.log("warn", `${logPrefix} 'near me' used, but no location context. Global search.`);
        searchQuery = searchQuery.replace(/near me|nearby/i, "").trim();
        if (!searchQuery) {
          const errorMsg = "Cannot search 'near me' without location context.";
          return { error: errorMsg, result: `Minato needs your location, ${input.context?.userName || "User"}, to find places near you. Can you share it or provide a city?`, structuredData: { result_type: "place", source_api: "nominatim", query: queryInputForStructuredData, place: null, error: errorMsg }};
        }
      }
    }
    const params = new URLSearchParams({ q: searchQuery, format: "json", addressdetails: "1", limit: "3", ...(input.context?.locale && { "accept-language": input.context.locale }) });
    const url = `${this.API_BASE}?${params.toString()}${viewboxParam}`;
    this.log("info", `${logPrefix} Searching Nominatim: ${url.split("?")[0]}...`);

    let outputStructuredData: CachedSinglePlace = {
      result_type: "place", source_api: "nominatim", query: queryInputForStructuredData, place: null, error: undefined,
    };

    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
      if (abortSignal?.aborted) { /* ... */ outputStructuredData.error = "Request timed out or cancelled."; return { error: "Place search cancelled.", result: "Cancelled.", structuredData: outputStructuredData }; }
      if (!response.ok) { /* ... error handling ... */ throw new Error(`Nominatim API request failed: ${response.status} ${response.statusText}`); }
      const data: NominatimResult[] = await response.json() as NominatimResult[];

      if (!Array.isArray(data) || data.length === 0) {
        this.log("info", `${logPrefix} No places found for query "${searchQuery}".`);
        return { result: `Minato couldn't find any places matching "${searchQuery}", ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
      }
      const place = this.mapNominatimToAppPlace(data[0]);
      if (!place) { throw new Error("Failed to process location data from Nominatim."); }
      this.log("info", `${logPrefix} Found place: ${place.displayName}`);
      const resultString = `Minato found location information for "${query}" for ${input.context?.userName || "User"}: ${place.displayName} (Category: ${place.category}). Coordinates: ${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}.`;
      outputStructuredData.place = place; outputStructuredData.error = undefined;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Place search failed: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === 'AbortError') { /* ... */ outputStructuredData.error = "Request timed out."; return { error: "Place search timed out or cancelled.", result: `Sorry, ${input.context?.userName || "User"}, the place search took too long.`, structuredData: outputStructuredData }; }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato encountered an error searching for that place.`, structuredData: outputStructuredData };
    }
  }
}