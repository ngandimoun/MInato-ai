// supabase/functions/reminder-service/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Note: Resend is kept as per original code, but Web Push is recommended
import { Resend } from 'https://esm.sh/resend@3.2.0';
import { addDays, addWeeks, addMonths, addYears, formatISO } from 'https://esm.sh/date-fns@2.30.0';

// --- Type Imports (Subset relevant here) ---
// Ideally, share types from the main project if possible, otherwise redefine minimally.
interface ReminderDetails {
    is_reminder: true; original_content: string; trigger_datetime: string;
    recurrence_rule: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    status: 'pending' | 'sent' | 'error' | 'acknowledged' | 'cancelled';
    last_sent_at?: string | null; error_message?: string | null;
}
interface MemoryRecord { // Simplified representation of what's needed from the DB record
    id: string; // Memory UUID
    user_id: string;
    metadata: Record<string, any> & { reminder_details?: ReminderDetails };
}
interface UserProfile { id: string; email?: string | null; first_name?: string | null; }
interface UserState { user_id: string; push_subscriptions?: UserPushSubscription[] | null; preferred_locale?: string | null; } // Added state for subscriptions/locale
interface UserPushSubscription { endpoint: string; keys: { p256dh: string; auth: string; }; }

// --- Environment Variables ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY'); // Kept for email fallback/option
const EMAIL_FROM_ADDRESS = Deno.env.get('EMAIL_FROM_ADDRESS') || "Minato Reminders <noreply@yourverifieddomain.com>"; // Needs verified Resend domain
const EDGE_FUNCTION_SECRET = Deno.env.get('EDGE_FUNCTION_SECRET');
// Required for Web Push (Store securely, e.g., in Supabase Vault or env vars)
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || "mailto:yourapp@support.com"; // Contact info for push service

// --- Initialize Clients ---
let supabaseAdmin: SupabaseClient | null = null;
let resend: Resend | null = null;
let webPushInitialized = false;
const logPrefix = "[Edge ReminderService]";

try {
    // Validate required env vars
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !EDGE_FUNCTION_SECRET) {
        throw new Error("Missing Supabase URL/Service Key or Edge Function Secret.");
    }
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn(`${logPrefix} VAPID Keys missing. Web Push notifications disabled.`);
    } else {
         // TODO: Initialize web-push library here if using it directly in Deno (might require compatibility check or alternative)
         // import webpush from 'npm:web-push'; // Example if using npm specifier
         // webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
         console.log(`${logPrefix} Web Push VAPID details configured (library initialization needed).`);
         webPushInitialized = true; // Assume initialization is possible
    }
     // Initialize Resend if key is present (optional fallback/alternative)
    if (RESEND_API_KEY) {
        resend = new Resend(RESEND_API_KEY);
        console.log(`${logPrefix} Resend client initialized.`);
    } else {
         console.warn(`${logPrefix} Resend API Key missing. Email reminders disabled.`);
    }

    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
    console.log(`${logPrefix} Supabase Admin client initialized.`);

} catch (initError) {
    console.error(`${logPrefix} CRITICAL Initialization Error:`, (initError instanceof Error ? initError.message : String(initError)));
}

// --- Helper: Calculate Next Trigger Time (Keep as is) ---
function calculateNextTrigger(currentTriggerISO: string, rule: ReminderDetails['recurrence_rule']): string | null {
    if (!rule) return null;
    try {
        const currentTriggerDate = new Date(currentTriggerISO);
        if (isNaN(currentTriggerDate.getTime())) return null;
        let nextTriggerDate: Date;
        switch (rule) {
            case 'daily': nextTriggerDate = addDays(currentTriggerDate, 1); break;
            case 'weekly': nextTriggerDate = addWeeks(currentTriggerDate, 1); break;
            case 'monthly': nextTriggerDate = addMonths(currentTriggerDate, 1); break;
            case 'yearly': nextTriggerDate = addYears(currentTriggerDate, 1); break;
            default: return null;
        }
        return formatISO(nextTriggerDate); // Use formatISO for consistency
    } catch (e) {
        console.error(`${logPrefix} Error calculating next trigger for rule '${rule}' from ${currentTriggerISO}:`, e);
        return null;
    }
}

