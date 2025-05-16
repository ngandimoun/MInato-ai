import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { GeolocationStructuredOutput } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";

interface GeolocationInput extends ToolInput {
  // No specific arguments for this tool, it uses context.ipAddress
}

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

export class GeolocationTool extends BaseTool {
  name = "GeolocationTool";
  description =
    "Estimates the user's current approximate location (City, Region, Country, Timezone, Lat/Lon) based on their connection IP address. Provides context for location-aware queries.";
  argsSchema = {
    type: "object" as const,
    properties: {}, // No user-settable properties for this tool
    required: [],
    additionalProperties: false as false,
    description: "No arguments needed; uses connection info from context.",
  };
  cacheTTLSeconds = 3600 * 6; // Cache for 6 hours

  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update GeolocationTool USER_AGENT contact info with actual details for ip-api.com compliance.");
    }
  }

  private isPrivateIP(ip: string): boolean {
    if (!ip) return false;
    if (ip === "::1" || ip.startsWith("fe80:")) return true; // IPv6 localhost and link-local
    if (ip === "127.0.0.1") return true; // IPv4 localhost
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return false; // Not a valid IPv4
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    return false;
  }

  async execute(input: GeolocationInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const ipAddress = input.context?.ipAddress;
    const logPrefix = `[GeolocationTool IP:${ipAddress?.substring(0,15) || "N/A"}]`;
    const queryInputForStructuredData = { ...input };

    let outputStructuredData: GeolocationStructuredOutput = {
      result_type: "geolocation",
      source_api: "geolocation_tool", // Or "ip-api.com"
      query: queryInputForStructuredData,
      queryIP: ipAddress || null,
      status: "error",
      city: null, regionCode: null, regionName: null, countryCode: null, countryName: null,
      zipCode: null, latitude: null, longitude: null, timezone: null,
      isp: null, organization: null, asn: null,
      errorMessage: "Tool execution failed initially.",
      error: "Tool execution failed initially.",
    };

    if (!ipAddress) {
      outputStructuredData.errorMessage = "IP address missing from context.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      this.log("warn", "IP Address not found in tool context.");
      return { result: "Minato couldn't determine your location context (missing connection info).", error: outputStructuredData.errorMessage, structuredData: outputStructuredData };
    }
    if (this.isPrivateIP(ipAddress)) {
      this.log("info", `Skipping public geolocation for local/private IP: ${ipAddress}`);
      outputStructuredData.status = "local_ip";
      outputStructuredData.errorMessage = "Private IP detected; cannot perform public lookup.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      return { result: "Your connection seems local, so Minato can't get a public location.", error: outputStructuredData.errorMessage, structuredData: outputStructuredData };
    }

    const fields = "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query";
    const apiUrl = `http://ip-api.com/json/${ipAddress}?fields=${fields}`;
    this.log("info", `Fetching geolocation for public IP ${ipAddress.substring(0,15)}... from ip-api.com`);

    try {
      const response = await fetch(apiUrl, { signal: abortSignal ?? AbortSignal.timeout(4000), headers: { "User-Agent": this.USER_AGENT } });
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after GeoIP API call.`);
        outputStructuredData.errorMessage = "Geolocation request timed out or cancelled.";
        outputStructuredData.error = outputStructuredData.errorMessage;
        outputStructuredData.status = "error";
        return { error: "Geolocation request cancelled.", result: "Cancelled.", structuredData: outputStructuredData };
      }
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GeoIP API request failed: ${response.status} ${response.statusText}. Response: ${errorText.substring(0,100)}`);
      }
      const data: IpApiLocationData = await response.json() as IpApiLocationData;

      if (data.status !== "success") {
        outputStructuredData.errorMessage = `GeoIP API failed: ${data.message || "Unknown reason reported by API"}`;
        outputStructuredData.error = outputStructuredData.errorMessage;
        outputStructuredData.status = "error";
        this.log("error", `Geolocation API returned failure for IP ${ipAddress}: ${outputStructuredData.errorMessage}`);
        return { error: outputStructuredData.errorMessage, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't determine your location from the IP address.`, structuredData: outputStructuredData };
      }

      const locationParts = [data.city, data.regionName, data.country].filter(Boolean);
      const locationString = locationParts.length > 0 ? locationParts.join(", ") : "an unspecified location";
      const resultString = `Based on your connection, ${input.context?.userName || "User"}, your approximate location is ${locationString}${data.timezone ? ` (Timezone: ${data.timezone})` : ""}.`;

      outputStructuredData = {
        result_type: "geolocation", source_api: "geolocation_tool", query: queryInputForStructuredData,
        queryIP: ipAddress, status: "success",
        city: data.city || null, regionCode: data.region || null, regionName: data.regionName || null,
        countryCode: data.countryCode || null, countryName: data.country || null,
        zipCode: data.zip || null, latitude: data.lat ?? null, longitude: data.lon ?? null,
        timezone: data.timezone || null, isp: data.isp || null, organization: data.org || null,
        asn: data.as || null, errorMessage: null, error: undefined
      };
      this.log("info", `Geolocation success for ${ipAddress}: ${locationString}, TZ: ${data.timezone}`);
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      let errorMsg: string;
      if (error.name === 'AbortError') {
        errorMsg = `Geolocation lookup timed out or was cancelled for IP ${ipAddress}`;
        this.log("error", errorMsg);
        outputStructuredData.errorMessage = "Geolocation request timed out.";
      } else {
        errorMsg = `Geolocation fetch failed: ${error.message}`;
        this.log("error", `Geolocation error for IP ${ipAddress}:`, error.message);
        outputStructuredData.errorMessage = errorMsg;
      }
      outputStructuredData.status = "error";
      outputStructuredData.error = errorMsg;
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato failed to get location details due to an error.`, structuredData: outputStructuredData };
    }
  }
}