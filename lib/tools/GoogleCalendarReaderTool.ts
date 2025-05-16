import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CalendarEvent, CalendarEventList, UserState } from "@/lib/types";
import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { supabase } from "../supabaseClient"; // Use the public client from supabaseClient.ts
import { decryptData } from "../utils/encryption";
import { randomUUID } from "crypto";

// Helper function implementations (getGoogleRefreshToken, getGoogleAuthClient, handleGoogleAuthFailure)
// should be kept as previously provided, or refactored into a common auth utility if used by multiple Google tools.
// For brevity, I'm assuming they are correctly defined as in your provided `tools2.txt`.

async function getGoogleRefreshToken(userId: string): Promise<string | null> {
  const logPrefix = `[getGoogleRefreshToken User:${userId?.substring(0, 8)}]`;
  if (!userId || !supabase || !appConfig.encryptionKey) { /* ... */ return null; }
  try {
    const { data, error } = await supabase.from("user_integrations").select("refresh_token_encrypted").eq("user_id", userId).eq("provider", "google").maybeSingle();
    if (error) { /* ... */ return null; }
    const encryptedToken = data?.refresh_token_encrypted;
    if (!encryptedToken) { /* ... */ return null; }
    const decryptedToken = decryptData(encryptedToken, appConfig.encryptionKey);
    if (!decryptedToken) { /* ... */ return null; }
    return decryptedToken;
  } catch (dbError: any) { /* ... */ return null; }
}
function getGoogleAuthClient(refreshToken: string): OAuth2Client {
  if (!appConfig.toolApiKeys.googleClientId || !appConfig.toolApiKeys.googleClientSecret || !process.env.GOOGLE_REDIRECT_URI) {
    logger.error("CRITICAL: Google OAuth Client ID, Secret, or Redirect URI missing.");
    throw new Error("Google OAuth Client credentials configuration error.");
  }
  const oauth2Client = new OAuth2Client(appConfig.toolApiKeys.googleClientId, appConfig.toolApiKeys.googleClientSecret, process.env.GOOGLE_REDIRECT_URI);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  oauth2Client.on("tokens", (tokens) => { /* ... logging ... */ });
  return oauth2Client;
}
async function handleGoogleAuthFailure(userId: string, errorMessage: string): Promise<void> {
  const logPrefix = `[handleGoogleAuthFailure User:${userId.substring(0,8)}]`;
  logger.warn(`${logPrefix} Google Auth Error: ${errorMessage}. Marking integration revoked.`);
  try {
    if (userId && supabase) {
      await supabase.from("user_integrations").update({ status: "revoked", last_error: errorMessage.substring(0, 250), refresh_token_encrypted: null, access_token_encrypted: null, token_expires_at: null }).eq("user_id", userId).eq("provider", "google");
    }
  } catch (dbError) { logger.error(`${logPrefix} Exception marking revoked:`, dbError); }
}


interface CalendarInput extends ToolInput {
  action?: "get_today_events" | null; // Allow null
  maxResults?: number | null; // Allow null
  calendarId?: string | null; // Allow null
}

