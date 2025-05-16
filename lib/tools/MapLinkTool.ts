import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { MapLinkStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config"; // Import logger

interface MapLinkInput extends ToolInput {
  location?: string | null; // Allow null
  origin?: string | null;   // Allow null
  destination?: string | null; // Allow null
  provider?: "google" | "apple" | null; // Allow null
}

export class MapLinkTool extends BaseTool {
  name = "MapLinkTool";
  description =
    "Generates a web link (Google Maps or Apple Maps) to show a specific location on a map, or to get directions between two points.";
  argsSchema = {
    type: "object" as const,
    properties: {
      location: { type: ["string", "null"], description: "A location name or address to show on the map." },
      origin: { type: ["string", "null"], description: "The starting point for directions." },
      destination: { type: ["string", "null"], description: "The destination point for directions." },
      provider: { type: ["string", "null"], enum: ["google", "apple"], description: "Map provider ('google' or 'apple'). Defaults to google." },
    },
    // Logic in execute handles one of (location) OR (origin AND destination)
    required: ["location", "origin", "destination", "provider"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined; // Links are dynamic, no caching

  async execute(input: MapLinkInput): Promise<ToolOutput> {
    const { location, origin, destination } = input;
    const provider = input.provider ?? "google"; // Default to google if null
    let url = "";
    let description = "";
    let linkType: "location" | "directions" | null = null;
    const queryInputForStructuredData = { ...input, provider }; // For structured output

    let outputStructuredData: MapLinkStructuredOutput = {
      result_type: "map_link",
      source_api: "map_tool",
      query: queryInputForStructuredData,
      mapProvider: provider,
      mapUrl: "",
      type: "location", // sera mis à jour
    };

    try {
      if (location && !origin && !destination) {
        const cleanLocation = String(location).trim();
        if (!cleanLocation) {
          return { error: "Empty 'location'.", result: "Please provide a location for Minato to map.", structuredData: outputStructuredData };
        }
        description = `a map link for "${cleanLocation}"`;
        linkType = "location";
        if (provider === "apple") url = `maps://?q=${encodeURIComponent(cleanLocation)}`;
        else url = `https://maps.google.com/?q=${encodeURIComponent(cleanLocation)}`;
        outputStructuredData = { ...outputStructuredData, type: "location", location: cleanLocation, mapUrl: url };
      } else if (origin && destination && !location) {
        const cleanOrigin = String(origin).trim();
        const cleanDestination = String(destination).trim();
        if (!cleanOrigin) {
          return { error: "Empty 'origin' for directions.", result: "Please provide a starting point for directions.", structuredData: outputStructuredData };
        }
        if (!cleanDestination) {
          return { error: "Empty 'destination' for directions.", result: "Please provide a destination for directions.", structuredData: outputStructuredData };
        }
        description = `directions from "${cleanOrigin}" to "${cleanDestination}"`;
        linkType = "directions";
        if (provider === "apple") url = `maps://?saddr=${encodeURIComponent(cleanOrigin)}&daddr=${encodeURIComponent(cleanDestination)}`;
        else url = `https://maps.google.com/?saddr=${encodeURIComponent(cleanOrigin)}&daddr=${encodeURIComponent(cleanDestination)}`;
        outputStructuredData = { ...outputStructuredData, type: "directions", origin: cleanOrigin, destination: cleanDestination, mapUrl: url };
      } else {
        return { error: "Invalid args. Provide 'location' OR 'origin'/'destination'.", result: `Please provide either a single location for Minato to show on a map, or both an origin and a destination for directions, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
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