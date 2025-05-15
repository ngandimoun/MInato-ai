// // FILE: app/api/cron/reminders/route.ts
// // Updated to trigger n8n workflow via API for sending notifications

// import { NextRequest, NextResponse } from "next/server";
// import { SupabaseDB } from "@/lib/supabaseClient"; // Use admin client implicitly via SupabaseDB
// import { CompanionCoreMemory } from "@/memory-framework/core/CompanionCoreMemory";
// import { config as frameworkConfig, logger } from "@/memory-framework/config";
// import { StoredMemoryUnit, UserPushSubscription } from "@/lib/types";
// import {
//   executeN8nWorkflowSync,
//   triggerN8nWorkflowAsync,
// } from "@/lib/n8nClient"; // Import n8n client helper

// // VAPID keys are configured *within the n8n Web Push node* or n8n credentials, not here.

// function authenticateCronRequest(req: NextRequest): boolean {
//   const cronSecret = process.env.CRON_SECRET;
//   if (!cronSecret) {
//     logger.error(
//       "[Cron Reminders Auth] CRON_SECRET environment variable is not set."
//     );
//     return false;
//   }
//   const authHeader = req.headers.get("Authorization");
//   const success = authHeader === `Bearer ${cronSecret}`;
//   if (!success)
//     logger.warn("[Cron Reminders Auth] Cron secret mismatch or missing.");
//   return success;
// }

// // Define the Workflow ID from environment variables
// const NOTIFICATION_WORKFLOW_ID = process.env.N8N_WORKFLOW_ID_SEND_NOTIFICATION;

// export async function GET(req: NextRequest) {
//   const logPrefix = "[Cron Reminders API]";

//   if (!authenticateCronRequest(req)) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   if (!NOTIFICATION_WORKFLOW_ID) {
//     logger.error(
//       `${logPrefix} N8N_WORKFLOW_ID_SEND_NOTIFICATION is not configured. Cannot send reminders via n8n.`
//     );
//     return NextResponse.json(
//       { error: "Notification workflow not configured on server" },
//       { status: 500 }
//     );
//   }
//   if (!process.env.N8N_URL || !process.env.N8N_API_KEY) {
//     logger.error(
//       `${logPrefix} N8N_URL or N8N_API_KEY is not configured. Cannot trigger workflows.`
//     );
//     return NextResponse.json(
//       { error: "n8n connection is not configured on server." },
//       { status: 500 }
//     );
//   }

//   const memoryFramework = new CompanionCoreMemory();
//   const nowISO = new Date().toISOString();
//   let remindersFetched = 0;
//   let remindersProcessed = 0;
//   let usersWithReminders = new Set<string>();
//   let n8nTriggerErrors = 0;
//   let n8nExecutionErrors = 0;
//   let dbErrors = 0;
//   let successCount = 0;

//   try {
//     logger.info(
//       `${logPrefix} --- Cron Job Started: Checking for due reminders before ${nowISO} ---`
//     );

//     const dueReminders: StoredMemoryUnit[] | null =
//       await memoryFramework.getDueReminders(nowISO);
//     if (dueReminders === null) {
//       logger.error(`${logPrefix} Failed to query due reminders from database.`);
//       dbErrors++;
//       throw new Error("Database error during reminder query.");
//     }
//     remindersFetched = dueReminders.length;
//     if (remindersFetched === 0) {
//       logger.info(`${logPrefix} No pending reminders found.`);
//       return NextResponse.json({
//         message: "No pending reminders found.",
//         processed: 0,
//       });
//     }
//     logger.info(
//       `${logPrefix} Found ${remindersFetched} potentially due reminders.`
//     );

//     const remindersByUser: { [userId: string]: StoredMemoryUnit[] } = {};
//     for (const reminder of dueReminders) {
//       if (!remindersByUser[reminder.user_id])
//         remindersByUser[reminder.user_id] = [];
//       remindersByUser[reminder.user_id].push(reminder);
//       usersWithReminders.add(reminder.user_id);
//     }

//     const allPromises: Promise<void>[] = [];

