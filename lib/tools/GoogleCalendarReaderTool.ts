// FILE: lib/tools/GoogleCalendarReaderTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CalendarEvent, CalendarEventList, UserState } from "@/lib/types";
import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getSupabaseAdminClient } from "../supabaseClient"; // Adjusted import
import { decryptData } from "../utils/encryption";
import { randomUUID } from "crypto";
import { format, parseISO, isToday } from 'date-fns';
// Import specific locales as needed
import { enUS, fr as frLocale, es as esLocale, de as deLocale, ja as jaLocale } from 'date-fns/locale'; // Renamed to avoid conflict with 'fr' variable
import type { Locale as DateFnsLocaleType } from 'date-fns';
import { generateStructuredJson } from "../providers/llm_clients"; // For parameter extraction

// Map of supported locales for date-fns
const dateFnsLocalesMap: { [key: string]: DateFnsLocaleType } = {
  'en': enUS, 'en-us': enUS, 'en-gb': enUS,
  'fr': frLocale, 'fr-fr': frLocale,
  'es': esLocale, 'es-es': esLocale,
  'de': deLocale, 'de-de': deLocale,
  'ja': jaLocale, 'ja-jp': jaLocale
};

// Constants for parameter extraction
const MINATO_GOOGLE_CALENDAR_EXTRACTION_SCHEMA_NAME = "minato_google_calendar_extraction_v1";

