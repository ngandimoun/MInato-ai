import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import Holidays from "date-holidays";
import { HolidaysTypes } from "date-holidays";
import { PublicHolidayStructuredOutput, HolidayData } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface HolidayInput extends ToolInput {
  countryCode: string;
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
      countryCode: { type: "string", description: "ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'CA')." },
      regionCode: { type: ["string", "null"], description: "Optional state/province/region code (e.g., 'CA' for California in US, 'ON' for Ontario in CA). Varies by country." },
      year: { type: ["number", "null"], description: "Optional year to check for holidays. Defaults to the current year." },
      date: { type: ["string", "null"], format: "date", description: "Optional specific date (YYYY-MM-DD) to check if it's a holiday." },
    },
    required: ["countryCode", "regionCode", "year", "date"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600 * 12;

  private holidaysInstances: Map<string, Holidays> = new Map();

  private getHolidaysInstance(country: string, region?: string | null): Holidays | null {
    const countryUpper = country.toUpperCase();
    const regionUpper = region?.toUpperCase();
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
    const formattedDate = typeof apiHoliday.date === 'string' ? apiHoliday.date.substring(0, 10) : (typeof apiHoliday.date === 'object' && apiHoliday.date !== null && 'toISOString' in apiHoliday.date ? (apiHoliday.date as Date).toISOString().substring(0, 10) : "unknown-date");
    return { date: formattedDate, name: apiHoliday.name, type: apiHoliday.type, rule: apiHoliday.rule };
  }

  async execute(input: HolidayInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { countryCode, regionCode, year, date } = input;
    const targetYear = year ?? new Date().getFullYear();
    const queryInputForStructuredData = { ...input, year: targetYear };

    let outputStructuredData: PublicHolidayStructuredOutput = {
      result_type: "holiday", source_api: "date-holidays", query: queryInputForStructuredData,
      location: countryCode?.toUpperCase() || "invalid", error: null,
      year: null, queryDate: null, isHoliday: null, holiday: null, holidays: null,
    };

    if (!countryCode || countryCode.length !== 2) {
      const errorMsg = `Invalid country code: "${countryCode}". Use 2-letter ISO 3166-1 alpha-2 code.`;
      outputStructuredData.error = errorMsg; outputStructuredData.location = countryCode || "invalid";
      return { error: errorMsg, result: `Please provide a valid 2-letter country code for Minato, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
    }

    const hd = this.getHolidaysInstance(countryCode, regionCode);
    const locationName = `${countryCode.toUpperCase()}${regionCode ? ` (${regionCode.toUpperCase()})` : ""}`;
    outputStructuredData.location = locationName;

    if (!hd) {
      let errorMsg = `Minato could not get holiday data for country "${countryCode}". It might be unsupported.`;
      if (regionCode) errorMsg = `Region "${regionCode}" might be unsupported for country "${countryCode}", or the combination is invalid for Minato.`;
      outputStructuredData.error = errorMsg;
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, ${errorMsg}`, structuredData: outputStructuredData };
    }

    try {
      if (date) {
        outputStructuredData.queryDate = date;
        let specificDate: Date;
        try {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid format");
          specificDate = new Date(date + "T12:00:00Z");
          if (isNaN(specificDate.getTime())) throw new Error("Invalid date value");
        } catch {
          const err = `Invalid date format: "${date}". Use YYYY-MM-DD.`;
          outputStructuredData.error = err;
          return { error: err, result: `Please provide the date as YYYY-MM-DD for Minato, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
        }

        const holidayResult = hd.isHoliday(specificDate);
        outputStructuredData.isHoliday = !!holidayResult;
        if (holidayResult && typeof holidayResult === 'object') {
          const singleHoliday = holidayResult as unknown as HolidaysTypes.Holiday;
          outputStructuredData.holiday = this.mapApiHoliday(singleHoliday);
          outputStructuredData.error = null;
          let resultString = `${date} is observed as "${singleHoliday.name}" (${singleHoliday.type}) in ${locationName} for ${input.context?.userName || "User"}.`;
          if (singleHoliday.type === 'public') {
            resultString = `Yes, ${input.context?.userName || "User"}, ${date} is the public holiday "${singleHoliday.name}" in ${locationName}.`;
          } else {
            resultString += ` (Note: This may not be a non-working day everywhere).`;
          }
          return { result: resultString, structuredData: outputStructuredData };
        } else {
          outputStructuredData.error = null;
          const resultString = `No specific holiday found on ${date} in ${locationName} for ${input.context?.userName || "User"}.`;
          return { result: resultString, structuredData: outputStructuredData };
        }
      } else {
        outputStructuredData.year = targetYear;
        const holidays = hd.getHolidays(targetYear);
        const publicHolidays = holidays.filter((h: HolidaysTypes.Holiday) => h.type === "public");
        if (!Array.isArray(publicHolidays) || publicHolidays.length === 0) {
          const resultStr = `No public holidays found for ${locationName} in ${targetYear} for ${input.context?.userName || "User"}.`;
          outputStructuredData.holidays = []; outputStructuredData.error = null;
          return { result: resultStr, structuredData: outputStructuredData };
        }
        outputStructuredData.holidays = publicHolidays.map(this.mapApiHoliday);
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