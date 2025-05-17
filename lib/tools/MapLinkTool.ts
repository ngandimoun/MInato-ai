// FILE: lib/tools/MapLinkTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { MapLinkStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface MapLinkInput extends ToolInput {
  location?: string | null;
  origin?: string | null;
  destination?: string | null;
  provider?: "google" | "apple" | null;
}

export class MapLinkTool extends BaseTool {
  name = "MapLinkTool";
  description =
    "Generates a web link (Google Maps or Apple Maps) to show a specific location on a map, or to get directions between two points.";
  argsSchema = {
    type: "object" as const,
    properties: {
      location: { type: ["string", "null"] as const, description: "A location name or address to show on the map. Use this OR both origin and destination. Can be null." } as OpenAIToolParameterProperties,
      origin: { type: ["string", "null"] as const, description: "The starting point for directions. Required if destination is provided. Can be null." } as OpenAIToolParameterProperties,
      destination: { type: ["string", "null"] as const, description: "The destination point for directions. Required if origin is provided. Can be null." } as OpenAIToolParameterProperties,
      provider: {
        type: ["string", "null"] as const,
        enum: ["google", "apple", null],
        description: "Map provider ('google' or 'apple'). If null or omitted, defaults to google.",
      } as OpenAIToolParameterProperties,
    },
    required: ["location", "origin", "destination", "provider"], // All defined properties are required
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined;

  async execute(input: MapLinkInput): Promise<ToolOutput> {
    // Defaulting logic
    const location = (input.location === null) ? undefined : input.location;
    const origin = (input.origin === null) ? undefined : input.origin;
    const destination = (input.destination === null) ? undefined : input.destination;
    const provider = (input.provider === null || input.provider === undefined) ? "google" : input.provider;

    let url = "";
    let description = "";
    let linkType: "location" | "directions"; // Will be set if valid
    const queryInputForStructuredData = { ...input, provider };

    let outputStructuredData: MapLinkStructuredOutput = {
      result_type: "map_link", source_api: "map_tool",
      query: queryInputForStructuredData, mapProvider: provider,
      mapUrl: "", type: "location", // Default type, will be updated
      error: undefined
    };

    try {
      if (location && !origin && !destination) {
        const cleanLocation = String(location).trim();
        if (!cleanLocation) {
            outputStructuredData.error = "Empty 'location' provided.";
            return { error: outputStructuredData.error, result: "Please provide a location for Minato to map.", structuredData: outputStructuredData };
        }
        description = `a map link for "${cleanLocation}"`;
        linkType = "location";
        if (provider === "apple") url = `maps://?q=${encodeURIComponent(cleanLocation)}`;
        else url = `https://maps.google.com/?q=${encodeURIComponent(cleanLocation)}`;
        outputStructuredData = { ...outputStructuredData, type: "location", location: cleanLocation, mapUrl: url, error: undefined };
      } else if (origin && destination && !location) {
        const cleanOrigin = String(origin).trim();
        const cleanDestination = String(destination).trim();
        if (!cleanOrigin) {
          outputStructuredData.error = "Empty 'origin' for directions.";
          return { error: outputStructuredData.error, result: "Please provide a starting point for directions.", structuredData: outputStructuredData };
        }
        if (!cleanDestination) {
          outputStructuredData.error = "Empty 'destination' for directions.";
          return { error: outputStructuredData.error, result: "Please provide a destination for directions.", structuredData: outputStructuredData };
        }
        description = `directions from "${cleanOrigin}" to "${cleanDestination}"`;
        linkType = "directions";
        if (provider === "apple") url = `maps://?saddr=${encodeURIComponent(cleanOrigin)}&daddr=${encodeURIComponent(cleanDestination)}`;
        else url = `https://maps.google.com/?saddr=${encodeURIComponent(cleanOrigin)}&daddr=${encodeURIComponent(cleanDestination)}`;
        outputStructuredData = { ...outputStructuredData, type: "directions", origin: cleanOrigin, destination: cleanDestination, mapUrl: url, error: undefined };
      } else {
        outputStructuredData.error = "Invalid args. Provide 'location' OR 'origin'/'destination'.";
        return { error: outputStructuredData.error, result: `Please provide either a single location for Minato to show on a map, or both an origin and a destination for directions, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
      }

      const resultString = `Okay, ${input.context?.userName || "User"}, here is ${description} using ${provider === "apple" ? "Apple Maps" : "Google Maps"}. Minato hopes this helps!`;
      this.log("info", `Generated ${provider} map link for ${description}.`);
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Failed to generate map link: ${error.message}`;
      this.log("error", "Error generating map link:", error);
      outputStructuredData.error = errorMsg;
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't create that map link.`, structuredData: outputStructuredData };
    }
  }
}