import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { logger } from "@/memory-framework/config";
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";

// Define reminder status type for proper typing
type ReminderStatus = 'pending' | 'sent' | 'error' | 'acknowledged' | 'cancelled';

// Helper function to get validated user ID
async function getValidatedUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      logger.error("[API Snooze Auth] Supabase getUser error:", error.message);
      return null;
    }
    if (!user?.id) {
      logger.warn("[API Snooze Auth] No authenticated Supabase user found.");
      return null;
    }
    return user.id;
  } catch (e: any) {
    logger.error("[API Snooze Auth] Exception during getUser:", e.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API Snooze]";
  const userId = await getValidatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, id, duration } = body;

    if (!type || !id || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: type, id, and duration" },
        { status: 400 }
      );
    }

    if (type !== 'reminder' && type !== 'suggestion') {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    logger.info(`${logPrefix} Snoozing ${type} ${id} for ${duration} minutes for user ${userId.substring(0, 8)}`);

    // Calculate the new snooze date
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + duration);

    // Handle different notification types
    if (type === 'reminder') {
      const memoryFramework = getGlobalMemoryFramework();
      
      // Fetch memory to check if it exists and belongs to the user
      const memory = await memoryFramework.fetchMemoryById(id);
      
      if (!memory) {
        return NextResponse.json(
          { error: "Reminder not found" },
          { status: 404 }
        );
      }
      
      if (memory.user_id !== userId) {
        return NextResponse.json(
          { error: "Unauthorized: This reminder doesn't belong to you" },
          { status: 403 }
        );
      }
      
      // Update the reminder in the database
      if (!memory.metadata?.reminder_details) {
        return NextResponse.json(
          { error: "This memory is not a reminder" },
          { status: 400 }
        );
      }
      
      // Update the reminder details with the new trigger time
      const updatedMetadata = {
        ...memory.metadata,
        reminder_details: {
          ...memory.metadata.reminder_details,
          status: 'pending' as ReminderStatus,
          trigger_datetime: snoozeUntil.toISOString(),
        }
      };
      
      // Update the memory with new metadata
      await memoryFramework.update_memory(id, { 
        metadata: updatedMetadata
      });
    } else {
      // For suggestions, we currently don't need server-side persistence
      // as they are ephemeral and handled on the client-side
    }

    return NextResponse.json({ 
      success: true,
      snoozeUntil: snoozeUntil.toISOString()
    });
  } catch (error: any) {
    logger.error(`${logPrefix} Error snoozing notification: ${error.message}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 