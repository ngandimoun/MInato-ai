// FILE: lib/tools/PublicHolidayTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import Holidays from "date-holidays";
import { HolidaysTypes } from "date-holidays"; // Keep this import
import { PublicHolidayStructuredOutput, HolidayData } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface HolidayInput extends ToolInput {
  countryCode: string; // Now required
  regionCode?: string | null;
  year?: number | null;
  date?: string | null; // YYYY-MM-DD
}

export class PublicHolidayTool extends BaseTool {
  name = "PublicHolidayTool";
  description =
    "Checks for public holidays in a specific country (and optionally region/state) for a given year or specific date. Uses ISO 3166-1 alpha-2 country codes.";
  argsSchema = {
    type: "object" as const,
    properties: {
      countryCode: { type: "string" as const, description: "Required. ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'CA')." } as OpenAIToolParameterProperties,
      regionCode: { type: ["string", "null"] as const, description: "Optional state/province/region code (e.g., 'CA' for California in US, 'ON' for Ontario in CA). Varies by country. Can be null." } as OpenAIToolParameterProperties,
      year: { type: ["number", "null"] as const, description: "Optional year to check for holidays (e.g., 2024). If null or omitted when 'date' is not provided, defaults to the current year." } as OpenAIToolParameterProperties, // Removed default
      date: { type: ["string", "null"] as const, description: "Optional specific date (YYYY-MM-DD format, e.g., '2024-07-04') to check if it's a holiday. Can be null." } as OpenAIToolParameterProperties, // Removed format
    },
    required: ["countryCode", "regionCode", "year", "date"], // All defined properties are required
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 12; // Cache holidays for 12 hours

  private holidaysInstances: Map<string, Holidays> = new Map();

  private getHolidaysInstance(country: string, region?: string | null): Holidays | null {
    const countryUpper = country.toUpperCase();
    const regionUpper = region?.toUpperCase(); // Handle null region
    const key = `${countryUpper}${regionUpper ? "." + regionUpper : ""}`;
    if (this.holidaysInstances.has(key)) return this.holidaysInstances.get(key)!;
    try {
      const hdInstance = regionUpper ? new Holidays(countryUpper, regionUpper) : new Holidays(countryUpper);
      this.holidaysInstances.set(key, hdInstance);
      this.log("info", `Initialized date-holidays instance for ${key}`);
      return hdInstance;
    } catch (error: any) {
      this.log("error", `Failed to initialize date-holidays for ${key}:`, error.message);
      return null;
    }
  }

  private mapApiHoliday(apiHoliday: HolidaysTypes.Holiday): HolidayData {
    // Ensure date is correctly formatted to YYYY-MM-DD
    let formattedDate = "unknown-date";
    if (apiHoliday.date) {
        try {
            const d = new Date(apiHoliday.date); // Handles both string and Date objects
            if (!isNaN(d.getTime())) {
                formattedDate = d.toISOString().substring(0, 10);
            }
        } catch (e) {
            // If parsing fails, try to use string directly if it matches format
            if (typeof apiHoliday.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(apiHoliday.date)) {
                formattedDate = apiHoliday.date.substring(0,10);
            }
            logger.warn(`[PublicHolidayTool] Could not parse date: ${apiHoliday.date}`);
        }
    }
    return { date: formattedDate, name: apiHoliday.name, type: apiHoliday.type, rule: apiHoliday.rule };
  }

  async execute(input: HolidayInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { countryCode } = input; // countryCode is required
    // Defaulting logic
    const regionCode = (input.regionCode === null) ? undefined : input.regionCode;
    const dateInput = (input.date === null) ? undefined : input.date;
    const yearInput = (input.year === null) ? undefined : input.year;
    const targetYear = yearInput ?? (dateInput ? new Date(dateInput + "T12:00:00Z").getFullYear() : new Date().getFullYear());


    const queryInputForStructuredData = { ...input, year: targetYear };
    let outputStructuredData: PublicHolidayStructuredOutput = {
      result_type: "holiday", source_api: "date-holidays", query: queryInputForStructuredData,
      location: countryCode?.toUpperCase() || "invalid", error: null,
      year: null, queryDate: null, isHoliday: null, holiday: null, holidays: null,
    };

    if (!countryCode || String(countryCode).length !== 2) {
      const errorMsg = `Invalid country code: "${countryCode}". Use 2-letter ISO 3166-1 alpha-2 code.`;
      outputStructuredData.error = errorMsg; outputStructuredData.location = String(countryCode) || "invalid";
      return { error: errorMsg, result: `Please provide a valid 2-letter country code for Minato, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
    }

    const hd = this.getHolidaysInstance(countryCode, regionCode);
    const locationName = `${String(countryCode).toUpperCase()}${regionCode ? ` (${String(regionCode).toUpperCase()})` : ""}`;
    outputStructuredData.location = locationName;

    if (!hd) {
      let errorMsg = `Minato could not get holiday data for country "${countryCode}". It might be unsupported.`;
      if (regionCode) errorMsg = `Region "${regionCode}" might be unsupported for country "${countryCode}", or the combination is invalid for Minato.`;
      outputStructuredData.error = errorMsg;
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, ${errorMsg}`, structuredData: outputStructuredData };
    }

    try {
      if (dateInput) {
        outputStructuredData.queryDate = dateInput;
        let specificDate: Date;
        try {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) throw new Error("Invalid format, expected YYYY-MM-DD.");
          specificDate = new Date(dateInput + "T12:00:00Z"); // Use midday to avoid timezone issues with date part
          if (isNaN(specificDate.getTime())) throw new Error("Invalid date value.");
        } catch (e:any) {
          const err = `Invalid date format: "${dateInput}". ${e.message}`;
          outputStructuredData.error = err;
          return { error: err, result: `Please provide the date as YYYY-MM-DD for Minato, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
        }

        const holidayResult = hd.isHoliday(specificDate);
        outputStructuredData.isHoliday = !!holidayResult;
        if (holidayResult && typeof holidayResult === 'object') {
          const singleHoliday = holidayResult as unknown as HolidaysTypes.Holiday; // Cast needed
          outputStructuredData.holiday = this.mapApiHoliday(singleHoliday);
          outputStructuredData.error = null;
          let resultString = `${dateInput} is observed as "${singleHoliday.name}" (${singleHoliday.type}) in ${locationName} for ${input.context?.userName || "User"}.`;
          if (singleHoliday.type === 'public') { resultString = `Yes, ${input.context?.userName || "User"}, ${dateInput} is the public holiday "${singleHoliday.name}" in ${locationName}.`; }
          else { resultString += ` (Note: This may not be a non-working day everywhere).`; }
          return { result: resultString, structuredData: outputStructuredData };
        } else {
          outputStructuredData.error = null;
          const resultString = `No specific holiday found on ${dateInput} in ${locationName} for ${input.context?.userName || "User"}.`;
          return { result: resultString, structuredData: outputStructuredData };
        }
      } else { // year-based query
        outputStructuredData.year = targetYear;
        const holidaysRaw = hd.getHolidays(targetYear);
        // Filter for public holidays only IF the library returns mixed types by default for getHolidays()
        // If getHolidays() is already filtered or you want all types, adjust this.
        // Based on typical usage, users usually want 'public' holidays.
        const publicHolidays = holidaysRaw.filter((h: HolidaysTypes.Holiday) => h.type === "public");

        if (!Array.isArray(publicHolidays) || publicHolidays.length === 0) {
          const resultStr = `No public holidays found for ${locationName} in ${targetYear} for ${input.context?.userName || "User"}.`;
          outputStructuredData.holidays = []; outputStructuredData.error = null;
          return { result: resultStr, structuredData: outputStructuredData };
        }
        outputStructuredData.holidays = publicHolidays.map(h => this.mapApiHoliday(h as HolidaysTypes.Holiday));
        outputStructuredData.error = null;
        const limitDisplay = 10;
        const listString = outputStructuredData.holidays?.slice(0, limitDisplay).map((h: HolidayData) => `- ${h.date}: ${h.name}`).join("\n") || "";
        const resultString = `Minato found ${publicHolidays.length} public holiday(s) for ${locationName} in ${targetYear} for ${input.context?.userName || "User"}. ${publicHolidays.length > limitDisplay ? `The first ${limitDisplay}`: "They"} are:\n${listString}${publicHolidays.length > limitDisplay ? "\n(...and more)" : ""}`;
        return { result: resultString, structuredData: outputStructuredData };
      }
    } catch (error: any) {
      const errorMsg = `Failed retrieving holiday info for ${locationName}: ${error.message}`;
      this.log("error", errorMsg, error);
      outputStructuredData.error = errorMsg;
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, an error occurred while getting holiday information for ${locationName}.`, structuredData: outputStructuredData };
    }
  }
}