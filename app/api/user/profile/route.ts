// FILE: app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server"; // Correction de l'import
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  UserState,
  UserProfile,
  OpenAITtsVoice,
  OpenAIRealtimeVoice,
  UserWorkflowPreferences,
} from "@/lib/types/index";
import { logger } from "@/memory-framework/config";
import { config as frameworkConfig } from "@/memory-framework/config"; // Utilisé pour les noms de table
import { appConfig } from "@/lib/config"; // Utilisé pour les valeurs par défaut
import { DEFAULT_USER_NAME, DEFAULT_PERSONA_ID } from "@/lib/constants";
// SupabaseDB n'est pas utilisé directement dans ce fichier, mais c'est ok de l'importer si d'autres fichiers l'utilisent.

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  // Utilisation de createSupabaseRouteHandlerClient corrigée
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
        "[API Profile Auth] Supabase getUser error:",
        userError.message
      );
      return null;
    }
    if (!user?.id) {
      logger.warn("[API Profile Auth] No authenticated Supabase user found.");
      return null;
    }
    return user.id;
  } catch (error: any) {
    logger.error(
      "[API Profile Auth] Exception checking Supabase session:",
      error.message
    );
    return null;
  }
}

export async function GET(req: NextRequest) {
  const logPrefix = "[API Profile GET]";
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
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from(frameworkConfig.vectorStore.userProfilesTableName)
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      logger.error(
        `${logPrefix} Error fetching profile for user ${userId.substring(
          0,
          8
        )}:`,
        profileError
      );
    }

    const { data: stateData, error: stateError } = await supabaseAdmin
      .from(frameworkConfig.vectorStore.userStatesTableName)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (stateError) {
      logger.error(
        `${logPrefix} Error fetching state for user ${userId.substring(0, 8)}:`,
        stateError
      );
    }

    if (!profileData && !stateData) {
      logger.warn(
        `${logPrefix} Profile and State not found for user ${userId.substring(
          0,
          8
        )}. Client should initiate creation.`
      );
      return NextResponse.json(
        { error: "User profile and state not found." },
        { status: 404 }
      );
    }

    logger.info(
      `${logPrefix} Fetched data for user ${userId.substring(
        0,
        8
      )}. Profile: ${!!profileData}, State: ${!!stateData}.`
    );
    return NextResponse.json({ profile: profileData, state: stateData });
  } catch (error: any) {
    logger.error(
      `${logPrefix} General error fetching profile/state for user ${userId.substring(
        0,
        8
      )}:`,
      error
    );
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API Profile POST]";
  const userId = await getUserIdFromSession(req);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized - No session" },
      { status: 401 }
    );
  }
  logger.info(
    `${logPrefix} Update/Create request for user: ${userId.substring(0, 8)}...`
  );

  let requestBody: Partial<
    UserProfile & UserState & { onboarding_complete?: boolean }
  >;
  try {
    requestBody = await req.json();
  } catch (e: any) {
    // Typer l'erreur explicitement
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
  const userProfilesTable = frameworkConfig.vectorStore.userProfilesTableName;
  const userStatesTable = frameworkConfig.vectorStore.userStatesTableName;

  // Correction: Initialiser profileUpdates avec toutes les propriétés optionnelles de UserProfile
  const profileUpdates: Partial<UserProfile> = {};
  const stateUpdates: Partial<
    Omit<UserState, "user_id" | "last_interaction_at">
  > = {};

  if (requestBody.hasOwnProperty("email"))
    profileUpdates.email = requestBody.email;
  if (requestBody.hasOwnProperty("full_name"))
    profileUpdates.full_name = requestBody.full_name;
  if (requestBody.hasOwnProperty("first_name"))
    profileUpdates.first_name = requestBody.first_name;
  if (requestBody.hasOwnProperty("avatar_url"))
    profileUpdates.avatar_url = requestBody.avatar_url;

  if (requestBody.hasOwnProperty("onboarding_complete"))
    stateUpdates.onboarding_complete = requestBody.onboarding_complete;
  if (requestBody.hasOwnProperty("active_persona_id"))
    stateUpdates.active_persona_id = requestBody.active_persona_id;
  if (requestBody.hasOwnProperty("preferred_locale"))
    stateUpdates.preferred_locale = requestBody.preferred_locale;
  if (requestBody.hasOwnProperty("user_first_name"))
    stateUpdates.user_first_name = requestBody.user_first_name;
  if (requestBody.hasOwnProperty("latitude"))
    stateUpdates.latitude = requestBody.latitude;
  if (requestBody.hasOwnProperty("longitude"))
    stateUpdates.longitude = requestBody.longitude;
  if (requestBody.hasOwnProperty("timezone"))
    stateUpdates.timezone = requestBody.timezone;
  if (requestBody.hasOwnProperty("country_code"))
    stateUpdates.country_code = requestBody.country_code;
  if (requestBody.hasOwnProperty("require_tool_confirmation"))
    stateUpdates.require_tool_confirmation =
      requestBody.require_tool_confirmation;
  if (requestBody.hasOwnProperty("notifications_enabled"))
    stateUpdates.notifications_enabled = requestBody.notifications_enabled;
  if (requestBody.hasOwnProperty("googlecalendarenabled"))
    stateUpdates.googlecalendarenabled = requestBody.googlecalendarenabled;
  if (requestBody.hasOwnProperty("googleemailenabled"))
    stateUpdates.googleemailenabled = requestBody.googleemailenabled;
  if (requestBody.hasOwnProperty("chainedvoice"))
    stateUpdates.chainedvoice = requestBody.chainedvoice as OpenAITtsVoice;
  if (requestBody.hasOwnProperty("realtimevoice"))
    stateUpdates.realtimevoice =
      requestBody.realtimevoice as OpenAIRealtimeVoice;
  if (requestBody.hasOwnProperty("toolconfirmation"))
    stateUpdates.toolconfirmation = requestBody.toolconfirmation;
  if (
    requestBody.hasOwnProperty("workflow_preferences") &&
    typeof requestBody.workflow_preferences === "object"
  ) {
    stateUpdates.workflow_preferences =
      requestBody.workflow_preferences as UserWorkflowPreferences | null;
  }

  try {
    // Build profileToUpsert only if the client actually sent profile fields
    const profileUpdateKeys = Object.keys(profileUpdates);
    let upsertedProfile: UserProfile | null = null;

    if (profileUpdateKeys.length > 0) {
      // If full_name or first_name are missing in the payload, keep existing DB values instead of setting defaults
      // Fetch the current profile so we don't overwrite existing data with defaults
      const { data: existingProfile } = await supabaseAdmin
        .from(userProfilesTable)
        .select("email, full_name, first_name")
        .eq("id", userId)
        .maybeSingle();

      const profileToUpsert: Partial<UserProfile> & { id: string } = {
        id: userId,
        // Only overwrite columns that the caller actually sent
        ...existingProfile,
        ...profileUpdates,
      };

      logger.debug(
        `${logPrefix} Upserting profile for ${userId.substring(0, 8)}:`,
        profileToUpsert
      );

      const { data, error: profileError } = await supabaseAdmin
        .from(userProfilesTable)
        .upsert(profileToUpsert)
        .select()
        .single();

      if (profileError) {
        logger.error(
          `${logPrefix} Profile upsert failed for user ${userId.substring(
            0,
            8
          )}:`,
          profileError
        );
        throw new Error(
          `Profile update/creation failed: ${profileError.message}`
        );
      }

      upsertedProfile = data;
    } else {
      // No profile fields were updated – fetch the existing profile once for later logic
      const { data } = await supabaseAdmin
        .from(userProfilesTable)
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      upsertedProfile = data as UserProfile | null;
    }

    const stateToUpsert: UserState = {
      user_id: userId,
      active_persona_id: stateUpdates.active_persona_id ?? DEFAULT_PERSONA_ID,
      preferred_locale:
        stateUpdates.preferred_locale ?? appConfig.defaultLocale ?? "en-US",
      onboarding_complete:
        typeof stateUpdates.onboarding_complete === "boolean"
          ? stateUpdates.onboarding_complete
          : true, // Assurer un booléen
      user_first_name:
        stateUpdates.user_first_name ??
        upsertedProfile?.first_name ??
        DEFAULT_USER_NAME,
      last_interaction_at: new Date().toISOString(),
      latitude: stateUpdates.latitude ?? null,
      longitude: stateUpdates.longitude ?? null,
      timezone: stateUpdates.timezone ?? null,
      country_code: stateUpdates.country_code ?? null,
      require_tool_confirmation:
        stateUpdates.require_tool_confirmation ?? false,
      notifications_enabled: stateUpdates.notifications_enabled ?? true,
      googlecalendarenabled: stateUpdates.googlecalendarenabled ?? false,
      googleemailenabled: stateUpdates.googleemailenabled ?? false,
      chainedvoice:
        stateUpdates.chainedvoice ?? appConfig.openai.ttsDefaultVoice,
      realtimevoice: stateUpdates.realtimevoice ?? undefined,
      toolconfirmation: stateUpdates.toolconfirmation ?? false,
      workflow_preferences: stateUpdates.workflow_preferences ?? null,
    };

    logger.debug(
      `${logPrefix} Upserting state for ${userId.substring(0, 8)}:`,
      stateToUpsert
    );
    const { data: upsertedState, error: stateError } = await supabaseAdmin
      .from(userStatesTable)
      .upsert(stateToUpsert, { onConflict: "user_id" })
      .select()
      .single();

    if (stateError) {
      logger.error(
        `${logPrefix} State upsert failed for user ${userId.substring(0, 8)}:`,
        stateError
      );
      throw new Error(`State update/creation failed: ${stateError.message}`);
    }

    logger.info(
      `${logPrefix} Profile and State for user ${userId.substring(
        0,
        8
      )} upserted successfully.`
    );
    return NextResponse.json({
      success: true,
      message: "User data updated.",
      profile: upsertedProfile,
      state: upsertedState,
    });
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error during upsert for user ${userId.substring(0, 8)}:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
