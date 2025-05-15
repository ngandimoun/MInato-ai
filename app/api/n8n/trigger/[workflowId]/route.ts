// // FILE: app/api/n8n/trigger/[workflowId]/route.ts
// // Unified version based on the second provided code block (using async/sync n8n client).

// import { NextRequest, NextResponse } from "next/server";
// import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// import { cookies } from "next/headers";
// import { SupabaseDB, supabaseAdmin } from "@/lib/supabaseClient"; // Ensure supabaseAdmin is imported
// import { logger } from "@/memory-framework/config";
// import { decryptData } from "@/lib/utils/encryption";
// import { appConfig } from "@/lib/config";
// import { UserState } from "@/lib/types";
// import {
//   triggerN8nWorkflowAsync,
//   executeN8nWorkflowSync,
// } from "@/lib/n8nClient"; // Import n8n client functions
// import { randomUUID } from "crypto"; // For generating task IDs

// interface RouteParams {
//   params: { workflowId: string };
// }

// // Helper to get User ID from Supabase session (Remains unchanged)
// async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
//   const cookieStore = cookies();
//   try {
//     const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
//     const {
//       data: { session },
//       error,
//     } = await supabase.auth.getSession();
//     if (error || !session?.user?.id) {
//       logger.warn(
//         `[API n8n Trigger GetUserID] Failed to get session or user ID: ${error?.message}`
//       );
//       return null;
//     }
//     return session.user.id;
//   } catch (e: any) {
//     logger.error(`[API n8n Trigger GetUserID] Exception getting user ID:`, e);
//     return null;
//   }
// }

// // Helper to get necessary OAuth token (Remains unchanged, ensure implementation covers needed providers)
// async function getRequiredToken(
//   userId: string,
//   provider: "google" | "fitbit" | string
// ): Promise<string | null> {
//   // Placeholder: Add logic for other providers if needed
//   if (provider !== "google" && provider !== "fitbit") {
//     // Example check
//     logger.warn(
//       `[API n8n Trigger GetToken] Token fetching logic not implemented for provider: ${provider}`
//     );
//     return null;
//   }
//   const logPrefix = `[API n8n Trigger GetToken User:${userId?.substring(
//     0,
//     8
//   )} Provider:${provider}]`;
//   if (!userId || !supabaseAdmin || !appConfig.encryptionKey) {
//     logger.error(
//       `${logPrefix} Missing prerequisites (userId, supabaseAdmin, or encryptionKey)`
//     );
//     return null;
//   }
//   try {
//     const { data, error } = await supabaseAdmin
//       .from("user_integrations")
//       .select("refresh_token_encrypted")
//       .eq("user_id", userId)
//       .eq("provider", provider) // Use the provider variable
//       .maybeSingle();

//     if (error) {
//       logger.error(
//         `${logPrefix} Error fetching token from DB: ${error.message}`
//       );
//       return null;
//     }
//     if (!data?.refresh_token_encrypted) {
//       logger.warn(
//         `${logPrefix} No encrypted token found for this user and provider.`
//       );
//       return null;
//     }
//     const decryptedToken = await decryptData(
//       data.refresh_token_encrypted,
//       appConfig.encryptionKey
//     );
//     if (!decryptedToken) {
//       logger.error(`${logPrefix} Failed to decrypt token.`);
//       return null;
//     }
//     // Potentially add logic here to *refresh* the access token using the refresh token if needed by n8n
//     // For now, assuming n8n handles refresh or the stored token is sufficient (e.g., refresh token itself)
//     return decryptedToken; // Returning the refresh token here based on original logic
//   } catch (e: any) {
//     logger.error(`${logPrefix} Exception fetching or decrypting token:`, e);
//     return null;
//   }
// }

// export async function POST(req: NextRequest, { params }: RouteParams) {
//   const { workflowId } = params;
//   const logPrefix = `[API n8n Trigger:${workflowId}]`;
//   const cookieStore = cookies(); // Need to get cookies instance for the helper
//   const userId = await getUserIdFromRequest(req);

//   if (!userId) {
//     logger.warn(`${logPrefix} Unauthorized access attempt.`);
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }
//   const userLogPrefix = `${logPrefix} User:${userId.substring(0, 8)}`;

