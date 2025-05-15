// FILE: app/auth/callback/google/route.ts
// (Content from finalcodebase.txt - verified)
import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";
import { appConfig } from "@/lib/config";
import { encryptData } from "@/lib/utils/encryption";
import { supabase, supabaseAdmin, } from "@/lib/supabaseClient";
import { logger } from "@/memory-framework/config";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { UserState } from "@/lib/types";

async function getUserIdFromCallbackRequest(
  req: NextRequest
): Promise<string | null> {
  const cookieStore = cookies();
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      logger.error(
        "[getUserIdFromCallbackRequest] Error getting session:",
        sessionError
      );
      return null;
    }
    if (!session?.user?.id) {
      logger.warn(
        "[getUserIdFromCallbackRequest] No active session found during callback."
      );
      return null;
    }
    logger.debug(
      `[getUserIdFromCallbackRequest] Identified user ${session.user.id.substring(
        0,
        8
      )} from session cookie.`
    );
    return session.user.id;
  } catch (error) {
    logger.error(
      "[getUserIdFromCallbackRequest] Exception getting user:",
      error
    );
    return null;
  }
}

export async function GET(req: NextRequest) {
  const logPrefix = "[API GoogleCallback]";
  const cookieStore = cookies();
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const receivedState = searchParams.get("state");
  const originalState = cookieStore.get("google_oauth_state")?.value;
  if (originalState) {
    cookieStore.delete("google_oauth_state");
    logger.debug(`${logPrefix} OAuth state cookie cleared.`);
  }
  if (!originalState || !receivedState || originalState !== receivedState) {
    logger.error(
      `${logPrefix} Invalid OAuth state parameter. Cookie: ${originalState}, Received: ${receivedState}. Potential CSRF.`
    );
    return NextResponse.redirect(
      new URL("/chat?error=google_invalid_state", appConfig.appUrl)
    );
  }
  logger.info(`${logPrefix} OAuth state validation successful.`);
  if (error) {
    logger.error(`${logPrefix} Error received from Google: ${error}`);
    return NextResponse.redirect(
      new URL(
        `/chat?error=google_auth_failed&details=${encodeURIComponent(error)}`,
        appConfig.appUrl
      )
    );
  }
  if (!code) {
    logger.error(`${logPrefix} Missing authorization code in callback.`);
    return NextResponse.redirect(
      new URL("/chat?error=google_missing_code", appConfig.appUrl)
    );
  }
  const userId = await getUserIdFromCallbackRequest(req);
  if (!userId) {
    logger.error(
      `${logPrefix} Could not identify user during callback (no active Supabase session).`
    );
    return NextResponse.redirect(
      new URL("/?error=session_expired_during_oauth", appConfig.appUrl)
    );
  }
  logger.info(
    `${logPrefix} Received callback for authenticated Supabase user ${userId.substring(
      0,
      8
    )} with code.`
  );

  try {
    if (
      !appConfig.apiKey.googleClientId ||
      !appConfig.apiKey.googleClientSecret ||
      !process.env.GOOGLE_REDIRECT_URI
    )
      throw new Error("Google OAuth Client credentials missing.");
    const oauth2Client = new OAuth2Client(
      appConfig.apiKey.googleClientId,
      appConfig.apiKey.googleClientSecret,
      process.env.GOOGLE_REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    const expiryDate = tokens.expiry_date;
    const scopes = tokens.scope?.split(" ") || [];
    if (!accessToken) throw new Error("Google did not return an access token.");
    const encryptedRefreshToken = refreshToken
      ? encryptData(refreshToken, appConfig.encryptionKey)
      : null;
    const encryptedAccessToken = accessToken
      ? encryptData(accessToken, appConfig.encryptionKey)
      : null;
    if (!encryptedAccessToken)
      throw new Error("Failed to secure access token.");
    if (refreshToken && !encryptedRefreshToken)
      throw new Error("Failed to secure refresh token.");
    if (!supabaseAdmin)
      throw new Error("Supabase Admin client not available for token storage.");
    const integrationData: any = {
      user_id: userId,
      provider: "google",
      scopes: scopes,
      status: "active",
      updated_at: new Date().toISOString(),
      last_error: null,
      ...(encryptedAccessToken && {
        access_token_encrypted: encryptedAccessToken,
      }),
      ...(expiryDate && {
        token_expires_at: new Date(expiryDate).toISOString(),
      }),
      ...(encryptedRefreshToken && {
        refresh_token_encrypted: encryptedRefreshToken,
      }),
    };
    logger.info(
      `${logPrefix} Preparing to upsert Google integration for Supabase user ${userId.substring(
        0,
        8
      )}.`
    );
    const { error: upsertError } = await supabase
      .from("user_integrations")
      .upsert(integrationData, { onConflict: "user_id, provider" });
    if (upsertError) {
      logger.error(
        `${logPrefix} Failed to save Google tokens to DB for user ${userId}:`,
        upsertError
      );
      throw new Error("Database error saving integration details.");
    }
    logger.info(
      `${logPrefix} Google integration data saved successfully for user ${userId.substring(
        0,
        8
      )}.`
    );
    let stateUpdate: Partial<UserState> = {};
    if (scopes.includes("https://www.googleapis.com/auth/calendar.readonly"))
      stateUpdate.googleCalendarEnabled = true;
    if (scopes.includes("https://www.googleapis.com/auth/gmail.readonly"))
      stateUpdate.googleEmailEnabled = true;
    if (Object.keys(stateUpdate).length > 0) {
      logger.info(
        `${logPrefix} Updating user state consent flags based on granted scopes for user ${userId.substring(
          0,
          8
        )}...`
      );
      await supabaseAdmin.updateState(userId, stateUpdate);
    }
    logger.info(
      `${logPrefix} Redirecting user to chat page (google=connected).`
    );
    return NextResponse.redirect(
      new URL("/chat?google=connected", appConfig.appUrl)
    );
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error during token exchange or DB operation for user ${userId}:`,
      error
    );
    return NextResponse.redirect(
      new URL(
        `/chat?error=google_token_exchange_failed&details=${encodeURIComponent(
          error.message || "Unknown error"
        )}`,
        appConfig.appUrl
      )
    );
  }
}
