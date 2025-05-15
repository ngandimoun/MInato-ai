// FILE: app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
// Renommer createSupabaseRouteHandlerClient en createServerSupabaseClient pour suivre la nomenclature de lib/supabase/server.ts
// si vous avez appliqué ce changement. Sinon, gardez l'ancien nom.
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers"; // Assurez-vous que ceci est bien importé
import { logger } from "@/memory-framework/config"; // Utiliser le logger configuré

export const dynamic = "force-dynamic"; // Important pour les Route Handlers qui lisent/écrivent des cookies

export async function GET(request: NextRequest) {
  const logPrefix = "[AuthCallback Route]";
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // `next` est un paramètre que vous pourriez ajouter pour rediriger vers une page spécifique après la connexion
  const next = requestUrl.searchParams.get("next") ?? "/chat"; // Default redirect to /chat

  if (!code) {
    logger.error(`${logPrefix} No authorization code found in callback URL.`);
    const errorUrl = new URL("/", request.url); // Rediriger vers la page d'accueil
    errorUrl.searchParams.set("error", "auth_callback_error");
    errorUrl.searchParams.set(
      "error_description",
      "Authorization code missing."
    );
    return NextResponse.redirect(errorUrl);
  }

  logger.info(
    `${logPrefix} Received authorization code. Attempting to exchange for session...`
  );

  const cookieStore = cookies();
  // Utiliser createServerSupabaseClient comme défini dans lib/supabase/server.ts
  const supabase = createServerSupabaseClient(); // createSupabaseRouteHandlerClient({ cookies: () => cookieStore })

  const { error: exchangeError, data } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    logger.error(
      `${logPrefix} Error exchanging code for session: ${exchangeError.message}`,
      exchangeError
    );
    const errorUrl = new URL("/", request.url); // Rediriger vers la page d'accueil
    errorUrl.searchParams.set("error", "auth_exchange_failed");
    errorUrl.searchParams.set(
      "error_description",
      exchangeError.message || "Could not complete login process."
    );
    if (
      exchangeError.message.includes("code verifier") ||
      exchangeError.message.includes("Invalid PKCE")
    ) {
      errorUrl.searchParams.append(
        "debug_info",
        "PKCE verifier issue suspected."
      );
    }
    return NextResponse.redirect(errorUrl);
  }

  logger.info(
    `${logPrefix} Code exchanged successfully. Session should be set for User: ${data.user?.id.substring(
      0,
      8
    )}.`
  );

  // Redirection vers `next` qui est '/chat' par défaut.
  // Assurez-vous que l'URL est correctement construite.
  // S'assurer que `next` est une route relative sécurisée.
  let redirectPath = next;
  if (!redirectPath.startsWith("/")) {
    logger.warn(
      `${logPrefix} Invalid 'next' parameter: ${redirectPath}. Defaulting to /chat.`
    );
    redirectPath = "/chat";
  }
  const finalRedirectUrl = new URL(redirectPath, request.url);
  logger.info(
    `${logPrefix} Redirecting user to: ${finalRedirectUrl.toString()}`
  );

  // Doit retourner une réponse pour définir les cookies de session
  return NextResponse.redirect(finalRedirectUrl);
}
