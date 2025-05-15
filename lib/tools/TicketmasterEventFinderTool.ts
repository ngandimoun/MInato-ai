// FILE: lib/tools/TicketmasterEventFinderTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  EventFinderStructuredOutput,
  TicketmasterEvent,
} from "@/lib/types/index"; // Use types from index

interface EventFinderInput extends ToolInput {
  keyword?: string;
  location?: string;
  radius?: number;
  radiusUnit?: "miles" | "km";
  startDate?: string;
  endDate?: string;
  classification?: string;
  limit?: number;
}
// Internal types for Ticketmaster response structure
interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
}
interface TicketmasterDateInfo {
  localDate: string;
  localTime?: string;
  dateTime?: string;
  status?: { code: string };
  spanMultipleDays?: boolean;
}
interface TicketmasterClassification {
  primary?: boolean;
  segment?: { id: string; name: string };
  genre?: { id: string; name: string };
  subGenre?: { id: string; name: string };
  type?: { id: string; name: string };
  subType?: { id: string; name: string };
}
interface TicketmasterVenue {
  name: string;
  id: string;
  url?: string;
  postalCode?: string;
  city?: { name: string };
  state?: { name: string; stateCode?: string };
  country?: { name: string; countryCode: string };
  address?: { line1?: string };
  location?: { longitude: string; latitude: string };
  images?: TicketmasterImage[];
}
interface TicketmasterAttraction {
  name: string;
  id: string;
  url?: string;
  images?: TicketmasterImage[];
  classifications?: TicketmasterClassification[];
}
interface TicketmasterPriceRange {
  type: string;
  currency: string;
  min: number;
  max: number;
}
interface TicketmasterEventRaw {
  name: string;
  type: string;
  id: string;
  test?: boolean;
  url?: string;
  locale?: string;
  images?: TicketmasterImage[];
  dates?: {
    start?: TicketmasterDateInfo;
    end?: TicketmasterDateInfo;
    timezone?: string;
    status?: { code: string };
    spanMultipleDays?: boolean;
  };
  classifications?: TicketmasterClassification[];
  promoter?: { id: string; name: string; description?: string };
  promoters?: Array<{ id: string; name: string; description?: string }>;
  priceRanges?: TicketmasterPriceRange[];
  seatmap?: { staticUrl?: string };
  _links?: {
    self: { href: string };
    attractions?: Array<{ href: string }>;
    venues?: Array<{ href: string }>;
  };
  _embedded?: {
    venues?: TicketmasterVenue[];
    attractions?: TicketmasterAttraction[];
  };
}
interface TicketmasterDiscoveryResponse {
  _embedded?: { events: TicketmasterEventRaw[] };
  _links?: any;
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
  errors?: Array<{ code: string; detail: string; status: string }>;
}

export class EventFinderTool extends BaseTool {
  name = "EventFinderTool";
  description =
    "Finds upcoming events (concerts, sports, theater) near a location based on keywords, dates, or classifications using Ticketmaster.";
  argsSchema = {
    type: "object" as const,
    properties: {
      keyword: {
        type: "string",
        description:
          "Keywords to search events for (e.g., 'rock concert', 'baseball').",
      },
      location: {
        type: "string",
        description:
          "City, state, or zip code to search near (e.g., 'London', 'New York, NY', '90210'). Uses context location if omitted.",
      },
      radius: {
        type: "number",
        description: "Search radius around the location. Defaults to 25.",
        default: 25,
      },
      radiusUnit: {
        type: "string",
        enum: ["miles", "km"],
        description: "Unit for the radius (miles or km). Defaults to miles.",
        default: "miles",
      },
      startDate: {
        type: "string",
        format: "date-time",
        description:
          "Optional start date/time for the event search (ISO 8601 format, e.g., '2024-09-21T00:00:00Z'). Defaults to now.",
      },
      endDate: {
        type: "string",
        format: "date-time",
        description:
          "Optional end date/time for the event search (ISO 8601 format).",
      },
      classification: {
        type: "string",
        description:
          "Filter by classification (e.g., 'Music', 'Sports', 'Arts & Theatre').",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 10,
        description: "Maximum number of events to return. Defaults to 5.",
        default: 5,
      },
    },
    required: [],
  };
  cacheTTLSeconds = 60 * 30;