//     for (const userId in remindersByUser) {
//       const userReminders = remindersByUser[userId];
//       logger.info(
//         `${logPrefix} Processing ${
//           userReminders.length
//         } reminder(s) for User ${userId.substring(0, 8)} via n8n...`
//       );

//       const subscriptions = await SupabaseDB.getPushSubscriptions(userId);
//       if (!subscriptions || subscriptions.length === 0) {
//         logger.warn(
//           `${logPrefix} User ${userId.substring(
//             0,
//             8
//           )} has due reminders but no push subscriptions found. Marking as error.`
//         );
//         for (const reminder of userReminders) {
//           remindersProcessed++;
//           allPromises.push(
//             memoryFramework.updateReminderStatus(
//               reminder.memory_id,
//               "error",
//               "User has no registered devices."
//             )
//           );
//         }
//         continue;
//       }

//       logger.debug(
//         `${logPrefix} Found ${
//           subscriptions.length
//         } subscription(s) for User ${userId.substring(0, 8)}.`
//       );

//       for (const reminder of userReminders) {
//         remindersProcessed++;
//         const n8nPayload = {
//           userId: userId,
//           reminderId: reminder.memory_id,
//           reminderContent: reminder.content,
//           reminderTriggerTime:
//             reminder.metadata?.reminder_details?.trigger_datetime,
//           pushSubscriptions: subscriptions, // Send all subs for this user
//         };

//         // Use async trigger and forget - n8n workflow handles sending & error logging internally
//         allPromises.push(
//           triggerN8nWorkflowAsync(NOTIFICATION_WORKFLOW_ID, n8nPayload)
//             .then(async (result) => {
//               if (!result.success || result.error) {
//                 n8nTriggerErrors++;
//                 const errorMsg = `n8n trigger failed for reminder ${reminder.memory_id.substring(
//                   0,
//                   6
//                 )}: ${result.error || "Unknown n8n error"}`;
//                 logger.error(`${logPrefix} ${errorMsg}`);
//                 await memoryFramework.updateReminderStatus(
//                   reminder.memory_id,
//                   "error",
//                   errorMsg.substring(0, 250)
//                 );
//               } else {
//                 successCount++;
//                 logger.info(
//                   `${logPrefix} Successfully triggered n8n notification workflow for reminder ${reminder.memory_id.substring(
//                     0,
//                     6
//                   )}. Execution ID: ${result.executionId || "N/A"}`
//                 );
//                 // Mark as 'sent' optimistically - n8n should handle actual send errors.
//                 await memoryFramework.updateReminderStatus(
//                   reminder.memory_id,
//                   "sent"
//                 );
//               }
//             })
//             .catch(async (err) => {
//               // Catch errors from the trigger function itself
//               n8nTriggerErrors++;
//               const errorMsg = `Exception triggering n8n for reminder ${reminder.memory_id.substring(
//                 0,
//                 6
//               )}: ${err.message}`;
//               logger.error(`${logPrefix} ${errorMsg}`);
//               await memoryFramework.updateReminderStatus(
//                 reminder.memory_id,
//                 "error",
//                 errorMsg.substring(0, 250)
//               );
//             })
//         );
//       } // End loop through user's reminders
//     } // End loop through users

//     // Wait for all trigger attempts and DB updates to settle
//     await Promise.allSettled(allPromises);

//     logger.info(
//       `${logPrefix} --- Cron Job Finished. Fetched: ${remindersFetched}, Processed: ${remindersProcessed}, Users Involved: ${usersWithReminders.size}, n8n Trigger Errors: ${n8nTriggerErrors}, Successful Triggers: ${successCount}, DB Errors: ${dbErrors} ---`
//     );
//     return NextResponse.json({
//       message: `Attempted processing ${remindersProcessed} reminders for ${usersWithReminders.size} users via n8n.`,
//       processed: remindersProcessed,
//       successful_triggers: successCount,
//       n8n_trigger_errors: n8nTriggerErrors,
//       db_errors: dbErrors,
//     });
//   } catch (error: any) {
//     logger.error(`${logPrefix} UNHANDLED EXCEPTION in Cron Job:`, error);
//     return NextResponse.json(
//       { error: `Cron job failed: ${error.message}` },
//       { status: 500 }
//     );
//   }
// }
