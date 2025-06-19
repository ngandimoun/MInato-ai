//livingdossier/services/tools-livings/PublicHolidayTool.ts
// Correction: Ajout de `result_type` discriminant dans `outputStructuredData`.
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import Holidays from "date-holidays";
import { HolidaysTypes } from "date-holidays"; // Import nested types if needed

// Define local types since imports are failing
interface HolidayData {
  date: string;
  name: string;
  type: string;
  rule?: string;
}

interface PublicHolidayStructuredOutput {
  result_type: "holiday_info";
  source_api: string;
  query: any;
  location: string;
  error: string | null;
  year: number | null;
  queryDate: string | null;
  isHoliday: boolean | null;
  holiday: HolidayData | null;
  holidays: HolidayData[] | null;
}

interface HolidayInput extends ToolInput {
  countryCode: string; // ISO 3166-1 alpha-2
  regionCode?: string; // State/province code
  year?: number;
  date?: string; // YYYY-MM-DD
}

export class PublicHolidayTool extends BaseTool {
  name = "PublicHolidayTool";
  description =
    "Checks for public holidays in a specific country (and optionally region/state) for a given year or specific date. Uses ISO 3166-1 alpha-2 country codes.";
  argsSchema = {
    type: "object" as const,
    properties: {
      countryCode: {
        type: "string",
        description:
          "ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'CA').",
      },
      regionCode: {
        type: "string",
        description:
          "Optional state/province/region code (e.g., 'CA' for California in US, 'ON' for Ontario in CA). Varies by country.",
      },
      year: {
        type: "number",
        description:
          "Optional year to check for holidays. Defaults to the current year.",
      },
      date: {
        type: "string",
        format: "date", // Suggests YYYY-MM-DD format
        description:
          "Optional specific date (YYYY-MM-DD) to check if it's a holiday.",
      },
    },
    required: ["countryCode"],
    additionalProperties: false as const, // Explicitly set to false as a const
  };
  // This tool is CPU-bound, not network-bound, so caching is less critical for performance,
  // but results don't change often, so a long cache is reasonable.
  cacheTTLSeconds = 3600 * 12; // Cache holiday data for 12 hours

  // Cache instances of the Holidays library to avoid repeated initialization
  private holidaysInstances: Map<string, Holidays> = new Map();

  // Get or create a Holidays instance for a specific country/region combination
  private getHolidaysInstance(
    country: string,
    region?: string
  ): Holidays | null {
    const countryUpper = country.toUpperCase();
    const regionUpper = region?.toUpperCase();
    const key = `${countryUpper}${regionUpper ? "." + regionUpper : ""}`; // Unique key

    if (this.holidaysInstances.has(key)) {
      return this.holidaysInstances.get(key)!;
    }

    try {
      // Initialize with optional region and languages if needed (though default usually works)
      const hdInstance = regionUpper
        ? new Holidays(countryUpper, regionUpper)
        : new Holidays(countryUpper);
      this.holidaysInstances.set(key, hdInstance); // Cache the instance
      this.log("info", `Initialized date-holidays instance for ${key}`);
      return hdInstance;
    } catch (error: any) {
      // Handle cases where the country/region code is invalid for the library
      this.log(
        "error",
        `Failed to initialize date-holidays for ${key}:`,
        error.message
      );
      return null;
    }
  }

  // Maps the library's holiday object to our internal HolidayData structure
  private mapApiHoliday(apiHoliday: HolidaysTypes.Holiday): HolidayData {
    // Ensure date is in YYYY-MM-DD format
    const formattedDate =
      typeof apiHoliday.date === "string"
        ? apiHoliday.date.substring(0, 10)
        : (apiHoliday.date as Date)
        ? (apiHoliday.date as Date).toISOString().substring(0, 10)
        : "unknown-date"; // Added check for Date instance

    return {
      date: formattedDate,
      name: apiHoliday.name,
      type: apiHoliday.type, // e.g., 'public', 'bank', 'observance'
      rule: apiHoliday.rule, // The rule used to calculate the holiday
    };
  }

