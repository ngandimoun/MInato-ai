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
    logger.info('[Debug User Memories] Fetching memories for user', { userId });

    // Query the memories table directly
    const { data: memories, error: dbError } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (dbError) {
      logger.error('[Debug User Memories] Database error', { dbError });
      return NextResponse.json({ error: 'Database error', dbError }, { status: 500 });
    }

    const response = {
      userId: userId,
      count: memories?.length || 0,
      memories: memories?.map((memory: any) => ({
        id: memory.id,
        content: memory.content,
        categories: memory.categories,
        metadata: memory.metadata,
        created_at: memory.created_at,
        updated_at: memory.updated_at,
        memory_type: memory.metadata?.memory_type,
        role: memory.metadata?.role,
        // Don't include the full embedding vector as it's too large
        has_embedding: !!memory.embedding
      })) || []
    };

    logger.info('[Debug User Memories] Query successful', {
      userId: userId.substring(0, 8),
      count: response.count
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Debug User Memories] Unexpected error', { error });
    return NextResponse.json({ error: 'Unexpected error', details: error }, { status: 500 });
  }
} 