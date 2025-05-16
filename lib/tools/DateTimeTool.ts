// FILE: lib/tools/DateTimeTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { formatInTimeZone } from "date-fns-tz"; // Use date-fns-tz for formatting
import { findTimeZone, getZonedTime } from "timezone-support/lookup-convert"; // Use timezone-support for lookups
import { DateTimeStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface DateTimeInput extends ToolInput {
  location?: string;
  locations?: string[];
  timezone?: string;
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
        type: "string",
        description: "A city name or location (e.g., 'London', 'Tokyo').",
      },
      locations: {
        type: "array",
        items: { type: "string" },
        description:
          "List of locations for world clock (e.g., ['London', 'New York']).",
      },
      timezone: {
        type: "string",
        description:
          "Specific IANA timezone (e.g., 'America/New_York'). Overrides location.",
      },
    },
    required: [],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 30;

  private resolveTimezone(identifier: string | undefined): string | null {
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    if (cleanId === "utc" || cleanId === "gmt") return "Etc/UTC";
    const commonMappings: { [key: string]: string } = {
      london: "Europe/London",
      paris: "Europe/Paris",
      tokyo: "Asia/Tokyo",
      "new york": "America/New_York",
      nyc: "America/New_York",
      "los angeles": "America/Los_Angeles",
      la: "America/Los_Angeles",
      sydney: "Australia/Sydney",
      berlin: "Europe/Berlin",
      moscow: "Europe/Moscow",
      dubai: "Asia/Dubai",
      singapore: "Asia/Singapore",
    };
    if (commonMappings[cleanId]) return commonMappings[cleanId];
    try {
      const tz = findTimeZone(identifier);
      if (tz) return tz.name;
      const underscoredId = identifier.replace(/\s+/g, "_");
      const tzUnderscored = findTimeZone(underscoredId);
      if (tzUnderscored) return tzUnderscored.name;
      this.log(
        "warn",
        `Could not resolve timezone for identifier: "${identifier}"`
      );
      return null;
    } catch (e: any) {
      this.log(
        "error",
        `Timezone lookup library error for "${identifier}":`,
        e.message
      );
      return null;
    }
  }
  private getCurrentTimeDetails(
    zoneIdentifier: string
  ):
    | Omit<LocalLocationTimeData, "inputLocation" | "error">
    | { error: string } {
    try {
      const nowUtc = new Date();
      const formattedTime = formatInTimeZone(
        nowUtc,
        zoneIdentifier,
        "HH:mm:ss"
      );
      const formattedDate = formatInTimeZone(
        nowUtc,
        zoneIdentifier,
        "yyyy-MM-dd"
      );
      const dayOfWeek = formatInTimeZone(nowUtc, zoneIdentifier, "EEEE");
      const utcOffset = formatInTimeZone(nowUtc, zoneIdentifier, "XXX");
      return {
        resolvedTimezone: zoneIdentifier,
        currentTime: formattedTime,
        currentDate: formattedDate,
        dayOfWeek: dayOfWeek,
        utcOffset: utcOffset,
      };
    } catch (error: any) {
      this.log(
        "error",
        `Error formatting time for zone "${zoneIdentifier}":`,
        error.message
      );
      return {
        error: `Invalid timezone identifier used: "${zoneIdentifier}".`,
      };
    }
  }

  async execute(input: DateTimeInput): Promise<ToolOutput> {
    let targetIdentifiers: { input: string; explicitTimezone?: string }[] = [];
    let isContextBased = false;
    const contextTz = input.context?.timezone;
    let overallSuccess = false;
    let firstError: string | undefined;

    if (input.timezone) {
      const resolved = this.resolveTimezone(input.timezone);
      if (resolved) {
        targetIdentifiers.push({
          input: input.timezone,
          explicitTimezone: resolved,
        });
      } else {
        const errorMsg = `Invalid explicit timezone provided: "${input.timezone}". Please use a valid IANA timezone name.`;
        const errorOutput: DateTimeStructuredOutput = {
          result_type: "datetime_info",
          source_api: "datetime_tool",
          query: input,
          processedTimeUTC: new Date().toISOString(),
          isContextBased: false,
          primaryLocation: {
            inputLocation: input.timezone,
            resolvedTimezone: null,
            currentTime: null,
            currentDate: null,
            dayOfWeek: null,
            utcOffset: null,
            error: errorMsg,
          },
          error: errorMsg,
        };
        return {
          error: errorMsg,
          result: `I couldn't understand the timezone "${input.timezone}". Please use a standard format like 'America/New_York'.`,
          structuredData: errorOutput,
        };
      }
    } else if (input.locations && input.locations.length > 0) {
      targetIdentifiers = input.locations.map((loc) => ({ input: loc }));
    } else if (input.location) {
      targetIdentifiers.push({ input: input.location });
    } else {
      const defaultTzIdentifier = contextTz
        ? `your current location (${contextTz})`
        : "UTC";
      const defaultTzResolved =
        this.resolveTimezone(contextTz ?? undefined) || "Etc/UTC";
      targetIdentifiers.push({
        input: defaultTzIdentifier,
        explicitTimezone: defaultTzResolved,
      });
      isContextBased = true;
      this.log(
        "debug",
        `No location/timezone specified, using resolved context/default: ${defaultTzResolved}`
      );
    }

    const resultsData: LocalLocationTimeData[] = [];
    for (const target of targetIdentifiers) {
      const resolvedTimezone =
        target.explicitTimezone || this.resolveTimezone(target.input);
      let resultEntry: LocalLocationTimeData;
      if (!resolvedTimezone) {
        resultEntry = {
          inputLocation: target.input,
          resolvedTimezone: null,
          currentTime: null,
          currentDate: null,
          dayOfWeek: null,
          utcOffset: null,
          error: `Cannot determine timezone for "${target.input}".`,
        };
        if (resultEntry.error) {
          this.log("warn", resultEntry.error);
          if (!firstError) firstError = resultEntry.error;
        }
      } else {
        const timeDetails = this.getCurrentTimeDetails(resolvedTimezone);
        if ("error" in timeDetails) {
          resultEntry = {
            inputLocation: target.input,
            resolvedTimezone: resolvedTimezone,
            currentTime: null,
            currentDate: null,
            dayOfWeek: null,
            utcOffset: null,
            error: timeDetails.error,
          };
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
      if (res.error) {
        resultString = res.error;
      } else {
        const locationDesc = isContextBased
          ? res.inputLocation
          : `in ${res.inputLocation}${
              res.resolvedTimezone ? ` (${res.resolvedTimezone})` : ""
            }`;
        resultString = `The current time ${locationDesc} is ${res.currentTime} on ${res.dayOfWeek}, ${res.currentDate} (UTC${res.utcOffset}).`;
      }
    } else {
      resultString = "Current times:\n";
      resultsData.forEach((res) => {
        if (res.error) {
          resultString += `- ${res.inputLocation}: Error (${res.error}).\n`;
        } else {
          resultString += `- ${res.inputLocation} (${res.resolvedTimezone}): ${res.currentTime} (${res.dayOfWeek}, ${res.currentDate}, UTC${res.utcOffset})\n`;
        }
      });
    }

    const primaryResultData =
      resultsData.find((r) => !r.error) || resultsData[0];
    const structuredOutput: DateTimeStructuredOutput = {
      result_type: "datetime_info",
      source_api: "datetime_tool",
      query: input,
      processedTimeUTC: new Date().toISOString(),
      isContextBased: isContextBased,
      primaryLocation: {
        inputLocation: primaryResultData.inputLocation,
        resolvedTimezone: primaryResultData.resolvedTimezone,
        currentTime: primaryResultData.currentTime,
        currentDate: primaryResultData.currentDate,
        dayOfWeek: primaryResultData.dayOfWeek,
        utcOffset: primaryResultData.utcOffset,
        error: primaryResultData.error || null,
      },
      allRequestedLocations:
        resultsData.length > 1
          ? resultsData.map((r) => ({
              inputLocation: r.inputLocation,
              resolvedTimezone: r.resolvedTimezone,
              currentTime: r.currentTime,
              currentDate: r.currentDate,
              dayOfWeek: r.dayOfWeek,
              utcOffset: r.utcOffset,
              error: r.error || null,
            }))
          : undefined,
      error: overallSuccess
        ? undefined
        : firstError || "Failed to get time for one or more locations.",
    };

    if (!overallSuccess) {
      return {
        error:
          firstError ||
          "Failed to get time details for the specified location(s).",
        result: resultString.trim(),
        structuredData: structuredOutput,
      };
    }
    return { result: resultString.trim(), structuredData: structuredOutput };
  }
}
