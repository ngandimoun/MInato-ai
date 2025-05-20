// FILE: lib/tools/GoogleGmailReaderTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { EmailHeader, EmailHeaderList, UserState } from "@/lib/types";
import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getSupabaseAdminClient } from "../supabaseClient";
import { decryptData } from "../utils/encryption";
import { randomUUID } from "crypto";
import { generateResponseWithIntent } from "../providers/llm_clients";
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns'; // For date formatting
// Helper function implementations (getGoogleRefreshToken, getGoogleAuthClient, handleGoogleAuthFailure, base64UrlDecode, extractTextFromPayload)
async function getGoogleRefreshToken(userId: string): Promise<string | null> {
  const logPrefix = `[getGoogleRefreshToken User:${userId?.substring(0, 8)}]`;
  const supabase = getSupabaseAdminClient();
  if (!userId || !supabase || !appConfig.encryptionKey) { logger.error(`${logPrefix} Missing critical prerequisites (userId, supabase client, or encryptionKey).`); return null; }
  try {
    const { data, error } = await supabase.from("user_integrations").select("refresh_token_encrypted").eq("user_id", userId).eq("provider", "google").maybeSingle();
    if (error && error.code !== "PGRST116") { logger.error(`${logPrefix} Supabase error fetching refresh token:, error`); return null; }
    if (!data?.refresh_token_encrypted) { logger.info(`${logPrefix} No encrypted refresh token found in DB.`); return null; }
    const decryptedToken = decryptData(data.refresh_token_encrypted, appConfig.encryptionKey);
    if (!decryptedToken) logger.warn(`${logPrefix} Failed to decrypt refresh token.`);
    return decryptedToken || null;
  } catch (dbError: any) { logger.error(`${logPrefix} Exception fetching/decrypting refresh token:, dbError.message`); return null; }
}
function getGoogleAuthClient(refreshToken: string): OAuth2Client {
  if (!appConfig.toolApiKeys.googleClientId || !appConfig.toolApiKeys.googleClientSecret || !process.env.GOOGLE_REDIRECT_URI) {
    logger.error("CRITICAL: Google OAuth Client ID, Secret, or Redirect URI missing in server configuration.");
    throw new Error("Google OAuth Client credentials configuration error on server.");
  }
  const oauth2Client = new OAuth2Client(appConfig.toolApiKeys.googleClientId, appConfig.toolApiKeys.googleClientSecret, process.env.GOOGLE_REDIRECT_URI);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  oauth2Client.on("tokens", (tokens) => {
    if (tokens.refresh_token) logger.info("[getGoogleAuthClient] New Google refresh token received during token refresh.");
    if (tokens.access_token) logger.debug('[getGoogleAuthClient] Google Access token refreshed successfully.');
  });
  return oauth2Client;
}
async function handleGoogleAuthFailure(userId: string, errorMessage: string): Promise<void> {
  const logPrefix = `[handleGoogleAuthFailure User:${userId.substring(0,8)}]`;
  logger.warn(`${logPrefix} Google Auth Error: ${errorMessage}. Marking Google integration as revoked in DB.`);
  try {
    const supabase = getSupabaseAdminClient();
    if (userId && supabase) {
      const { error: updateError } = await supabase.from("user_integrations").update({ status: "revoked", last_error: errorMessage.substring(0, 250), refresh_token_encrypted: null, access_token_encrypted: null, token_expires_at: null }).eq("user_id", userId).eq("provider", "google");
      if (updateError) logger.error(`${logPrefix} Failed to mark integration as revoked in DB:, updateError`);
      else logger.info(`${logPrefix} Successfully marked Google integration as revoked for user.`);
    }
  } catch (dbException) { logger.error(`${logPrefix} Exception during attempt to mark integration as revoked:, dbException`); }
}
function base64UrlDecode(str: string | null | undefined): string {
  if (!str) return "";
  try { let base64 = str.replace(/-/g, "+").replace(/_/g, "/"); while (base64.length % 4) { base64 += "="; } return Buffer.from(base64, "base64").toString("utf-8"); }
  catch (e) { logger.error("Error decoding base64url:", e); return "[Decoding Error]"; }
}
function extractTextFromPayload(payload: gmail_v1.Schema$Message['payload']): string {
  // Extraction du texte du corps de l'email (exemple simple, à adapter selon structure réelle)
  let bodyText = '';
  if (!payload) return bodyText;
  if (payload.body && payload.body.data) {
    try {
      bodyText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } catch {
      bodyText = '';
    }
  } else if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        try {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        } catch {
          bodyText = '';
        }
      }
    }
  }
  // Nettoyage du texte
  bodyText = bodyText.replace(/\r?\n/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const MAX_BODY_LENGTH_FOR_SUMMARY = 4000;
  return bodyText.substring(0, MAX_BODY_LENGTH_FOR_SUMMARY);
}
interface GmailInput extends ToolInput {
  action?: "get_recent_emails";
  maxResults?: number;
  query?: string;
  summarize_body?: boolean;
  summarize_limit?: number;
}
export class GoogleGmailReaderTool extends BaseTool {
name = "GoogleGmailReaderTool";
description =
"Reads email metadata (sender, subject, date, snippet) from the user's Gmail inbox based on a query. Optionally summarizes recent email bodies. Requires appropriate permissions and user consent.";
argsSchema = {
type: "object" as const,
properties: {
action: {
type: ["string"] as const,
enum: ["get_recent_emails"],
description: "Action to perform.",
} as OpenAIToolParameterProperties,
maxResults: {
type: ["number"] as const,
description: "Maximum number of email metadata records to return (1-10).",
} as OpenAIToolParameterProperties,
query: {
type: ["string"] as const,
description: "Gmail search query (e.g., 'is:unread label:work').",
} as OpenAIToolParameterProperties,
summarize_body: {
type: ["boolean"] as const,
description: "Whether to summarize recent email bodies.",
} as OpenAIToolParameterProperties,
summarize_limit: {
type: ["number"] as const,
description: "Maximum number of email bodies to summarize if summarize_body is true (1-3).",
} as OpenAIToolParameterProperties,
},
required: ["action", "maxResults", "query", "summarize_body", "summarize_limit"],
additionalProperties: false as false,
};
cacheTTLSeconds = 60 * 2;
async execute(input: GmailInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
const effectiveAction = input.action === undefined ? "get_recent_emails" : input.action;
const effectiveMaxResults = input.maxResults === undefined ? 5 : Math.max(1, Math.min(input.maxResults, 10));
const effectiveQuery = input.query === undefined || input.query.trim() === "" ? "is:unread category:primary" : input.query.trim();
const effectiveSummarizeBody = input.summarize_body === undefined ? false : input.summarize_body;
const effectiveSummarizeLimit = input.summarize_limit === undefined ? 1 : Math.max(1, Math.min(input.summarize_limit, 3));
const userNameForResponse = input.context?.userName || "User";
const userId = input.context?.userId || input.userId;
const logPrefix = `[GoogleGmailReaderTool User:${userId?.substring(0,8)} Query:"${effectiveQuery.substring(0,20)}"]`;
const queryInputForStructuredData = { ...input, action: effectiveAction, maxResults: effectiveMaxResults, query: effectiveQuery, summarize_body: effectiveSummarizeBody, summarize_limit: effectiveSummarizeLimit };

if (abortSignal?.aborted) { return { error: "Email check cancelled.", result: "Cancelled.", structuredData: { result_type: "email_headers", source_api: "google_gmail", query: queryInputForStructuredData, emails: [], error: "Email check cancelled." } } as ToolOutput; }
if (!userId) return { error: "User ID missing.", result: `I need to know who you are, ${userNameForResponse}, to check your email.`, structuredData: { result_type: "email_headers", source_api: "google_gmail", query: queryInputForStructuredData, emails: [], error: "User ID missing" } } as ToolOutput;

const userState = input.context?.userState as UserState | null;
if (!userState?.googleemailenabled) {
  logger.warn(`${logPrefix} Permission denied: Google Email access not enabled by user.`);
  return { error: "Permission denied by user settings.", result: `Access to Google Email is not enabled in your settings, ${userNameForResponse}. Please enable it if you want me to check your emails.`, structuredData: { result_type: "permission_denied", source_api: "google_gmail", query: queryInputForStructuredData, message:"Google Email access not enabled by user.", error: "Permission denied by user settings" }} as ToolOutput;
}
logger.debug(`${logPrefix} Consent verified: Google Email access enabled.`);

let auth: OAuth2Client;
try {
  const refreshToken = await getGoogleRefreshToken(userId);
  if (!refreshToken) {
    logger.warn(`${logPrefix} No Google refresh token found or decryption failed.`);
    return { error: "Gmail not connected.", result: `Please connect your Gmail account in settings first, ${userNameForResponse}.`, structuredData: { result_type: "email_headers", source_api: "google_gmail", query: queryInputForStructuredData, emails: [], error: "Gmail not connected" } } as ToolOutput;
  }
  auth = getGoogleAuthClient(refreshToken);
} catch (authError: any) {
  logger.error(`${logPrefix} Authentication setup failed:`, authError.message);
  return { error: `Authentication setup failed: ${authError.message}`, result: `Sorry, ${userNameForResponse}, there was a problem setting up email access.`, structuredData: { result_type: "email_headers", source_api: "google_gmail", query: queryInputForStructuredData, emails: [], error: `Auth setup failed: ${authError.message}` } } as ToolOutput;
}

let outputStructuredData: EmailHeaderList = {
  result_type: "email_headers", source_api: "google_gmail",
  query: queryInputForStructuredData, emails: [], error: undefined,
};

try {
  const gmail = google.gmail({ version: "v1", auth });
  logger.info(`${logPrefix} Listing messages (Query: "${effectiveQuery}", Limit: ${effectiveMaxResults})...`);
  const listResponse = await gmail.users.messages.list({
    userId: "me", q: effectiveQuery, maxResults: Math.max(1, Math.min(effectiveMaxResults, 20)) 
  });

  if (abortSignal?.aborted) { return { error: "Email check cancelled.", result: "Cancelled.", structuredData: outputStructuredData } as ToolOutput; }
  const messages = listResponse.data.messages;
  if (!messages || messages.length === 0) {
    logger.info(`${logPrefix} No matching messages found.`);
    const queryDesc = effectiveQuery === "is:unread category:primary" ? "any new important emails" : `emails matching your criteria`;
    return { result: `Minato didn't find ${queryDesc} for you, ${userNameForResponse}, right now.`, structuredData: outputStructuredData } as ToolOutput;
  }

  logger.info(`${logPrefix} Found ${messages.length} IDs. Fetching metadata${effectiveSummarizeBody ? ` and bodies for up to ${effectiveSummarizeLimit}` : ""}...`);
  const detailPromises = messages.slice(0, effectiveMaxResults).map(async (msg, index) => {
    if (!msg.id) return null;
    const shouldFetchBody = effectiveSummarizeBody && index < effectiveSummarizeLimit;
    const format = shouldFetchBody ? 'full' : 'metadata';
    logger.debug(`${logPrefix} Fetching message ${msg.id.substring(0,6)}... (Index: ${index}, Format: ${format})`);
    try {
      const metaResponse = await gmail.users.messages.get({ userId: "me", id: msg.id, format: format, metadataHeaders: ["Subject", "From", "Date", "To", "Cc", "Message-ID"] });
      if (abortSignal?.aborted) return null;
      return metaResponse.data;
    } catch (getErr: any) {
      if (getErr.name === 'AbortError') { logger.warn(`${logPrefix} Aborted fetch for msg ${msg.id}.`); return null; }
      logger.warn(`${logPrefix} Failed get ${format} for msg ${msg.id}: ${getErr.message}`); return null;
    }
  });
  const settledDetailResults = await Promise.allSettled(detailPromises);
  if (abortSignal?.aborted) { return { error: "Email check cancelled.", result: "Cancelled.", structuredData: outputStructuredData } as ToolOutput; }

  const detailResults = settledDetailResults.filter(res => res.status === "fulfilled" && res.value !== null).map(res => (res as PromiseFulfilledResult<gmail_v1.Schema$Message | null>).value).filter((meta): meta is gmail_v1.Schema$Message => meta !== null && !!meta.id);
  if (detailResults.length === 0) {
    logger.warn(`${logPrefix} Found message IDs but failed to fetch details for any (or aborted).`);
    return { result: `Minato found some message IDs for ${userNameForResponse} but couldn't retrieve their details at this moment.`, structuredData: outputStructuredData } as ToolOutput;
  }

  const formattedEmails: EmailHeader[] = [];
  const summaryPromises: Promise<void>[] = [];
  const userLocale = input.context?.locale || 'en-US';

  for (let i = 0; i < detailResults.length; i++) {
      const meta = detailResults[i];
      const headers = meta.payload?.headers || [];
      const getHeader = (name: string): string | null => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || null;
      const fromRaw = getHeader("From") || "Unknown Sender";
      let fromClean = fromRaw;
      const match = fromRaw.match(/(?:\"?([^<"]*)\"?\s*)?<?([^>]+)?>?/);
      if (match && match[1] && match[1].trim()) fromClean = match[1].trim();
      else if (match && match[2]) fromClean = match[2].trim();
      
      let dateParsed: string | null = null;
      const dateRaw = getHeader("Date");
      if(dateRaw) { try { dateParsed = parseISO(dateRaw).toISOString(); } catch { dateParsed = dateRaw; } } // Store as ISO

      const emailHeader: EmailHeader = {
          id: meta.id!, threadId: meta.threadId || "unknown", subject: getHeader("Subject") || "(No Subject)",
          from: fromClean, fromRaw: fromRaw, to: getHeader("To"), cc: getHeader("Cc"), date: dateParsed, dateRaw: dateRaw,
          snippet: meta.snippet || null, messageIdHeader: getHeader("Message-ID"), bodySummary: null
      };
      formattedEmails.push(emailHeader);

      if (effectiveSummarizeBody && i < effectiveSummarizeLimit) {
          const bodyText = extractTextFromPayload(meta.payload);
          if (bodyText) {
              logger.debug(`${logPrefix} Extracted body text (len: ${bodyText.length}) for msg ${meta.id}. Summarizing...`);
              summaryPromises.push((async () => {
                  const summarySystemPrompt = `You are an AI assistant. Summarize the following email body concisely (1-2 sentences), focusing on the main points and call to action for ${userNameForResponse}. Keep it natural and informative. Email Body:\n"${bodyText.substring(0,3500)}..."`; // Truncate input to LLM
                  const summaryUserInput = "Provide the summary.";
                  const summaryResult = await generateResponseWithIntent(summarySystemPrompt, summaryUserInput, [], appConfig.openai.extractionModel, 100, userId); // Limit summary output
                  const targetEmail = formattedEmails.find(e => e.id === meta.id);
                  if (targetEmail) {
                      if ("responseText" in summaryResult && summaryResult.responseText) {
                          targetEmail.bodySummary = summaryResult.responseText.trim();
                          logger.debug(`${logPrefix} Body summarized for msg ${meta.id}: "${targetEmail.bodySummary.substring(0,50)}..."`);
                      } else {
                          logger.warn(`${logPrefix} Failed to summarize body for msg ${meta.id}: ${(summaryResult as any).error || 'No text in summary'}`);
                          targetEmail.bodySummary = "[Could not summarize body]";
                      }
                  }
              })());
          } else { logger.warn(`${logPrefix} Could not extract text body for summarization from msg ${meta.id}.`); const targetEmail = formattedEmails.find(e => e.id === meta.id); if (targetEmail) targetEmail.bodySummary = "[No text body found]"; }
      }
  }
  if (summaryPromises.length > 0) { logger.debug(`${logPrefix} Waiting for ${summaryPromises.length} body summaries...`); await Promise.allSettled(summaryPromises); logger.debug(`${logPrefix} All body summaries finished (or failed).`); }

  outputStructuredData.emails = formattedEmails;
  let resultString = "";
  if (formattedEmails.length === 0) {
    resultString = `Minato didn't find any emails for ${userNameForResponse} matching "${effectiveQuery}".`;
  } else if (formattedEmails.length === 1) {
    const e = formattedEmails[0];
    resultString = `Okay ${userNameForResponse}, I found one email about "${e.subject}" from ${e.from}.`;
    if (e.bodySummary && e.bodySummary !== "[Could not summarize body]" && e.bodySummary !== "[No text body found]") resultString += ` Here's a quick summary: ${e.bodySummary}`;
    else if(e.snippet) resultString += ` The snippet says: "${e.snippet.substring(0,100)}..."`;
  } else {
    resultString = `Alright ${userNameForResponse}, I found ${formattedEmails.length} emails matching your search for "${effectiveQuery}". The latest ones are:\n`;
    resultString += formattedEmails.slice(0,3).map(e => `- From ${e.from} about "${e.subject}"${e.bodySummary && e.bodySummary !== "[Could not summarize body]" && e.bodySummary !== "[No text body found]" ? ` (Summary: ${e.bodySummary.substring(0,40)}...)` : ""}`).join("\n");
    if(formattedEmails.length > 3) resultString += `\n...and ${formattedEmails.length - 3} more. I can show you the full list.`;
  }
  logger.info(`${logPrefix} Fetched details for ${formattedEmails.length} emails${effectiveSummarizeBody ? ` (summarized ${formattedEmails.filter(e => e.bodySummary && !e.bodySummary.startsWith("[")).length})` : ""}.`);
  return { result: resultString, structuredData: outputStructuredData } as ToolOutput;

} catch (error: any) {
  logger.error(`${logPrefix} Failed to fetch Gmail messages:`, error);
  const statusCode = error.response?.status;
  const apiErrorMessage = error.response?.data?.error?.message || error.message;
  outputStructuredData.error = `Google Gmail API Error: ${apiErrorMessage}`;
  if (error.name === 'AbortError') { outputStructuredData.error = "Request timed out."; return { error: "Email check timed out.", result: `Sorry, ${userNameForResponse}, checking email took too long.`, structuredData: outputStructuredData } as ToolOutput;}
  if (statusCode === 401 || (statusCode === 403 && (apiErrorMessage?.includes("invalid_grant") || apiErrorMessage?.includes("access_denied")))) {
    await handleGoogleAuthFailure(userId, `Auth Error (${statusCode}): ${apiErrorMessage}`);
    outputStructuredData.error = "Google authentication failed. Please reconnect your account.";
    return { error: outputStructuredData.error, result: `Minato couldn't access your Gmail, ${userNameForResponse}. Please try reconnecting it in settings.`, structuredData: outputStructuredData } as ToolOutput;
  } else if (statusCode === 403 && (apiErrorMessage?.includes("forbidden") || apiErrorMessage?.includes("insufficient permissions"))) {
    let permissionErrorMsg = "Permission denied by Google. Required scope (e.g., gmail.readonly) might be missing or revoked.";
    if(effectiveSummarizeBody) permissionErrorMsg = "Insufficient permissions to read email body content. Required scope (gmail.readonly) might be missing or revoked.";
    outputStructuredData.error = permissionErrorMsg;
    return { error: outputStructuredData.error, result: `It seems Minato doesn't have permission to access your emails anymore, ${userNameForResponse}. Please check connection settings.`, structuredData: outputStructuredData } as ToolOutput;
  }
  return { error: outputStructuredData.error, result: `Sorry, ${userNameForResponse}, there was an error accessing your email.`, structuredData: outputStructuredData } as ToolOutput;
}
}
}