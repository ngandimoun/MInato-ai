//livingdossier/services/tools-livings/GeocodingTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";

type GeocodingFunction = "forward_geocode" | "reverse_geocode";

interface GeocodingInput extends ToolInput {
  function_name: GeocodingFunction;
  query?: string | null;       // For forward geocoding (e.g., "Eiffel Tower")
  latitude?: number | null;    // For reverse geocoding
  longitude?: number | null;   // For reverse geocoding
}

// Interfaces for API responses
interface Location {
  lat: string;
  lng: string;
}

interface AddressComponents {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  [key: string]: string | undefined; // For other potential components
}

interface GeocodingResult {
  class: string;
  type: string;
  address_components: AddressComponents;
  formatted_address: string;
  geometry: {
    location: Location;
  };
  osmurl: string;
  distance?: string; // Only in reverse geocoding
}

interface GeocodingResponse {
  results: GeocodingResult[];
  status: "ok" | string; // Other statuses indicate errors
  error?: string; // Manually add this if status is not 'ok'
}

export class GeocodingTool extends BaseTool {
  name = "GeocodingTool";
  description = "Finds geographic information. It can convert a location name into latitude and longitude (forward geocoding) or convert coordinates back into an address (reverse geocoding).";
  argsSchema = {
    type: "object" as const,
    properties: {
      function_name: {
        type: "string" as const,
        description: "The geocoding action to perform.",
        enum: ["forward_geocode", "reverse_geocode"],
      } as OpenAIToolParameterProperties,
      query: {
        type: ["string", "null"] as const,
        description: "The address or place name to search for (e.g., 'Eiffel Tower, Paris'). Required for 'forward_geocode'.",
      } as OpenAIToolParameterProperties,
      latitude: {
        type: ["number", "null"] as const,
        description: "The latitude coordinate. Required for 'reverse_geocode'.",
      } as OpenAIToolParameterProperties,
      longitude: {
        type: ["number", "null"] as const,
        description: "The longitude coordinate. Required for 'reverse_geocode'.",
      } as OpenAIToolParameterProperties,
    },
    required: ["function_name"],
    additionalProperties: false as false,
  };

  cacheTTLSeconds = 86400; // Geocoding data is stable, cache for a day
  private readonly API_KEY: string;
  private readonly API_BASE = "https://geokeo.com/geocode/v1";
  private readonly USER_AGENT: string;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.geokeo || "";
    this.USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;
    if (!this.API_KEY) {
      this.log("error", "Geokeo API Key (GEOKEO_API_KEY) is missing. Tool will fail.");
    }
  }

  private async extractGeocodingParameters(userInput: string): Promise<Partial<GeocodingInput>> {
    const extractionPrompt = `
You are an expert parameter extractor for Minato's GeocodingTool.
The user's query is: "${userInput.replace(/\"/g, '\\"')}"

Your task is to determine if the user wants to perform 'forward_geocode' (name to coordinates) or 'reverse_geocode' (coordinates to name) and extract the necessary parameters.

GUIDELINES:

1.  **INTENT & FUNCTION:**
    *   If the user asks "Where is...", "get coordinates for...", or provides a place name/address, the function is "forward_geocode".
    *   If the user provides latitude and longitude coordinates, the function is "reverse_geocode".

2.  **PARAMETERS:**
    *   For "forward_geocode", extract the location name or address into the 'query' field.
    *   For "reverse_geocode", extract the numerical latitude and longitude into their respective fields.

OUTPUT FORMAT: A JSON object.
- "function_name": "forward_geocode" | "reverse_geocode"
- "query": (string|null)
- "latitude": (number|null)
- "longitude": (number|null)

RESPOND ONLY WITH THE JSON OBJECT.`;
    
    try {
      const schema = {
        type: "object",
        properties: {
          function_name: { type: "string", enum: ["forward_geocode", "reverse_geocode"] },
          query: { type: ["string", "null"] },
          latitude: { type: ["number", "null"] },
          longitude: { type: ["number", "null"] },
        },
      };
      return await generateStructuredJson<Partial<GeocodingInput>>(extractionPrompt, userInput, schema, "GeocodingParams") || {};
    } catch (error) {
      logger.error("[GeocodingTool] Parameter extraction failed:", error);
      return {};
    }
  }

  private async _fetch<T>(endpoint: string, params: URLSearchParams): Promise<T> {
    params.set('api', this.API_KEY);
    const url = `${this.API_BASE}${endpoint}?${params.toString()}`;
    this.log('info', `[GeocodingTool] Calling: ${endpoint}`);

    const response = await fetch(url, { headers: { 'User-Agent': this.USER_AGENT } });
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
    }
    const data = await response.json() as GeocodingResponse;
    if (data.status !== 'ok') {
        throw new Error(`Geokeo API error: ${data.status}`);
    }
    return data as T;
  }

  async execute(input: GeocodingInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
        const extractedParams = await this.extractGeocodingParameters(input._rawUserInput);
        input = { ...extractedParams, ...input };
    }
    
    const { function_name, query, latitude, longitude } = input;

    if (!this.API_KEY) {
      return { error: "GeocodingTool is not configured.", result: "Sorry, Minato cannot access geocoding services right now." };
    }
    
    try {
      switch (function_name) {
        case "forward_geocode": {
          if (!query) return { error: "Missing parameter", result: "I need an address or place name to search for." };
          const data = await this._fetch<GeocodingResponse>('/search.php', new URLSearchParams({ q: query }));
          const firstResult = data.results[0];
          if (!firstResult) return { result: `I couldn't find any location matching "${query}".` };
          
          const { lat, lng } = firstResult.geometry.location;
          const resultText = `The coordinates for "${query}" are Latitude: ${lat}, Longitude: ${lng}. The full address is: ${firstResult.formatted_address}.`;
          return { result: resultText, structuredData: { source_api: 'geokeo', ...firstResult } };
        }

        case "reverse_geocode": {
          if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
            return { error: "Missing parameter", result: "I need both latitude and longitude coordinates." };
          }
          const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
          const data = await this._fetch<GeocodingResponse>('/reverse.php', params);
          const firstResult = data.results[0];
          if (!firstResult) return { result: `I couldn't find an address for coordinates ${latitude}, ${longitude}.` };
          
          const resultText = `The address for coordinates ${latitude}, ${longitude} is: ${firstResult.formatted_address}.`;
          return { result: resultText, structuredData: { source_api: 'geokeo', ...firstResult } };
        }

        default:
          return { error: "Invalid function_name", result: "I'm not sure which geocoding action you want to perform." };
      }
    } catch (error: any) {
      this.log("error", "[GeocodingTool] Execution failed:", error);
      return { error: `GeocodingTool API request failed: ${error.message}`, result: "Sorry, I encountered an error while fetching location data." };
    }
  }
}