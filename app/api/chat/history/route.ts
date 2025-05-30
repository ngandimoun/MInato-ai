// FILE: app/api/chat/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseAdminClient } from "@/lib/supabase/server";
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
      logger.warn(`${logPrefix} No active Supabase session found.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    logger.info(`${logPrefix} Request from authenticated user: ${userId.substring(0, 8)}...`);

    // Get pagination parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || MESSAGES_PER_PAGE_DEFAULT.toString());
    const offset = (page - 1) * limit;

    // Validate pagination
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    }

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (conversationError && conversationError.code !== "PGRST116") {
      logger.error(`${logPrefix} Error fetching conversation: ${conversationError.message}`);
      return NextResponse.json({ error: "Error fetching conversation" }, { status: 500 });
    }

    let conversationId = conversationData?.id;

    // If no conversation exists, create one
    if (!conversationId) {
      logger.info(`${logPrefix} Creating new conversation for user: ${userId.substring(0, 8)}...`);
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert([{ user_id: userId }])
        .select("id")
        .single();

      if (createError) {
        logger.error(`${logPrefix} Error creating conversation: ${createError.message}`);
        return NextResponse.json({ error: "Error creating conversation" }, { status: 500 });
      }
      conversationId = newConversation.id;
    }

    // Fetch messages from the conversation with proper pagination - newest first
    const { data: messagesData, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      logger.error(`${logPrefix} Error fetching messages: ${messagesError.message}`);
      return NextResponse.json({ error: "Error fetching messages" }, { status: 500 });
    }

    // Transform database messages to ChatMessage format
    const messages: ChatMessage[] = messagesData.map(message => {
      // Check for audio messages using multiple methods
      const isAudioMessage = 
        message.is_audio_message === true || 
        !!message.audio_url ||
        (typeof message.content === 'object' && message.content?.isAudioMessage === true);
      
      return {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        attachments: message.attachments || [],
        audioUrl: message.audio_url,
        structured_data: message.structured_data,
        debugInfo: message.debug_info,
        intentType: message.intent_type,
        ttsInstructions: message.tts_instructions,
        error: message.error,
        isAudioMessage: isAudioMessage
      };
    });

    logger.info(`${logPrefix} Returning ${messages.length} messages for user ${userId.substring(0, 8)}...`);
    return NextResponse.json(messages);
    
  } catch (error: any) {
    logger.error(`${logPrefix} Unhandled exception: ${error.message}`);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}