//   // Get n8n configuration from environment variables
//   const n8nWorkflowApiId =
//     process.env[`N8N_WORKFLOW_ID_${workflowId.toUpperCase()}`]; // Preferred method
//   const n8nWebhookUrl =
//     process.env[`N8N_WEBHOOK_URL_${workflowId.toUpperCase()}`]; // Fallback/Reference

//   // Check if essential n8n config is present
//   if (!n8nWorkflowApiId) {
//     // If API ID is missing, we cannot use the preferred API method.
//     // You *could* fallback to the webhook URL here if the first version's logic is still desired as a backup,
//     // but the second version strongly implies moving away from direct webhook calls from here.
//     logger.error(
//       `${userLogPrefix} n8n workflow ID (N8N_WORKFLOW_ID_${workflowId.toUpperCase()}) not found in environment variables. Cannot trigger via API.`
//     );
//     // Log if the webhook exists as an alternative, but still return error based on the new preferred path
//     if (n8nWebhookUrl) {
//       logger.warn(
//         `${userLogPrefix} Webhook URL (N8N_WEBHOOK_URL_${workflowId.toUpperCase()}) exists, but API ID is preferred and missing.`
//       );
//     }
//     return NextResponse.json(
//       { error: "Workflow API endpoint not configured." },
//       { status: 500 }
//     );
//   }
//   if (!process.env.N8N_URL || !process.env.N8N_API_KEY) {
//     logger.error(
//       `${userLogPrefix} N8N_URL or N8N_API_KEY is not configured. Cannot trigger workflows via API.`
//     );
//     return NextResponse.json(
//       { error: "n8n connection is not configured on server." },
//       { status: 500 }
//     );
//   }

//   try {
//     // Parse request body (allow empty for simple triggers)
//     const requestBody = await req.json().catch((e) => {
//       logger.debug(
//         `${userLogPrefix} Failed to parse JSON body, assuming empty: ${e.message}`
//       );
//       return {};
//     });
//     const userState: UserState | null = await SupabaseDB.getUserState(userId);

//     // Generate a unique Task ID for tracking this specific trigger instance
//     const taskId = `minato_${workflowId}_${randomUUID()}`;

//     // Prepare the payload to send to the n8n workflow
//     const n8nPayload: Record<string, any> = {
//       userId: userId,
//       taskId: taskId, // Include the Minato-generated task ID for traceability
//       triggerData: requestBody, // Data sent from the client
//       userState: userState
//         ? {
//             // Pass relevant, non-sensitive user state
//             preferred_locale: userState.preferred_locale,
//             latitude: userState.latitude,
//             longitude: userState.longitude,
//             timezone: userState.timezone,
//             country_code: userState.country_code,
//             // Include workflow preferences if available in user state
//             workflow_preferences: userState.workflow_preferences,
//           }
//         : {},
//       // --- Inject necessary tokens based on workflow ID ---
//       // Use includes for more flexibility, but ensure IDs are distinct enough
//       ...(workflowId.toUpperCase().includes("GOOGLE") && {
//         injectedGoogleToken: await getRequiredToken(userId, "google"),
//       }),
//       ...(workflowId.toUpperCase().includes("FITBIT") && {
//         injectedFitbitToken: await getRequiredToken(userId, "fitbit"),
//       }),
//       // Add more mappings here for other workflows requiring tokens
//       // e.g., ...(workflowId.toUpperCase().includes('NOTION') && { injectedNotionToken: await getRequiredToken(userId, 'notion') }),
//     };

//     // Clean up any null/undefined injected tokens before sending
//     Object.keys(n8nPayload).forEach((key) => {
//       if (key.startsWith("injected") && !n8nPayload[key]) {
//         logger.warn(
//           `${userLogPrefix} Token for key '${key}' was requested but not found or failed to fetch/decrypt. Removing from payload.`
//         );
//         delete n8nPayload[key];
//       }
//     });