export class GoogleCalendarReaderTool extends BaseTool {
  name = "GoogleCalendarReaderTool";
  description =
    "Reads upcoming events from a specified Google Calendar (defaults to primary) for today. Requires appropriate user permissions and user consent.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: { type: ["string", "null"], enum: ["get_today_events"], description: "Action (default 'get_today_events').", default: "get_today_events" },
      maxResults: { type: ["number", "null"], minimum: 1, maximum: 10, description: "Max events (default 5).", default: 5 },
      calendarId: { type: ["string", "null"], description: "Optional Calendar ID (e.g., user's email, 'primary'). Defaults to 'primary'.", default: "primary" },
    },
    required: ["action", "maxResults", "calendarId"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 5; // Cache for 5 minutes

  async execute(input: CalendarInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId, maxResults, calendarId } = input; // Removed action as it defaults
    const userId = input.context?.userId || contextUserId;
    const effectiveMaxResults = maxResults ?? 5;
    const effectiveCalendarId = calendarId ?? "primary";

    const logPrefix = `[GoogleCalendarReaderTool User:${userId?.substring(0,8)} Cal:${effectiveCalendarId}]`;
    const queryInputForStructuredData = { ...input, maxResults: effectiveMaxResults, calendarId: effectiveCalendarId };

    if (abortSignal?.aborted) { /* ... */ return { error: "Calendar check cancelled.", result: "Cancelled." }; }
    if (!userId) return { error: "User ID missing.", result: "I need to know who you are to check your calendar.", structuredData: { result_type: "calendar_events", source_api: "google_calendar", query: queryInputForStructuredData, events: [], error: "User ID missing" } };

    const userState = input.context?.userState as UserState | null;
    if (!userState?.googlecalendarenabled) {
      logger.warn(`${logPrefix} Permission denied: Google Calendar access not enabled by user.`);
      return {
        error: "Permission denied by user settings.",
        result: `Access to Google Calendar is not enabled in your settings, ${input.context?.userName || "User"}. Please enable it if you want me to check your calendar.`,
        structuredData: { result_type: "permission_denied", source_api: "google_calendar", query: queryInputForStructuredData, message: "Google Calendar access not enabled by user.", error: "Permission denied by user settings" },
      };
    }
    logger.debug(`${logPrefix} Consent verified: Google Calendar access enabled.`);

    let auth: OAuth2Client;
    try {
      const refreshToken = await getGoogleRefreshToken(userId);
      if (!refreshToken) {
        logger.warn(`${logPrefix} No Google refresh token found or decryption failed.`);
        return { error: "Google Calendar not connected.", result: `Please connect your Google Calendar in settings first, ${input.context?.userName || "User"}.`, structuredData: { result_type: "calendar_events", source_api: "google_calendar", query: queryInputForStructuredData, events: [], error: "Google Calendar not connected" } };
      }
      auth = getGoogleAuthClient(refreshToken);
    } catch (authError: any) {
      logger.error(`${logPrefix} Authentication setup failed:`, authError.message);
      return { error: `Authentication setup failed: ${authError.message}`, result: `Sorry, ${input.context?.userName || "User"}, there was a problem setting up calendar access.`, structuredData: { result_type: "calendar_events", source_api: "google_calendar", query: queryInputForStructuredData, events: [], error: `Auth setup failed: ${authError.message}` } };
    }

    let outputStructuredData: CalendarEventList = {
      result_type: "calendar_events",
      source_api: "google_calendar",
      query: queryInputForStructuredData,
      events: [],
      error: undefined,
    };

    try {
      const calendar = google.calendar({ version: "v3", auth });
      const now = new Date();
      const userTimezone = input.context?.timezone;
      let timeMinISO: string, timeMaxISO: string;

      try {
        // Get start and end of today in user's timezone or UTC
        const year = parseInt(now.toLocaleDateString('en-US', { year: 'numeric', timeZone: userTimezone || 'UTC' }));
        const month = parseInt(now.toLocaleDateString('en-US', { month: '2-digit', timeZone: userTimezone || 'UTC' })) - 1;
        const day = parseInt(now.toLocaleDateString('en-US', { day: '2-digit', timeZone: userTimezone || 'UTC' }));
        
        // Create Date objects based on the user's local day, then convert to ISO
        // This ensures we get events for "today" according to the user, not just UTC "today"
        const localTodayStart = new Date(year, month, day, 0, 0, 0, 0);
        const localTodayEnd = new Date(year, month, day, 23, 59, 59, 999);

        // If userTimezone is known, we can be more precise by converting these local start/end to UTC for the API query
        // However, Google Calendar API's `timeZone` parameter for `events.list` handles this.
        // So, we'll provide the local start/end and the user's timezone to the API.
        timeMinISO = localTodayStart.toISOString();
        timeMaxISO = localTodayEnd.toISOString();

      } catch (tzError: any) {
        logger.warn(`${logPrefix} Error creating date range with TZ '${userTimezone}'. Falling back to simple UTC today.`, tzError.message);
        const utcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0,0,0,0));
        const utcEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23,59,59,999));
        timeMinISO = utcStart.toISOString();
        timeMaxISO = utcEnd.toISOString();
      }

      logger.info(`${logPrefix} Fetching up to ${effectiveMaxResults} events for today (${timeMinISO.substring(0,10)}) [API TZ Param: ${userTimezone || "Default"}]...`);
      const response = await calendar.events.list({
        calendarId: effectiveCalendarId,
        timeMin: timeMinISO,
        timeMax: timeMaxISO,
        maxResults: Math.max(1, Math.min(effectiveMaxResults, 15)),
        singleEvents: true,
        orderBy: 'startTime',
        timeZone: userTimezone || undefined, // Let Google API handle timezone conversion for query range
      });

      if (abortSignal?.aborted) { /* ... */ return { error: "Calendar check cancelled.", result: "Cancelled." }; }
      const events = response.data.items;
      if (!events || events.length === 0) {
        logger.info(`${logPrefix} No events found for today in calendar '${effectiveCalendarId}'.`);
        return { result: `Looks like calendar '${effectiveCalendarId}' is clear for today, ${input.context?.userName || "User"}!`, structuredData: outputStructuredData };
      }

      const formattedEvents: CalendarEvent[] = events.filter(event => event?.status !== 'cancelled').map((event: calendar_v3.Schema$Event): CalendarEvent | null => {
        if (!event) return null;
        const startTime = event.start?.dateTime || event.start?.date || null;
        const endTime = event.end?.dateTime || event.end?.date || null;
        const isAllDay = !!event.start?.date && !event.start?.dateTime;
        let timeString = "Time TBD";
        if (isAllDay) {
          timeString = "All day";
        } else if (startTime) {
          try {
            // Use the event's own timezone if provided, otherwise the user's context, fallback to UTC for display
            const displayTimeZone = event.start?.timeZone || userState?.timezone || input.context?.timezone || 'UTC';
            timeString = new Date(startTime).toLocaleTimeString(input.context?.locale || 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: displayTimeZone, hour12: true });
          } catch (e: any) {
            logger.warn(`${logPrefix} Error formatting event time '${startTime}' TZ '${event.start?.timeZone || userState?.timezone || input.context?.timezone}': ${e.message}`);
            try { timeString = new Date(startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
            catch { timeString = "Invalid Time"; }
          }
        }
        return {
          id: event.id || `cal-${randomUUID()}`, summary: event.summary || "No Title",
          start: startTime, end: endTime, location: event.location || null, description: event.description || null,
          isAllDay: isAllDay, status: event.status || null, organizer: event.organizer?.email || null,
          attendees: event.attendees?.filter(a => !a?.resource).map(a => a?.email || "?") || [],
          url: event.htmlLink || null, formattedTime: timeString
        };
      }).filter((e): e is CalendarEvent => e !== null);

      outputStructuredData.events = formattedEvents;
      const eventSummaries = formattedEvents.map(e => `- ${e.summary} (${e.formattedTime})`);
      const resultString = formattedEvents.length === 1
        ? `You have one event today in '${effectiveCalendarId}', ${input.context?.userName || "User"}: ${formattedEvents[0].summary} at ${formattedEvents[0].formattedTime}.`
        : `Today's calendar '${effectiveCalendarId}' for ${input.context?.userName || "User"} has ${formattedEvents.length} events:\n${eventSummaries.join("\n")}`;
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
        return { error: outputStructuredData.error, result: `Minato couldn't access your Google Calendar, ${input.context?.userName || "User"}. Please try reconnecting it in settings.`, structuredData: outputStructuredData };
      } else if (statusCode === 403 && (apiErrorMessage?.includes("forbidden") || apiErrorMessage?.includes("insufficient permissions"))) {
        outputStructuredData.error = "Permission denied by Google. Please ensure calendar access is granted with the correct scopes.";
        return { error: outputStructuredData.error, result: `It seems Minato doesn't have permission to access this calendar ('${effectiveCalendarId}'), ${input.context?.userName || "User"}. Please check your Google connection settings.`, structuredData: outputStructuredData };
      } else if (statusCode === 404) {
        outputStructuredData.error = `Calendar with ID '${effectiveCalendarId}' not found or you don't have access.`;
        return { error: outputStructuredData.error, result: `Minato couldn't find a calendar named '${effectiveCalendarId}' or doesn't have permission to view it, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
      }
      return { error: outputStructuredData.error, result: `Sorry, ${input.context?.userName || "User"}, there was an error accessing your calendar.`, structuredData: outputStructuredData };
    }
  }
}