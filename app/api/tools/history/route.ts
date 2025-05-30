import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";
import { ChatMessage } from "@/lib/types";

const MESSAGES_PER_PAGE_DEFAULT = 30;

export async function GET(req: NextRequest) {
  const logPrefix = "[API ToolsHistory GET]";
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
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "Invalid 'limit' parameter (must be 1-100)." }, { status: 400 });
  }

  const offset = (page - 1) * limit;

  logger.info(`${logPrefix} User: ${userId.substring(0,8)}, Fetching page: ${page}, limit: ${limit}, offset: ${offset}`);

  try {
    const supabaseDB = getSupabaseAdminClient();
    if (!supabaseDB) {
        logger.error(`${logPrefix} Supabase admin client unavailable.`);
        throw new Error("Database client error.");
    }
    
    const { data: convoData, error: convoError } = await supabaseDB
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convoError && convoError.code !== 'PGRST116') {
      logger.error(`${logPrefix} Error fetching conversation ID for user ${userId.substring(0,8)}:`, convoError);
      throw convoError;
    }

    if (!convoData) {
      logger.info(`${logPrefix} No conversation found for user ${userId.substring(0,8)}. Returning empty history.`);
      return NextResponse.json([]);
    }

    const conversationId = convoData.id;
    logger.debug(`${logPrefix} Using conversation ID: ${conversationId} for user ${userId.substring(0,8)}.`);

    // Specifically query for audio messages (where audio_url is not null)
    const { data: messages, error: messagesError } = await supabaseDB
      .from("chat_messages")
      .select("id, role, content, timestamp, attachments, tool_calls, structured_data, audio_url, intent_type, tts_instructions, error")
      .eq("conversation_id", conversationId)
      .not("audio_url", "is", null) // Only get messages with audio_url
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      logger.error(`${logPrefix} Error fetching audio messages for user ${userId.substring(0,8)}, convo ${conversationId}:`, messagesError);
      throw messagesError;
    }

    interface DBMessage {
      id: string;
      role: string;
      content: any;
      timestamp: string;
      attachments: any[] | null;
      tool_calls: any[] | null;
      structured_data: any | null;
      audio_url?: string | null;
      intent_type?: string | null;
      tts_instructions?: string | null;
      error?: boolean | null;
    }

    const chronologicalMessages = (messages || []).map((msg: DBMessage) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      attachments: msg.attachments || [],
      tool_calls: msg.tool_calls || null,
      structured_data: msg.structured_data || null,
      audioUrl: msg.audio_url || undefined,
      intentType: msg.intent_type || undefined,
      ttsInstructions: msg.tts_instructions || undefined,
      error: msg.error || undefined,
    })).reverse() as ChatMessage[];

    logger.info(`${logPrefix} Fetched ${chronologicalMessages.length} audio messages for user ${userId.substring(0,8)}.`);
    return NextResponse.json(chronologicalMessages);

  } catch (error: any) {
    logger.error(`${logPrefix} Error fetching audio history for user ${userId.substring(0,8)}:`, error);
    return NextResponse.json({ error: `Failed to load audio history: ${error.message}` }, { status: 500 });
  }
} 