//     // --- Decide whether to run workflow synchronously or asynchronously ---
//     // Heuristic: Workflows involving analysis, reporting, web watching, or content fetching are often longer. Adjust keywords as needed.
//     const isPotentiallyLongRunning =
//       workflowId.toUpperCase().includes("ANALYSIS") ||
//       workflowId.toUpperCase().includes("REPORT") ||
//       workflowId.toUpperCase().includes("RADAR") ||
//       workflowId.toUpperCase().includes("WATCHER") ||
//       workflowId.toUpperCase().includes("FETCH") || // Consider fetches long-running too
//       workflowId.toUpperCase().includes("SUMMARY"); // Summarization can be long

//     let n8nResult;

//     if (isPotentiallyLongRunning) {
//       // Trigger ASYNCHRONOUSLY: Fire-and-forget from the API route perspective.
//       // n8n runs in the background. We need a mechanism (like n8n calling back or polling) to get the result later.
//       logger.info(
//         `${userLogPrefix} Triggering ASYNC n8n workflow. Task ID: ${taskId}, Payload Keys: ${Object.keys(
//           n8nPayload
//         ).join(", ")}`
//       );
//       n8nResult = await triggerN8nWorkflowAsync(n8nWorkflowApiId, n8nPayload);
//     } else {
//       // Execute SYNCHRONOUSLY: Wait for n8n to finish and return a result directly.
//       // Suitable for quick tasks like simple lookups, data transformations, or short API calls.
//       logger.info(
//         `${userLogPrefix} Triggering SYNC n8n workflow. Task ID: ${taskId}, Payload Keys: ${Object.keys(
//           n8nPayload
//         ).join(", ")}`
//       );
//       // Use a reasonable timeout for synchronous operations (e.g., 20-30 seconds)
//       const syncTimeoutMs = 25000;
//       n8nResult = await executeN8nWorkflowSync(
//         n8nWorkflowApiId,
//         n8nPayload,
//         syncTimeoutMs
//       );
//     }

//     // --- Handle the response from the n8n client function ---
//     if (!n8nResult.success || n8nResult.error) {
//       const errorMsg = `n8n workflow ${
//         isPotentiallyLongRunning ? "trigger (async)" : "execution (sync)"
//       } failed: ${n8nResult.error || "Unknown n8n error"}`;
//       logger.error(
//         `${userLogPrefix} ${errorMsg} (n8n Execution ID: ${
//           n8nResult.executionId || "N/A"
//         })`
//       );
//       // Return a 502 Bad Gateway error as our server failed to get a valid response from the upstream (n8n)
//       return NextResponse.json(
//         { error: errorMsg, taskId: taskId, executionId: n8nResult.executionId },
//         { status: 502 }
//       );
//     }

//     logger.info(
//       `${userLogPrefix} n8n workflow ${
//         isPotentiallyLongRunning
//           ? "triggered asynchronously"
//           : "executed synchronously"
//       } successfully. Task ID: ${taskId}, n8n Exec ID: ${
//         n8nResult.executionId || "N/A"
//       }`
//     );

//     // --- Format the response to the client ---
//     if (!isPotentiallyLongRunning) {
//       // Synchronous execution: Return success, task details, and any data returned by the workflow.
//       return NextResponse.json({
//         success: true,
//         taskId: taskId,
//         executionId: n8nResult.executionId,
//         message: `Workflow ${workflowId} completed successfully.`,
//         data: n8nResult.data || null, // Forward data from n8n if it exists
//       });
//     } else {
//       // Asynchronous trigger: Confirm the task has started.
//       // The client will need to be notified later when the actual work is done (e.g., via WebSockets, SSE, or polling).
//       return NextResponse.json({
//         success: true,
//         taskId: taskId,
//         executionId: n8nResult.executionId, // n8n execution ID if available from trigger response
//         message: `Task ${workflowId} started successfully. You will be notified upon completion.`, // Or a more specific message
//         // No 'data' here as the workflow hasn't finished yet.
//       });
//     }
//   } catch (error: any) {
//     // Catch unexpected errors during payload prep, token fetching, or calling n8n client
//     logger.error(`${userLogPrefix} Unhandled error in trigger route:`, error);
//     return NextResponse.json(
//       { error: `Failed to trigger workflow: ${error.message}` },
//       { status: 500 }
//     );
//   }
// }
