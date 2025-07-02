import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

interface GamePreferences {
  language: string;
  ai_personality: string;
  topic_focus: string;
  preferred_difficulty: string;
  preferred_mode: 'solo' | 'multiplayer';
  preferred_rounds: number;
}

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const supabase = await createSupabaseRouteHandlerClient({
    cookies: () => cookies(),
  });
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      return null;
    }
    return user.id;
  } catch (error: any) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromSession(req);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from("user_states")
      .select("workflow_preferences")
      .eq("user_id", userId)
      .maybeSingle();

    if (stateError) {
      return NextResponse.json(
        { error: `Database error: ${stateError.message}` },
        { status: 500 }
      );
    }

    const gamePreferences = stateData?.workflow_preferences?.gamePreferences || {
      language: 'en',
      ai_personality: 'friendly',
      topic_focus: 'general',
      preferred_difficulty: 'medium',
      preferred_mode: 'solo',
      preferred_rounds: 10
    };

    return NextResponse.json({ preferences: gamePreferences });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromSession(req);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let gamePreferences: Partial<GamePreferences>;
  try {
    gamePreferences = await req.json();
  } catch (e: any) {
    return NextResponse.json(
      { error: `Invalid JSON request body: ${e.message}` },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // Get existing preferences
    const { data: existingState, error: fetchError } = await supabaseAdmin
      .from("user_states")
      .select("workflow_preferences")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (fetchError) {
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }
    
    // Merge existing preferences with new game preferences
    const existingPreferences = existingState?.workflow_preferences || {};
    const existingGamePreferences = existingPreferences.gamePreferences || {};
    
    const updatedPreferences = {
      ...existingPreferences,
      gamePreferences: {
        ...existingGamePreferences,
        ...gamePreferences
      }
    };
    
    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from("user_states")
      .upsert({
        user_id: userId,
        workflow_preferences: updatedPreferences,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    
    if (updateError) {
      return NextResponse.json(
        { error: `Database error: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      preferences: updatedPreferences.gamePreferences,
      message: "Game preferences updated successfully" 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
} 