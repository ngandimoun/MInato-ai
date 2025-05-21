// FILE: app/api/chat/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseAdminClient } from "@/lib/supabase/server"; // Use getSupabaseAdminClient
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";
import { ChatMessage } from "@/lib/types";

const MESSAGES_PER_PAGE_DEFAULT = 30;

export async function GET(req: NextRequest) {
  const logPrefix = "[API ChatHistory GET]";
  const cookieStore = cookies();
  let userId: string;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn(`${logPrefix} Unauthorized access attempt. UserError: ${userError?.message}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    userId = user.id;
  } catch (authError: any) {
    logger.error(`${logPrefix} Auth Error:`, authError);
    return NextResponse.json({ error: "Authentication error" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : MESSAGES_PER_PAGE_DEFAULT;

  if (isNaN(page) || page < 1) {
    return NextResponse.json({ error: "Invalid 'page' parameter." }, { status: 400 });
  }
  if (isNaN(limit) || limit < 1 || limit > 100) { // Add a max limit for safety
    return NextResponse.json({ error: "Invalid 'limit' parameter (must be 1-100)." }, { status: 400 });
  }

  const offset = (page - 1) * limit;

  logger.info(`${logPrefix} User: ${userId.substring(0,8)}, Fetching page: ${page}, limit: ${limit}, offset: ${offset}`);

  try {
    const supabaseDB = getSupabaseAdminClient(); // Use the admin client for direct DB access
    if (!supabaseDB) {
        logger.error(`${logPrefix} Supabase admin client unavailable.`);
        throw new Error("Database client error.");
    }
    
    const { data: convoData, error: convoError } = await supabaseDB
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .order('created_at', { ascending: false }) // Get the latest conversation
      .limit(1)
      .single();

    if (convoError && convoError.code !== 'PGRST116') { // PGRST116: No rows found
      logger.error(`${logPrefix} Error fetching conversation ID for user ${userId.substring(0,8)}:`, convoError);
      throw convoError;
    }

    if (!convoData) {
      logger.info(`${logPrefix} No conversation found for user ${userId.substring(0,8)}. Returning empty history.`);
      return NextResponse.json([]); // Return empty array if no conversation exists
    }

    const conversationId = convoData.id;
    logger.debug(`${logPrefix} Using conversation ID: ${conversationId} for user ${userId.substring(0,8)}.`);

    const { data: messages, error: messagesError } = await supabaseDB
      .from("chat_messages")
      .select("id, role, content, timestamp, attachments, tool_calls, structured_data, audio_url, intent_type, tts_instructions, error")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: false }) // Fetch newest first for pagination
      .range(offset, offset + limit - 1);

    if (messagesError) {
      logger.error(`${logPrefix} Error fetching messages for user ${userId.substring(0,8)}, convo ${conversationId}:`, messagesError);
      throw messagesError;
    }

    interface DBMessage {
      id: string;
      role: string;
      content: any; // More flexible for DB schema
      timestamp: string;
      attachments: any[] | null;
      tool_calls: any[] | null;
      structured_data: any | null;
      audio_url?: string | null;
      intent_type?: string | null;
      tts_instructions?: string | null;
      error?: boolean | null;
    }

    // Messages are fetched in descending order, so reverse them for chronological display
    const chronologicalMessages = (messages || []).map((msg: DBMessage) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content, // Keep as is from DB, frontend MessageItem handles parsing
      timestamp: msg.timestamp,
      attachments: msg.attachments || [],
      tool_calls: msg.tool_calls || null,
      structured_data: msg.structured_data || null,
      audioUrl: msg.audio_url || undefined,
      intentType: msg.intent_type || undefined,
      ttsInstructions: msg.tts_instructions || undefined,
      error: msg.error || undefined,
    })).reverse() as ChatMessage[];

    logger.info(`${logPrefix} Fetched ${chronologicalMessages.length} messages for user ${userId.substring(0,8)}.`);
    return NextResponse.json(chronologicalMessages);

  } catch (error: any) {
    logger.error(`${logPrefix} Error fetching chat history for user ${userId.substring(0,8)}:`, error);
    return NextResponse.json({ error: `Failed to load chat history: ${error.message}` }, { status: 500 });
  }
}