// FILE: lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/memory-framework/config'; // Assurez-vous que ce chemin est correct

export async function updateSession(request: NextRequest) {
  const requestPath = request.nextUrl.pathname;
  logger.debug(`[Middleware] Processing request for path: ${requestPath}`);

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    logger.error("[Middleware] Supabase URL or Key missing. Cannot update session. Request will proceed without session update.");
    return response; // Laisse passer la requête, la protection de route individuelle doit gérer ça.
  }

  // Log des cookies entrants dans le middleware
  const initialCookiesArray = request.cookies.getAll();
  const initialCookiesLog = initialCookiesArray.length > 0
    ? initialCookiesArray.map(c => `${c.name}=${c.value.substring(0,15)}...`).join('; ')
    : "No cookies in request.";
  logger.debug(`[Middleware] Path: ${requestPath} - Initial request cookies: ${initialCookiesLog}`);
  if (!initialCookiesArray.some(c => c.name.startsWith('sb-'))) {
    logger.debug(`[Middleware] Path: ${requestPath} - No Supabase auth cookies found in initial request.`);
  }


  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        const cookie = request.cookies.get(name);
        // logger.debug(`[Middleware Cookie GET] Name: ${name}, Value: ${cookie?.value ? cookie.value.substring(0,10)+'...' : 'undefined'}`);
        return cookie?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // logger.debug(`[Middleware Cookie SET] Name: ${name}, Value: ${value.substring(0,10)+'...'}, Options: ${JSON.stringify(options)}`);
        try {
          request.cookies.set({ name, value, ...options }); // Tenter de mettre à jour pour la requête actuelle (peut ne pas être vu par le même cycle)
          response.cookies.set({ name, value, ...options }); // Mettre sur la réponse sortante
        } catch (error) {
           logger.debug(`[Middleware Cookie SET] Ignoring cookie set error (Path: ${requestPath}). Error: ${error}`);
        }
      },
      remove(name: string, options: CookieOptions) {
        // logger.debug(`[Middleware Cookie REMOVE] Name: ${name}, Options: ${JSON.stringify(options)}`);
        try {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        } catch (error) {
           logger.debug(`[Middleware Cookie REMOVE] Ignoring cookie remove error (Path: ${requestPath}). Error: ${error}`);
        }
      },
    },
  });

  logger.debug(`[Middleware] Path: ${requestPath} - About to call supabase.auth.getSession()...`);
  const { data: { session: sessionFromGetSession }, error: refreshError } = await supabase.auth.getSession();

  if (refreshError) {
    logger.error(`[Middleware] Path: ${requestPath} - Error during getSession() (refresh attempt): ${refreshError.message}`);
    // Si getSession() échoue, la session est potentiellement invalide.
    // On continue pour que getUser() confirme l'état.
  } else {
    if (sessionFromGetSession) {
        logger.debug(`[Middleware] Path: ${requestPath} - getSession() successful. Session User ID: ${sessionFromGetSession.user?.id?.substring(0,8) || "None"}. Expires at: ${sessionFromGetSession.expires_at ? new Date(sessionFromGetSession.expires_at * 1000).toISOString() : 'N/A'}`);
    } else {
        logger.debug(`[Middleware] Path: ${requestPath} - getSession() successful, but no session returned.`);
    }
  }

  logger.debug(`[Middleware] Path: ${requestPath} - About to call supabase.auth.getUser()...`);
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  if (getUserError) {
    logger.error(`[Middleware] Path: ${requestPath} - Error during getUser(): ${getUserError.message}`);
    // user sera null
  } else {
    if (user) {
        logger.info(`[Middleware] Path: ${requestPath} - getUser() successful. Authenticated User ID: ${user.id.substring(0,8)}`);
    } else {
        logger.info(`[Middleware] Path: ${requestPath} - getUser() successful, but no authenticated user found (session likely invalid or expired and not refreshable).`);
    }
  }
  
  const finalResponseCookiesArray = response.cookies.getAll(); // Lire les cookies mis sur la réponse
  const finalResponseCookiesLog = finalResponseCookiesArray.length > 0
    ? finalResponseCookiesArray.map(c => `${c.name}=${c.value.substring(0,15)}...`).join('; ')
    : "No cookies set on response by middleware.";
  logger.debug(`[Middleware] Path: ${requestPath} - Cookies being set on outgoing response: ${finalResponseCookiesLog}`);


  // Logique de redirection existante
  const logPath = requestPath.substring(0,100);
  const logPrefix = `[Middleware Logic User:${user ? user.id.substring(0,5) : 'NoUser'}] Path: ${logPath}`;
  logger.debug(`${logPrefix}`);

  const protectedPaths = ['/chat']; // Et autres que vous définissez
  // Vérifier si request.nextUrl.pathname est dans protectedPaths
  // ou si c'est une route API qui devrait être protégée
  const isApiRoute = requestPath.startsWith('/api/');
  const isProtectedRoute = protectedPaths.some(path => requestPath.startsWith(path));

  if ((isProtectedRoute || (isApiRoute && !requestPath.startsWith('/api/auth'))) && !user) { // Exclure /api/auth des protections API strictes
    logger.warn(`${logPrefix} Unauthorized access attempt to ${requestPath}.`);
    if (isApiRoute) {
      // Pour les routes API, retourner 401 au lieu de rediriger
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    } else {
      // Pour les pages, rediriger vers la page de connexion (/)
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('redirectedFrom', requestPath);
      logger.info(`${logPrefix} Redirecting to / due to unauthorized access to protected page.`);
      return NextResponse.redirect(url);
    }
  }

  if (user && requestPath === '/') {
     logger.info(`${logPrefix} User logged in, on landing page, redirecting to /chat`);
     const url = request.nextUrl.clone();
     url.pathname = '/chat';
     return NextResponse.redirect(url);
  }

  logger.debug(`[Middleware] Path: ${requestPath} - Processing complete, returning response.`);
  return response;
}