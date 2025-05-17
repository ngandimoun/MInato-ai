// FILE: lib/tools/DateTimeTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { formatInTimeZone } from "date-fns-tz";
import { findTimeZone } from "timezone-support/lookup-convert"; // getZonedTime not directly used for current impl.
import { DateTimeStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface DateTimeInput extends ToolInput {
  location?: string | null; // Keep as nullable for internal logic
  locations?: string[] | null; // Keep as nullable
  timezone?: string | null; // Keep as nullable
}
interface LocalLocationTimeData {
  inputLocation: string;
  resolvedTimezone: string | null;
  currentTime: string | null;
  currentDate: string | null;
  dayOfWeek: string | null;
  utcOffset: string | null;
  error?: string;
}

export class DateTimeTool extends BaseTool {
  name = "DateTimeTool";
  description =
    "Gets the current date and time for one or multiple locations using IANA timezones. If no location is specified, uses context timezone or UTC.";
  argsSchema = {
    type: "object" as const,
    properties: {
      location: {
        type: ["string", "null"] as const,
        description: "A city name or location (e.g., 'London', 'Tokyo'). If null and 'locations' is empty, uses context or UTC.",
      } as OpenAIToolParameterProperties,
      locations: {
        type: ["array", "null"] as const,
        items: { type: "string" as const },
        description: "List of locations for world clock (e.g., ['London', 'New York']). Can be null.",
      } as OpenAIToolParameterProperties,
      timezone: {
        type: ["string", "null"] as const,
        description: "Specific IANA timezone (e.g., 'America/New_York'). Overrides location if provided. Can be null.",
      } as OpenAIToolParameterProperties,
    },
    // All defined properties are required for strict mode, LLM sends null if not applicable.
    required: ["location", "locations", "timezone"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 30; // Short cache for time

  private resolveTimezone(identifier: string | undefined | null): string | null { // Allow null
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    if (cleanId === "utc" || cleanId === "gmt") return "Etc/UTC";
    const commonMappings: { [key: string]: string } = { /* ... same as before ... */
      london: "Europe/London", paris: "Europe/Paris", tokyo: "Asia/Tokyo",
      "new york": "America/New_York", nyc: "America/New_York",
      "los angeles": "America/Los_Angeles", la: "America/Los_Angeles",
      sydney: "Australia/Sydney", berlin: "Europe/Berlin", moscow: "Europe/Moscow",
      dubai: "Asia/Dubai", singapore: "Asia/Singapore",
    };
    if (commonMappings[cleanId]) return commonMappings[cleanId];
    try {
      const tz = findTimeZone(identifier); // findTimeZone expects string
      if (tz) return tz.name;
      const underscoredId = identifier.replace(/\s+/g, "_");
      const tzUnderscored = findTimeZone(underscoredId);
      if (tzUnderscored) return tzUnderscored.name;
      this.log("warn", `Could not resolve timezone for identifier: "${identifier}"`);
      return null;
    } catch (e: any) { this.log("error", `Timezone lookup error for "${identifier}":`, e.message); return null; }
  }

  private getCurrentTimeDetails(zoneIdentifier: string): Omit<LocalLocationTimeData, "inputLocation" | "error"> | { error: string } {
    try {
      const nowUtc = new Date();
      const formattedTime = formatInTimeZone(nowUtc, zoneIdentifier, "HH:mm:ss");
      const formattedDate = formatInTimeZone(nowUtc, zoneIdentifier, "yyyy-MM-dd");
      const dayOfWeek = formatInTimeZone(nowUtc, zoneIdentifier, "EEEE");
      const utcOffset = formatInTimeZone(nowUtc, zoneIdentifier, "XXX"); // e.g., +05:00, -07:00, Z
      return { resolvedTimezone: zoneIdentifier, currentTime: formattedTime, currentDate: formattedDate, dayOfWeek: dayOfWeek, utcOffset: utcOffset };
    } catch (error: any) { this.log("error", `Error formatting time for zone "${zoneIdentifier}":`, error.message); return { error: `Invalid timezone identifier used: "${zoneIdentifier}".` }; }
  }

  async execute(input: DateTimeInput): Promise<ToolOutput> {
    // Defaulting logic for nullable inputs
    const locationInput = (input.location === null) ? undefined : input.location;
    const locationsInput = (input.locations === null) ? undefined : input.locations;
    const timezoneInput = (input.timezone === null) ? undefined : input.timezone;

    let targetIdentifiers: { input: string; explicitTimezone?: string }[] = [];
    let isContextBased = false;
    const contextTz = input.context?.timezone;
    let overallSuccess = false;
    let firstError: string | undefined;

    if (timezoneInput) {
      const resolved = this.resolveTimezone(timezoneInput);
      if (resolved) { targetIdentifiers.push({ input: timezoneInput, explicitTimezone: resolved }); }
      else {
        const errorMsg = `Invalid explicit timezone: "${timezoneInput}". Use IANA format (e.g., 'America/New_York').`;
        return { error: errorMsg, result: errorMsg, structuredData: { result_type: "datetime_info", source_api: "datetime_tool", query: input, processedTimeUTC: new Date().toISOString(), isContextBased: false, primaryLocation: { inputLocation: timezoneInput, resolvedTimezone: null, currentTime: null, currentDate: null, dayOfWeek: null, utcOffset: null, error: errorMsg }, error: errorMsg }};
      }
    } else if (locationsInput && locationsInput.length > 0) {
      targetIdentifiers = locationsInput.map((loc) => ({ input: loc }));
    } else if (locationInput) {
      targetIdentifiers.push({ input: locationInput });
    } else {
      const defaultTzIdentifier = contextTz ? `your current location (${contextTz})` : "UTC";
      const defaultTzResolved = this.resolveTimezone(contextTz) || "Etc/UTC";
      targetIdentifiers.push({ input: defaultTzIdentifier, explicitTimezone: defaultTzResolved });
      isContextBased = true;
      this.log("debug", `No location/timezone specified, using resolved context/default: ${defaultTzResolved}`);
    }

    const resultsData: LocalLocationTimeData[] = [];
    for (const target of targetIdentifiers) {
      const resolvedTimezone = target.explicitTimezone || this.resolveTimezone(target.input);
      let resultEntry: LocalLocationTimeData;
      if (!resolvedTimezone) {
        resultEntry = { inputLocation: target.input, resolvedTimezone: null, currentTime: null, currentDate: null, dayOfWeek: null, utcOffset: null, error: `Cannot determine timezone for "${target.input}".` };
        if (resultEntry.error && !firstError) firstError = resultEntry.error;
      } else {
        const timeDetails = this.getCurrentTimeDetails(resolvedTimezone);
        if ("error" in timeDetails) {
          resultEntry = { inputLocation: target.input, resolvedTimezone: resolvedTimezone, currentTime: null, currentDate: null, dayOfWeek: null, utcOffset: null, error: timeDetails.error };
          if (!firstError) firstError = resultEntry.error;
        } else {
          resultEntry = { inputLocation: target.input, ...timeDetails };
          overallSuccess = true;
        }
      }
      resultsData.push(resultEntry);
    }

    let resultString = "";
    if (resultsData.length === 1) {
      const res = resultsData[0];
      if (res.error) { resultString = res.error; }
      else { const locationDesc = isContextBased ? res.inputLocation : `in ${res.inputLocation}${res.resolvedTimezone ? ` (${res.resolvedTimezone})` : ""}`; resultString = `The current time ${locationDesc} is ${res.currentTime} on ${res.dayOfWeek}, ${res.currentDate} (UTC${res.utcOffset}).`; }
    } else {
      resultString = "Current times:\n";
      resultsData.forEach((res) => {
        if (res.error) { resultString += `- ${res.inputLocation}: Error (${res.error}).\n`; }
        else { resultString += `- ${res.inputLocation} (${res.resolvedTimezone}): ${res.currentTime} (${res.dayOfWeek}, ${res.currentDate}, UTC${res.utcOffset})\n`; }
      });
    }

    const primaryResultData = resultsData.find((r) => !r.error) || resultsData[0];
    const structuredOutput: DateTimeStructuredOutput = {
      result_type: "datetime_info", source_api: "datetime_tool", query: input,
      processedTimeUTC: new Date().toISOString(), isContextBased: isContextBased,
      primaryLocation: { inputLocation: primaryResultData.inputLocation, resolvedTimezone: primaryResultData.resolvedTimezone, currentTime: primaryResultData.currentTime, currentDate: primaryResultData.currentDate, dayOfWeek: primaryResultData.dayOfWeek, utcOffset: primaryResultData.utcOffset, error: primaryResultData.error || null },
      allRequestedLocations: resultsData.length > 1 ? resultsData.map(r => ({ inputLocation: r.inputLocation, resolvedTimezone: r.resolvedTimezone, currentTime: r.currentTime, currentDate: r.currentDate, dayOfWeek: r.dayOfWeek, utcOffset: r.utcOffset, error: r.error || null })) : undefined,
      error: overallSuccess ? undefined : (firstError || "Failed to get time for one or more locations."),
    };

    return { result: resultString.trim(), structuredData: structuredOutput, error: structuredOutput.error };
  }
}