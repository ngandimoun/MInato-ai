// FILE: lib/tools/GoogleGmailReaderTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { EmailHeader, EmailHeaderList, UserState } from "@/lib/types";
import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { supabase } from "../supabaseClient";
import { decryptData } from "../utils/encryption";
import { randomUUID } from "crypto";
import { generateResponseWithIntent } from "../providers/llm_clients";

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
interface GmailInput extends ToolInput {
  action?: "get_recent_emails";
  maxResults?: number;
  query?: string;
  summarize_body?: boolean;
  summarize_limit?: number;
}
function base64UrlDecode(str: string | null | undefined): string {
  if (!str) return "";
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (e) {
    logger.error("Error decoding base64url:", e);
    return "[Decoding Error]";
  }
}
function extractTextFromPayload(
  payload: gmail_v1.Schema$MessagePart | undefined
): string {
  let bodyText = "";
  if (!payload) return bodyText;
  const decodePayloadData = (data: string | null | undefined): string =>
    data ? base64UrlDecode(data) : "";
  if (payload.mimeType === "text/plain") {
    bodyText = decodePayloadData(payload.body?.data);
  } else if (payload.mimeType?.startsWith("multipart/") && payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain") {
        bodyText = decodePayloadData(part.body?.data);
        if (bodyText) break;
      }
      if (!bodyText && part.mimeType?.startsWith("multipart/")) {
        bodyText = extractTextFromPayload(part);
        if (bodyText) break;
      }
      if (
        !bodyText &&
        part.mimeType === "multipart/alternative" &&
        part.parts
      ) {
        for (const subPart of part.parts) {
          if (subPart.mimeType === "text/plain") {
            bodyText = decodePayloadData(subPart.body?.data);
            if (bodyText) break;
          }
        }
        if (bodyText) break;
      }
    }
  }
  if (!bodyText && payload.mimeType === "text/html") {
    bodyText = decodePayloadData(payload.body?.data);
    bodyText = bodyText
      .replace(/<style[^>]*>.*?<\/style>/gs, "")
      .replace(/<script[^>]*>.*?<\/script>/gs, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/<!--.*?-->/gs, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const MAX_BODY_LENGTH_FOR_SUMMARY = 4000;
  return bodyText.substring(0, MAX_BODY_LENGTH_FOR_SUMMARY);
}

export class GoogleGmailReaderTool extends BaseTool {
  name = "GoogleGmailReaderTool";
  description =
    "Reads email metadata (sender, subject, date, snippet) from the user's Gmail inbox based on a query. Optionally summarizes recent email bodies. Requires appropriate permissions and user consent.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["get_recent_emails"],
        description: "Action to perform.",
        default: "get_recent_emails",
      },
      maxResults: {
        type: "number",
        minimum: 1,
        maximum: 10,
        description: "Max emails metadata (default 5).",
        default: 5,
      },
      query: {
        type: "string",
        description:
          "Gmail search query (e.g., 'is:unread label:work'). Defaults to 'is:unread category:primary'.",
        default: "is:unread category:primary",
      },
      summarize_body: {
        type: "boolean",
        description:
          "Summarize recent email bodies (default false). Needs more permissions.",
        default: false,
      },
      summarize_limit: {
        type: "number",
        minimum: 1,
        maximum: 3,
        description: "Max bodies to summarize if enabled (default 1).",
        default: 1,
      },
    },
    required: [],
  };
  cacheTTLSeconds = 60 * 2;

  async execute(
    input: GmailInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const {
      userId,
      maxResults = 5,
      query = "is:unread category:primary",
      summarize_body = false,
      summarize_limit = 1,
    } = input;
    const logPrefix = `[GoogleGmailReaderTool User:${userId?.substring(
      0,
      8
    )} Query:"${query.substring(0, 20)}"]`;
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Aborted.`);
      return {
        error: "Email check cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!userId)
      return {
        error: "User ID missing.",
        result: "I need to know who you are to check your email.",
        structuredData: undefined,
      };
    const userState = input.context?.userState as UserState | null;
    if (!userState?.googleEmailEnabled) {
      logger.warn(
        `${logPrefix} Permission denied: Google Email access not enabled by user.`
      );
      return {
        error: "Permission denied by user settings.",
        result:
          "Access to Google Email is not enabled in your settings. Please enable it if you want me to check your emails.",
        structuredData: {
          result_type: "permission_denied",
          source_api: "google_gmail",
          query: input,
          error: "Permission denied by user settings",
        },
      };
    }
    logger.debug(`${logPrefix} Consent verified: Google Email access enabled.`);
    let auth: OAuth2Client;
    try {
      const refreshToken = await getGoogleRefreshToken(userId);
      if (!refreshToken) {
        logger.warn(
          `${logPrefix} No Google refresh token found or decryption failed.`
        );
        return {
          error: "Gmail not connected.",
          result: "Please connect your Gmail account in settings first.",
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
        result: "Sorry, there was a problem setting up email access.",
        structuredData: undefined,
      };
    }
    let outputStructuredData: EmailHeaderList = {
      result_type: "email_headers",
      source_api: "google_gmail",
      query: input,
      emails: [],
      error: undefined,
    };

    try {
      const gmail = google.gmail({ version: "v1", auth });
      logger.info(`${logPrefix} Listing messages (Limit: ${maxResults})...`);
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: Math.max(1, Math.min(maxResults, 20)),
      });
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Aborted after listing.`);
        return {
          error: "Email check cancelled.",
          result: "Cancelled.",
          structuredData: outputStructuredData,
        };
      }
      const messages = listResponse.data.messages;
      if (!messages || messages.length === 0) {
        logger.info(`${logPrefix} No matching messages found.`);
        const queryDesc =
          query === "is:unread category:primary"
            ? "new important emails"
            : `emails matching your criteria`;
        return {
          result: `No ${queryDesc} found right now.`,
          structuredData: outputStructuredData,
        };
      }
      logger.info(
        `${logPrefix} Found ${messages.length} IDs. Fetching metadata${
          summarize_body ? ` and bodies for ${summarize_limit}` : ""
        }...`
      );
      const detailPromises = messages
        .slice(0, maxResults)
        .map(async (msg, index) => {
          if (!msg.id) return null;
          const shouldFetchBody = summarize_body && index < summarize_limit;
          const format = shouldFetchBody ? "full" : "metadata";
          logger.debug(
            `${logPrefix} Fetching message ${msg.id.substring(
              0,
              6
            )}... (Index: ${index}, Format: ${format})`
          );
          try {
            const metaResponse = await gmail.users.messages.get({
              userId: "me",
              id: msg.id,
              format: format,
              metadataHeaders: [
                "Subject",
                "From",
                "Date",
                "To",
                "Cc",
                "Message-ID",
              ],
            });
            if (abortSignal?.aborted) return null;
            return metaResponse.data;
          } catch (getErr: any) {
            if (getErr.name === "AbortError") {
              logger.warn(
                `${logPrefix} Aborted during fetch for message ${msg.id}.`
              );
              return null;
            }
            logger.warn(
              `${logPrefix} Failed to get ${format} for message ${msg.id}: ${getErr.message}`
            );
            return null;
          }
        });
      const settledDetailResults = await Promise.allSettled(detailPromises);
      if (abortSignal?.aborted) {
        logger.warn(
          `${logPrefix} Aborted after detail fetch potentially completed.`
        );
        return {
          error: "Email check cancelled.",
          result: "Cancelled.",
          structuredData: outputStructuredData,
        };
      }
      const detailResults = settledDetailResults
        .filter((res) => res.status === "fulfilled" && res.value !== null)
        .map(
          (res) =>
            (res as PromiseFulfilledResult<gmail_v1.Schema$Message | null>)
              .value
        )
        .filter(
          (meta): meta is gmail_v1.Schema$Message => meta !== null && !!meta.id
        );
      if (detailResults.length === 0) {
        logger.warn(
          `${logPrefix} Found message IDs but failed to fetch details for any (or aborted).`
        );
        return {
          result: "Found some message IDs but couldn't retrieve their details.",
          structuredData: outputStructuredData,
        };
      }

      const formattedEmails: EmailHeader[] = [];
      const summaryPromises: Promise<void>[] = [];
      for (let i = 0; i < detailResults.length; i++) {
        const meta = detailResults[i];
        const headers = meta.payload?.headers || [];
        const getHeader = (name: string): string | null =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value || null;
        const fromRaw = getHeader("From") || "Unknown Sender";
        let fromClean = fromRaw;
        const match = fromRaw.match(/(?:\"?([^<"]*)\"?\s*)?<?([^>]+)?>?/);
        if (match && match[1] && match[1].trim()) fromClean = match[1].trim();
        else if (match && match[2]) fromClean = match[2].trim();
        let dateParsed: string | null = null;
        const dateRaw = getHeader("Date");
        if (dateRaw) {
          try {
            dateParsed = new Date(dateRaw).toISOString();
          } catch {
            dateParsed = dateRaw;
          }
        }
        const emailHeader: EmailHeader = {
          id: meta.id!,
          threadId: meta.threadId || "unknown",
          subject: getHeader("Subject") || "(No Subject)",
          from: fromClean,
          fromRaw: fromRaw,
          to: getHeader("To"),
          cc: getHeader("Cc"),
          date: dateParsed,
          dateRaw: dateRaw,
          snippet: meta.snippet || null,
          messageIdHeader: getHeader("Message-ID"),
          bodySummary: null,
        };
        formattedEmails.push(emailHeader);
        if (summarize_body && i < summarize_limit) {
          const bodyText = extractTextFromPayload(meta.payload);
          if (bodyText) {
            logger.debug(
              `${logPrefix} Extracted body text (len: ${bodyText.length}) for msg ${meta.id}. Summarizing...`
            );
            summaryPromises.push(
              (async () => {
                const summarySystemPrompt = `You are an email summarization assistant...Email Body:\n"${bodyText}"`;
                const summaryUserInput = "Provide the summary.";
                const summaryResult = await generateResponseWithIntent(
                  summarySystemPrompt,
                  summaryUserInput,
                  [],
                  appConfig.openai.extraction,
                  150,
                  userId
                );
                const targetEmail = formattedEmails.find(
                  (e) => e.id === meta.id
                );
                if (targetEmail) {
                  if ("responseText" in summaryResult) {
                    targetEmail.bodySummary = summaryResult.responseText.trim();
                    logger.debug(
                      `${logPrefix} Body summarized for msg ${
                        meta.id
                      }: "${targetEmail.bodySummary.substring(0, 50)}..."`
                    );
                  } else {
                    logger.warn(
                      `${logPrefix} Failed to summarize body for msg ${meta.id}: ${summaryResult.error}`
                    );
                    targetEmail.bodySummary = "[Could not summarize body]";
                  }
                }
              })()
            );
          } else {
            logger.warn(
              `${logPrefix} Could not extract text body for summarization from msg ${meta.id}.`
            );
            const targetEmail = formattedEmails.find((e) => e.id === meta.id);
            if (targetEmail) targetEmail.bodySummary = "[No text body found]";
          }
        }
      }
      if (summaryPromises.length > 0) {
        logger.debug(
          `${logPrefix} Waiting for ${summaryPromises.length} body summaries...`
        );
        await Promise.allSettled(summaryPromises);
        logger.debug(`${logPrefix} All body summaries finished (or failed).`);
      }
      outputStructuredData.emails = formattedEmails;
      const emailSummaries = formattedEmails.map(
        (e) =>
          `- From ${e.from}: "${e.subject}"${
            e.bodySummary
              ? ` (Summary: ${e.bodySummary.substring(0, 50)}...)`
              : ""
          }`
      );
      const resultString =
        formattedEmails.length === 1
          ? `Found 1 email matching criteria: From ${
              formattedEmails[0].from
            } about "${formattedEmails[0].subject}".${
              formattedEmails[0].bodySummary
                ? ` Summary: ${formattedEmails[0].bodySummary}`
                : ""
            }`
          : `Found ${
              formattedEmails.length
            } emails matching criteria. Highlights:\n${emailSummaries.join(
              "\n"
            )}`;
      logger.info(
        `${logPrefix} Fetched details for ${formattedEmails.length} emails${
          summarize_body
            ? ` (summarized ${
                formattedEmails.filter(
                  (e) => e.bodySummary && !e.bodySummary.startsWith("[")
                ).length
              })`
            : ""
        }.`
      );
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      logger.error(`${logPrefix} Failed to fetch Gmail messages:`, error);
      const statusCode = error.response?.status;
      const apiErrorMessage =
        error.response?.data?.error?.message || error.message;
      if (error.name === "AbortError") {
        logger.error(`${logPrefix} Request timed out or was aborted.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return {
          error: outputStructuredData.error,
          result: "Sorry, checking your email took too long.",
          structuredData: outputStructuredData,
        };
      }
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
            "I couldn't access your Gmail. Please try reconnecting it in settings.",
          structuredData: outputStructuredData,
        };
      } else if (
        statusCode === 403 &&
        (apiErrorMessage?.includes("forbidden") ||
          apiErrorMessage?.includes("insufficient permissions"))
      ) {
        let permissionErrorMsg =
          "Permission denied by Google. Required scope (e.g., gmail.readonly) might be missing or revoked.";
        if (summarize_body) {
          permissionErrorMsg =
            "Insufficient permissions to read email body content. Required scope (gmail.readonly) might be missing or revoked.";
          logger.error(
            `${logPrefix} Permission error likely due to missing 'gmail.readonly' scope for body summarization.`
          );
        } else {
          logger.error(
            `${logPrefix} Google API returned 403 Forbidden/Insufficient Permissions. Scope might be missing or revoked even for metadata access.`
          );
        }
        outputStructuredData.error = permissionErrorMsg;
        return {
          error: outputStructuredData.error,
          result:
            "It seems I don't have permission to access your emails anymore. Please check connection settings and ensure the necessary permissions (like 'gmail.readonly') are granted.",
          structuredData: outputStructuredData,
        };
      } else {
        outputStructuredData.error = `Google Gmail API Error: ${apiErrorMessage}`;
        return {
          error: outputStructuredData.error,
          result: "Sorry, there was an error accessing your email.",
          structuredData: outputStructuredData,
        };
      }
    }
  }
}
