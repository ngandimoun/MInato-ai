//livingdossier/services/tools-livings/GeolocationTool.ts
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch"; // Use node-fetch for server-side
// Import specific types directly
import {
  AnyToolStructuredData,
} from "../../../lib/types/index";
import { appConfig } from "../config"; // For potential USER_AGENT use
import { logger } from "../../memory-framework/config"; // Use shared logger

interface GeolocationInput extends ToolInput {
  /* No specific args */
}

// Structure matching ip-api.com JSON response (keep internal)
interface IpApiLocationData {
  status: "success" | "fail";
  message?: string;
  query?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
}

// Define local types since imports are failing
interface GeolocationStructuredOutput {
  result_type: "geolocation";
  source_api: string;
  query: any;
  queryIP?: string | null;
  status?: string;
  city?: string | null;
  regionCode?: string | null;
  regionName?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  isp?: string | null;
  organization?: string | null;
  asn?: string | null;
  errorMessage?: string | null;
  location?: {
    ip: string;
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    timezone?: string;
  } | null;
  error?: string;
}

export class GeolocationTool extends BaseTool {
  name = "GeolocationTool";
  description =
    "Estimates the user's current approximate location (City, Region, Country, Timezone, Lat/Lon) based on their connection IP address. Provides context for location-aware queries.";
  argsSchema = {
    type: "object" as const,
    properties: {},
    description: "This tool doesn't require any parameters. It uses the user's context location if available.",
    required: [] as string[],
    additionalProperties: false as const,
  };
  cacheTTLSeconds = 3600 * 6; // Cache geolocation for 6 hours

  // User Agent for ip-api.com (optional but good practice)
  private readonly USER_AGENT = "MinatoAICompanion/1.0";

  private isPrivateIP(ip: string): boolean {
    if (!ip) return false;
    // Check for IPv6 loopback and link-local
    if (ip === "::1" || ip.startsWith("fe80:")) return true;
    // Check for IPv4 loopback and common private ranges
    if (ip === "127.0.0.1") return true;
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return false; // Ensure 4 valid numbers
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    return false;
  }

  async execute(
    input: GeolocationInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const ipAddress = input.context?.ipAddress;
    const logPrefix = `[GeolocationTool IP:${
      ipAddress?.substring(0, 15) || "N/A"
    }]`;

    // Initialize with required discriminant type and default error status
    let outputStructuredData: GeolocationStructuredOutput = {
      result_type: "geolocation", // Discriminant
      source_api: "geolocation_tool", // Add source_api here
      queryIP: ipAddress || null,
      status: "error", // Default status
      city: null,
      regionCode: null,
      regionName: null,
      countryCode: null,
      countryName: null,
      zipCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      organization: null,
      asn: null,
      errorMessage: "Tool execution failed initially.", // Initial error message
      query: input, // Include query input
      error: undefined, // Initialize top-level error
    };

    if (!ipAddress) {
      outputStructuredData.errorMessage = "IP address missing from context.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      this.log("warn", "IP Address not found in tool context.");
      return {
        result:
          "I couldn't determine your location context (missing connection info).",
        error: outputStructuredData.errorMessage,
        structuredData: outputStructuredData,
      };
    }

    if (this.isPrivateIP(ipAddress)) {
      this.log(
        "info",
        `Skipping public geolocation for local/private IP: ${ipAddress}`
      );
      outputStructuredData.status = "local_ip";
      outputStructuredData.errorMessage =
        "Private IP detected; cannot perform public lookup.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      return {
        result:
          "Your connection seems local, so I can't get a public location.",
        error: outputStructuredData.errorMessage, // Keep error for internal logging
        structuredData: outputStructuredData,
      };
    }

    // Define fields to request from ip-api.com
    const fields =
      "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query";
    const apiUrl = `http://ip-api.com/json/${ipAddress}?fields=${fields}`;
    this.log(
      "info",
      `Fetching geolocation for public IP ${ipAddress.substring(
        0,
        15
      )}... from ip-api.com`
    );

    try {
      // Execute fetch request with timeout/abort signal
      const response = await fetch(apiUrl, {
        headers: { "User-Agent": this.USER_AGENT },
      });

      // Check abort signal *after* the call (best effort)
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after GeoIP API call.`);
        outputStructuredData.errorMessage =
          "Geolocation request timed out or cancelled.";
        outputStructuredData.error = outputStructuredData.errorMessage;
        outputStructuredData.status = "error";
        return {
          error: "Geolocation request cancelled.",
          result: "Cancelled.",
          structuredData: outputStructuredData,
        };
      }

      // Handle non-OK responses before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `GeoIP API request failed: ${response.status} ${
            response.statusText
          }. Response: ${errorText.substring(0, 100)}`
        );
      }

      const data: IpApiLocationData =
        (await response.json()) as IpApiLocationData;

      // Handle API-level failures reported in the JSON response
      if (data.status !== "success") {
        outputStructuredData.errorMessage = `GeoIP API failed: ${
          data.message || "Unknown reason reported by API"
        }`;
        outputStructuredData.error = outputStructuredData.errorMessage;
        outputStructuredData.status = "error"; // Ensure status is error
        this.log(
          "error",
          `Geolocation API returned failure for IP ${ipAddress}: ${outputStructuredData.errorMessage}`
        );
        return {
          error: outputStructuredData.errorMessage,
          result:
            "Sorry, couldn't determine your location from the IP address.",
          structuredData: outputStructuredData,
        };
      }

      // Process successful response
      const locationParts = [data.city, data.regionName, data.country].filter(
        Boolean
      );
      const locationString =
        locationParts.length > 0
          ? locationParts.join(", ")
          : "an unspecified location";
      const resultString = `Based on your connection, your approximate location is ${locationString}${
        data.timezone ? ` (Timezone: ${data.timezone})` : ""
      }.`;

      // **CORRECTED**: Rebuild the object ensuring all required fields, including source_api, are present
      outputStructuredData = {
        result_type: "geolocation", // Discriminant
        source_api: "geolocation_tool", // Ensure source_api is included
        queryIP: ipAddress, // Keep queryIP
        status: "success", // Update status
        city: data.city || null,
        regionCode: data.region || null,
        regionName: data.regionName || null,
        countryCode: data.countryCode || null,
        countryName: data.country || null,
        zipCode: data.zip || null,
        latitude: data.lat ?? null,
        longitude: data.lon ?? null,
        timezone: data.timezone || null,
        isp: data.isp || null,
        organization: data.org || null,
        asn: data.as || null,
        errorMessage: null, // Clear error message on success
        query: input, // Keep original query input
        error: undefined, // Clear top-level error
      };
      this.log(
        "info",
        `Geolocation success for ${ipAddress}: ${locationString}, TZ: ${data.timezone}`
      );

      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      let errorMsg: string;
      // Handle AbortError specifically
      if (error.name === "AbortError") {
        errorMsg = `Geolocation lookup timed out or was cancelled for IP ${ipAddress}`;
        this.log("error", errorMsg);
        outputStructuredData.errorMessage = "Geolocation request timed out.";
      } else {
        // Handle other errors (network, parsing, etc.)
        errorMsg = `Geolocation fetch failed: ${error.message}`;
        this.log(
          "error",
          `Geolocation error for IP ${ipAddress}:`,
          error.message
        );
        outputStructuredData.errorMessage = errorMsg;
      }
      outputStructuredData.status = "error";
      outputStructuredData.error = errorMsg; // Set top-level error

      return {
        error: errorMsg,
        result: "Sorry, failed to get location details due to an error.",
        structuredData: outputStructuredData, // Return structure with error
      };
    }
  }
}