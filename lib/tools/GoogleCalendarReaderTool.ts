// FILE: lib/tools/GoogleCalendarReaderTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CalendarEvent, CalendarEventList, UserState } from "@/lib/types";
import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { supabase } from "../supabaseClient";
import { decryptData } from "../utils/encryption";
import { randomUUID } from "crypto";
import { any } from "zod";

async function getGoogleRefreshToken(userId: string): Promise<string | null> {
  const logPrefix = `[getGoogleRefreshToken User:${userId?.substring(0, 8)}]`;
  if (!userId || !supabase || !appConfig.encryptionKey) {
    logger.error(
      `${logPrefix} Missing userId, supabaseAdmin client, or encryptionKey.`
    );
    return null;
  }
  logger.debug(`${logPrefix} Attempting to fetch Google refresh token...`);
  try {
    const { data, error } = await supabase
      .from("user_integrations")
      .select("refresh_token_encrypted")
      .eq("user_id", userId)
      .eq("provider", "google")
      .maybeSingle();
    if (error) {
      if (error.code !== "PGRST116") {
        logger.error(`${logPrefix} Supabase error fetching token:`, error);
      } else {
        logger.debug(
          `${logPrefix} No Google integration record found for user.`
        );
      }
      return null;
    }
    const encryptedToken = data?.refresh_token_encrypted;
    if (!encryptedToken) {
      logger.warn(
        `${logPrefix} Google integration record found, but encrypted refresh token is missing.`
      );
      return null;
    }
    const decryptedToken = decryptData(encryptedToken, appConfig.encryptionKey);
    if (!decryptedToken) {
      logger.error(`${logPrefix} Failed to decrypt Google refresh token.`);
      return null;
    }
    logger.debug(
      `${logPrefix} Successfully retrieved and decrypted Google refresh token.`
    );
    return decryptedToken;
  } catch (dbError: any) {
    logger.error(
      `${logPrefix} Exception fetching/decrypting Google token:`,
      dbError
    );
    return null;
  }
}
function getGoogleAuthClient(refreshToken: string): OAuth2Client {
  if (
    !appConfig.toolApiKeys.googleClientId ||
    !appConfig.toolApiKeys.googleClientSecret ||
    !process.env.GOOGLE_REDIRECT_URI
  ) {
    logger.error(
      "CRITICAL: Google OAuth Client ID, Secret, or Redirect URI missing."
    );
    throw new Error("Google OAuth Client credentials configuration error.");
  }
  const oauth2Client = new OAuth2Client(
    appConfig.toolApiKeys.googleClientId,
    appConfig.toolApiKeys.googleClientSecret,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  oauth2Client.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
      logger.info(
        "[getGoogleAuthClient] New refresh token received (not automatically saved by this tool)."
      );
    }
    if (tokens.access_token) {
      logger.debug(`[getGoogleAuthClient] Access token refreshed.`);
    }
  });
  return oauth2Client;
}
async function handleGoogleAuthFailure(
  userId: string,
  errorMessage: string
): Promise<void> {
  const logPrefix = `[handleGoogleAuthFailure User:${userId.substring(0, 8)}]`;
  logger.warn(
    `${logPrefix} Google Auth Error detected: ${errorMessage}. Marking integration as revoked.`
  );
  try {
    if (userId && supabase) {
      const { error: updateError } = await supabase
        .from("user_integrations")
        .update({
          status: "revoked",
          last_error: errorMessage.substring(0, 250),
          refresh_token_encrypted: null,
          access_token_encrypted: null,
          token_expires_at: null,
        })
        .eq("user_id", userId)
        .eq("provider", "google");class SupabaseAdmin {
          constructor() {
            // initialization code here
          }
        
          from(table: string) {
            // implementation here
          }
        }supabase
        .from("user_integrations")
        .update({
          status: "revoked",
          last_error: errorMessage.substring(0, 250),
          refresh_token_encrypted: null,
          access_token_encrypted: null,
          token_expires_at: null,
        })
        .eq("user_id", userId)
        .eq("provider", "google");
      if (updateError) {
        logger.error(
          `${logPrefix} Failed to mark Google integration as revoked in DB:`,
          updateError
        );
      } else {
        logger.info(
          `${logPrefix} Successfully marked Google integration as revoked.`
        );
      }
    }
  } catch (dbError) {
    logger.error(
      `${logPrefix} Exception while marking integration as revoked:`,
      dbError
    );
  }
}
interface CalendarInput extends ToolInput {
  action?: "get_today_events";
  maxResults?: number;
  calendarId?: string;
}