  // AbortSignal is added but not used as this tool is synchronous CPU-bound
  async execute(
    input: HolidayInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { countryCode, regionCode, year, date } = input;
    const targetYear = year || new Date().getFullYear();

    // Initialize structured output with discriminant type
    let outputStructuredData: PublicHolidayStructuredOutput = {
      result_type: "holiday_info", // Add discriminant
      source_api: "date-holidays",
      query: input,
      location: countryCode?.toUpperCase() || "invalid", // Set initial location
      error: null, // Initialize error as null
      // Initialize other fields to null/undefined
      year: null,
      queryDate: null,
      isHoliday: null,
      holiday: null,
      holidays: null,
    };

    // Input validation
    if (!countryCode || countryCode.length !== 2) {
      const errorMsg = `Invalid country code: "${countryCode}". Use 2-letter ISO 3166-1 alpha-2 code.`;
      outputStructuredData.error = errorMsg;
      outputStructuredData.location = countryCode || "invalid";
      return {
        error: errorMsg,
        result: "Please provide a valid 2-letter country code.",
        structuredData: outputStructuredData,
      };
    }

    const hd = this.getHolidaysInstance(countryCode, regionCode);
    const locationName = `${countryCode.toUpperCase()}${
      regionCode ? ` (${regionCode.toUpperCase()})` : ""
    }`;
    outputStructuredData.location = locationName; // Update location name

    if (!hd) {
      let errorMsg = `Could not get holiday data for country "${countryCode}". It might be unsupported by the library.`;
      if (regionCode)
        errorMsg = `Region "${regionCode}" might be unsupported for country "${countryCode}", or the country/region combination is invalid.`;
      outputStructuredData.error = errorMsg;
      return {
        error: errorMsg,
        result: `Sorry, ${errorMsg}`,
        structuredData: outputStructuredData,
      };
    }

    try {
      // Check for a specific date
      if (date) {
        outputStructuredData.queryDate = date;
        let specificDate: Date;
        try {
          // Attempt to parse the date string rigorously
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new Error("Invalid format");
          specificDate = new Date(date + "T12:00:00Z"); // Use midday UTC to avoid timezone shifts affecting the date
          if (isNaN(specificDate.getTime()))
            throw new Error("Invalid date value");
        } catch {
          const err = `Invalid date format: "${date}". Use YYYY-MM-DD.`;
          outputStructuredData.error = err;
          return {
            error: err,
            result: "Please provide the date as YYYY-MM-DD.",
            structuredData: outputStructuredData,
          };
        }

        const holidayResult = hd.isHoliday(specificDate);
        outputStructuredData.isHoliday = !!holidayResult; // True if holidayResult is an object, false if false/undefined

        if (holidayResult && typeof holidayResult === "object") {
          // Map the result (ensure it's an object, not just true)
          const singleHoliday =
            holidayResult as unknown as HolidaysTypes.Holiday; // Assert type
          outputStructuredData.holiday = this.mapApiHoliday(singleHoliday);
          outputStructuredData.error = null; // Clear error on success

          let resultString = `${date} is observed as "${singleHoliday.name}" (${singleHoliday.type}) in ${locationName}.`;
          // Customize message for public holidays
          if (singleHoliday.type === "public") {
            resultString = `Yes, ${date} is the public holiday "${singleHoliday.name}" in ${locationName}.`;
          } else {
            resultString += ` (Note: This may not be a non-working day everywhere).`;
          }
          return { result: resultString, structuredData: outputStructuredData };
        } else {
          // No holiday found for the specific date
          outputStructuredData.error = null; // Clear error
          const resultString = `No specific holiday found on ${date} in ${locationName}.`;
          return { result: resultString, structuredData: outputStructuredData };
        }
      }

      // Get all holidays for a year
      outputStructuredData.year = targetYear;
      const yearHolidays = hd.getHolidays(targetYear);
      
      if (yearHolidays && yearHolidays.length > 0) {
        // Map the API holidays to our internal format
        outputStructuredData.holidays = yearHolidays.map((h: HolidaysTypes.Holiday) => this.mapApiHoliday(h));
        outputStructuredData.error = null; // Clear error on success

        // Format the result as a readable list
        const resultString = `Holidays in ${locationName} for ${targetYear}:\n${yearHolidays
          .map((h: HolidaysTypes.Holiday) => `- ${h.date}: ${h.name}`)
          .join("\n")}`;
        return { result: resultString, structuredData: outputStructuredData };
      } else {
        // No holidays found for the year
        outputStructuredData.error = null; // Clear error
        outputStructuredData.holidays = [];
        const resultString = `No holidays found for ${locationName} in ${targetYear}.`;
        return { result: resultString, structuredData: outputStructuredData };
      }
    } catch (error: any) {
      // Handle any unexpected errors
      const errorMsg = `Error retrieving holiday data: ${error.message}`;
      outputStructuredData.error = errorMsg;
      return {
        error: errorMsg,
        result: `Sorry, there was a problem retrieving holiday data: ${error.message}`,
        structuredData: outputStructuredData,
      };
    }
  }
}