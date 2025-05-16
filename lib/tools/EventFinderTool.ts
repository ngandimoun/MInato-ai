import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  EventFinderStructuredOutput,
  TicketmasterEvent,
} from "@/lib/types/index";

interface EventFinderInput extends ToolInput {
  keyword?: string | null; // Allow null
  location?: string | null; // Allow null
  radius?: number | null; // Allow null
  radiusUnit?: "miles" | "km" | null; // Allow null
  startDate?: string | null; // Allow null
  endDate?: string | null; // Allow null
  classification?: string | null; // Allow null
  limit?: number | null; // Allow null
}

// Internal types for Ticketmaster response structure remain the same
interface TicketmasterImage { url: string; ratio?: string; width?: number; height?: number; fallback?: boolean; }
interface TicketmasterDateInfo { localDate: string; localTime?: string; dateTime?: string; status?: { code: string }; spanMultipleDays?: boolean; }
interface TicketmasterClassification { primary?: boolean; segment?: { id: string; name: string }; genre?: { id: string; name: string }; subGenre?: { id: string; name: string }; type?: { id: string; name: string }; subType?: { id: string; name: string }; }
interface TicketmasterVenue { name: string; id: string; url?: string; postalCode?: string; city?: { name: string }; state?: { name: string; stateCode?: string }; country?: { name: string; countryCode: string }; address?: { line1?: string }; location?: { longitude: string; latitude: string }; images?: TicketmasterImage[]; }
interface TicketmasterAttraction { name: string; id: string; url?: string; images?: TicketmasterImage[]; classifications?: TicketmasterClassification[]; }
interface TicketmasterPriceRange { type: string; currency: string; min: number; max: number; }
interface TicketmasterEventRaw { name: string; type: string; id: string; test?: boolean; url?: string; locale?: string; images?: TicketmasterImage[]; dates?: { start?: TicketmasterDateInfo; end?: TicketmasterDateInfo; timezone?: string; status?: { code: string }; spanMultipleDays?: boolean; }; classifications?: TicketmasterClassification[]; promoter?: { id: string; name: string; description?: string }; promoters?: Array<{ id: string; name: string; description?: string }>; priceRanges?: TicketmasterPriceRange[]; seatmap?: { staticUrl?: string }; _links?: { self: { href: string }; attractions?: Array<{ href: string }>; venues?: Array<{ href: string }>; }; _embedded?: { venues?: TicketmasterVenue[]; attractions?: TicketmasterAttraction[]; }; }
interface TicketmasterDiscoveryResponse { _embedded?: { events: TicketmasterEventRaw[] }; _links?: any; page?: { size: number; totalElements: number; totalPages: number; number: number; }; errors?: Array<{ code: string; detail: string; status: string }>;}