export class GoogleCalendarReaderTool extends BaseTool {
  name = "GoogleCalendarReaderTool";
  description =
    "Reads upcoming events from a specified Google Calendar (defaults to primary) for today. Requires appropriate user permissions and user consent.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["get_today_events"],
        description: "Action (default 'get_today_events').",
        default: "get_today_events",
      },
      maxResults: {
        type: "number",
        minimum: 1,
        maximum: 10,
        description: "Max events (default 5).",
        default: 5,
      },
      calendarId: {
        type: "string",
        description:
          "Optional Calendar ID (e.g., user's email, 'primary'). Defaults to 'primary'.",
        default: "primary",
      },
    },
    required: [],
  };
  cacheTTLSeconds = 60 * 5;

  async execute(
    input: CalendarInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { userId, maxResults = 5, calendarId = "primary" } = input;
    const logPrefix = `[GoogleCalendarReaderTool User:${userId?.substring(
      0,
      8
    )} Cal:${calendarId}]`;
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted.`);
      return {
        error: "Calendar check cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!userId)
      return {
        error: "User ID missing.",
        result: "I need to know who you are to check your calendar.",
        structuredData: undefined,
      };
    const userState = input.context?.userState as UserState | null;
    if (!userState?.googleCalendarEnabled) {
      logger.warn(
        `${logPrefix} Permission denied: Google Calendar access not enabled by user.`
      );
      return {
        error: "Permission denied by user settings.",
        result:
          "Access to Google Calendar is not enabled in your settings. Please enable it if you want me to check your calendar.",
        structuredData: {
          result_type: "permission_denied",
          source_api: "google_calendar",
          query: input,
          error: "Permission denied by user settings",
        },
      };
    }
    logger.debug(
      `${logPrefix} Consent verified: Google Calendar access enabled.`
    );
    let auth: OAuth2Client;
    try {
      const refreshToken = await getGoogleRefreshToken(userId);
      if (!refreshToken) {
        logger.warn(
          `${logPrefix} No Google refresh token found or decryption failed.`
        );
        return {
          error: "Google Calendar not connected.",
          result: "Please connect your Google Calendar in settings first.",
          structuredData: undefined,
        };
      }
      auth = getGoogleAuthClient(refreshToken);
    } catch (authError: any) {
      logger.error(
        `${logPrefix} Authentication setup failed:`,
        authError.message
      );
      return {
        error: `Authentication setup failed: ${authError.message}`,
        result: "Sorry, there was a problem setting up calendar access.",
        structuredData: undefined,
      };
    }
    let outputStructuredData: CalendarEventList = {
      result_type: "calendar_events",
      source_api: "google_calendar",
      query: input,
      events: [],
      error: undefined,
    };

    try {
      const calendar = google.calendar({ version: "v3", auth });
      const now = new Date();
      const userTimezone = input.context?.timezone;
      let timeMinISO: string, timeMaxISO: string;
      try {
        const year = parseInt(
          now.toLocaleDateString("en-US", {
            year: "numeric",
            timeZone: userTimezone || "UTC",
          })
        );
        const month =
          parseInt(
            now.toLocaleDateString("en-US", {
              month: "2-digit",
              timeZone: userTimezone || "UTC",
            })
          ) - 1;
        const day = parseInt(
          now.toLocaleDateString("en-US", {
            day: "2-digit",
            timeZone: userTimezone || "UTC",
          })
        );
        const zonedDate = new Date(Date.UTC(year, month, day));
        const startOfDay = new Date(
          zonedDate.toLocaleString("en-US", { timeZone: userTimezone || "UTC" })
        );
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(
          zonedDate.toLocaleString("en-US", { timeZone: userTimezone || "UTC" })
        );
        endOfDay.setHours(23, 59, 59, 999);
        timeMinISO = startOfDay.toISOString();
        timeMaxISO = endOfDay.toISOString();
      } catch (tzError: any) {
        logger.warn(
          `${logPrefix} Error creating date range with TZ '${userTimezone}'. Falling back to UTC.`,
          tzError.message
        );
        const utcStart = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        const utcEnd = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            23,
            59,
            59,
            999
          )
        );
        timeMinISO = utcStart.toISOString();
        timeMaxISO = utcEnd.toISOString();
      }
      logger.info(
        `${logPrefix} Fetching up to ${maxResults} events for today (${timeMinISO.substring(
          0,
          10
        )}) [API TZ Param: ${userTimezone || "Default"}]...`
      );
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMinISO,
        timeMax: timeMaxISO,
        maxResults: Math.max(1, Math.min(maxResults, 15)),
        singleEvents: true,
        orderBy: "startTime",
        timeZone: userTimezone || undefined,
      });
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Aborted after Google API call.`);
        return {
          error: "Calendar check cancelled.",
          result: "Cancelled.",
          structuredData: outputStructuredData,
        };
      }
      const events = response.data.items;
      if (!events || events.length === 0) {
        logger.info(
          `${logPrefix} No events found for today in calendar '${calendarId}'.`
        );
        return {
          result: `Looks like calendar '${calendarId}' is clear for today!`,
          structuredData: outputStructuredData,
        };
      }
      const formattedEvents: CalendarEvent[] = events
        .filter((event) => event?.status !== "cancelled")
        .map((event: calendar_v3.Schema$Event): CalendarEvent | null => {
          if (!event) return null;
          const startTime = event.start?.dateTime || event.start?.date || null;
          const endTime = event.end?.dateTime || event.end?.date || null;
          const isAllDay = !!event.start?.date && !event.start?.dateTime;
          let timeString = "Time TBD";
          if (isAllDay) {
            timeString = "All day";
          } else if (startTime) {
            try {
              const eventTimeZone =
                event.start?.timeZone || userTimezone || "UTC";
              timeString = new Date(startTime).toLocaleTimeString(
                input.context?.locale || "en-US",
                {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: eventTimeZone,
                  hour12: true,
                }
              );
            } catch (e: any) {
              logger.warn(
                `${logPrefix} Error formatting event time '${startTime}' TZ '${
                  event.start?.timeZone || userTimezone
                }': ${e.message}`
              );
              try {
                timeString = new Date(startTime).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                });
              } catch {
                timeString = "Invalid Time";
              }
            }
          }
          return {
            id: event.id || `cal-${randomUUID()}`,
            summary: event.summary || "No Title",
            start: startTime,
            end: endTime,
            location: event.location || null,
            description: event.description || null,
            isAllDay: isAllDay,
            status: event.status || null,
            organizer: event.organizer?.email || null,
            attendees:
              event.attendees
                ?.filter((a) => !a?.resource)
                .map((a) => a?.email || "?") || [],
            url: event.htmlLink || null,
            formattedTime: timeString,
          };
        })
        .filter((e): e is CalendarEvent => e !== null);
      outputStructuredData.events = formattedEvents;
      const eventSummaries = formattedEvents.map(
        (e) => `- ${e.summary} (${e.formattedTime})`
      );
      const resultString =
        formattedEvents.length === 1
          ? `You have one event today in '${calendarId}': ${formattedEvents[0].summary} at ${formattedEvents[0].formattedTime}.`
          : `Today's calendar '${calendarId}' has ${
              formattedEvents.length
            } events:\n${eventSummaries.join("\n")}`;
      logger.info(`${logPrefix} Found ${formattedEvents.length} events.`);
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      logger.error(
        `${logPrefix} Failed to fetch Google Calendar events:`,
        error
      );
      const statusCode = error.response?.status;
      const apiErrorMessage =
        error.response?.data?.error?.message || error.message;
      if (
        statusCode === 401 ||
        (statusCode === 403 &&
          (apiErrorMessage?.includes("invalid_grant") ||
            apiErrorMessage?.includes("access_denied")))
      ) {
        await handleGoogleAuthFailure(
          userId,
          `Auth Error (${statusCode}): ${apiErrorMessage}`
        );
        outputStructuredData.error =
          "Google authentication failed. Please reconnect your account.";
        return {
          error: outputStructuredData.error,
          result:
            "I couldn't access your Google Calendar. Please try reconnecting it in settings.",
          structuredData: outputStructuredData,
        };
      } else if (
        statusCode === 403 &&
        (apiErrorMessage?.includes("forbidden") ||
          apiErrorMessage?.includes("insufficient permissions"))
      ) {
        logger.warn(
          `${logPrefix} Google API returned 403 Forbidden/Insufficient Permissions.`
        );
        outputStructuredData.error =
          "Permission denied by Google. Please ensure calendar access is granted with the correct scopes.";
        return {
          error: outputStructuredData.error,
          result:
            "It seems I don't have permission to access this calendar ('" +
            calendarId +
            "'). Please check your Google connection settings and ensure the calendar scope is granted.",
          structuredData: outputStructuredData,
        };
      } else if (statusCode === 404) {
        outputStructuredData.error = `Calendar with ID '${calendarId}' not found or you don't have access.`;
        logger.warn(`${logPrefix} Calendar '${calendarId}' not found (404).`);
        return {
          error: outputStructuredData.error,
          result: `I couldn't find a calendar named '${calendarId}' or don't have permission to view it.`,
          structuredData: outputStructuredData,
        };
      } else {
        outputStructuredData.error = `Google Calendar API Error: ${apiErrorMessage}`;
        return {
          error: outputStructuredData.error,
          result: "Sorry, there was an error accessing your calendar.",
          structuredData: outputStructuredData,
        };
      }
    }
  }
}
