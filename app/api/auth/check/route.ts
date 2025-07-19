import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/check
 * 
 * Simple endpoint to check if user is authenticated
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Get the current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    return NextResponse.json({
      authenticated: false,
      error: 'Not authenticated'
    }, { status: 401 });
  }
  
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email
    }
  });
} 