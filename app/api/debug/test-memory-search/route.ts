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

    console.log("[DEBUG] User ID:", user.id);
    
    // Test the memory search API
    const searchPayload = {
      query: "",
      limit: 5,
      offset: 0
    };
    
    console.log("[DEBUG] Testing memory search with payload:", searchPayload);
    
    // Make internal request to memory search API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/memory/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify(searchPayload)
    });

    console.log("[DEBUG] Memory search response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("[DEBUG] Memory search error:", errorText);
      return NextResponse.json({ 
        error: 'Memory search failed', 
        status: response.status,
        details: errorText,
        user_id: user.id
      });
    }

    const data = await response.json();
    console.log("[DEBUG] Memory search success:", data);
    
    return NextResponse.json({
      success: true,
      user_id: user.id,
      memories_count: data.results?.length || 0,
      total_estimated: data.total_estimated,
      sample_results: data.results?.slice(0, 2)
    });

  } catch (error: any) {
    console.log("[DEBUG] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 