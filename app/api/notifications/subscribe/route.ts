// FILE: app/api/notifications/subscribe/route.ts
// (Content from finalcodebase.txt - verified)
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { UserPushSubscription } from "@/lib/types";
import { logger } from "@/memory-framework/config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";

// Helper function to get validated user ID
async function getValidatedUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      logger.error("[API Subscribe Auth] Supabase getUser error:", error.message);
      return null;
    }
    if (!user?.id) {
      logger.warn("[API Subscribe Auth] No authenticated Supabase user found.");
      return null;
    }
    return user.id;
  } catch (e: any) {
    logger.error("[API Subscribe Auth] Exception during getUser:", e.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API Subscribe]";
  const userId = await getValidatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  logger.info(`${logPrefix} User: ${userId.substring(0, 8)}`);

  let subscription: UserPushSubscription;
  try {
    subscription = await req.json();
    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      throw new Error("Invalid PushSubscription object structure received.");
    }
    logger.info(
      `${logPrefix} Received subscription request for user ${userId.substring(
        0,
        8
      )}, endpoint: ${subscription.endpoint.substring(0, 30)}...`
    );
  } catch (e: any) {
    logger.error(
      `${logPrefix} Invalid request body for user ${userId.substring(0, 8)}:`,
      e.message
    );
    return NextResponse.json(
      { error: `Invalid request body: ${e.message}` },
      { status: 400 }
    );
  }

  try {
    const success = await supabaseAdmin.savePushSubscription(userId, subscription);
    if (success) {
      logger.info(
        `${logPrefix} Subscription saved successfully for user ${userId.substring(
          0,
          8
        )}.`
      );
      return NextResponse.json({ success: true });
    } else {
      logger.error(
        `${logPrefix} Failed to save subscription to DB for user ${userId.substring(
          0,
          8
        )}.`
      );
      return NextResponse.json(
        { error: "Failed to save subscription details." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error(
      `${logPrefix} Unhandled exception saving subscription for user ${userId.substring(
        0,
        8
      )}:`,
      error
    );
    return NextResponse.json(
      { error: "Internal server error while saving subscription." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const logPrefix = "[API Unsubscribe]";
  const userId = await getValidatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  logger.info(`${logPrefix} User: ${userId.substring(0, 8)}`);

  let endpoint: string | null = null;
  try {
    const { searchParams } = new URL(req.url);
    endpoint = searchParams.get("endpoint");
    if (!endpoint) {
      try {
        const body = await req.json();
        endpoint = body?.endpoint;
      } catch {
        /* Ignore */
      }
    }
    if (!endpoint)
      throw new Error("Missing 'endpoint' parameter in request query or body.");
    logger.info(
      `${logPrefix} Received unsubscribe request for user ${userId.substring(
        0,
        8
      )}, endpoint: ${endpoint.substring(0, 30)}...`
    );
  } catch (e: any) {
    logger.error(
      `${logPrefix} Invalid request for user ${userId.substring(0, 8)}:`,
      e.message
    );
    return NextResponse.json(
      { error: `Invalid request: ${e.message}` },
      { status: 400 }
    );
  }

  try {
    const success = await supabaseAdmin.deletePushSubscription(userId, endpoint);
    if (success) {
      logger.info(
        `${logPrefix} Subscription deleted successfully for endpoint ${endpoint.substring(
          0,
          30
        )}... (User: ${userId.substring(0, 8)}).`
      );
      return NextResponse.json({ success: true });
    } else {
      logger.warn(
        `${logPrefix} Failed to delete subscription (or not found/not owned by user) for endpoint ${endpoint.substring(
          0,
          30
        )}... (User: ${userId.substring(0, 8)}).`
      );
      return NextResponse.json({
        success: true,
        message: "Subscription not found for this user or already deleted.",
      });
    } // Treat not found as success
  } catch (error: any) {
    logger.error(
      `${logPrefix} Unhandled exception deleting subscription for user ${userId.substring(
        0,
        8
      )}, endpoint ${endpoint?.substring(0, 30)}:`,
      error
    );
    return NextResponse.json(
      { error: "Internal server error while deleting subscription." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const logPrefix = "[API Notifications GET]";
  const userId = await getValidatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Fetch due reminders from memory framework
    let memoryFramework;
    try {
      memoryFramework = getGlobalMemoryFramework();
      logger.info(`${logPrefix} Memory framework initialized successfully.`);
    } catch (initError: any) {
      logger.error(`${logPrefix} Memory framework initialization failed: ${initError.message}`);
      return NextResponse.json({ reminders: [], suggestions: [], error: "Memory service unavailable" });
    }

    try {
      const now = new Date().toISOString();
      const dueReminders = await memoryFramework.getDueReminders(now, userId, 10) || [];
      // Generate suggestions (stub: suggest a reminder if user has <2 reminders)
      let suggestions: any[] = [];
      if (dueReminders.length < 2) {
        suggestions.push({
          type: "reminder_suggestion",
          message: "You have few reminders. Want to add a new one?",
        });
      }
      return NextResponse.json({ reminders: dueReminders, suggestions });
    } catch (memoryError: any) {
      logger.error(`${logPrefix} Error retrieving reminders: ${memoryError.message}`);
      return NextResponse.json({ reminders: [], suggestions: [], error: "Failed to retrieve reminders" });
    }
  } catch (error: any) {
    logger.error(`${logPrefix} Error fetching notifications for user ${userId}:`, error);
    return NextResponse.json({ error: "Internal server error while fetching notifications." }, { status: 500 });
  }
}
