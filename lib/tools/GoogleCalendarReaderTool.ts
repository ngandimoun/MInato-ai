// FILE: lib/tools/GoogleCalendarReaderTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CalendarEvent, CalendarEventList, UserState } from "@/lib/types";
import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { supabase } from "../supabaseClient";
import { decryptData } from "../utils/encryption";
import { randomUUID } from "crypto";

// Helper function implementations (getGoogleRefreshToken, getGoogleAuthClient, handleGoogleAuthFailure)
async function getGoogleRefreshToken(userId: string): Promise<string | null> {
  const logPrefix = `[getGoogleRefreshToken User:${userId?.substring(0, 8)}]`;
  if (!userId || !supabase || !appConfig.encryptionKey) { logger.error(`${logPrefix} Missing critical prerequisites (userId, supabase client, or encryptionKey).`); return null; }
  try {
    const { data, error } = await supabase.from("user_integrations").select("refresh_token_encrypted").eq("user_id", userId).eq("provider", "google").maybeSingle();
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
  oauth2Client.on("tokens", (tokens) => { if (tokens.refresh_token) logger.info("[getGoogleAuthClient] New Google refresh token received during token refresh."); if (tokens.access_token) logger.debug(`[getGoogleAuthClient] Google Access token refreshed successfully.`); });
  return oauth2Client;
}
async function handleGoogleAuthFailure(userId: string, errorMessage: string): Promise<void> {
  const logPrefix = `[handleGoogleAuthFailure User:${userId.substring(0,8)}]`;
  logger.warn(`${logPrefix} Google Auth Error: ${errorMessage}. Marking Google integration as revoked in DB.`);
  try {
    if (userId && supabase) {
      const { error: updateError } = await supabase.from("user_integrations").update({ status: "revoked", last_error: errorMessage.substring(0, 250), refresh_token_encrypted: null, access_token_encrypted: null, token_expires_at: null }).eq("user_id", userId).eq("provider", "google");
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
  description =
    "Reads upcoming events from a specified Google Calendar (defaults to primary) for today. Requires appropriate user permissions and user consent.";
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
        description: "Maximum number of events to return (must be between 1 and 10). If null or omitted, defaults to 5.",
        // Removed: minimum, maximum, default
      } as OpenAIToolParameterProperties,
      calendarId: {
        type: ["string", "null"] as const,
        description: "Optional Calendar ID (e.g., user's email, 'primary'). If null or omitted, defaults to 'primary'.",
      } as OpenAIToolParameterProperties,
    },
    required: ["action", "maxResults", "calendarId"], // All defined properties are required
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 5;

  async execute(input: CalendarInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // Defaulting logic for nullable inputs
    const effectiveAction = (input.action === null || input.action === undefined) ? "get_today_events" : input.action;
    const effectiveMaxResults = (input.maxResults === null || input.maxResults === undefined) ? 5 : Math.max(1, Math.min(input.maxResults, 10));
    const effectiveCalendarId = (input.calendarId === null || input.calendarId === undefined) ? "primary" : input.calendarId;

    const userId = input.context?.userId || input.userId; // Ensure userId is sourced
    const logPrefix = `[GoogleCalendarReaderTool User:${userId?.substring(0,8)} Cal:${effectiveCalendarId}]`;
    const queryInputForStructuredData = { ...input, action: effectiveAction, maxResults: effectiveMaxResults, calendarId: effectiveCalendarId };

    if (abortSignal?.aborted) { return { error: "Calendar check cancelled.", result: "Cancelled." }; }
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
      result_type: "calendar_events", source_api: "google_calendar",
      query: queryInputForStructuredData, events: [], error: undefined,
    };

    try {
      const calendar = google.calendar({ version: "v3", auth });
      const now = new Date();
      const userTimezone = input.context?.timezone;
      let timeMinISO: string, timeMaxISO: string;

      try {
        const year = parseInt(now.toLocaleDateString('en-US', { year: 'numeric', timeZone: userTimezone || 'UTC' }));
        const month = parseInt(now.toLocaleDateString('en-US', { month: '2-digit', timeZone: userTimezone || 'UTC' })) - 1;
        const day = parseInt(now.toLocaleDateString('en-US', { day: '2-digit', timeZone: userTimezone || 'UTC' }));
        const localTodayStart = new Date(year, month, day, 0, 0, 0, 0);
        const localTodayEnd = new Date(year, month, day, 23, 59, 59, 999);
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
        calendarId: effectiveCalendarId, timeMin: timeMinISO, timeMax: timeMaxISO,
        maxResults: Math.max(1, Math.min(effectiveMaxResults, 15)), // API constraint
        singleEvents: true, orderBy: 'startTime', timeZone: userTimezone || undefined,
      });

      if (abortSignal?.aborted) { return { error: "Calendar check cancelled.", result: "Cancelled." }; }
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
        if (isAllDay) { timeString = "All day"; }
        else if (startTime) {
          try {
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
        outputStructuredData.error = "Permission denied by Google. Required scope (e.g., calendar.readonly) might be missing or revoked.";
        return { error: outputStructuredData.error, result: `It seems Minato doesn't have permission to access this calendar ('${effectiveCalendarId}'), ${input.context?.userName || "User"}. Please check connection settings.`, structuredData: outputStructuredData };
      } else if (statusCode === 404) {
        outputStructuredData.error = `Calendar with ID '${effectiveCalendarId}' not found or you don't have access.`;
        return { error: outputStructuredData.error, result: `Minato couldn't find a calendar named '${effectiveCalendarId}' or doesn't have permission to view it, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
      }
      return { error: outputStructuredData.error, result: `Sorry, ${input.context?.userName || "User"}, there was an error accessing your calendar.`, structuredData: outputStructuredData };
    }
  }
}