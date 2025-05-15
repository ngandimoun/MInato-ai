// // FILE: app/api/tasks/callback/route.ts
// // Receives results/status updates from n8n workflows
// // Implemented DB update (assuming 'user_tasks' table) and Supabase Realtime notification

// import { NextRequest, NextResponse } from "next/server";
// import { supabaseAdmin, SupabaseDB } from "@/lib/supabaseClient"; // Use Admin for DB writes and Realtime
// import { logger } from "@/memory-framework/config";

// // Secret used by n8n HTTP Request node's authentication header to verify the call
// const N8N_CALLBACK_SECRET = process.env.N8N_CALLBACK_SECRET;

// // Define the structure for the user_tasks table (adjust as needed)
// interface UserTask {
//   id: string; // Primary Key (Minato-generated taskId)
//   user_id: string; // Foreign Key to auth.users
//   created_at: string;
//   completed_at?: string | null;
//   status: "pending" | "running" | "completed" | "failed";
//   workflow_id?: string | null; // Optional: n8n workflow ID
//   n8n_execution_id?: string | null; // Optional: n8n execution ID
//   input_data?: Record<string, any> | null; // Optional: Store initial input
//   result?: Record<string, any> | null; // Store results as JSONB
//   error_message?: string | null;
// }

// export async function POST(req: NextRequest) {
//   const logPrefix = "[API TaskCallback]";

//   // 1. Authenticate the n8n Request
//   const authorization = req.headers.get("Authorization");
//   if (!N8N_CALLBACK_SECRET) {
//     logger.error(
//       `${logPrefix} N8N_CALLBACK_SECRET is not set. Cannot process callbacks.`
//     );
//     return NextResponse.json(
//       { error: "Callback endpoint misconfigured." },
//       { status: 500 }
//     );
//   }
//   if (authorization !== `Bearer ${N8N_CALLBACK_SECRET}`) {
//     logger.warn(
//       `${logPrefix} Invalid or missing authorization header from n8n.`
//     );
//     return NextResponse.json(
//       { error: "Unauthorized callback." },
//       { status: 401 }
//     );
//   }

//   // 2. Parse the incoming data from n8n
//   let n8nResultPayload: {
//     userId: string;
//     taskId: string; // Expect Minato-generated taskId to be passed back
//     n8nExecutionId?: string;
//     status: "success" | "error";
//     resultData?: any;
//     errorMessage?: string;
//     workflowId?: string;
//   };

//   try {
//     n8nResultPayload = await req.json();
//     // **Require taskId for reliable updates**
//     if (!n8nResultPayload.userId || !n8nResultPayload.taskId) {
//       throw new Error("Missing 'userId' or 'taskId' in n8n callback payload.");
//     }
//     if (!n8nResultPayload.status) {
//       throw new Error("Missing 'status' in n8n callback payload.");
//     }
//     logger.info(
//       `${logPrefix} Received callback for User: ${n8nResultPayload.userId.substring(
//         0,
//         8
//       )}, TaskID: ${n8nResultPayload.taskId}, Status: ${
//         n8nResultPayload.status
//       }`
//     );
//     logger.debug(
//       `${logPrefix} Full Payload:`,
//       JSON.stringify(n8nResultPayload).substring(0, 500)
//     );
//   } catch (e: any) {
//     logger.error(`${logPrefix} Invalid JSON body from n8n:`, e.message);
//     return NextResponse.json(
//       { error: "Invalid callback payload." },
//       { status: 400 }
//     );
//   }

//   const {
//     userId,
//     taskId,
//     n8nExecutionId,
//     status,
//     resultData,
//     errorMessage,
//     workflowId,
//   } = n8nResultPayload;

//   try {
//     // 3. Update Task Status and Store Result in Database
//     if (supabaseAdmin) {
//       logger.info(
//         `${logPrefix} Updating task ${taskId} status to '${status}' in DB for user ${userId.substring(
//           0,
//           8
//         )}.`
//       );
//       const updatePayload: Partial<UserTask> = {
//         status: status === "success" ? "completed" : "failed",
//         result: resultData ? resultData : null, // Store result directly (ensure column type is JSONB)
//         error_message: errorMessage,
//         completed_at: new Date().toISOString(),
//         n8n_execution_id: n8nExecutionId,
//       };

