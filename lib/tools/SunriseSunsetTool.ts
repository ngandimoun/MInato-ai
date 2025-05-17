// FILE: lib/tools/SunriseSunsetTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import SunCalc from "suncalc";
import fetch from "node-fetch";
import { formatInTimeZone } from "date-fns-tz";
import { findTimeZone } from "timezone-support/lookup-convert";
import { SunriseSunsetStructuredOutput } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";

interface SunTimeInput extends ToolInput {
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  date?: string | null; // YYYY-MM-DD
}

interface GeocodeResult {
  latitude?: number;
  longitude?: number;
  displayName?: string;
  error?: string;
}

export class SunriseSunsetTool extends BaseTool {
  name = "SunriseSunsetTool";
  description =
    "Gets sunrise and sunset times for a specific location and date. It uses latitude/longitude from the user's context if available and no explicit location/coords are given, otherwise, it attempts to find coordinates for the provided location name.";
  argsSchema = {
    type: "object" as const,
    properties: {
      location: { type: ["string", "null"] as const, description: "The city name or address (e.g., 'Paris, France', 'Tokyo'). If null and latitude/longitude are not provided, uses user's context location." } as OpenAIToolParameterProperties,
      latitude: { type: ["number", "null"] as const, description: "Optional explicit latitude. Overrides location name and context if provided. Can be null." } as OpenAIToolParameterProperties,
      longitude: { type: ["number", "null"] as const, description: "Optional explicit longitude. Overrides location name and context if provided. Can be null." } as OpenAIToolParameterProperties,
      date: { type: ["string", "null"] as const, description: "Optional date to check (YYYY-MM-DD format, e.g., '2024-07-30'). If null or omitted, defaults to today." } as OpenAIToolParameterProperties, // Removed format: "date"
    },
    // All are required as LLM needs to provide them, even if null, for strict schema.
    // The execute method will handle defaulting or erroring if truly essential ones are missing.
    required: ["location", "latitude", "longitude", "date"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 6; // Cache sun times for 6 hours

  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;
  private readonly API_BASE = "https://nominatim.openstreetmap.org/search";

  constructor() {
    super();
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update USER_AGENT contact info in SunriseSunsetTool for Nominatim compliance.");
    }
  }

  private async geocodeLocation(location: string, abortSignal?: AbortSignal): Promise<GeocodeResult> { /* ... (implementation unchanged) ... */
    if (!location?.trim()) return { error: "Location name cannot be empty." };
    const url = `${this.API_BASE}?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=0`;
    this.log("info", `Geocoding fallback required for "${location}" via Nominatim...`);
    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(5000) });
      if (abortSignal?.aborted) { this.log("warn", `Geocoding aborted for "${location}"`); return { error: "Geocoding request cancelled." };}
      if (!response.ok) throw new Error(`Nominatim API request failed: ${response.status} ${response.statusText}`);
      const data = await response.json() as any[]; // Nominatim returns an array
      if (!Array.isArray(data) || data.length === 0 || !data[0].lat || !data[0].lon) { this.log("warn", `Nominatim could not find coordinates for "${location}". Response:`, data); throw new Error(`Location "${location}" not found by Nominatim.`); }
      const result = data[0];
      const lat = parseFloat(result.lat); const lon = parseFloat(result.lon);
      if (isNaN(lat) || isNaN(lon)) throw new Error("Invalid coordinates received from Nominatim.");
      this.log("info", `Geocoded "${location}" to: ${lat.toFixed(4)}, ${lon.toFixed(4)}. Name: ${result.display_name}`);
      return { latitude: lat, longitude: lon, displayName: result.display_name };
    } catch (error: any) {
      if (error.name === 'AbortError') { this.log("error", `Geocoding timed out or aborted for "${location}"`); return { error: "Geocoding request timed out or cancelled." }; }
      this.log("error", `Geocoding error for "${location}":`, error.message);
      return { error: `Could not find coordinates for "${location}". (${error.message})` };
    }
  }
  private getSafeTimezone(inputTz?: string | null): string { /* ... (implementation unchanged) ... */
    if (!inputTz) { this.log("warn", "No timezone provided or found in context, defaulting to UTC."); return "Etc/UTC"; }
    try { const found = findTimeZone(inputTz); if (found) return found.name; } catch {}
    this.log("warn", `Could not validate provided timezone "${inputTz}", defaulting to UTC.`);
    return "Etc/UTC";
  }
  private formatTimeInZone(date: Date | undefined | null, timeZone: string): string | null { /* ... (implementation unchanged) ... */
    if (!date || isNaN(date.getTime())) return null;
    try { return formatInTimeZone(date, timeZone, "HH:mm"); } // Using HH:mm for 24-hour format
    catch (e: any) { this.log("error", `Error formatting time ${date.toISOString()} in zone ${timeZone}:`, e.message); return null; }
  }


  async execute(input: SunTimeInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // Defaulting logic
    let lat: number | undefined | null = (input.latitude === null) ? undefined : input.latitude;
    let lon: number | undefined | null = (input.longitude === null) ? undefined : input.longitude;
    let locationNameInput = (input.location === null) ? undefined : input.location;
    const dateInput = (input.date === null) ? undefined : input.date;


    let coordSource = "unknown";
    let displayLocation = "";
    let geoError: string | undefined = undefined;
    const queryInputForStructuredData = { ...input };

    let structuredOutput: SunriseSunsetStructuredOutput = {
      result_type: "sun_times", source_api: "suncalc", query: queryInputForStructuredData,
      resolvedLat: null, resolvedLon: null, resolvedLocation: locationNameInput || "unknown",
      date: dateInput || new Date().toISOString().split("T")[0], // Default to today's date string
      timezone: null, coordSource: coordSource, sunriseISO: null, sunsetISO: null,
      sunriseLocal: null, sunsetLocal: null, error: null,
    };

    if (abortSignal?.aborted) { return { error: "Sun times check cancelled.", result: "Cancelled." }; }

    if (typeof lat === "number" && typeof lon === "number") {
      coordSource = "explicit_coords"; displayLocation = `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
      this.log("info", `Using explicit coords: ${lat}, ${lon}`);
    } else if (typeof input.context?.latitude === "number" && typeof input.context?.longitude === "number") {
      coordSource = "user_context"; lat = input.context.latitude; lon = input.context.longitude;
      displayLocation = locationNameInput || `your current location`;
      this.log("info", `Using context coords for ${input.context?.userName || "user"}: ${lat}, ${lon}`);
    } else if (locationNameInput) {
      this.log("info", `No coordinates, geocoding "${locationNameInput}"...`);
      const geoResult = await this.geocodeLocation(locationNameInput, abortSignal);
      if (abortSignal?.aborted) { return { error: "Sun times check cancelled (during geocoding).", result: "Cancelled." }; }
      if (geoResult.error || geoResult.latitude === undefined || geoResult.longitude === undefined) { geoError = geoResult.error || `Could not find coordinates for "${locationNameInput}".`; coordSource = "error"; }
      else { lat = geoResult.latitude; lon = geoResult.longitude; coordSource = "geocoded_name"; displayLocation = geoResult.displayName || locationNameInput; this.log("info", `Using geocoded coords for "${locationNameInput}": ${lat}, ${lon}`);}
    } else { coordSource = "error"; geoError = "Missing location. Provide coordinates, a location name, or ensure location context is available."; }

    structuredOutput.coordSource = coordSource;
    structuredOutput.resolvedLat = typeof lat === "number" ? lat : null;
    structuredOutput.resolvedLon = typeof lon === "number" ? lon : null;
    structuredOutput.resolvedLocation = displayLocation || locationNameInput || "unknown";

    if (coordSource === "error" || typeof lat !== "number" || typeof lon !== "number") {
      const errorMsg = geoError || "Could not determine coordinates.";
      structuredOutput.error = errorMsg;
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato needs a valid location. ${errorMsg}`, structuredData: structuredOutput };
    }

    const dateStringForCalc = dateInput || new Date().toISOString().split("T")[0];
    structuredOutput.date = dateStringForCalc;
    let targetDate: Date;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStringForCalc)) throw new Error("Invalid format, YYYY-MM-DD expected.");
      targetDate = new Date(dateStringForCalc + "T12:00:00Z"); // Midday UTC to represent the date
      if (isNaN(targetDate.getTime())) throw new Error("Invalid date value.");
    } catch (e:any) {
      const errorMsg = `Invalid date: "${dateInput}". ${e.message}`;
      structuredOutput.error = errorMsg;
      return { error: errorMsg, result: `Please provide date as YYYY-MM-DD, ${input.context?.userName || "User"}.`, structuredData: structuredOutput };
    }

    const timezone = this.getSafeTimezone(input.context?.timezone);
    structuredOutput.timezone = timezone;

    try {
      this.log("info", `Calculating sun times for ${lat.toFixed(4)},${lon.toFixed(4)} on ${dateStringForCalc}`);
      const times = SunCalc.getTimes(targetDate, lat, lon); // SunCalc uses local time of the machine for Date obj if not specified
      structuredOutput.sunriseISO = times.sunrise?.toISOString() || null;
      structuredOutput.sunsetISO = times.sunset?.toISOString() || null;
      structuredOutput.sunriseLocal = this.formatTimeInZone(times.sunrise, timezone);
      structuredOutput.sunsetLocal = this.formatTimeInZone(times.sunset, timezone);
      structuredOutput.error = null;

      if (!structuredOutput.sunriseLocal || !structuredOutput.sunsetLocal) {
        this.log("warn", `Failed to format times in timezone: ${timezone}`);
        const sunriseISOStr = structuredOutput.sunriseISO ? new Date(structuredOutput.sunriseISO).toUTCString() : "N/A";
        const sunsetISOStr = structuredOutput.sunsetISO ? new Date(structuredOutput.sunsetISO).toUTCString() : "N/A";
        const resultString = `For ${displayLocation} on ${dateStringForCalc}: Sunrise ${sunriseISOStr} (UTC), Sunset ${sunsetISOStr} (UTC). (Could not format for timezone: ${timezone})`;
        structuredOutput.error = `Failed to format times in timezone ${timezone}.`;
        return { result: resultString, structuredData: structuredOutput, error: structuredOutput.error };
      }

      const resultString = `For ${displayLocation} on ${dateStringForCalc}, ${input.context?.userName || "User"}:\nSunrise is around ${structuredOutput.sunriseLocal}\nSunset is around ${structuredOutput.sunsetLocal}\n(Times shown in timezone: ${timezone})`;
      this.log("info", `SunCalc success for ${displayLocation}. Sunrise: ${structuredOutput.sunriseLocal}, Sunset: ${structuredOutput.sunsetLocal} (TZ: ${timezone})`);
      return { result: resultString, structuredData: structuredOutput };
    } catch (error: any) {
      this.log("error", `SunCalc calculation error for ${lat.toFixed(4)},${lon.toFixed(4)}:`, error.message);
      structuredOutput.error = `Calculation failed: ${error.message}`;
      return { error: structuredOutput.error, result: `Sorry, ${input.context?.userName || "User"}, error calculating sun times.`, structuredData: structuredOutput };
    }
  }
}