// --- Helper: Send Notification (Prioritizes Web Push) ---
async function sendNotification(
    userId: string,
    reminderDetails: ReminderDetails,
    userState: UserState | null // Pass UserState which might contain subscriptions
) {
    const logItemPrefix = `${logPrefix} User:${userId.substring(0,8)}`;
    const title = `Minato Reminder`;
    const body = reminderDetails.original_content;
    const payload = JSON.stringify({ title, body, data: { memoryId: reminderDetails } }); // Send memoryId in data

    let notificationSent = false;

    // 1. Attempt Web Push if configured and subscriptions exist
    if (webPushInitialized && userState?.push_subscriptions && userState.push_subscriptions.length > 0) {
        console.log(`${logItemPrefix} Attempting Web Push for ${userState.push_subscriptions.length} subscription(s)...`);
        // TODO: Implement actual web-push sending logic
        // Needs a Deno-compatible web-push library or a separate microservice/function call
        const pushPromises = userState.push_subscriptions.map(async (sub) => {
            try {
                 console.debug(`${logItemPrefix} Simulating webpush.sendNotification to ${sub.endpoint.substring(0,30)}...`);
                 // Replace with actual webpush.sendNotification(sub, payload);
                 await new Promise(res => setTimeout(res, 50)); // Simulate async call
                 console.log(`${logItemPrefix} Simulated Web Push successful for endpoint.`);
                 notificationSent = true; // Mark as sent if at least one succeeds
            } catch (pushError: any) {
                 console.error(`${logItemPrefix} Web Push send error for endpoint ${sub.endpoint.substring(0,30)}:`, pushError.message || pushError);
                 // Handle specific errors like 410 Gone (unsubscribe)
                 if ((pushError as any)?.statusCode === 410) {
                     console.warn(`${logItemPrefix} Push subscription ${sub.endpoint.substring(0,30)} is expired/invalid. Needs removal.`);
                     // TODO: Implement logic to remove this specific subscription from user_state.push_subscriptions
                 }
            }
        });
        await Promise.allSettled(pushPromises);
    } else {
        console.log(`${logItemPrefix} Web Push skipped (not initialized or no subscriptions found).`);
    }

    // 2. Fallback to Email if Web Push wasn't sent and Resend is configured
    if (!notificationSent && resend) {
        console.log(`${logItemPrefix} Falling back to Email notification...`);
        try {
             // Fetch User Profile for Email
            const { data: profile, error: profileError } = await supabaseAdmin!
                .from('user_profiles')
                .select('email, first_name')
                .eq('id', userId)
                .single();

            if (profileError || !profile?.email) {
                throw new Error(`User profile/email lookup failed for email fallback: ${profileError?.message || 'No email'}`);
            }
            const userEmail = profile.email;
            const userFirstName = profile.first_name || 'there';

            // Send Email via Resend
            console.log(`${logItemPrefix} Sending reminder email to ${userEmail}...`);
            const { data: sendData, error: sendError } = await resend.emails.send({
                from: EMAIL_FROM_ADDRESS,
                to: [userEmail],
                subject: `${title}: ${body.substring(0, 30)}${body.length > 30 ? '...' : ''}`,
                text: `Hi ${userFirstName},\n\nReminder: "${body}"\n\n(Triggered around: ${new Date(reminderDetails.trigger_datetime).toISOString()})`,
                html: `<p>Hi ${userFirstName},</p><p>Reminder:</p><blockquote>${body}</blockquote><p><small>(Set for: ${reminderDetails.trigger_datetime})</small></p>`,
            });

            if (sendError) throw new Error(`Resend API error: ${sendError.message}`);
            console.log(`${logItemPrefix} Reminder email sent successfully (Resend ID: ${sendData?.id}).`);
            notificationSent = true; // Mark as sent via email

        } catch (emailError: any) {
             console.error(`${logItemPrefix} Email fallback failed:`, emailError.message);
             // If both push and email failed, re-throw to mark reminder as error
             if (!notificationSent) throw emailError;
        }
    }

    // If neither method worked, throw an error
    if (!notificationSent) {
        throw new Error("Failed to send notification via Web Push and Email (or services not configured).");
    }
}


