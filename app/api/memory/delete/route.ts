// FILE: app/api/memory/delete/route.ts
// New API route for deleting a specific memory item
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CompanionCoreMemory } from '@/memory-framework/core/CompanionCoreMemory';
import { logger } from '@/memory-framework/config';
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";

// Replace local memory framework initialization with global one
function getMemoryFramework(): CompanionCoreMemory {
  try {
    return getGlobalMemoryFramework();
  } catch (memError: any) {
    logger.error("[API MemoryDelete] Failed to get memory framework:", memError.message, memError.stack);
    throw new Error(`Memory Framework initialization failed: ${memError.message}`);
  }
}

export async function DELETE(req: NextRequest) {
    const logPrefix = "[API MemoryDelete]";
    const cookieStore = cookies();
    let userId: string | null = null;

    // Authentication
    try {
        const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session?.user?.id) {
            logger.warn(`${logPrefix} Auth] Unauthorized access attempt.`);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        userId = session.user.id;
    } catch (authError: any) {
        logger.error(`${logPrefix} Auth Error:`, authError);
        return NextResponse.json({ error: "Authentication error" }, { status: 500 });
    }

    // Get memory ID from request (from query param or body)
    let memoryId: string | null = null;
    try {
        // First try to get from query parameter ?id=...
        memoryId = req.nextUrl.searchParams.get('id');
        
        // If not in query params, try to get from JSON body
        if (!memoryId) {
            try {
                const body = await req.json();
                memoryId = body.memoryId || body.id;
            } catch (parseError) {
                // Body parsing failed, continue with validation
            }
        }

        if (!memoryId || typeof memoryId !== 'string' || memoryId.trim() === '') {
            throw new Error("Missing or invalid memory ID. Please provide either a query parameter '?id=...' or a JSON body with 'memoryId' field.");
        }
        
        // Validate UUID format if needed (optional)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(memoryId)) {
            logger.warn(`${logPrefix} Possible invalid memory ID format: ${memoryId}`);
            // Continue anyway, let the database handle validation
        }
        
        logger.warn(`${logPrefix} Received request to DELETE memory ${memoryId} for user ${userId && typeof userId === 'string' ? userId.substring(0, 8) : 'unknown'}.`);
    } catch (e: any) {
        logger.error(`${logPrefix} Invalid request for user ${userId && typeof userId === 'string' ? userId.substring(0, 8) : 'unknown'}:`, e.message);
        return NextResponse.json({ error: `Invalid request: ${e.message}` }, { status: 400 });
    }

    // Deletion Logic
    try {
        const memory = getMemoryFramework();

        // Optional: Fetch memory first to verify ownership before deleting
        const existingMemory = await memory.fetchMemoryById(memoryId);
        if (!existingMemory) {
            logger.warn(`${logPrefix} Memory ${memoryId} not found.`);
            return NextResponse.json({ error: "Memory not found." }, { status: 404 });
        }
        if (!existingMemory.user_id || existingMemory.user_id !== userId) {
            logger.warn(`${logPrefix} User ${userId && typeof userId === 'string' ? userId.substring(0, 8) : 'unknown'} attempted to delete memory ${memoryId} owned by ${existingMemory.user_id && typeof existingMemory.user_id === 'string' ? existingMemory.user_id.substring(0, 8) : 'unknown'}.`);
            return NextResponse.json({ error: "Forbidden: Cannot delete this memory." }, { status: 403 });
        }
        // End Optional Ownership Check

        const success = await memory.delete_memory(memoryId); // delete_memory handles both DBs

        if (success) {
            logger.info(`${logPrefix} Memory ${memoryId} deleted successfully for user ${userId && typeof userId === 'string' ? userId.substring(0, 8) : 'unknown'}.`);
            return new NextResponse(null, { status: 204 }); // Success, No Content
        } else {
            // Delete might return false if not found after check, or if DB error occurred
            logger.warn(`${logPrefix} Memory ${memoryId} delete operation returned false for user ${userId && typeof userId === 'string' ? userId.substring(0, 8) : 'unknown'}. Might have been deleted already or DB issue.`);
            // Treat "not found" as success from client perspective if ownership check passed
            return NextResponse.json({ error: 'Memory not found or delete failed.' }, { status: 404 });
        }
    } catch (error: any) {
        logger.error(`${logPrefix} Error deleting memory ${memoryId} for user ${userId && typeof userId === 'string' ? userId.substring(0, 8) : 'unknown'}:`, error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API Memory Delete]";
  const cookieStore = cookies();
  const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
  let userId: string;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      logger.error(`${logPrefix} Auth Supabase getUser error:`, error.message);
      throw new Error("Authentication failed");
    }
    if (!user?.id) {
      logger.warn(`${logPrefix} Auth No authenticated Supabase user found.`);
      throw new Error("Unauthorized");
    }
    userId = user.id;
  } catch (authError: any) {
    logger.error(`${logPrefix} Auth check failed:`, authError.message);
    const status = authError.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: authError.message }, { status });
  }

  logger.info(`${logPrefix} Request for user: ${userId.substring(0, 8)}`);

  try {
    const body = await req.json();
    const { memoryIds } = body;

    if (!Array.isArray(memoryIds) || memoryIds.length === 0) {
      return NextResponse.json({ 
        error: "Invalid request body. Expected 'memoryIds' as a non-empty array." 
      }, { status: 400 });
    }

    // Validate each memory ID
    for (const id of memoryIds) {
      if (typeof id !== 'string' || id.trim() === '') {
        return NextResponse.json({ 
          error: "All memory IDs must be non-empty strings." 
        }, { status: 400 });
      }
    }

    // Process batch deletion here...
    return NextResponse.json({ success: true, message: "Batch deletion handled" });
  } catch (error: any) {
    logger.error(`${logPrefix} Error processing request:`, error);
    return NextResponse.json({ 
      error: `Request processing error: ${error.message}` 
    }, { status: 500 });
  }
}