// // FILE: lib/n8nClient.ts (CORRECTED)

// import { logger } from "@/memory-framework/config";
// import { appConfig } from "./config"; // To access N8N_URL and N8N_API_KEY indirectly if needed

// const n8nUrl = process.env.N8N_URL;
// const n8nApiKey = process.env.N8N_API_KEY;

// interface N8nExecutionResult {
//   success: boolean;
//   data?: any; // Type this more specifically if you know the expected output structure
//   error?: string;
//   executionId?: string | undefined; // n8n execution ID for debugging
// }

// /**
//  * Executes an n8n workflow via its API and waits for the result.
//  * Uses the 'wait' mechanism if available, otherwise polls (simplified here).
//  * IMPORTANT: For production, use webhook response or a proper polling/queue system instead of long waits.
//  *
//  * @param workflowId The ID of the n8n workflow to execute.
//  * @param inputData The data to send to the workflow's trigger node.
//  * @param waitTimeoutMs Max time to wait for synchronous execution (if supported by n8n version/config).
//  * @returns Promise<N8nExecutionResult>
//  */
// export async function executeN8nWorkflowSync(
//   workflowId: string,
//   inputData: Record<string, any>,
//   waitTimeoutMs: number = 30000 // 30 seconds default timeout for sync wait
// ): Promise<N8nExecutionResult> {
//   const logPrefix = `[n8nClient:${workflowId}]`;

//   if (!n8nUrl || !n8nApiKey) {
//     logger.error(`${logPrefix} N8N_URL or N8N_API_KEY is not configured.`);
//     return { success: false, error: "n8n connection is not configured.", executionId: undefined }; // Added executionId: undefined
//   }

//   // Prefer using workflow ID over webhook URLs for API execution
//   // const executionUrl = `${n8nUrl}/api/v1/workflows/${workflowId}/execute`; // Newer API endpoint
//   // Consider using the newer API if possible, check n8n docs for sync options
//   const executionUrl = `${n8nUrl}/api/v1/workflows/${workflowId}/execute?sync=true&timeout=${waitTimeoutMs}`; // Trying newer endpoint with sync

//   logger.info(
//     `${logPrefix} Triggering SYNC workflow execution via API: ${
//       executionUrl.split("?")[0]
//     }?sync=true...`
//   );
//   logger.debug(
//     `${logPrefix} Payload keys: ${Object.keys(inputData).join(", ")}`
//   );

//   try {
//     const response = await fetch(executionUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${n8nApiKey}`, // Ensure Bearer prefix if using API Key auth
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       body: JSON.stringify(inputData),
//       signal: AbortSignal.timeout(waitTimeoutMs + 2000) // Add buffer to fetch timeout
//     });

//     // Try getting execution ID from header (might vary based on n8n version/config)
//     const executionId = response.headers.get("x-n8n-execution-id") || undefined;
//     logger.debug(`${logPrefix} n8n Execution ID: ${executionId || "N/A"}`);

//     if (!response.ok) {
//       let errorBody = "Unknown error";
//       try {
//         errorBody = await response.text();
//       } catch {
//         /* ignore */
//       }
//       logger.error(
//         `${logPrefix} n8n API execution failed (${response.status}): ${errorBody}`
//       );
//       return {
//         success: false,
//         error: `n8n workflow execution failed (${response.status}). Response: ${errorBody.substring(0, 200)}`,
//         executionId, // Include executionId even on error if available
//       };
//     }

//     // Handle potential empty responses or different content types
//     const contentType = response.headers.get("content-type");
//     if (
//       response.status === 204 || // No Content
//       !contentType ||
//       !contentType.includes("application/json")
//     ) {
//       logger.info(
//         `${logPrefix} n8n workflow executed successfully (Status: ${response.status}, Non-JSON or empty response).`
//       );
//       // Check if status indicates data might be missing unexpectedly
//       if (response.status === 200) {
//         logger.warn(
//           `${logPrefix} Expected JSON response but received ${
//             contentType || "empty"
//           }. Returning success with null data.`
//         );
//         return { success: true, data: null, executionId }; // Indicate success but no data
//       }
//       return { success: true, data: null, executionId }; // Success for 204 or non-JSON 200
//     }