export class EventFinderTool extends BaseTool {
  name = "EventFinderTool";
  description =
    "Finds upcoming events (concerts, sports, theater) near a location based on keywords, dates, or classifications using Ticketmaster.";
  argsSchema = {
    type: "object" as const,
    properties: {
      keyword: { type: ["string", "null"], description: "Keywords to search events for (e.g., 'rock concert', 'baseball')." },
      location: { type: ["string", "null"], description: "City, state, or zip code to search near (e.g., 'London', 'New York, NY', '90210'). Uses context location if omitted." },
      radius: { type: ["number", "null"], description: "Search radius around the location. Defaults to 25.", default: 25 },
      radiusUnit: { type: ["string", "null"], enum: ["miles", "km"], description: "Unit for the radius (miles or km). Defaults to miles.", default: "miles" },
      startDate: { type: ["string", "null"], format: "date-time", description: "Optional start date/time for the event search (ISO 8601 format, e.g., '2024-09-21T00:00:00Z'). Defaults to now." },
      endDate: { type: ["string", "null"], format: "date-time", description: "Optional end date/time for the event search (ISO 8601 format)." },
      classification: { type: ["string", "null"], description: "Filter by classification (e.g., 'Music', 'Sports', 'Arts & Theatre')." },
      limit: { type: ["number", "null"], minimum: 1, maximum: 10, description: "Maximum number of events to return. Defaults to 5.", default: 5 },
    },
    required: ["keyword", "location", "radius", "radiusUnit", "startDate", "endDate", "classification", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 30;

  private readonly API_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
  private readonly API_KEY: string;
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`; // Use configured email

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.ticketmaster || "";
    if (!this.API_KEY) this.log("error", "Ticketmaster API Key missing. Tool will fail.");
    if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update EventFinderTool USER_AGENT contact info with actual details.");
    }
  }

  private formatIsoDateTime(dateInput: string | Date | undefined | null): string | undefined {
    if (!dateInput) return undefined;
    try {
      const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) {
        this.log("warn", `Invalid date input provided for formatting: ${dateInput}`);
        return undefined;
      }
      return d.toISOString().substring(0, 19) + "Z";
    } catch (e: any) {
      this.log("error", `Error parsing date for formatting: ${dateInput}`, e.message);
      return undefined;
    }
  }

  private mapRawEventToAppEvent(rawEvent: TicketmasterEventRaw): TicketmasterEvent {
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
      _embedded: rawEvent._embedded,
    };
  }

  async execute(input: EventFinderInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    if (!this.API_KEY) return { error: "Event Finder Tool not configured.", result: "Event search unavailable." };

    const limit = input.limit ?? 5;
    const params = new URLSearchParams({ apikey: this.API_KEY, size: String(limit), sort: "date,asc", includeTBA: "no", includeTBD: "no" });
    let locationDescription = "your current area";
    const queryInputForStructuredData = { ...input }; // For structured output

    if (input.keyword) params.set("keyword", input.keyword);
    if (input.classification) params.set("classificationName", input.classification);

    if (input.location) {
        params.set("city", input.location); // Ticketmaster uses "city" or "postalCode" etc.
        locationDescription = `near ${input.location}`;
        params.set("radius", String(input.radius ?? 25));
        params.set("unit", input.radiusUnit ?? "miles");
    } else if (typeof input.context?.latitude === 'number' && typeof input.context?.longitude === 'number') {
        const geoPoint = `${input.context.latitude},${input.context.longitude}`;
        params.set("geoPoint", geoPoint);
        locationDescription = "near your current location";
        this.log("info", `Using context coordinates for event search: ${geoPoint}`);
        params.set("radius", String(input.radius ?? 25));
        params.set("unit", input.radiusUnit ?? "miles");
    } else {
        locationDescription = "globally";
        this.log("warn", "No location or context coordinates provided for event search. Searching globally (may yield broad results).");
    }

    const startDateTime = this.formatIsoDateTime(input.startDate ?? new Date());
    if (startDateTime) params.set("startDateTime", startDateTime);
    const endDateTime = this.formatIsoDateTime(input.endDate);
    if (endDateTime) params.set("endDateTime", endDateTime);

    const url = `${this.API_BASE}?${params.toString()}`;
    this.log("info", `Searching Ticketmaster Events ${locationDescription} for "${input.keyword || input.classification || "any"}": ${url.split("apikey=")[0]}...`);

    let outputStructuredData: EventFinderStructuredOutput = {
      result_type: "event_list",
      source_api: "ticketmaster",
      query: queryInputForStructuredData,
      locationDescription: locationDescription,
      count: 0,
      events: [],
      error: undefined,
    };

    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(8000) });
      const responseBody = await response.text();
      if (abortSignal?.aborted) {
        logger.warn(`[EventFinderTool] Aborted after API call.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return { error: "Event search cancelled.", result: "Cancelled.", structuredData: outputStructuredData };
      }

      if (!response.ok) {
        let errorDetail = `Event search failed: ${response.status} ${response.statusText}.`;
        try {
          const eJson = JSON.parse(responseBody);
          errorDetail += ` Details: ${eJson.errors?.[0]?.detail || eJson.errors?.[0]?.code || JSON.stringify(eJson)}`;
        } catch { errorDetail += ` Response: ${responseBody.substring(0, 150)}...`; }
        this.log("error", `Ticketmaster API Error ${response.status}: ${errorDetail}`);
        throw new Error(errorDetail);
      }
      const data: TicketmasterDiscoveryResponse = JSON.parse(responseBody);
      const rawEvents = data?._embedded?.events;

      if (!rawEvents || rawEvents.length === 0) {
        const criteria = [
          input.keyword ? `"${input.keyword}"` : "",
          `loc:${locationDescription}`,
          input.classification ? `cat:"${input.classification}"` : "",
          startDateTime ? `after ${startDateTime.substring(0,10)}` : ""
        ].filter(Boolean).join(", ");
        const msg = `No upcoming events found for ${input.context?.userName || "you"} matching criteria (${criteria}).`;
        this.log("info", msg);
        outputStructuredData.totalFound = data.page?.totalElements || 0;
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log("info", `Found ${rawEvents.length} events via Ticketmaster.`);
      const mappedEvents = rawEvents.map(this.mapRawEventToAppEvent);
      const resultString = `Minato found these events ${locationDescription} for ${input.context?.userName || "you"}${input.keyword ? ` related to "${input.keyword}"` : ""}:\n` +
        mappedEvents.map((e, i) => {
          const name = e.name;
          const venue = e._embedded?.venues?.[0]?.name || "TBD";
          const city = e._embedded?.venues?.[0]?.city?.name || "";
          const state = e._embedded?.venues?.[0]?.state?.stateCode || "";
          const venueLoc = [venue, city, state].filter(Boolean).join(", ");
          const date = e.dates?.start?.localDate || "TBD";
          const time = e.dates?.start?.localTime?.substring(0,5);
          const dtInfo = `${date}${time ? ` at ${time}` : ""}`;
          return `${i + 1}. ${name} at ${venueLoc} on ${dtInfo}`;
        }).join("\n");

      outputStructuredData.count = mappedEvents.length;
      outputStructuredData.totalFound = data.page?.totalElements;
      outputStructuredData.events = mappedEvents;
      outputStructuredData.error = undefined;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMessage = `Failed event search: ${error.message}`;
      outputStructuredData.error = errorMessage;
      if (error.name === 'AbortError') {
        this.log("error", `Ticketmaster request timed out or was aborted.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return { error: "Event search timed out or cancelled.", result: `Sorry, ${input.context?.userName || "User"}, the search for events took too long.`, structuredData: outputStructuredData };
      }
      this.log("error", `Error fetching Ticketmaster events:`, error.message);
      return { error: errorMessage, result: `Sorry, ${input.context?.userName || "User"}, an error occurred while finding events.`, structuredData: outputStructuredData };
    }
  }
}