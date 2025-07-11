import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';
import { getGlobalMemoryFramework } from '@/lib/memory-framework-global';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated', authError }, { status: 401 });
    }

    const userId = user.id;
    logger.info('[Debug Test Memory] Testing memory for user', { userId });

    // Initialize memory framework
    const memoryFramework = getGlobalMemoryFramework();

    // Test adding a memory
    const testContent = `Test memory created at ${new Date().toISOString()}. User prefers Italian food and lives in New York. They mentioned loving pasta and visiting Rome.`;
    
    const conversationTurn = [
      { role: 'user' as const, content: testContent, name: 'User' }
    ];

    logger.info('[Debug Test Memory] Adding test memory', { testContent });

    const addSuccess = await memoryFramework.add_memory(
      conversationTurn,
      userId,
      'test-memory-run-id'
    );

    logger.info('[Debug Test Memory] Memory add result', { addSuccess });

    // Test searching for the memory
    const searchResults = await memoryFramework.search_memory(
      'Italian food New York pasta',
      userId,
      { limit: 10, offset: 0 }
    );

    logger.info('[Debug Test Memory] Search results', { 
      found: searchResults.results.length,
      results: searchResults.results.map(r => ({ content: r.content.substring(0, 100), score: r.final_score }))
    });

    const response = {
      userId: userId,
      testMemoryAdded: addSuccess,
      searchResults: {
        count: searchResults.results.length,
        memories: searchResults.results.map(r => ({
          memory_id: r.memory_id,
          content: r.content,
          created_at: r.created_at,
          score: r.final_score,
          categories: r.categories
        }))
      },
      testSuccess: addSuccess && searchResults.results.length > 0
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Debug Test Memory] Unexpected error', { error });
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 