// FILE: app/api/auth/disconnect/google/route.ts
// (Content from finalcodebase.txt - verified)
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { appConfig } from "@/lib/config";
import { decryptData } from "@/lib/utils/encryption";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { logger } from "@/memory-framework/config";

const maxTokens = appConfig?.openai?.maxTokens ?? 4096;
const planningModel = appConfig?.llm?.planningModel ?? "o4-mini-2025-04-16";
const extractionModel = appConfig?.llm?.extractionModel ?? "gpt-4.1-nano-2025-04-14";
const chatModel = appConfig?.llm?.chatModel ?? "gpt-4.1-mini-2025-04-14";

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const cookieStore = cookies();
  try {
    const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.user?.id) {
      logger.warn("[API GoogleDisconnect Auth] No active session found.");
      return null;
    }
    return session.user.id;
  } catch (error) {
    logger.error("[API GoogleDisconnect Auth] Exception:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API Auth Disconnect Google]";
  const cookieStore = await cookies();
  const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
  let userId: string;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      logger.error(`${logPrefix} Auth Supabase getUser error:`, error.message);
      throw new Error("Authentication failed");
    }
    if (!user?.id) {
      logger.warn(`${logPrefix} Auth No authenticated Supabase user found.`);
      throw new Error("Unauthorized");
    }
    userId = user.id;
  } catch (authError: any) {
    logger.error(`${logPrefix} Auth check failed:`, authError.message);
    const status = authError.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: authError.message }, { status });
  }

  logger.info(`${logPrefix} Request for user: ${(userId ?? "unknown").substring(0, 8)}`);

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    logger.error(`${logPrefix} Admin client unavailable.`);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
  if (
    !appConfig.toolApiKeys.googleClientId ||
    !appConfig.toolApiKeys.googleClientSecret
  ) {
    logger.error(`${logPrefix} Google OAuth client config missing.`);
    return NextResponse.json(
      { error: "Google integration not configured on server." },
      { status: 500 }
    );
  }

  try {
    const { data: integrationData, error: fetchError } = await supabase
      .from("user_integrations")
      .select("refresh_token_encrypted")
      .eq("user_id", userId)
      .eq("provider", "google")
      .maybeSingle();
    if (fetchError) {
      logger.error(
        `${logPrefix} Error fetching Google integration data for user ${(userId ?? "unknown").substring(0, 8)}:`,
        fetchError
      );
      throw new Error("Database error fetching integration details.");
    }
    const encryptedToken = integrationData?.refresh_token_encrypted;
    let tokenRevoked = false;
    if (encryptedToken) {
      const refreshToken = decryptData(encryptedToken, appConfig.encryptionKey);
      if (refreshToken) {
        try {
          const oauth2Client = new OAuth2Client(
            appConfig.toolApiKeys.googleClientId,
            appConfig.toolApiKeys.googleClientSecret
          );
          await oauth2Client.revokeToken(refreshToken);
          logger.info(
            `${logPrefix} Google refresh token successfully revoked for user ${(userId ?? "unknown").substring(0, 8)}.`
          );
          tokenRevoked = true;
        } catch (revokeError: any) {
          logger.warn(
            `${logPrefix} Failed to revoke Google token for user ${(userId ?? "unknown").substring(0, 8)} (maybe already invalid):`,
            revokeError.message
          );
          tokenRevoked = false;
        }
      } else {
        logger.warn(
          `${logPrefix} Failed to decrypt refresh token for user ${(userId ?? "unknown").substring(0, 8)}. Cannot revoke.`
        );
      }
    } else {
      logger.info(
        `${logPrefix} No refresh token found in DB for user ${(userId ?? "unknown").substring(0, 8)}. Skipping Google revocation.`
      );
      tokenRevoked = true;
    }
    const { error: deleteError } = await supabaseAdmin
      .from("user_integrations")
      .delete()
      .eq("user_id", userId)
      .eq("provider", "google");
    if (deleteError) {
      logger.warn(
        `${logPrefix} Failed to delete integration record from DB for user ${(userId ?? "unknown").substring(0, 8)}, but token might be revoked.`,
        deleteError.message
      );
    } else {
      logger.info(
        `${logPrefix} Successfully deleted Google integration record for user ${(userId ?? "unknown").substring(0, 8)}.`
      );
    }
    logger.info(
      `${logPrefix} Updating user state to remove Google consent flags for user ${(userId ?? "unknown").substring(0, 8)}...`
    );
    const { error: updateStateError } = await supabaseAdmin
      .from("user_states")
      .update({
        googlecalendarenabled: false,
        googleemailenabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (updateStateError) {
      logger.error(`${logPrefix} Failed to update user state: ${updateStateError.message}`);
      return NextResponse.json({ error: "Failed to update user state but token was revoked" }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: "Google integration disconnected.",
    });
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error disconnecting Google for user ${(userId ?? "unknown").substring(0, 8)}:`,
      error
    );
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
