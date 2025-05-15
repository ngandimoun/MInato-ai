// FILE: lib/tools/SunriseSunsetTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import SunCalc from "suncalc";
import fetch from "node-fetch";
import { formatInTimeZone } from "date-fns-tz";
import { findTimeZone } from "timezone-support/lookup-convert";
import { SunriseSunsetStructuredOutput } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";

interface SunTimeInput extends ToolInput {
  location?: string;
  latitude?: number;
  longitude?: number;
  date?: string;
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
    "Gets sunrise and sunset times for a specific location and date. It uses latitude/longitude from the user's context if available, otherwise, it attempts to find coordinates for the provided location name.";
  argsSchema = {
    type: "object" as const,
    properties: {
      location: {
        type: "string",
        description:
          "The city name or address (e.g., 'Paris, France', 'Tokyo'). If omitted, uses user's context location.",
      },
      latitude: {
        type: "number",
        description:
          "Optional explicit latitude. Overrides location name and context.",
      },
      longitude: {
        type: "number",
        description:
          "Optional explicit longitude. Overrides location name and context.",
      },
      date: {
        type: "string",
        format: "date",
        description: "Optional date to check (YYYY-MM-DD). Defaults to today.",
      },
    },
    required: [],
  };
  cacheTTLSeconds = 3600 * 6;

  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.appUrl}; contact: replace-with-your-contact@example.com)`; // REPLACE EMAIL

  constructor() {
    super();
    if (this.USER_AGENT.includes("replace-with-your-contact@example.com")) {
      this.log(
        "warn",
        "Update USER_AGENT contact info in SunriseSunsetTool for Nominatim compliance."
      );
    }
  }

  private async geocodeLocation(
    location: string,
    abortSignal?: AbortSignal
  ): Promise<GeocodeResult> {
    if (!location?.trim()) return { error: "Location name cannot be empty." };
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      location
    )}&format=json&limit=1&addressdetails=0`;
    this.log(
      "info",
      `Geocoding fallback required for "${location}" via Nominatim...`
    );
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: abortSignal ?? AbortSignal.timeout(5000),
      });
      if (abortSignal?.aborted) {
        this.log("warn", `Geocoding aborted for "${location}"`);
        return { error: "Geocoding request cancelled." };
      }
      if (!response.ok)
        throw new Error(
          `Nominatim API request failed: ${response.status} ${response.statusText}`
        );
      const data = await response.json();
      if (
        !Array.isArray(data) ||
        data.length === 0 ||
        !data[0].lat ||
        !data[0].lon
      ) {
        this.log(
          "warn",
          `Nominatim could not find coordinates for "${location}". Response:`,
          data
        );
        throw new Error(`Location "${location}" not found by Nominatim.`);
      }
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      if (isNaN(lat) || isNaN(lon))
        throw new Error("Invalid coordinates received from Nominatim.");
      this.log(
        "info",
        `Geocoded "${location}" to: ${lat.toFixed(4)}, ${lon.toFixed(
          4
        )}. Name: ${result.display_name}`
      );
      return {
        latitude: lat,
        longitude: lon,
        displayName: result.display_name,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        this.log("error", `Geocoding timed out or aborted for "${location}"`);
        return { error: "Geocoding request timed out or cancelled." };
      }
      this.log("error", `Geocoding error for "${location}":`, error.message);
      return {
        error: `Could not find coordinates for "${location}". (${error.message})`,
      };
    }
  }
  private getSafeTimezone(inputTz?: string | null): string {
    if (!inputTz) {
      this.log(
        "warn",
        "No timezone provided or found in context, defaulting to UTC."
      );
      return "Etc/UTC";
    }
    try {
      const found = findTimeZone(inputTz);
      if (found) return found.name;
    } catch {
      /* ignore */
    }
    this.log(
      "warn",
      `Could not validate provided timezone "${inputTz}", defaulting to UTC.`
    );
    return "Etc/UTC";
  }
  private formatTimeInZone(
    date: Date | undefined | null,
    timeZone: string
  ): string | null {
    if (!date || isNaN(date.getTime())) return null;
    try {
      return formatInTimeZone(date, timeZone, "HH:mm");
    } catch (e: any) {
      this.log(
        "error",
        `Error formatting time ${date.toISOString()} in zone ${timeZone}:`,
        e.message
      );
      return null;
    }
  }

  async execute(
    input: SunTimeInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    let lat: number | undefined | null = input.latitude;
    let lon: number | undefined | null = input.longitude;
    let locationName = input.location;
    let coordSource = "unknown";
    let displayLocation = "";
    let geoError: string | undefined = undefined;
    let structuredOutput: SunriseSunsetStructuredOutput = {
      result_type: "sun_times",
      source_api: "suncalc",
      query: input,
      resolvedLat: null,
      resolvedLon: null,
      resolvedLocation: locationName || "unknown",
      date: input.date || new Date().toISOString().split("T")[0],
      timezone: null,
      coordSource: coordSource,
      sunriseISO: null,
      sunsetISO: null,
      sunriseLocal: null,
      sunsetLocal: null,
      error: null,
    };

    if (abortSignal?.aborted) {
      logger.warn(`[SunriseSunsetTool] Execution aborted before starting.`);
      return {
        error: "Sun times check cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }

    if (typeof lat === "number" && typeof lon === "number") {
      coordSource = "explicit_coords";
      displayLocation = `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
      this.log("info", `Using explicit coords: ${lat}, ${lon}`);
    } else if (
      typeof input.context?.latitude === "number" &&
      typeof input.context?.longitude === "number"
    ) {
      coordSource = "user_context";
      lat = input.context.latitude;
      lon = input.context.longitude;
      displayLocation = locationName || `your current location`;
      this.log("info", `Using context coords: ${lat}, ${lon}`);
    } else if (locationName) {
      this.log(
        "info",
        `No coordinates provided, attempting to geocode "${locationName}"...`
      );
      const geoResult = await this.geocodeLocation(locationName, abortSignal);
      if (abortSignal?.aborted) {
        logger.warn(
          `[SunriseSunsetTool] Execution aborted during/after geocoding.`
        );
        return {
          error: "Sun times check cancelled.",
          result: "Cancelled.",
          structuredData: undefined,
        };
      }
      if (
        geoResult.error ||
        geoResult.latitude === undefined ||
        geoResult.longitude === undefined
      ) {
        geoError =
          geoResult.error ||
          `Could not find coordinates for "${locationName}".`;
        coordSource = "error";
      } else {
        lat = geoResult.latitude;
        lon = geoResult.longitude;
        coordSource = "geocoded_name";
        displayLocation = geoResult.displayName || locationName;
        this.log(
          "info",
          `Using geocoded coords for "${locationName}": ${lat}, ${lon}`
        );
      }
    } else {
      coordSource = "error";
      geoError =
        "Missing location information. Provide coordinates or a location name.";
    }

    structuredOutput.coordSource = coordSource;
    structuredOutput.resolvedLat = typeof lat === "number" ? lat : null;
    structuredOutput.resolvedLon = typeof lon === "number" ? lon : null;
    structuredOutput.resolvedLocation =
      displayLocation || locationName || "unknown";

    if (
      coordSource === "error" ||
      typeof lat !== "number" ||
      typeof lon !== "number"
    ) {
      const errorMsg =
        geoError || "Could not determine coordinates for the location.";
      structuredOutput.error = errorMsg;
      return {
        error: errorMsg,
        result: `Sorry, I need a valid location to check sun times. ${errorMsg}`,
        structuredData: structuredOutput,
      };
    }

    const dateString = input.date || new Date().toISOString().split("T")[0];
    structuredOutput.date = dateString;
    let targetDate: Date;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString))
        throw new Error("Invalid format");
      targetDate = new Date(dateString + "T12:00:00Z");
      if (isNaN(targetDate.getTime())) throw new Error("Invalid date value");
    } catch {
      const errorMsg = `Invalid date: "${input.date}". Use YYYY-MM-DD format.`;
      structuredOutput.error = errorMsg;
      return {
        error: errorMsg,
        result: "Please provide the date in YYYY-MM-DD format.",
        structuredData: structuredOutput,
      };
    }

    const timezone = this.getSafeTimezone(input.context?.timezone);
    structuredOutput.timezone = timezone;

    try {
      this.log(
        "info",
        `Calculating sun times using SunCalc for ${lat.toFixed(
          4
        )},${lon.toFixed(4)} on ${dateString}`
      );
      const times = SunCalc.getTimes(targetDate, lat, lon);
      structuredOutput.sunriseISO = times.sunrise?.toISOString() || null;
      structuredOutput.sunsetISO = times.sunset?.toISOString() || null;
      structuredOutput.sunriseLocal = this.formatTimeInZone(
        times.sunrise,
        timezone
      );
      structuredOutput.sunsetLocal = this.formatTimeInZone(
        times.sunset,
        timezone
      );
      structuredOutput.error = null;

      if (!structuredOutput.sunriseLocal || !structuredOutput.sunsetLocal) {
        this.log(
          "warn",
          `Failed to format sunrise/sunset times in timezone: ${timezone}`
        );
        const sunriseISOStr = structuredOutput.sunriseISO
          ? new Date(structuredOutput.sunriseISO).toUTCString()
          : "N/A";
        const sunsetISOStr = structuredOutput.sunsetISO
          ? new Date(structuredOutput.sunsetISO).toUTCString()
          : "N/A";
        const resultString = `For ${displayLocation} on ${dateString}: Sunrise is around ${sunriseISOStr} (UTC), Sunset is around ${sunsetISOStr} (UTC). (Could not format for timezone: ${timezone})`;
        structuredOutput.error = `Failed to format times in timezone ${timezone}.`;
        return {
          result: resultString,
          structuredData: structuredOutput,
          error: structuredOutput.error,
        };
      }

      const resultString = `For ${displayLocation} on ${dateString}:\nSunrise is around ${structuredOutput.sunriseLocal}\nSunset is around ${structuredOutput.sunsetLocal}\n(Times shown in timezone: ${timezone})`;
      this.log(
        "info",
        `SunCalc success for ${displayLocation}. Sunrise: ${structuredOutput.sunriseLocal}, Sunset: ${structuredOutput.sunsetLocal} (TZ: ${timezone})`
      );
      return { result: resultString, structuredData: structuredOutput };
    } catch (error: any) {
      this.log(
        "error",
        `SunCalc calculation error for ${lat.toFixed(4)},${lon.toFixed(4)}:`,
        error.message
      );
      structuredOutput.error = `Calculation failed: ${error.message}`;
      return {
        error: structuredOutput.error,
        result:
          "Sorry, there was an error calculating the sun times for that location.",
        structuredData: structuredOutput,
      };
    }
  }
}