// --- Main Handler ---
serve(async (req: Request) => {
    // 1. Authorization Check
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${EDGE_FUNCTION_SECRET}`) {
        console.warn(`${logPrefix} Unauthorized access attempt.`);
        return new Response("Unauthorized", { status: 401 });
    }

    // 2. Ensure Supabase Initialized
    if (!supabaseAdmin) {
        console.error(`${logPrefix} Supabase Admin client not initialized. Aborting.`);
        return new Response("Service configuration error", { status: 500 });
    }
    console.log(`${logPrefix} Received authorized request at ${new Date().toISOString()}. Starting check...`);

    let remindersProcessed = 0;
    let notificationsSent = 0;
    let remindersErrored = 0;
    const nowISO = new Date().toISOString();

    try {
        // 3. Query for Due Reminders (using SupabaseService logic conceptually)
        console.debug(`${logPrefix} Querying due reminders (status=pending, trigger<= ${nowISO})...`);
        // Directly query the 'memories' table using JSONB operators
        const { data: dueMemoryRecords, error: queryError } = await supabaseAdmin
            .from('memories') // Use the correct table name
            .select('id, user_id, metadata') // Select needed fields
            .eq('metadata->reminder_details->>status', 'pending') // Filter by status inside JSONB
            .lte('metadata->reminder_details->>trigger_datetime', nowISO) // Filter by trigger time inside JSONB
            .not('metadata->>reminder_details', 'is', null); // Ensure reminder_details exists

        if (queryError) {
            console.error(`${logPrefix} Error querying reminders:`, queryError);
            throw new Error(`Database query failed: ${queryError.message}`);
        }

        if (!dueMemoryRecords || dueMemoryRecords.length === 0) {
            console.log(`${logPrefix} No pending reminders due at this time.`);
            return new Response(JSON.stringify({ message: "No pending reminders.", processed: 0 }), { headers: { 'Content-Type': 'application/json' } });
        }

        console.log(`${logPrefix} Found ${dueMemoryRecords.length} potentially due reminders.`);
        remindersProcessed = dueMemoryRecords.length;

        // 4. Fetch User States for push subscriptions in batch if possible (Optimization)
        const userIds = [...new Set(dueMemoryRecords.map((r: { user_id: any; }) => r.user_id))];
        const { data: userStatesData, error: stateError } = await supabaseAdmin
            .from('user_states')
            .select('user_id, push_subscriptions, preferred_locale') // Fetch necessary fields
            .in('user_id', userIds);

        if (stateError) {
             console.error(`${logPrefix} Failed to fetch user states:`, stateError);
             // Proceed without push subs if fetch fails? Or mark all as error? Decide based on requirements.
             // For now, log error and continue with email fallback if available.
        }
        const userStatesMap = new Map<string, UserState>(userStatesData?.map((s: UserState) => [s.user_id, s as UserState]) || []);


        // 5. Process each due reminder
        for (const memory of dueMemoryRecords as MemoryRecord[]) {
            const reminderDetails = memory.metadata?.reminder_details;
            // Extra check: ensure reminder_details exists and status is pending
            if (!reminderDetails || reminderDetails.status !== 'pending' || reminderDetails.trigger_datetime > nowISO) {
                 console.warn(`${logPrefix} Skipping memory ${memory.id.substring(0,8)} - invalid state after query.`);
                 continue;
            }

            const memoryId = memory.id;
            const userId = memory.user_id;
            const logItemPrefix = `${logPrefix} Mem:${memoryId.substring(0,8)} User:${userId.substring(0,8)}`;
            const userState = userStatesMap.get(userId) || null;

            try {
                // Send notification (prioritizes Web Push, falls back to Email)
                await sendNotification(userId, reminderDetails, userState);
                notificationsSent++;

                // Update Reminder Status and Next Trigger Time
                const nextTrigger = calculateNextTrigger(reminderDetails.trigger_datetime, reminderDetails.recurrence_rule);
                const updatedReminderDetails: ReminderDetails = {
                    ...reminderDetails,
                    status: nextTrigger ? 'pending' : 'sent', // Reset to pending if recurring
                    trigger_datetime: nextTrigger || reminderDetails.trigger_datetime,
                    last_sent_at: nowISO,
                    error_message: null, // Clear previous error
                };

                // Update using jsonb_set
                const { error: updateError } = await supabaseAdmin
                    .rpc('jsonb_set_recursive', { // Use recursive helper if needed, or basic jsonb_set
                        target: memory.metadata,
                        path_elements: ['reminder_details'],
                        new_value: updatedReminderDetails
                     })
                    .then((rpcResult: { data: any; }) => supabaseAdmin.from('memories').update({ metadata: rpcResult.data }).eq('id', memoryId)); // Update the main row

                if (updateError) {
                    console.error(`${logItemPrefix} Failed to update reminder status/trigger after sending:`, updateError);
                    // Log critical error, manual fix might be needed
                } else {
                     console.log(`${logItemPrefix} Reminder status updated to '${updatedReminderDetails.status}'${nextTrigger ? ` (Next trigger: ${nextTrigger})` : ''}.`);
                }

            } catch (processingError: any) {
                 console.error(`${logItemPrefix} Error processing/sending reminder:`, processingError.message);
                 remindersErrored++;
                 // Attempt to mark reminder as 'error'
                 try {
                     const errorReminderDetails: Partial<ReminderDetails> = {
                         status: 'error',
                         last_sent_at: nowISO, // Record attempt time
                         error_message: processingError.message?.substring(0, 250) || 'Unknown processing error',
                     };
                     const mergedDetails = { ...(memory.metadata?.reminder_details || {}), ...errorReminderDetails };

                     await supabaseAdmin
                         .rpc('jsonb_set_recursive', {
                             target: memory.metadata,
                             path_elements: ['reminder_details'],
                             new_value: mergedDetails
                          })
                         .then((rpcResult: { data: any; }) => supabaseAdmin.from('memories').update({ metadata: rpcResult.data }).eq('id', memoryId));
                     console.log(`${logItemPrefix} Marked reminder status as 'error' in DB.`);
                 } catch (dbError: any) {
                     console.error(`${logItemPrefix} CRITICAL: Failed to mark reminder as 'error' after processing failure:`, dbError);
                 }
            }
        } // End loop

        console.log(`${logPrefix} Finished processing. Processed: ${remindersProcessed}, Notifications OK: ${notificationsSent}, Errored: ${remindersErrored}.`);
        return new Response(JSON.stringify({ message: "Reminder check complete.", processed: remindersProcessed, sent: notificationsSent, errors: remindersErrored }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error(`${logPrefix} Unhandled error in main handler:`, error);
        return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
});

// Helper function for recursive JSONB updates (if needed)
// Create this function in your Supabase SQL editor:
/*
CREATE OR REPLACE FUNCTION jsonb_set_recursive(target jsonb, path_elements text[], new_value jsonb)
RETURNS jsonb AS $$
BEGIN
  IF array_length(path_elements, 1) = 1 THEN
    RETURN jsonb_set(target, path_elements, new_value, true);
  ELSE
    RETURN jsonb_set(
      target,
      array[path_elements[1]],
      jsonb_set_recursive(
        target->path_elements[1],
        path_elements[2:],
        new_value
      ),
      true
    );
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
*/