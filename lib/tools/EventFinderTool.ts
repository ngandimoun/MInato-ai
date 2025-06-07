// FILE: lib/tools/EventFinderTool.ts
// (or TicketmasterEventFinderTool.ts)
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  EventFinderStructuredOutput,
  TicketmasterEvent,
} from "@/lib/types/index";
import { format, parseISO } from "date-fns"; // For better date formatting

interface EventFinderInput extends ToolInput {
  keyword?: string | null;
  location?: string | null;
  radius?: number | null;
  radiusUnit?: "miles" | "km" | null;
  startDate?: string | null; // ISO 8601 YYYY-MM-DDTHH:mm:ssZ
  endDate?: string | null;   // ISO 8601 YYYY-MM-DDTHH:mm:ssZ
  classificationName?: string | null;
  limit?: number | null;
  countryCode?: string | null;
  source?: string | null;
}

// Internal types for Ticketmaster response structure (kept for mapping)
interface TicketmasterImage { url: string; ratio?: string; width?: number; height?: number; fallback?: boolean; }
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
interface TicketmasterDiscoveryResponse { _embedded?: { events: TicketmasterEventRaw[] }; _links?: any; page?: { size: number; totalElements: number; totalPages: number; number: number; }; errors?: Array<{ code: string; detail: string; status: string }>;}

export class EventFinderTool extends BaseTool {
  name = "EventFinderTool";
  description =
    "Finds upcoming events (concerts, sports, theater, etc.) near a location or globally based on keywords, dates, or classifications. Primarily uses Ticketmaster.";
  argsSchema = {
    type: "object" as const,
    properties: {
      keyword: { type: ["string", "null"] as const, description: "Keywords to search events for (e.g., 'rock concert', 'Taylor Swift', 'baseball game'). Can be null if using other filters." } as OpenAIToolParameterProperties,
      location: { type: ["string", "null"] as const, description: "City, state, postal code, or 'latitude,longitude' string to search near (e.g., 'London, UK', 'New York, NY', '90210', '40.7128,-74.0060'). Uses user's context location if null or omitted." } as OpenAIToolParameterProperties,
      radius: { type: ["number", "null"] as const, description: "Search radius around the location (e.g., 25). If null or omitted, defaults to 25." } as OpenAIToolParameterProperties, // Default handled in code
      radiusUnit: { type: ["string", "null"] as const, enum: ["miles", "km", null], description: "Unit for the radius ('miles' or 'km'). If null or omitted, defaults to 'miles'." } as OpenAIToolParameterProperties, // Default handled in code
      startDate: { type: ["string", "null"] as const, description: "Optional start date/time for event search (ISO 8601 format, e.g., '2024-09-21T00:00:00Z'). If null or omitted, defaults to now." } as OpenAIToolParameterProperties,
      endDate: { type: ["string", "null"] as const, description: "Optional end date/time for event search (ISO 8601 format, e.g., '2024-09-28T23:59:59Z'). Can be null." } as OpenAIToolParameterProperties,
      classificationName: { type: ["string", "null"] as const, description: "Filter by broad classification (e.g., 'Music', 'Sports', 'Arts & Theatre', 'Family'). Specific genre/subgenre can be part of keyword. Can be null." } as OpenAIToolParameterProperties,
      limit: { type: ["number", "null"] as const, description: "Maximum number of events to return (1-10). If null or omitted, defaults to 5." } as OpenAIToolParameterProperties, // Default handled in code
      countryCode: { type: ["string", "null"] as const, description: "Optional ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB') to focus search. Can be null." } as OpenAIToolParameterProperties,
      source: { type: ["string", "null"] as const, enum: ["ticketmaster", "songkick", null], description: "Preferred event source. If null or omitted, defaults to Ticketmaster." } as OpenAIToolParameterProperties, // Default handled in code
    },
    required: ["radius", "radiusUnit", "limit", "source"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 15; // Cache events for 15 minutes
  categories = ["events", "search", "ticketing"];
  version = "1.0.0";
  metadata = { provider: "Ticketmaster API", supports: ["concerts", "sports", "theater", "family"] };

  private readonly API_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
  private readonly API_KEY: string;
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.ticketmaster || "";
    if (!this.API_KEY) this.log("error", "Ticketmaster API Key missing. EventFinderTool will fail for Ticketmaster source.");
    if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update EventFinderTool USER_AGENT contact info with actual details.");
    }
  }