//     // Parse successful JSON response
//     const resultData = await response.json();
//     logger.info(
//       `${logPrefix} n8n workflow executed successfully and returned data.`
//     );
//     logger.debug(
//       `${logPrefix} n8n Result Data (sample):`,
//       JSON.stringify(resultData)?.substring(0, 200)
//     );

//     // Adapt this based on how your *specific* n8n workflow is designed to output results
//     // n8n sync execution often returns an array of results from the last node(s).
//     // Or it might return a specific structure depending on the 'Respond to Webhook' node settings.
//     // Assuming the desired output is the last item if it's an array.
//     const finalOutput = Array.isArray(resultData) && resultData.length > 0
//       ? resultData[resultData.length - 1] // Get last node's data if array
//       : resultData; // Otherwise assume the whole object is the result

//     return { success: true, data: finalOutput, executionId };
//   } catch (error: any) {
//     if (error.name === 'AbortError') {
//         logger.error(`${logPrefix} n8n API request timed out after ${waitTimeoutMs}ms.`);
//         return {
//           success: false,
//           error: `Failed to communicate with n8n: Request timed out (${waitTimeoutMs}ms).`,
//           executionId: undefined,
//         };
//     }
//     logger.error(`${logPrefix} Error calling n8n API: ${error.message}`, error);
//     return {
//       success: false,
//       error: `Failed to communicate with n8n: ${error.message}`,
//       executionId: undefined, // Set to undefined on catch
//     };
//   }
// }

// // --- Optional: Asynchronous Trigger ---
// // Use this if your workflow takes longer and you don't need immediate results
// export async function triggerN8nWorkflowAsync(
//   workflowId: string,
//   inputData: Record<string, any>
// ): Promise<{ data: null; success: boolean; executionId?: string; error?: string }> {
//   const logPrefix = `[n8nClientAsync:${workflowId}]`;
//   if (!n8nUrl || !n8nApiKey) {
//     logger.error(`${logPrefix} N8N_URL or N8N_API_KEY is not configured.`);
//     // Corrected: Include data: null
//     return { data: null, success: false, error: "n8n connection is not configured." };
//   }

//   // Prefer the newer API endpoint for triggering async workflows
//   const executionUrl = `${n8nUrl}/api/v1/workflows/${workflowId}/execute`;

//   logger.info(
//     `${logPrefix} Triggering ASYNC workflow execution via API: ${executionUrl}...`
//   );
//   logger.debug(
//     `${logPrefix} Payload keys: ${Object.keys(inputData).join(", ")}`
//   );

//   try {
//     const response = await fetch(executionUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${n8nApiKey}`, // Ensure Bearer prefix if using API Key auth
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(inputData),
//       signal: AbortSignal.timeout(10000) // Shorter timeout for async trigger
//     });

//     // Handle non-OK responses (including non-202 Accepted)
//     if (!response.ok && response.status !== 202) {
//       const errorText = await response.text();
//       logger.error(
//         `${logPrefix} n8n async trigger failed (${response.status}): ${errorText}`
//       );
//       throw new Error(`n8n async trigger failed (${response.status})`);
//     }

//     // Try to parse response even for 202, might contain execution ID
//     const responseData = await response.json().catch(() => ({}));
//     const executionId =
//       responseData?.executionId || response.headers.get("x-n8n-execution-id") || undefined; // Default to undefined

//     logger.info(
//       `${logPrefix} n8n workflow triggered asynchronously. Status: ${response.status}, Execution ID: ${
//         executionId || "N/A"
//       }`
//     );
//     // Corrected: Include data: null
//     return { data: null, success: true, executionId };
//   } catch (error: any) {
//      if (error.name === 'AbortError') {
//          logger.error(`${logPrefix} n8n async trigger request timed out.`);
//          return {
//            data: null,
//            success: false,
//            error: `Failed to trigger n8n workflow: Request timed out.`,
//          };
//      }
//     logger.error(
//       `${logPrefix} Error calling n8n async API: ${error.message}`,
//       error
//     );
//     // Corrected: Include data: null
//     return {
//       data: null,
//       success: false,
//       error: `Failed to trigger n8n workflow: ${error.message}`,
//     };
//   }
// }