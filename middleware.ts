// FILE: middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { logger } from '@/memory-framework/config';
import { getGlobalMemoryFramework } from '@/lib/memory-framework-global';

// Initialize memory framework at server startup
let memoryFrameworkInitialized = false;
const initializeMemoryFramework = async () => {
  if (!memoryFrameworkInitialized) {
    try {
      logger.info('[Middleware] Initializing global memory framework...');
      getGlobalMemoryFramework();
      memoryFrameworkInitialized = true;
      logger.info('[Middleware] Global memory framework initialized successfully.');
    } catch (error: any) {
      logger.error('[Middleware] Failed to initialize global memory framework:', error);
    }
  }
};

export async function middleware(request: NextRequest) {
  logger.debug(`[Middleware] Running for path: ${request.nextUrl.pathname}`);
  
  // Try to initialize memory framework (will only happen once)
  await initializeMemoryFramework();
  
  return await updateSession(request);
  // updateSession now handles redirection logic internally
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /auth/callback (Supabase callback handled differently)
     * - /api/auth/ (Internal auth routes)
     * - /api/public/ (Example public API route if needed)
     * - /sw.js (Service worker file)
     * - /manifest.json (PWA manifest)
     * - /icon-*.png (App icons)
     * - / (Landing page handled by updateSession redirect logic)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api/auth/|api/public/|sw.js|manifest.json|icon-.*\\.png$|$).*)',
    // Protect /chat explicitly if not covered by the negative lookahead
    '/chat/:path*',
    // Include API routes that require authentication
    '/api/chat/:path*',
    '/api/memory/:path*',
    '/api/personas/:path*',
    '/api/user/profile/:path*',
    '/api/files/upload/:path*',
    '/api/tools/execute/:path*',
    '/api/realtime/:path*',
    '/api/video/analyze/:path*',
    '/api/notifications/subscribe/:path*',
    '/api/messages/:path*',
    // Add other protected API routes as needed
  ],
};