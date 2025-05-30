import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { UserWorkflowPreferences } from "@/lib/types/index";
import { logger } from "@/memory-framework/config";
import { config as frameworkConfig } from "@/memory-framework/config";
import { appConfig } from "@/lib/config";

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const supabase = await createSupabaseRouteHandlerClient({
    cookies: () => cookies(),
  });
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) {
      logger.error(
        "[API Preferences Auth] Supabase getUser error:",
        userError.message
      );
      return null;
    }
    if (!user?.id) {
      logger.warn("[API Preferences Auth] No authenticated Supabase user found.");
      return null;
    }
    return user.id;
  } catch (error: any) {
    logger.error(
      "[API Preferences Auth] Exception checking Supabase session:",
      error.message
    );
    return null;
  }
}

export async function GET(req: NextRequest) {
  const logPrefix = "[API Preferences GET]";
  const userId = await getUserIdFromSession(req);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized - No session" },
      { status: 401 }
    );
  }
  logger.info(`${logPrefix} Request for user: ${userId.substring(0, 8)}...`);

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    logger.error(`${logPrefix} Admin client unavailable.`);
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from(frameworkConfig.vectorStore.userStatesTableName)
      .select("workflow_preferences")
      .eq("user_id", userId)
      .maybeSingle();

    if (stateError) {
      logger.error(
        `${logPrefix} Error fetching state for user ${userId.substring(0, 8)}:`,
        stateError
      );
      return NextResponse.json(
        { error: `Database error: ${stateError.message}` },
        { status: 500 }
      );
    }

    if (!stateData) {
      logger.warn(
        `${logPrefix} User state not found for user ${userId.substring(
          0,
          8
        )}. Creating default preferences.`
      );
      
      // Create default preferences
      const defaultPreferences: UserWorkflowPreferences = {
        newsPreferredCategories: ["general"],
        newsSources: ["bbc-news", "cnn"],
        interestCategories: [],
        dailyBriefingEnabled: false,
        dailyBriefingTime: "08:00",
        dailyBriefingIncludeNews: true,
        dailyBriefingIncludeWeather: true,
        dailyBriefingIncludeCalendar: true,
        dailyBriefingIncludeReminders: true
      };
      
      // Insert default preferences into database
      const { error: insertError } = await supabaseAdmin
        .from(frameworkConfig.vectorStore.userStatesTableName)
        .upsert({
          user_id: userId,
          workflow_preferences: defaultPreferences
        }, { onConflict: "user_id" });
      
      if (insertError) {
        logger.error(
          `${logPrefix} Error creating default preferences for user ${userId.substring(0, 8)}:`,
          insertError
        );
        return NextResponse.json(
          { error: `Database error: ${insertError.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ preferences: defaultPreferences });
    }

    logger.info(
      `${logPrefix} Fetched preferences for user ${userId.substring(0, 8)}.`
    );
    
    return NextResponse.json({ 
      preferences: stateData.workflow_preferences || {} 
    });
  } catch (error: any) {
    logger.error(
      `${logPrefix} General error fetching preferences for user ${userId.substring(0, 8)}:`,
      error
    );
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API Preferences POST]";
  const userId = await getUserIdFromSession(req);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized - No session" },
      { status: 401 }
    );
  }
  logger.info(
    `${logPrefix} Update preferences request for user: ${userId.substring(0, 8)}...`
  );

  let requestBody: UserWorkflowPreferences;
  try {
    requestBody = await req.json();
  } catch (e: any) {
    return NextResponse.json(
      { error: `Invalid JSON request body: ${e.message}` },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    logger.error(`${logPrefix} Admin client unavailable.`);
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // Get existing state to merge preferences
    const { data: existingState, error: fetchError } = await supabaseAdmin
      .from(frameworkConfig.vectorStore.userStatesTableName)
      .select("workflow_preferences")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (fetchError) {
      logger.error(
        `${logPrefix} Error fetching existing preferences for user ${userId.substring(0, 8)}:`,
        fetchError
      );
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }
    
    // Merge existing preferences with new ones
    const existingPreferences = existingState?.workflow_preferences || {};
    const updatedPreferences = {
      ...existingPreferences,
      ...requestBody
    };
    
    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from(frameworkConfig.vectorStore.userStatesTableName)
      .upsert({
        user_id: userId,
        workflow_preferences: updatedPreferences
      }, { onConflict: "user_id" });
    
    if (updateError) {
      logger.error(
        `${logPrefix} Error updating preferences for user ${userId.substring(0, 8)}:`,
        updateError
      );
      return NextResponse.json(
        { error: `Database error: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    logger.info(
      `${logPrefix} Successfully updated preferences for user ${userId.substring(0, 8)}`
    );
    
    return NextResponse.json({ 
      success: true,
      preferences: updatedPreferences
    });
  } catch (error: any) {
    logger.error(
      `${logPrefix} General error updating preferences for user ${userId.substring(0, 8)}:`,
      error
    );
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
} 