async function getGoogleRefreshToken(userId: string): Promise<string | null> {
const logPrefix = `[getGoogleRefreshToken User:${userId?.substring(0, 8)}]`;
const supabaseClient = getSupabaseAdminClient();
if (!userId || !supabaseClient || !appConfig.encryptionKey) { logger.error(`${logPrefix} Missing critical prerequisites (userId, supabase client, or encryptionKey).`); return null; }
try {
const { data, error } = await supabaseClient.from("user_integrations").select("refresh_token_encrypted").eq("user_id", userId).eq("provider", "google").maybeSingle();
if (error && error.code !== "PGRST116") { logger.error(`${logPrefix} Supabase error fetching refresh token:`, error); return null; }
if (!data?.refresh_token_encrypted) { logger.info(`${logPrefix} No encrypted refresh token found in DB.`); return null; }
const decryptedToken = decryptData(data.refresh_token_encrypted, appConfig.encryptionKey);
if (!decryptedToken) logger.warn(`${logPrefix} Failed to decrypt refresh token.`);
return decryptedToken || null;
} catch (dbError: any) { logger.error(`${logPrefix} Exception fetching/decrypting refresh token:`, dbError.message); return null; }
}
function getGoogleAuthClient(refreshToken: string): OAuth2Client {
if (!appConfig.toolApiKeys.googleClientId || !appConfig.toolApiKeys.googleClientSecret || !process.env.GOOGLE_REDIRECT_URI) {
logger.error("CRITICAL: Google OAuth Client ID, Secret, or Redirect URI missing in server configuration.");
throw new Error("Google OAuth Client credentials configuration error on server.");
}
const oauth2Client = new OAuth2Client(appConfig.toolApiKeys.googleClientId, appConfig.toolApiKeys.googleClientSecret, process.env.GOOGLE_REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: refreshToken });
oauth2Client.on("tokens", (tokens) => { if (tokens.refresh_token) logger.info("[getGoogleAuthClient] New Google refresh token received during token refresh."); if (tokens.access_token) logger.debug("[getGoogleAuthClient] Google Access token refreshed successfully."); });
return oauth2Client;
}
async function handleGoogleAuthFailure(userId: string, errorMessage: string): Promise<void> {
const logPrefix = `[handleGoogleAuthFailure User:${userId.substring(0,8)}]`;
logger.warn(`${logPrefix} Google Auth Error: ${errorMessage}. Marking Google integration as revoked in DB.`);
try {
const supabaseClient = getSupabaseAdminClient();
if (userId && supabaseClient) {
const { error: updateError } = await supabaseClient.from("user_integrations").update({ status: "revoked", last_error: errorMessage.substring(0, 250), refresh_token_encrypted: null, access_token_encrypted: null, token_expires_at: null }).eq("user_id", userId).eq("provider", "google");
if (updateError) logger.error(`${logPrefix} Failed to mark integration as revoked in DB:`, updateError);
else logger.info(`${logPrefix} Successfully marked Google integration as revoked for user.`);
}
} catch (dbException) { logger.error(`${logPrefix} Exception during attempt to mark integration as revoked:`, dbException); }
}
interface CalendarInput extends ToolInput {
action?: "get_today_events" | null;
maxResults?: number | null;
calendarId?: string | null;
}
export class GoogleCalendarReaderTool extends BaseTool {
name = "GoogleCalendarReaderTool";
description = "Reads events from the user's Google Calendar. Requires appropriate permissions and user consent.";
argsSchema = {
type: "object" as const,
properties: {
action: {
type: ["string", "null"] as const,
enum: ["get_today_events", null],
description: "Action to perform. If null or omitted, defaults to 'get_today_events'.",
} as OpenAIToolParameterProperties,
maxResults: {
type: ["number", "null"] as const,
description: "Maximum number of events to return (1-10). If null or omitted, defaults to 5.",
} as OpenAIToolParameterProperties,
calendarId: {
type: ["string", "null"] as const,
description: "Optional Calendar ID (e.g., user's email, 'primary'). If null or omitted, defaults to 'primary'.",
} as OpenAIToolParameterProperties,
},
required: ["action", "maxResults", "calendarId"],
additionalProperties: false as false,
};
cacheTTLSeconds = 60 * 5; 
categories = ["calendar", "productivity", "google"];
version = "1.0.0";
metadata = { provider: "Google Calendar API", supports: ["read_events"] };

/**
 * Extract calendar parameters from user input using LLM
 */
private async extractCalendarParameters(userInput: string, userId?: string): Promise<Partial<CalendarInput>> {
  if (!userInput.trim()) {
    return {};
  }
  
  // Clean the user input to focus on the calendar request
  const cleanedInput = userInput
    .replace(/^(hey|hi|hello|ok|okay)\s+(minato|there)\s*/i, '')
    .replace(/^can\s+you\s+/i, '')
    .replace(/^please\s+/i, '')
    .replace(/^show\s+me\s+/i, '')
    .replace(/^check\s+/i, '')
    .replace(/^what('s|s|)\s+(do\s+i\s+have|is|are)\s+/i, '')
    .trim();
  
  try {
    // Calendar extraction prompt
    const extractionPrompt = `
You are an expert parameter extractor for Minato's GoogleCalendarReaderTool.

Given this user query about their calendar: "${cleanedInput.replace(/"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. CALENDAR REQUEST UNDERSTANDING:
   - Determine if the user is asking about events, appointments, meetings, or schedule
   - Identify specific time-related context (today, this week, specific dates)
   - Recognize references to specific calendars ("work calendar", "personal calendar")

2. PARAMETER IDENTIFICATION:
   - maxResults: How many events the user wants to see (look for numeric indicators)
   - calendarId: Which calendar to check (default is "primary")
   - Maintain awareness of how these parameters relate to each other

3. MULTILINGUAL UNDERSTANDING:
   - Process calendar requests in multiple languages
   - Extract parameters correctly regardless of language
   - Preserve essential meaning across translations

4. CONTEXTUAL INFERENCE:
   - If user doesn't specify event count, determine reasonable default (5)
   - If no specific calendar mentioned, use "primary"
   - Handle implicit requests ("What's my day look like?" → calendar events)

PARAMETER DETAILS:
- action: Always use "get_today_events" as this is the only supported action
- maxResults: How many calendar events to return (1-10, default to 5 if not specified)
- calendarId: The specific calendar to check ("primary" is the default user calendar, or could be an email address for shared calendars)

EXAMPLE EXTRACTIONS:
"What's on my calendar today?" → { "action": "get_today_events", "maxResults": 5, "calendarId": "primary" }
"Show me my top 3 appointments for today" → { "action": "get_today_events", "maxResults": 3, "calendarId": "primary" }
"Check my work calendar for today's events" → { "action": "get_today_events", "maxResults": 5, "calendarId": "work@company.com" }
"Am I busy today?" → { "action": "get_today_events", "maxResults": 5, "calendarId": "primary" }
"Meetings scheduled for today" → { "action": "get_today_events", "maxResults": 5, "calendarId": "primary" }

Output as JSON with these fields only:
{
  "action": "get_today_events",
  "maxResults": number,
  "calendarId": string | null
}`;

    const model = (appConfig as any).openai?.extractionModel || "gpt-4.1-nano-2025-04-14";
    this.log("debug", `Extracting Calendar parameters from: "${cleanedInput.substring(0, 50)}..." using ${model}`);
    
    const extractionResult = await generateStructuredJson(
      extractionPrompt,
      cleanedInput,
      {
        type: "object",
        properties: {
          action: { type: "string", enum: ["get_today_events"] },
          maxResults: { type: "number", minimum: 1, maximum: 10 },
          calendarId: { type: ["string", "null"] }
        },
        required: ["action", "maxResults"],
        additionalProperties: false
      },
      MINATO_GOOGLE_CALENDAR_EXTRACTION_SCHEMA_NAME,
      [],
      model,
      userId
    );
    
    if ("error" in extractionResult) {
      this.log("warn", `Failed to extract calendar parameters: ${extractionResult.error}`);
      // Return default values on extraction failure
      return { action: "get_today_events", maxResults: 5, calendarId: null };
    }
    
    this.log("info", `Successfully extracted calendar parameters: ${JSON.stringify(extractionResult)}`);
    return extractionResult;
  } catch (error: any) {
    this.log("error", `Exception during calendar parameter extraction: ${error.message}`);
    // Return default values on error
    return { action: "get_today_events", maxResults: 5, calendarId: null };
  }
}

async execute(input: CalendarInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
  // Default values to ensure required properties exist
  input = {
    action: "get_today_events",
    maxResults: 5,
    calendarId: "primary",
    ...input // This preserves any values provided in the input
  };

  // If there's a raw user input string and parameters aren't explicitly set, extract them
  if (typeof input.userInput === 'string' && input.userInput.trim() !== '') {
    try {
      const extractedParams = await this.extractCalendarParameters(input.userInput, input.userId || input.context?.userId);
      // Merge extracted parameters with input, keeping any explicitly provided values
      input = { ...input, ...extractedParams };
      this.log("info", `Using LLM-extracted parameters for calendar query: ${JSON.stringify(extractedParams)}`);
    } catch (error: any) {
      this.log("warn", `Failed to extract calendar parameters from user input: ${error.message}`);
      // Continue with default parameter handling below
    }
  }

  const effectiveAction = (input.action === null || input.action === undefined) ? "get_today_events" : input.action;
  const effectiveMaxResults = (input.maxResults === null || input.maxResults === undefined) ? 5 : Math.max(1, Math.min(input.maxResults, 10));
  const effectiveCalendarId = (input.calendarId === null || input.calendarId === undefined) ? "primary" : input.calendarId;
  const userNameForResponse = input.context?.userName || "User";
  const userId = input.context?.userId || input.userId; 
  const logPrefix = `[GoogleCalendarReaderTool User:${userId?.substring(0,8)} Cal:${effectiveCalendarId}]`;
  const queryInputForStructuredData = { ...input, action: effectiveAction, maxResults: effectiveMaxResults, calendarId: effectiveCalendarId };

  // Log the final parameters being used
  this.log("debug", `Executing with parameters: action=${effectiveAction}, maxResults=${effectiveMaxResults}, calendarId=${effectiveCalendarId}`);

  if (abortSignal?.aborted) { return { error: "Calendar check cancelled.", result: "Cancelled." }; }
  if (!userId) return { error: "User ID missing.", result: `I need to know who you are, ${userNameForResponse}, to check your calendar.`, structuredData: { result_type: "calendar_events", source_api: "google_calendar", query: queryInputForStructuredData, events: [], error: "User ID missing" } };

  const userState = input.context?.userState as UserState | null;
  if (!userState?.googlecalendarenabled) {
    logger.warn(`${logPrefix} Permission denied: Google Calendar access not enabled by user.`);
    return {
      error: "Permission denied by user settings.",
      result: `Access to Google Calendar is not enabled in your settings, ${userNameForResponse}. Please enable it if you want me to check your calendar.`,
      structuredData: { result_type: "permission_denied", source_api: "google_calendar", query: queryInputForStructuredData, message: "Google Calendar access not enabled by user.", error: "Permission denied by user settings" },
    };
  }
  logger.debug(`${logPrefix} Consent verified: Google Calendar access enabled.`);

  let auth: OAuth2Client;
  try {
    const refreshToken = await getGoogleRefreshToken(userId);
    if (!refreshToken) {
      logger.warn(`${logPrefix} No Google refresh token found or decryption failed.`);
      return { error: "Google Calendar not connected.", result: `Please connect your Google Calendar in settings first, ${userNameForResponse}.`, structuredData: { result_type: "calendar_events", source_api: "google_calendar", query: queryInputForStructuredData, events: [], error: "Google Calendar not connected" } };
    }
    auth = getGoogleAuthClient(refreshToken);
  } catch (authError: any) {
    logger.error(`${logPrefix} Authentication setup failed:`, authError.message);
    return { error: `Authentication setup failed: ${authError.message}`, result: `Sorry, ${userNameForResponse}, there was a problem setting up calendar access.`, structuredData: { result_type: "calendar_events", source_api: "google_calendar", query: queryInputForStructuredData, events: [], error: `Auth setup failed: ${authError.message}` } };
  }

  let outputStructuredData: CalendarEventList = {
    result_type: "calendar_events", source_api: "google_calendar",
    query: queryInputForStructuredData, events: [], error: undefined,
  };

  try {
    const calendar = google.calendar({ version: "v3", auth });
    const now = new Date();
    const userTimezone = input.context?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone; 
    let timeMinISO: string, timeMaxISO: string;

    try {
      const todayAtStartOfDayInUserTZ = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      todayAtStartOfDayInUserTZ.setHours(0, 0, 0, 0);
      
      const todayAtEndOfDayInUserTZ = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      todayAtEndOfDayInUserTZ.setHours(23, 59, 59, 999);

      timeMinISO = todayAtStartOfDayInUserTZ.toISOString();
      timeMaxISO = todayAtEndOfDayInUserTZ.toISOString();

    } catch (tzError: any) {
      logger.warn(`${logPrefix} Error creating date range with TZ '${userTimezone}'. Falling back to simple UTC today.`, tzError.message);
      const utcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0,0,0,0));
      const utcEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23,59,59,999));
      timeMinISO = utcStart.toISOString();
      timeMaxISO = utcEnd.toISOString();
    }

