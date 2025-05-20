// FILE: app/api/chat/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || String(MESSAGES_PER_PAGE_DEFAULT), 10);
  const offset = (page - 1) * limit;

  logger.info(`${logPrefix} User: ${userId.substring(0,8)}, Fetching page: ${page}, limit: ${limit}, offset: ${offset}`);

  try {
    const supabaseDB = await createServerSupabaseClient();
    
    const { data: convoData, error: convoError } = await supabaseDB
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
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

    const { data: messages, error: messagesError } = await supabaseDB
      .from("chat_messages")
      .select("id, role, content, timestamp, attachments, tool_calls, structured_data, audio_url, intent_type, tts_instructions, error")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      logger.error(`${logPrefix} Error fetching messages for user ${userId.substring(0,8)}, convo ${conversationId}:`, messagesError);
      throw messagesError;
    }

    interface DBMessage {
      id: string;
      role: string;
      content: string;
      timestamp: string;
      attachments: any[] | null;
      tool_calls: any[] | null;
      structured_data: any | null;
      audio_url?: string;
      intent_type?: string;
      tts_instructions?: string;
      error?: boolean;
    }

    const chronologicalMessages = (messages || []).map((msg: DBMessage) => ({
      ...msg,
      attachments: msg.attachments || [],
      tool_calls: msg.tool_calls || null,
      structured_data: msg.structured_data || null,
      audioUrl: msg.audio_url,
      intentType: msg.intent_type,
      ttsInstructions: msg.tts_instructions
    })).reverse() as ChatMessage[];

    logger.info(`${logPrefix} Fetched ${chronologicalMessages.length} messages for user ${userId.substring(0,8)}.`);
    return NextResponse.json(chronologicalMessages);

  } catch (error: any) {
    logger.error(`${logPrefix} Error fetching chat history for user ${userId.substring(0,8)}:`, error);
    return NextResponse.json({ error: `Failed to load chat history: ${error.message}` }, { status: 500 });
  }
}