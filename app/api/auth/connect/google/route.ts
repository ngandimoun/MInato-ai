// FILE: app/api/auth/connect/google/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { appConfig } from "@/lib/config";
// CHANGER L'IMPORT pour utiliser createServerSupabaseClient de votre lib/supabase/server.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/memory-framework/config";

export async function GET(req: NextRequest) {
  const logPrefix = "[API GoogleConnect Initiate]";
  const cookieStore = cookies();
  let userId: string | null = null;

  // --- Authentification Supabase ---
  try {
    const supabase = createServerSupabaseClient(); // Utiliser le client pour Route Handler
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(); // Utiliser getUser()

    if (userError) {
      logger.error(
        `${logPrefix} Auth] Supabase getUser() error:`,
        userError.message
      );
      // Laisser la vérification !user ci-dessous gérer le cas d'erreur
    }
    if (!user) {
      logger.warn(
        `${logPrefix} Auth] No active Supabase user found via getUser(). Cannot initiate Google Connect.`
      );
      return NextResponse.json(
        {
          error:
            "Unauthorized - User session required to connect Google account.",
        },
        { status: 401 }
      );
    }
    userId = user.id;
    logger.info(
      `${logPrefix} Initiate request from authenticated Supabase user: ${userId.substring(
        0,
        8
      )}...`
    );
  } catch (authError: any) {
    logger.error(
      `${logPrefix} Auth Exception during client creation or getUser call:`,
      authError.message,
      authError.stack
    );
    return NextResponse.json(
      { error: "Authentication process error" },
      { status: 500 }
    );
  }
  // --- Fin Authentification Supabase ---

  const scopeParam = req.nextUrl.searchParams.get("scope");
  let scopes: string[] = [];
  const calendarScopes = ["https://www.googleapis.com/auth/calendar.readonly"]; // Accès lecture seule
  const emailScopes = ["https://www.googleapis.com/auth/gmail.readonly"]; // Accès lecture seule des métadonnées/corps
  // Vous pouvez ajouter d'autres scopes si nécessaire, par exemple :
  // const emailModifyScopes = ["https://www.googleapis.com/auth/gmail.modify"];
  // const tasksScopes = ["https://www.googleapis.com/auth/tasks"];

  if (scopeParam === "calendar") scopes = calendarScopes;
  else if (scopeParam === "email") scopes = emailScopes;
  else if (scopeParam === "both")
    scopes = [...calendarScopes, ...emailScopes]; // Exemple pour les deux
  else {
    logger.warn(
      `${logPrefix} Missing or invalid scope parameter: '${scopeParam}' for user ${userId.substring(
        0,
        8
      )}.`
    );
    return NextResponse.json(
      {
        error:
          'Missing or invalid scope parameter (must be "calendar", "email", or "both")',
      },
      { status: 400 }
    );
  }

  if (
    !appConfig.apiKey.googleClientId ||
    !appConfig.apiKey.googleClientSecret ||
    !process.env.GOOGLE_REDIRECT_URI // Assurez-vous que GOOGLE_REDIRECT_URI est bien dans votre .env
  ) {
    logger.error(
      `${logPrefix} Google OAuth client configuration is missing on the server for user ${userId.substring(
        0,
        8
      )}.`
    );
    return NextResponse.json(
      { error: "Google integration is not properly configured on the server." },
      { status: 500 }
    );
  }

  try {
    const oauth2Client = new OAuth2Client(
      appConfig.apiKey.googleClientId,
      appConfig.apiKey.googleClientSecret,
      process.env.GOOGLE_REDIRECT_URI // Doit correspondre à ce qui est configuré dans Google Cloud Console
    );

    const state = randomBytes(16).toString("hex"); // CSRF protection token

    // Inclure access_type: 'offline' pour obtenir un refresh_token
    // Inclure prompt: 'consent' pour forcer l'écran de consentement Google à chaque fois (utile pour le dev ou si les scopes changent)
    // En production, vous pourriez omettre 'prompt: consent' après la première autorisation si les scopes ne changent pas,
    // mais le demander explicitement est plus sûr si vous permettez aux utilisateurs de révoquer/changer les permissions.
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Essentiel pour obtenir un refresh_token
      scope: scopes,
      prompt: "consent", // Recommande de demander le consentement pour s'assurer que l'utilisateur voit les scopes
      state: state, // Pour la protection CSRF
    });

    // Stocker l'état dans un cookie HttpOnly, Secure
    cookieStore.set("google_oauth_state", state, {
      path: "/", // Accessible sur tout le site
      maxAge: 60 * 10, // 10 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // 'lax' est un bon compromis pour les redirections OAuth
    });

    logger.info(
      `${logPrefix} Generated Google Auth URL with state and scopes [${scopes.join(
        ", "
      )}] for user ${userId.substring(0, 8)}. Redirecting user.`
    );
    // Renvoyer l'URL d'autorisation au client, qui effectuera la redirection
    return NextResponse.json({ authorizeUrl });
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error generating Google auth URL for user ${userId.substring(
        0,
        8
      )}:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { error: "Failed to initiate Google connection process." },
      { status: 500 }
    );
  }
}
