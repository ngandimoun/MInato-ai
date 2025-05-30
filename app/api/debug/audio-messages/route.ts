import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";

// Debugging endpoint to directly fetch audio messages
export async function GET(req: NextRequest) {
  const logPrefix = "[API Debug AudioMessages]";
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

  try {
    const supabaseDB = getSupabaseAdminClient();
    if (!supabaseDB) {
      logger.error(`${logPrefix} Supabase admin client unavailable.`);
      throw new Error("Database client error.");
    }
    
    // Get the most recent conversation for this user
    const { data: convoData, error: convoError } = await supabaseDB
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (convoError) {
      logger.error(`${logPrefix} Error fetching conversation: ${convoError.message}`);
      return NextResponse.json({ error: convoError.message }, { status: 500 });
    }

    if (!convoData) {
      return NextResponse.json({ message: "No conversations found for user" }, { status: 404 });
    }

    const conversationId = convoData.id;
    
    // Direct query for messages with audio_url
    const { data: audioMessages, error: audioError } = await supabaseDB
      .from("chat_messages")
      .select("id, role, timestamp, audio_url")
      .eq("conversation_id", conversationId)
      .not("audio_url", "is", null)
      .order("timestamp", { ascending: false });

    if (audioError) {
      logger.error(`${logPrefix} Error fetching audio messages: ${audioError.message}`);
      return NextResponse.json({ error: audioError.message }, { status: 500 });
    }

    // Count total messages for comparison
    const { count: totalCount, error: countError } = await supabaseDB
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);

    if (countError) {
      logger.error(`${logPrefix} Error counting messages: ${countError.message}`);
    }

    return NextResponse.json({
      totalMessages: totalCount || "unknown",
      audioMessagesFound: audioMessages.length,
      audioMessages: audioMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        timestamp: msg.timestamp,
        audio_url: msg.audio_url ? `${msg.audio_url.substring(0, 50)}...` : null
      }))
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 