//       // Assuming you have a 'user_tasks' table with 'id' (PK) and 'user_id' columns
//       const { error: updateError } = await supabaseAdmin
//         .from("user_tasks") // Replace with your actual table name
//         .update(updatePayload)
//         .eq("id", taskId)
//         .eq("user_id", userId); // Ensure user owns the task

//       if (updateError) {
//         // Log error, but continue to attempt notification
//         logger.error(
//           `${logPrefix} Failed to update task status in DB for Task ID ${taskId}:`,
//           updateError
//         );
//         // Consider how critical DB update failure is - should it stop the notification? Maybe not.
//       } else {
//         logger.info(
//           `${logPrefix} Task ${taskId} status updated successfully to ${status}.`
//         );
//       }
//     } else {
//       logger.error(
//         `${logPrefix} Supabase Admin client not available. Cannot update task status in DB.`
//       );
//       // Proceed with notification attempt anyway? Or return error? Let's proceed.
//     }

//     // 4. Notify the User via Supabase Realtime
//     const notificationPayload = {
//       type: "TASK_UPDATE", // Use a specific event type
//       taskId: taskId,
//       executionId: n8nExecutionId,
//       workflowId: workflowId,
//       status: status,
//       message:
//         status === "success"
//           ? `Your task '${workflowId || taskId}' is complete!`
//           : `There was an issue with your task '${workflowId || taskId}': ${
//               errorMessage || "Unknown error"
//             }`,
//       // Optionally include resultData if needed by the UI notification
//       resultData: status === "success" ? resultData : null, // Send results only on success
//     };

//     if (supabaseAdmin) {
//       const channelName = `user-updates:${userId}`; // Use a specific channel pattern per user
//       const channel = supabaseAdmin.channel(channelName);
//       try {
//         // Send the notification payload on the user-specific channel
//         const realtimeResponse = await channel.send({
//           type: "broadcast",
//           event: "n8n_task_update", // Specific event name
//           payload: notificationPayload,
//         });
//         if (realtimeResponse === "ok") {
//           logger.info(
//             `${logPrefix} Sent Supabase Realtime notification to channel: ${channelName}`
//           );
//         } else {
//           logger.error(
//             `${logPrefix} Failed to send Supabase Realtime notification to ${channelName}. Response: ${realtimeResponse}`
//           );
//           // Fallback or logging needed here
//         }
//       } catch (realtimeError: any) {
//         logger.error(
//           `${logPrefix} Exception sending Supabase Realtime notification to ${channelName}:`,
//           realtimeError
//         );
//         // Fallback or logging needed here
//       }
//       // It's good practice to remove the channel reference if not needed anymore,
//       // though Supabase might handle this internally. Check docs if issues arise.
//       // supabaseAdmin.removeChannel(channel);
//     } else {
//       logger.error(
//         `${logPrefix} Supabase Admin client not available. Cannot send Realtime notification.`
//       );
//     }

//     // **Alternative: Web Push (If you want to implement it here instead of n8n)**
//     // This would require fetching subscriptions again and using web-push library
//     // const subscriptions = await SupabaseDB.getPushSubscriptions(userId);
//     // if (subscriptions && subscriptions.length > 0) {
//     //     // ... webPush.sendNotification logic ...
//     // }

//     // **Alternative: DB Flag (Simplest, requires frontend polling)**
//     // await SupabaseDB.updateState(userId, { has_new_task_update: true });
//     // logger.info(`${logPrefix} Set new_task_update flag for user ${userId}`);

//     // 5. Respond to n8n
//     logger.info(`${logPrefix} Acknowledging callback receipt to n8n.`);
//     return NextResponse.json({ message: "Callback received and processed." });
//   } catch (error: any) {
//     logger.error(
//       `${logPrefix} Error processing n8n callback for user ${userId}:`,
//       error
//     );
//     // Return 500 so n8n knows processing failed and might retry
//     return NextResponse.json(
//       { error: `Internal Server Error: ${error.message}` },
//       { status: 500 }
//     );
//   }
// }