  private formatIsoDateTime(dateInput: string | Date | undefined | null): string | undefined {
    if (!dateInput) return undefined;
    try {
      const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) { 
        this.log("warn", `Invalid date input for formatting: ${dateInput}`); 
        return undefined; 
      }
      // Use proper ISO format as required by Ticketmaster API: YYYY-MM-DDTHH:mm:ssZ (without milliseconds)
      return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    } catch (e: any) { 
      this.log("error", `Error parsing date for formatting: ${dateInput}`, e.message); 
      return undefined; 
    }
  }

  private mapRawEventToAppEvent(rawEvent: TicketmasterEventRaw): TicketmasterEvent {
    return {
      name: rawEvent.name, type: rawEvent.type, id: rawEvent.id,
      test: rawEvent.test, url: rawEvent.url, locale: rawEvent.locale,
      images: rawEvent.images, dates: rawEvent.dates, classifications: rawEvent.classifications,
      promoter: rawEvent.promoter, priceRanges: rawEvent.priceRanges, _embedded: rawEvent._embedded,
    };
  }

  async execute(input: EventFinderInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const effectiveSource = (input.source === null || input.source === undefined) ? "ticketmaster" : input.source;
    if (effectiveSource === "ticketmaster" && !this.API_KEY) {
        return { error: "Event Finder Tool (Ticketmaster) not configured.", result: "Event search via Ticketmaster is unavailable." };
    }

    // Apply user event preferences if available
    let modifiedInput = { ...input };
    if (input.context?.userState?.workflow_preferences?.eventFinderPreferences) {
      const eventPrefs = input.context.userState.workflow_preferences.eventFinderPreferences;
      
      // Apply preferred event types to the keyword if not already specified
      if (eventPrefs.eventTypes && eventPrefs.eventTypes.length > 0 && !modifiedInput.keyword) {
        modifiedInput.keyword = eventPrefs.eventTypes.join(' OR ');
        this.log("debug", `[EventFinderTool] Applied preferred event types: ${eventPrefs.eventTypes.join(', ')}`);
      }
      
      // Apply preferred venues to the keyword if specified
      if (eventPrefs.preferredVenues && eventPrefs.preferredVenues.length > 0) {
        const venueQuery = eventPrefs.preferredVenues.join(' OR ');
        modifiedInput.keyword = modifiedInput.keyword ? `${modifiedInput.keyword} (${venueQuery})` : venueQuery;
        this.log("debug", `[EventFinderTool] Applied preferred venues: ${eventPrefs.preferredVenues.join(', ')}`);
      }
      
      // Apply distance radius preference if not specified
      if (eventPrefs.distanceRadius && !modifiedInput.radius) {
        modifiedInput.radius = eventPrefs.distanceRadius;
        this.log("debug", `[EventFinderTool] Applied preferred distance radius: ${eventPrefs.distanceRadius}`);
      }
      
      // Apply time preference to start/end dates if specified
      if (eventPrefs.timePreference && eventPrefs.timePreference !== "any" && !modifiedInput.startDate) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (eventPrefs.timePreference) {
          case "morning":
            modifiedInput.startDate = new Date(today.getTime() + 6 * 60 * 60 * 1000).toISOString(); // 6 AM
            modifiedInput.endDate = new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(); // 12 PM
            break;
          case "afternoon":
            modifiedInput.startDate = new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(); // 12 PM
            modifiedInput.endDate = new Date(today.getTime() + 18 * 60 * 60 * 1000).toISOString(); // 6 PM
            break;
          case "evening":
            modifiedInput.startDate = new Date(today.getTime() + 18 * 60 * 60 * 1000).toISOString(); // 6 PM
            modifiedInput.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 12 AM
            break;
        }
        this.log("debug", `[EventFinderTool] Applied time preference: ${eventPrefs.timePreference}`);
      }
      
      // Apply preferred days of week if specified
      if (eventPrefs.preferredDaysOfWeek && eventPrefs.preferredDaysOfWeek.length > 0 && !modifiedInput.startDate) {
        // Find the next occurrence of one of the preferred days
        const now = new Date();
        const preferredDayIndices = eventPrefs.preferredDaysOfWeek.map(day => {
          const dayMap: { [key: string]: number } = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
            'friday': 5, 'saturday': 6, 'sunday': 0
          };
          return dayMap[day.toLowerCase()];
        });
        
        const currentDayIndex = now.getDay();
        let nextPreferredDay = preferredDayIndices.find(dayIndex => dayIndex > currentDayIndex);
        
        if (nextPreferredDay === undefined) {
          // No preferred day this week, find the earliest one next week
          nextPreferredDay = Math.min(...preferredDayIndices) + 7;
        }
        
        const daysUntilNext = nextPreferredDay - currentDayIndex;
        const nextPreferredDate = new Date(now.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
        modifiedInput.startDate = nextPreferredDate.toISOString();
        this.log("debug", `[EventFinderTool] Applied preferred days of week: ${eventPrefs.preferredDaysOfWeek.join(', ')}`);
      }
    }

    const effectiveLimit = (modifiedInput.limit === null || modifiedInput.limit === undefined) ? 5 : Math.max(1, Math.min(modifiedInput.limit, 10));
    const effectiveRadius = (modifiedInput.radius === null || modifiedInput.radius === undefined) ? 25 : modifiedInput.radius;
    const effectiveRadiusUnit = (modifiedInput.radiusUnit === null || modifiedInput.radiusUnit === undefined) ? "miles" : modifiedInput.radiusUnit;
    const effectiveStartDate = modifiedInput.startDate === null ? undefined : modifiedInput.startDate;
    const effectiveEndDate = modifiedInput.endDate === null ? undefined : modifiedInput.endDate;
    const effectiveKeyword = modifiedInput.keyword === null ? undefined : modifiedInput.keyword;
    const effectiveClassificationName = modifiedInput.classificationName === null ? undefined : modifiedInput.classificationName;
    const effectiveLocation = modifiedInput.location === null ? undefined : modifiedInput.location;
    const effectiveCountryCode = modifiedInput.countryCode === null ? undefined : modifiedInput.countryCode;
    const userNameForResponse = modifiedInput.context?.userName || "friend";

    const logPrefix = `[EventFinderTool User:${input.context?.userId?.substring(0,8)}]`;
    const queryInputForStructuredData = { ...modifiedInput, limit: effectiveLimit, radius: effectiveRadius, radiusUnit: effectiveRadiusUnit, source: effectiveSource };

    const params = new URLSearchParams({ apikey: this.API_KEY, size: String(effectiveLimit), sort: "date,asc", includeTBA: "no", includeTBD: "no" });
    let locationDescription = "your current area";

    if (effectiveKeyword) params.set("keyword", effectiveKeyword);
    if (effectiveClassificationName) params.set("classificationName", effectiveClassificationName);
    if (effectiveCountryCode) params.set("countryCode", effectiveCountryCode);

    if (effectiveLocation) {
        if (effectiveLocation.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/)) {
            // Coordinates format
            params.set("latlong", effectiveLocation);
            locationDescription = `near coordinates ${effectiveLocation}`;
        } else {
            // City name or address - use city parameter instead of adding to keyword
            params.set("city", effectiveLocation);
            locationDescription = `near ${effectiveLocation}`;
        }
        params.set("radius", String(effectiveRadius));
        params.set("unit", effectiveRadiusUnit);
    } else if (effectiveCountryCode && !effectiveLocation) {
        // If we have a country code but no specific city, use a major city from that country
        const majorCitiesByCountry: Record<string, string> = {
            "US": "New York",
            "GB": "London", 
            "CA": "Toronto",
            "AU": "Sydney",
            "DE": "Berlin",
            "FR": "Paris",
            "IT": "Rome",
            "ES": "Madrid",
            "NL": "Amsterdam",
            "JP": "Tokyo",
            "KR": "Seoul",
            "CN": "Beijing",
            "IN": "Mumbai",
            "BR": "São Paulo",
            "MX": "Mexico City",
            "AR": "Buenos Aires",
            "SG": "Singapore",
            "HK": "Hong Kong",
            "TH": "Bangkok",
            "MY": "Kuala Lumpur",
            "ID": "Jakarta",
            "PH": "Manila",
            "VN": "Ho Chi Minh City",
            "TW": "Taipei"
        };
        
        const majorCity = majorCitiesByCountry[effectiveCountryCode];
        if (majorCity) {
            params.set("city", majorCity);
            locationDescription = `in ${majorCity}, ${effectiveCountryCode}`;
            params.set("radius", String(effectiveRadius));
            params.set("unit", effectiveRadiusUnit);
            this.log("info", `${logPrefix} Using major city ${majorCity} for country ${effectiveCountryCode}`);
        } else {
            // Fallback to global search with country filter
            locationDescription = `in ${effectiveCountryCode}`;
            this.log("warn", `${logPrefix} No major city mapping for country ${effectiveCountryCode}, searching globally with country filter.`);
        }
    } else if (typeof input.context?.latitude === 'number' && typeof input.context?.longitude === 'number') {
        const geoPoint = `${input.context.latitude},${input.context.longitude}`;
        params.set("latlong", geoPoint);
        locationDescription = "near your current location";
        params.set("radius", String(effectiveRadius));
        params.set("unit", effectiveRadiusUnit);
    } else {
        locationDescription = "globally";
        this.log("warn", `${logPrefix} No location. Searching globally.`);
    }

    const startDateTime = this.formatIsoDateTime(effectiveStartDate ?? new Date());
    if (startDateTime) params.set("startDateTime", startDateTime);
    const endDateTime = this.formatIsoDateTime(effectiveEndDate);
    if (endDateTime) params.set("endDateTime", endDateTime);

    const url = `${this.API_BASE}?${params.toString()}`;
    this.log("info", `${logPrefix} Searching Ticketmaster: ${url.split("apikey=")[0]}...`);
    this.log("debug", `${logPrefix} Date range: start=${startDateTime}, end=${endDateTime}, location=${effectiveLocation}, country=${effectiveCountryCode}`);

    let outputStructuredData: EventFinderStructuredOutput = {
      result_type: "event_list", source_api: "ticketmaster", query: queryInputForStructuredData,
      locationDescription: locationDescription, count: 0, events: [], error: undefined,
    };

    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(8000) });
      const responseBody = await response.text();
      if (abortSignal?.aborted) {
        outputStructuredData.error = "Request timed out or cancelled.";
        return { error: "Event search cancelled.", result: "Cancelled.", structuredData: outputStructuredData };
      }

      if (!response.ok) {
        let errorDetail = `Ticketmaster API Error: ${response.status} ${response.statusText}.`;
        try { const eJson = JSON.parse(responseBody); errorDetail += ` Details: ${eJson.errors?.[0]?.detail || JSON.stringify(eJson)}`; }
        catch { errorDetail += ` Response: ${responseBody.substring(0,150)}...`; }
        this.log("error", `${logPrefix} ${errorDetail}`);
        throw new Error(errorDetail);
      }
      const data: TicketmasterDiscoveryResponse = JSON.parse(responseBody);
      const rawEvents = data?._embedded?.events;

      if (!rawEvents || rawEvents.length === 0) {
        const criteria = [effectiveKeyword ? `"${effectiveKeyword}"` : "", `loc:${locationDescription}`, effectiveClassificationName ? `cat:"${effectiveClassificationName}"` : "", startDateTime ? `after ${format(parseISO(startDateTime), "MMM d")}` : ""].filter(Boolean).join(", ");
        const msg = `Minato couldn't find any upcoming events for ${userNameForResponse} matching criteria (${criteria}).`;
        this.log("info", `${logPrefix} ${msg}`);
        outputStructuredData.totalFound = data.page?.totalElements || 0;
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Found ${rawEvents.length} events via Ticketmaster.`);
      const mappedEvents = rawEvents.map(this.mapRawEventToAppEvent);
      
      let resultString = "";
      if (mappedEvents.length > 0) {
          const firstEvent = mappedEvents[0];
          const eventName = firstEvent.name;
          const venue = firstEvent._embedded?.venues?.[0];
          const venueName = venue?.name || "an unconfirmed venue";
          const venueCity = venue?.city?.name;
          const venueCountry = venue?.country?.countryCode;
          const venueLocation = [venueCity, venueCountry].filter(Boolean).join(", ");
          
          const eventDate = firstEvent.dates?.start?.localDate ? format(parseISO(firstEvent.dates.start.localDate), "EEEE, MMMM do, yyyy") : "an upcoming date";
          const eventTime = firstEvent.dates?.start?.localTime ? format(parseISO(`1970-01-01T${firstEvent.dates.start.localTime}`), "h:mm a") : null;
          const dateTimeStr = eventTime ? `${eventDate} at ${eventTime}` : eventDate;
          
          const priceRange = firstEvent.priceRanges?.[0];
          const priceStr = priceRange ? ` Tickets range from ${priceRange.currency} ${priceRange.min} to ${priceRange.currency} ${priceRange.max}.` : "";
          
          const classification = firstEvent.classifications?.[0];
          const genre = classification?.genre?.name;
          const subGenre = classification?.subGenre?.name;
          const genreStr = [genre, subGenre].filter(Boolean).join(" - ");
          
          resultString = `Hey ${userNameForResponse}, I found some exciting events ${locationDescription}${effectiveKeyword ? ` related to "${effectiveKeyword}"` : ""}! The highlight is "${eventName}"${genreStr ? ` (${genreStr})` : ""} at ${venueName}${venueLocation ? ` in ${venueLocation}` : ""} on ${dateTimeStr}.${priceStr}`;
          
          if (mappedEvents.length > 1) {
            resultString += ` There are ${mappedEvents.length - 1} more events too! Would you like to see the full list?`;
          } else {
            resultString += ` Would you like more details about this event?`;
          }
      } else {
          const criteria = [
            effectiveKeyword ? `keyword: "${effectiveKeyword}"` : null,
            locationDescription ? `location: ${locationDescription}` : null,
            effectiveClassificationName ? `category: ${effectiveClassificationName}` : null,
            startDateTime ? `after: ${format(parseISO(startDateTime), "MMM d")}` : null
          ].filter(Boolean).join(", ");
          
          resultString = `I searched for events ${locationDescription} for you, ${userNameForResponse}${criteria ? ` (${criteria})` : ""}, but couldn't find any matches right now. Would you like to try with different dates or a broader search?`;
      }

      outputStructuredData.count = mappedEvents.length;
      outputStructuredData.totalFound = data.page?.totalElements;
      outputStructuredData.events = mappedEvents;
      outputStructuredData.error = undefined;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMessage = `Event search failed: ${error.message}`;
      outputStructuredData.error = errorMessage;
      if (error.name === 'AbortError') {
        this.log("error", `${logPrefix} Ticketmaster request timed out or was aborted.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return { error: "Event search timed out.", result: `Sorry, ${userNameForResponse}, the event search took too long.`, structuredData: outputStructuredData };
      }
      this.log("error", `${logPrefix} Error fetching events:`, error.message);
      return { error: errorMessage, result: `Sorry, ${userNameForResponse}, an error occurred while finding events.`, structuredData: outputStructuredData };
    }
  }
}