    logger.info(`${logPrefix} Fetching up to ${effectiveMaxResults} events for today (${timeMinISO.substring(0,10)}) [API TZ Param: ${userTimezone}]...`);
    const response = await calendar.events.list({
      calendarId: effectiveCalendarId, timeMin: timeMinISO, timeMax: timeMaxISO,
      maxResults: Math.max(1, Math.min(effectiveMaxResults, 15)), 
      singleEvents: true, orderBy: 'startTime', timeZone: userTimezone,
    });

    if (abortSignal?.aborted) { return { error: "Calendar check cancelled.", result: "Cancelled." }; }
    const events = response.data.items;
    if (!events || events.length === 0) {
      logger.info(`${logPrefix} No events found for today in calendar '${effectiveCalendarId}'.`);
      return { result: `Looks like your calendar ('${effectiveCalendarId}') is clear for today, ${userNameForResponse}! Enjoy your day!`, structuredData: outputStructuredData };
    }

    const userLocaleKey = (input.context?.locale || 'en-US').split('-')[0].toLowerCase();
    const dateFnsLocale = dateFnsLocalesMap[userLocaleKey] || enUS;

    const formattedEvents: CalendarEvent[] = events.filter(event => event?.status !== 'cancelled').map((event: calendar_v3.Schema$Event): CalendarEvent | null => {
      if (!event) return null;
      const startTimeStr = event.start?.dateTime || event.start?.date || null;
      const endTimeStr = event.end?.dateTime || event.end?.date || null;
      const isAllDay = !!event.start?.date && !event.start?.dateTime;
      
      let timeString = "Time TBD";
      if (isAllDay) { timeString = "All day"; }
      else if (startTimeStr) {
        try {
          const startDate = parseISO(startTimeStr);
          timeString = format(startDate, "p", { locale: dateFnsLocale });
          if (endTimeStr) {
              const endDate = parseISO(endTimeStr);
              timeString += ` - ${format(endDate, "p", { locale: dateFnsLocale })}`;
          }
        } catch (e: any) {
          logger.warn(`${logPrefix} Error formatting event time '${startTimeStr}' TZ '${event.start?.timeZone || userTimezone}': ${e.message}`);
          timeString = "Invalid Time";
        }
      }
      return {
        id: event.id || `cal-${randomUUID()}`, summary: event.summary || "No Title",
        start: startTimeStr, end: endTimeStr, location: event.location || null, description: event.description || null,
        isAllDay: isAllDay, status: event.status || null, organizer: event.organizer?.email || null,
        attendees: event.attendees?.filter(a => !a?.resource && a?.responseStatus !== 'declined').map(a => a?.displayName || a?.email || "?") || [],
        url: event.htmlLink || null, formattedTime: timeString
      };
    }).filter((e): e is CalendarEvent => e !== null);

