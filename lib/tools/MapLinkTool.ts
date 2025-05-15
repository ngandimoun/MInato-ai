// FILE: lib/tools/MapLinkTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { MapLinkStructuredOutput } from "@/lib/types/index";

interface MapLinkInput extends ToolInput {
  location?: string;
  origin?: string;
  destination?: string;
  provider?: "google" | "apple";
}

export class MapLinkTool extends BaseTool {
  name = "MapLinkTool";
  description =
    "Generates a web link (Google Maps or Apple Maps) to show a specific location on a map, or to get directions between two points.";
  argsSchema = {
    type: "object" as const,
    properties: {
      location: {
        type: "string",
        description: "A location name or address to show on the map.",
      },
      origin: {
        type: "string",
        description: "The starting point for directions.",
      },
      destination: {
        type: "string",
        description: "The destination point for directions.",
      },
      provider: {
        type: "string",
        enum: ["google", "apple"],
        description: "Map provider ('google' or 'apple'). Defaults to google.",
      },
    },
  }; // Removed required, logic handles it
  cacheTTLSeconds = undefined;

  async execute(input: MapLinkInput): Promise<ToolOutput> {
    const { location, origin, destination } = input;
    const provider = input.provider === "apple" ? "apple" : "google";
    let url = "";
    let description = "";
    let linkType: "location" | "directions" | null = null;
    let outputStructuredData: MapLinkStructuredOutput = {
      result_type: "map_link",
      query: input,
      mapProvider: provider,
      mapUrl: "",
      type: "location",
      error: undefined,
      source_api: "map_tool",
    };

    try {
      if (location && !origin && !destination) {
        const cleanLocation = String(location).trim();
        if (!cleanLocation) {
          outputStructuredData.error = "Empty 'location'.";
          return {
            error: outputStructuredData.error,
            result: "Please provide a location.",
            structuredData: outputStructuredData,
          };
        }
        description = `a map link for "${cleanLocation}"`;
        linkType = "location";
        if (provider === "apple")
          url = `maps://?q=${encodeURIComponent(cleanLocation)}`;
        else
          url = `https://maps.google.com/?q=${encodeURIComponent(
            cleanLocation
          )}`;
        outputStructuredData = {
          ...outputStructuredData,
          type: "location",
          location: cleanLocation,
          mapUrl: url,
          error: undefined,
        };
      } else if (origin && destination && !location) {
        const cleanOrigin = String(origin).trim();
        const cleanDestination = String(destination).trim();
        if (!cleanDestination) {
          outputStructuredData.error = "Empty 'destination'.";
          return {
            error: outputStructuredData.error,
            result: "Please provide a destination.",
            structuredData: outputStructuredData,
          };
        }
        description = `directions from "${cleanOrigin}" to "${cleanDestination}"`;
        linkType = "directions";
        if (provider === "apple")
          url = `maps://?saddr=${encodeURIComponent(
            cleanOrigin
          )}&daddr=${encodeURIComponent(cleanDestination)}`;
        else
          url = `https://maps.google.com/?saddr=${encodeURIComponent(
            cleanOrigin
          )}&daddr=${encodeURIComponent(cleanDestination)}`;
        outputStructuredData = {
          ...outputStructuredData,
          type: "directions",
          origin: cleanOrigin,
          destination: cleanDestination,
          mapUrl: url,
          error: undefined,
        };
      } else {
        outputStructuredData.error =
          "Invalid args. Provide 'location' OR 'origin'/'destination'.";
        return {
          error: outputStructuredData.error,
          result:
            "Please provide either a location OR both an origin and destination.",
          structuredData: outputStructuredData,
        };
      }

      const resultString = `Okay, here is ${description} using ${
        provider === "apple" ? "Apple Maps" : "Google Maps"
      }.`;
      this.log("info", `Generated ${provider} map link for ${description}.`);
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Failed to generate map link: ${error.message}`;
      this.log("error", "Error generating map link:", error);
      outputStructuredData.error = errorMsg;
      return {
        error: errorMsg,
        result: "Sorry, couldn't create that map link.",
        structuredData: outputStructuredData,
      };
    }
  }
}
