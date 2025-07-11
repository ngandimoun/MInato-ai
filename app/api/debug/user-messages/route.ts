import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', authError }, { status: 401 });
    }

    const userId = user.id;
    logger.info('[Debug User Messages] Fetching chat messages for user', { userId });

    // Query the chat_messages table
    const { data: messages, error: dbError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (dbError) {
      logger.error('[Debug User Messages] Database error', { dbError });
      return NextResponse.json({ error: 'Database error', dbError }, { status: 500 });
    }

    // Also check conversations table
    const { data: conversations, error: convoError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (convoError) {
      logger.error('[Debug User Messages] Conversation query error', { convoError });
    }

    const response = {
      userId: userId,
      messagesCount: messages?.length || 0,
      conversationsCount: conversations?.length || 0,
      messages: messages?.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content.substring(0, 200) + '...' : msg.content,
        timestamp: msg.timestamp,
        conversation_id: msg.conversation_id,
        has_tool_calls: !!msg.tool_calls,
        has_structured_data: !!msg.structured_data
      })) || [],
      conversations: conversations?.map((conv: any) => ({
        id: conv.id,
        created_at: conv.created_at,
        updated_at: conv.updated_at
      })) || []
    };

    logger.info('[Debug User Messages] Query successful', {
      userId: userId.substring(0, 8),
      messagesCount: response.messagesCount,
      conversationsCount: response.conversationsCount
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Debug User Messages] Unexpected error', { error });
    return NextResponse.json({ error: 'Unexpected error', details: error }, { status: 500 });
  }
} 