    outputStructuredData.events = formattedEvents;
    let resultString = "";
    if (formattedEvents.length === 0) {
      resultString = `Looks like your calendar ('${effectiveCalendarId}') is clear for today, ${userNameForResponse}!`;
    } else if (formattedEvents.length === 1) {
      const e = formattedEvents[0];
      resultString = `You have one event today in '${effectiveCalendarId}', ${userNameForResponse}: "${e.summary}" at ${e.formattedTime}.`;
    } else {
      resultString = `Okay ${userNameForResponse}, you have ${formattedEvents.length} events in '${effectiveCalendarId}' today. The first few are:\n`;
      resultString += formattedEvents.slice(0,3).map(e => `- "${e.summary}" (${e.formattedTime})`).join("\n");
      if (formattedEvents.length > 3) resultString += `\n...and ${formattedEvents.length - 3} more.`;
    }
    logger.info(`${logPrefix} Found ${formattedEvents.length} events.`);
    return { result: resultString, structuredData: outputStructuredData };

  } catch (error: any) {
    logger.error(`${logPrefix} Failed to fetch Google Calendar events:`, error);
    const statusCode = error.response?.status;
    const apiErrorMessage = error.response?.data?.error?.message || error.message;
    outputStructuredData.error = `Google Calendar API Error: ${apiErrorMessage}`;

    if (statusCode === 401 || (statusCode === 403 && (apiErrorMessage?.includes("invalid_grant") || apiErrorMessage?.includes("access_denied")))) {
      await handleGoogleAuthFailure(userId, `Auth Error (${statusCode}): ${apiErrorMessage}`);
      outputStructuredData.error = "Google authentication failed. Please reconnect your account.";
      return { error: outputStructuredData.error, result: `Minato couldn't access your Google Calendar, ${userNameForResponse}. Please try reconnecting it in settings.`, structuredData: outputStructuredData };
    } else if (statusCode === 403 && (apiErrorMessage?.includes("forbidden") || apiErrorMessage?.includes("insufficient permissions"))) {
      outputStructuredData.error = "Permission denied by Google. Required scope (e.g., calendar.readonly) might be missing or revoked.";
      return { error: outputStructuredData.error, result: `It seems Minato doesn't have permission to access this calendar ('${effectiveCalendarId}'), ${userNameForResponse}. Please check connection settings.`, structuredData: outputStructuredData };
    } else if (statusCode === 404) {
      outputStructuredData.error = `Calendar with ID '${effectiveCalendarId}' not found or you don't have access.`;
      return { error: outputStructuredData.error, result: `Minato couldn't find a calendar named '${effectiveCalendarId}' or doesn't have permission to view it, ${userNameForResponse}.`, structuredData: outputStructuredData };
    }
    return { error: outputStructuredData.error, result: `Sorry, ${userNameForResponse}, there was an error accessing your calendar.`, structuredData: outputStructuredData };
  }
}
}