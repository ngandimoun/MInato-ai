//livingdossier/services/tools-livings/DateTimeTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { formatInTimeZone } from "date-fns-tz";
import { findTimeZone } from "timezone-support/lookup-convert"; // getZonedTime not directly used for current impl.
import { DateTimeStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface DateTimeInput extends ToolInput {
  location?: string | null; // Keep as nullable for internal logic
  locations?: string[] | null; // Keep as nullable
  timezone?: string | null; // Keep as nullable
  format?: string | null; // Optional format string for customizing date/time output
}

interface LocalLocationTimeData {
  inputLocation: string;
  resolvedTimezone: string | null;
  currentTime: string | null;
  currentDate: string | null;
  dayOfWeek: string | null;
  utcOffset: string | null;
  isNighttime?: boolean; // Added for conversation context awareness
  error?: string;
}

export class DateTimeTool extends BaseTool {
  name = "DateTimeTool";
  description = "Provides current date and time information, and can format dates/times for the user. Useful for world clock, scheduling, and time-based contextual information.";
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
      format: {
        type: ["string", "null"] as const,
        description: "Optional format string for customizing date/time output. For example, 'time_only' or 'date_only'. Defaults to full date and time.",
      } as OpenAIToolParameterProperties,
    },
    // Making all parameters optional to prevent validation errors
    required: [],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 30; // Short cache for time
  categories = ["utility", "datetime", "conversation"];
  version = "1.1.0";
  metadata = { 
    supports: ["current_time", "date_formatting", "world_clock", "timezone_conversion"],
    conversational: true 
  };

  // LLM prompt templates for better tool use
  promptTemplates = {
    tool_use: `Use the DateTimeTool to provide accurate current time and date information for specific locations. 
This tool is helpful when the user:
- Asks for the current time in a specific location or timezone
- Needs time differences between locations
- Wants to know if it's morning/afternoon/night somewhere
- Needs date information for scheduling or planning
- Wants a world clock for multiple locations

Examples:
- "What time is it in Tokyo?"
- "What's the current time in my location?"
- "Is it morning in London right now?"
- "What time is it in New York and Paris?"
- "What day is it in Sydney?"`,

    tool_description: `The DateTimeTool provides accurate current time and date information for any location worldwide. 
It can return:
- Current time in 24-hour format
- Current date
- Day of the week
- UTC offset
- Whether it's nighttime`,

    response_formatting: {
      single_location: `For a single location, provide the current time in a natural, conversational way, mentioning the location, time, date and day of week:
"The current time in {location} is {time} on {day}, {date} ({utc_offset})."

For audio responses, use a more conversational tone:
"It's currently {time_12h} in {location}. That's {day}, {date}."

If it's nighttime (between 10PM and 6AM), add "It's nighttime there."`,

      multiple_locations: `For multiple locations, start with "Current times:" and then list each location with its time, date, and day of week.
For audio responses, use a more natural conversational format:
"Here are the current times: In {location1}, it's {time1}. In {location2}, it's {time2}..."`,

      errors: `If there's an error resolving a location or timezone, clearly explain what went wrong and provide a suggestion:
"I couldn't determine the timezone for '{location}'. Please provide a more specific city name or an IANA timezone like 'America/New_York'."`,
    }
  };

  private resolveTimezone(identifier: string | undefined | null): string | null { // Allow null
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    if (cleanId === "utc" || cleanId === "gmt") return "Etc/UTC";
    
    // Extended common mappings for better location resolution
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
      beijing: "Asia/Shanghai",
      shanghai: "Asia/Shanghai",
      delhi: "Asia/Kolkata",
      mumbai: "Asia/Kolkata",
      "hong kong": "Asia/Hong_Kong",
      toronto: "America/Toronto",
      chicago: "America/Chicago",
      dallas: "America/Chicago",
      mexico: "America/Mexico_City",
      "mexico city": "America/Mexico_City",
      cairo: "Africa/Cairo",
      johannesburg: "Africa/Johannesburg",
      rome: "Europe/Rome",
      madrid: "Europe/Madrid",
      amsterdam: "Europe/Amsterdam",
      bangkok: "Asia/Bangkok",
      seoul: "Asia/Seoul",
      istanbul: "Europe/Istanbul",
      athens: "Europe/Athens",
      auckland: "Pacific/Auckland",
      honolulu: "Pacific/Honolulu",
      hawaii: "Pacific/Honolulu",
      anchorage: "America/Anchorage",
      alaska: "America/Anchorage",
      denver: "America/Denver",
      phoenix: "America/Phoenix",
      brazil: "America/Sao_Paulo",
      "sao paulo": "America/Sao_Paulo",
      lisbon: "Europe/Lisbon",
      vienna: "Europe/Vienna",
      melbourne: "Australia/Melbourne",
      perth: "Australia/Perth",
    };
    
    if (commonMappings[cleanId]) return commonMappings[cleanId];
    
    try {
      const tz = findTimeZone(identifier); // findTimeZone expects string
      if (tz) return tz.name;
      
      // Try with underscores for multi-word locations
      const underscoredId = identifier.replace(/\s+/g, "_");
      const tzUnderscored = findTimeZone(underscoredId);
      if (tzUnderscored) return tzUnderscored.name;
      
      // Try partial matching for common city names
      for (const [key, value] of Object.entries(commonMappings)) {
        if (cleanId.includes(key) || key.includes(cleanId)) {
          return value;
        }
      }
      
      this.log("warn", `Could not resolve timezone for identifier: "${identifier}"`);
      return null;
    } catch (e: any) { 
      this.log("error", `Timezone lookup error for "${identifier}":`, e.message); 
      return null; 
    }
  }

  private getCurrentTimeDetails(zoneIdentifier: string): Omit<LocalLocationTimeData, "inputLocation" | "error"> | { error: string } {
    try {
      const nowUtc = new Date();
      const formattedTime = formatInTimeZone(nowUtc, zoneIdentifier, "HH:mm:ss");
      const formattedDate = formatInTimeZone(nowUtc, zoneIdentifier, "yyyy-MM-dd");
      const dayOfWeek = formatInTimeZone(nowUtc, zoneIdentifier, "EEEE");
      const utcOffset = formatInTimeZone(nowUtc, zoneIdentifier, "XXX"); // e.g., +05:00, -07:00, Z
      
      // Determine if it's nighttime (between 10PM and 6AM) for conversational context
      const hour = parseInt(formattedTime.split(":")[0], 10);
      const isNighttime = hour >= 22 || hour < 6;
      
      return { 
        resolvedTimezone: zoneIdentifier, 
        currentTime: formattedTime, 
        currentDate: formattedDate, 
        dayOfWeek: dayOfWeek, 
        utcOffset: utcOffset,
        isNighttime 
      };
    } catch (error: any) { 
      this.log("error", `Error formatting time for zone "${zoneIdentifier}":`, error.message); 
      return { error: `Invalid timezone identifier used: "${zoneIdentifier}".` }; 
    }
  }

  // Format time for audio-friendly output
  private formatTimeForAudio(timeData: LocalLocationTimeData): string {
    if (!timeData.currentTime || !timeData.currentDate) {
      return "";
    }
    
    // Convert 24-hour format to 12-hour for more natural speech
    const [hours, minutes] = timeData.currentTime.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12; // Convert 0 to 12
    
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Extract location from user input if not explicitly provided
  private extractLocationFromContext(input: DateTimeInput): string | null {
    // Check if there's a user query in the context that we can extract location from
    const userQuery = input.context?.userQuery || "";
    if (!userQuery) return null;
    
    // Basic extraction of location from common query patterns
    const locationPatterns = [
      /(?:time|date|day|hour|when).+(?:in|at)\s+([a-z\s]+)(?:\?|$)/i,  // "What time is it in Tokyo?"
      /(?:what's|what is|check).+(?:time|date|day|hour|when).+(?:in|at)\s+([a-z\s]+)(?:\?|$)/i,  // "What's the time in Tokyo?"
      /(?:current|now|today).+(?:time|date|day|hour|when).+(?:in|at)\s+([a-z\s]+)(?:\?|$)/i,  // "Current time in Tokyo?"
      /([a-z\s]+)(?:\s+time|\s+date|\s+now|\s+hour|\s+today)/i,  // "Tokyo time" or "Tokyo date"
    ];
    
    for (const pattern of locationPatterns) {
      const match = userQuery.match(pattern);
      if (match && match[1]) {
        const extractedLocation = match[1].trim();
        // Skip very short or common words that might be false positives
        if (extractedLocation.length > 2 && !['the', 'now', 'here', 'there', 'this', 'that', 'my'].includes(extractedLocation.toLowerCase())) {
          return extractedLocation;
        }
      }
    }
    
    return null;
  }

  async execute(input: DateTimeInput): Promise<ToolOutput> {
    // Defaulting logic for nullable inputs
    const locationInput = (input.location === null) ? undefined : input.location;
    const locationsInput = (input.locations === null) ? undefined : input.locations;
    const timezoneInput = (input.timezone === null) ? undefined : input.timezone;
    const formatInput = (input.format === null) ? undefined : input.format;
    
    // Try to extract location from context if not provided
    const extractedLocation = !locationInput && !locationsInput && !timezoneInput ? 
                             this.extractLocationFromContext(input) : null;

    let targetIdentifiers: { input: string; explicitTimezone?: string }[] = [];
    let isContextBased = false;
    const contextTz = input.context?.timezone;
    let overallSuccess = false;
    let firstError: string | undefined;
    
    // Determine if this is likely from an audio conversation
    const isLikelyAudio = input.context?.sourceType === "audio" || 
                          input.context?.conversationMode === "voice";

    if (timezoneInput) {
      const resolved = this.resolveTimezone(timezoneInput);
      if (resolved) { targetIdentifiers.push({ input: timezoneInput, explicitTimezone: resolved }); }
      else {
        const errorMsg = `Invalid explicit timezone: "${timezoneInput}". Use IANA format (e.g., 'America/New_York').`;
        return { 
          error: errorMsg, 
          result: errorMsg, 
          structuredData: { 
            result_type: "datetime_info", 
            source_api: "datetime_tool", 
            query: input, 
            processedTimeUTC: new Date().toISOString(), 
            isContextBased: false, 
            primaryLocation: { 
              inputLocation: timezoneInput, 
              resolvedTimezone: null, 
              currentTime: null, 
              currentDate: null, 
              dayOfWeek: null, 
              utcOffset: null, 
              error: errorMsg 
            }, 
            error: errorMsg,
            isAudioResponse: isLikelyAudio
          }
        };
      }
    } else if (locationsInput && locationsInput.length > 0) {
      targetIdentifiers = locationsInput.map((loc) => ({ input: loc }));
    } else if (locationInput) {
      targetIdentifiers.push({ input: locationInput });
    } else if (extractedLocation) {
      // Use location extracted from user query
      targetIdentifiers.push({ input: extractedLocation });
      this.log("debug", `Extracted location from context: "${extractedLocation}"`);
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
        resultEntry = { 
          inputLocation: target.input, 
          resolvedTimezone: null, 
          currentTime: null, 
          currentDate: null, 
          dayOfWeek: null, 
          utcOffset: null, 
          error: `Cannot determine timezone for "${target.input}".` 
        };
        if (resultEntry.error && !firstError) firstError = resultEntry.error;
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
            error: timeDetails.error 
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
    
    // Format output differently based on context (audio vs text)
    if (isLikelyAudio) {
      if (resultsData.length === 1) {
        const res = resultsData[0];
        if (res.error) { 
          resultString = `I couldn't get the time for ${res.inputLocation}. ${res.error}`; 
        } else { 
          const timeForSpeech = this.formatTimeForAudio(res);
          const locationDesc = isContextBased ? "" : ` in ${res.inputLocation}`;
          const nighttimeContext = res.isNighttime ? " It's nighttime there." : "";
          
          if (formatInput === "time_only") {
            resultString = `The current time${locationDesc} is ${timeForSpeech}.${nighttimeContext}`;
          } else if (formatInput === "date_only") {
            resultString = `Today's date${locationDesc} is ${res.dayOfWeek}, ${res.currentDate}.`;
          } else {
            resultString = `The current time${locationDesc} is ${timeForSpeech} on ${res.dayOfWeek}, ${res.currentDate}.${nighttimeContext}`;
          }
        }
      } else {
        resultString = "Here are the current times: ";
        resultsData.forEach((res, idx) => {
          if (res.error) { 
            resultString += `For ${res.inputLocation}, I couldn't get the time. `; 
          } else { 
            const timeForSpeech = this.formatTimeForAudio(res);
            resultString += `In ${res.inputLocation}, it's ${timeForSpeech}. `;
            if (idx < resultsData.length - 1) resultString += " ";
          }
        });
      }
    } else {
      // Standard text output format
      if (resultsData.length === 1) {
        const res = resultsData[0];
        if (res.error) { 
          resultString = res.error; 
        } else { 
          const locationDesc = isContextBased ? res.inputLocation : `in ${res.inputLocation}${res.resolvedTimezone ? ` (${res.resolvedTimezone})` : ""}`;
          
          if (formatInput === "time_only") {
            resultString = `The current time ${locationDesc} is ${res.currentTime}.`;
          } else if (formatInput === "date_only") {
            resultString = `The current date ${locationDesc} is ${res.dayOfWeek}, ${res.currentDate}.`;
          } else {
            resultString = `The current time ${locationDesc} is ${res.currentTime} on ${res.dayOfWeek}, ${res.currentDate} (UTC${res.utcOffset}).`;
          }
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
    }

    const primaryResultData = resultsData.find((r) => !r.error) || resultsData[0];
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
        isNighttime: primaryResultData.isNighttime,
        error: primaryResultData.error || null 
      },
      allRequestedLocations: resultsData.length > 1 ? resultsData.map(r => ({ 
        inputLocation: r.inputLocation, 
        resolvedTimezone: r.resolvedTimezone, 
        currentTime: r.currentTime, 
        currentDate: r.currentDate, 
        dayOfWeek: r.dayOfWeek, 
        utcOffset: r.utcOffset,
        isNighttime: r.isNighttime,
        error: r.error || null 
      })) : undefined,
      error: overallSuccess ? undefined : (firstError || "Failed to get time for one or more locations."),
      format: formatInput || "full",
      isAudioResponse: isLikelyAudio
    };

    return { 
      result: resultString.trim(), 
      structuredData: structuredOutput, 
      error: structuredOutput.error 
    };
  }
}