  private readonly API_BASE =
    "https://app.ticketmaster.com/discovery/v2/events.json";
  private readonly API_KEY: string;
  private readonly USER_AGENT = "MinatoAICompanion/1.0";

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.ticketmaster || "";
    if (!this.API_KEY)
      this.log("error", "Ticketmaster API Key missing. Tool will fail.");
  }

  private formatIsoDateTime(
    dateInput: string | Date | undefined
  ): string | undefined {
    if (!dateInput) return undefined;
    try {
      const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) {
        this.log(
          "warn",
          `Invalid date input provided for formatting: ${dateInput}`
        );
        return undefined;
      }
      return d.toISOString().substring(0, 19) + "Z";
    } catch (e: any) {
      this.log(
        "error",
        `Error parsing date for formatting: ${dateInput}`,
        e.message
      );
      return undefined;
    }
  }

  // Map raw TicketmasterEventRaw to simplified TicketmasterEvent used in types/index.d.ts
  private mapRawEventToAppEvent(
    rawEvent: TicketmasterEventRaw
  ): TicketmasterEvent {
    // Selectively map fields we defined in lib/types/index.d.ts
    return {
      name: rawEvent.name,
      type: rawEvent.type,
      id: rawEvent.id,
      test: rawEvent.test,
      url: rawEvent.url,
      locale: rawEvent.locale,
      images: rawEvent.images,
      dates: rawEvent.dates,
      classifications: rawEvent.classifications,
      promoter: rawEvent.promoter,
      priceRanges: rawEvent.priceRanges,
      _embedded: rawEvent._embedded, // Include embedded venues/attractions
    };
  }

  async execute(
    input: EventFinderInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    if (!this.API_KEY)
      return {
        error: "Event Finder Tool not configured.",
        result: "Event search unavailable.",
        structuredData: undefined,
      };

    const limit = input.limit ? Math.max(1, Math.min(input.limit, 10)) : 5;
    const params = new URLSearchParams({
      apikey: this.API_KEY,
      size: String(limit),
      sort: "date,asc",
      includeTBA: "no",
      includeTBD: "no",
    });
    let locationDescription = "your current area";

    if (input.keyword) params.set("keyword", input.keyword);
    if (input.classification)
      params.set("classificationName", input.classification);

    if (input.location) {
      params.set("city", input.location);
      locationDescription = `near ${input.location}`;
      params.set("radius", String(input.radius || 25));
      params.set("unit", input.radiusUnit || "miles");
    } else if (
      typeof input.context?.latitude === "number" &&
      typeof input.context?.longitude === "number"
    ) {
      const geoPoint = `${input.context.latitude},${input.context.longitude}`;
      params.set("geoPoint", geoPoint);
      locationDescription = "near your current location";
      this.log(
        "info",
        `Using context coordinates for event search: ${geoPoint}`
      );
      params.set("radius", String(input.radius || 25));
      params.set("unit", input.radiusUnit || "miles");
    } else {
      locationDescription = "globally";
      this.log(
        "warn",
        "No location or context coordinates provided for event search. Searching globally."
      );
    }

    const startDateTime = this.formatIsoDateTime(input.startDate || new Date());
    if (startDateTime) params.set("startDateTime", startDateTime);
    const endDateTime = this.formatIsoDateTime(input.endDate);
    if (endDateTime) params.set("endDateTime", endDateTime);

    const url = `${this.API_BASE}?${params.toString()}`;
    this.log(
      "info",
      `Searching Ticketmaster Events ${locationDescription} for "${
        input.keyword || input.classification || "any"
      }": ${url.split("apikey=")[0]}...`
    );

    // Initialize structured data
    let outputStructuredData: EventFinderStructuredOutput = {
      result_type: "event_list",
      source_api: "ticketmaster",
      query: input,
      locationDescription: locationDescription,
      count: 0,
      events: [],
      error: undefined,
    };

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: abortSignal ?? AbortSignal.timeout(8000),
      });
      const responseBody = await response.text();
      if (abortSignal?.aborted) {
        logger.warn(`[EventFinderTool] Aborted after API call.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return {
          error: "Event search cancelled.",
          result: "Cancelled.",
          structuredData: outputStructuredData,
        };
      }

      if (!response.ok) {
        let errorDetail = `Event search failed: ${response.status} ${response.statusText}.`;
        try {
          const eJson = JSON.parse(responseBody);
          errorDetail += ` Details: ${
            eJson.errors?.[0]?.detail ||
            eJson.errors?.[0]?.code ||
            JSON.stringify(eJson)
          }`;
        } catch {
          errorDetail += ` Response: ${responseBody.substring(0, 150)}...`;
        }
        this.log(
          "error",
          `Ticketmaster API Error ${response.status}: ${errorDetail}`
        );
        throw new Error(errorDetail);
      }
      const data: TicketmasterDiscoveryResponse = JSON.parse(responseBody);
      const rawEvents = data?._embedded?.events;

      if (!rawEvents || rawEvents.length === 0) {
        const criteria = [
          input.keyword ? `"${input.keyword}"` : "",
          `loc:${locationDescription}`,
          input.classification ? `cat:"${input.classification}"` : "",
          startDateTime ? `after ${startDateTime.substring(0, 10)}` : "",
        ]
          .filter(Boolean)
          .join(", ");
        const msg = `No upcoming events found matching criteria (${criteria}).`;
        this.log("info", msg);
        outputStructuredData.totalFound = data.page?.totalElements || 0;
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log("info", `Found ${rawEvents.length} events via Ticketmaster.`);
      const mappedEvents = rawEvents.map(this.mapRawEventToAppEvent); // Use mapper
      const resultString =
        `Upcoming events ${locationDescription}${
          input.keyword ? ` related to "${input.keyword}"` : ""
        }:\n` +
        mappedEvents
          .map((e, i) => {
            const name = e.name;
            const venue = e._embedded?.venues?.[0]?.name || "TBD";
            const city = e._embedded?.venues?.[0]?.city?.name || "";
            const state = e._embedded?.venues?.[0]?.state?.stateCode || "";
            const venueLoc = [venue, city, state].filter(Boolean).join(", ");
            const date = e.dates?.start?.localDate || "TBD";
            const time = e.dates?.start?.localTime?.substring(0, 5);
            const dtInfo = `${date}${time ? ` at ${time}` : ""}`;
            return `${i + 1}. ${name} at ${venueLoc} on ${dtInfo}`;
          })
          .join("\n");

      outputStructuredData.count = mappedEvents.length;
      outputStructuredData.totalFound = data.page?.totalElements;
      outputStructuredData.events = mappedEvents; // Store mapped events
      outputStructuredData.error = undefined;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMessage = `Failed event search: ${error.message}`;
      outputStructuredData.error = errorMessage;
      if (error.name === "AbortError") {
        this.log("error", `Ticketmaster request timed out or was aborted.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return {
          error: "Event search timed out or cancelled.",
          result: "Sorry, the search for events took too long.",
          structuredData: outputStructuredData,
        };
      }
      this.log("error", `Error fetching Ticketmaster events:`, error.message);
      return {
        error: errorMessage,
        result: `Sorry, an error occurred while finding events.`,
        structuredData: outputStructuredData,
      };
    }
  }
}
