// FILE: lib/supabase/server.ts
import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/memory-framework/config'; // Utilisation du logger configuré

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error("CRITICAL: Supabase URL or Anon Key is missing from environment variables for server-side SSR clients.");
  throw new Error("Supabase URL or Anon Key is missing for server-side SSR clients.");
}

// Fonction pour créer un client Supabase dans les Route Handlers, Server Actions, ou Server Components
// qui ont besoin d'accéder à la session utilisateur.
// Le paramètre p0: unknown est inutile et a été retiré.
export async function createServerSupabaseClient(): Promise<ReturnType<typeof _createServerClient>> {
  const cookieStore = await cookies();
  return _createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          logger.debug("[Supabase ServerClient] Ignoring cookie set error from Server Component (likely expected if middleware handles refresh).");
        }
      },
      remove(name: string, options: CookieOptions): void {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          logger.debug("[Supabase ServerClient] Ignoring cookie remove error from Server Component (likely expected if middleware handles refresh).");
        }
      },
    },
  });
}
// Renommer createSupabaseRouteHandlerClient pour plus de clarté car elle sert à plus que les Route Handlers.
// Si vous voulez garder une fonction spécifique pour les Route Handlers, elle pourrait juste appeler createServerSupabaseClient.
export async function createSupabaseRouteHandlerClient(p0: unknown): Promise<ReturnType<typeof _createServerClient>> {
    // Cette fonction est maintenant un alias pour la clarté dans les Route Handlers,
    // mais createServerSupabaseClient est la fonction principale.
    return createServerSupabaseClient();
}


// Admin client setup (reste identique, mais utilise le logger)
import { createClient as createAdminClientBase, SupabaseClient } from '@supabase/supabase-js';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabaseAdminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient | null {
    if (typeof window !== "undefined") {
        logger.warn("[SupabaseServer] Attempted to initialize Supabase Admin client on the client-side. Returning null.");
        return null;
    }
    if (!supabaseAdminClientInstance) {
        if (!supabaseServiceRoleKey && process.env.NODE_ENV !== "test") {
            logger.error("[SupabaseServer] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set. Admin client cannot be initialized.");
            return null;
        }
         if (!supabaseUrl) {
            logger.error("[SupabaseServer] CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set. Admin client cannot be initialized.");
            return null;
        }
        if (supabaseServiceRoleKey || process.env.NODE_ENV === "test") {
            supabaseAdminClientInstance = createAdminClientBase( // Renommer l'import pour éviter conflit
                supabaseUrl,
                supabaseServiceRoleKey || 'dummy_service_key_for_test',
                { auth: { autoRefreshToken: false, persistSession: false } }
            );
            logger.info("[SupabaseServer] Supabase Admin client initialized.");
        } else {
            logger.error("[SupabaseServer] Admin client not initialized due to missing Service Role Key.");
        }
    }
    return supabaseAdminClientInstance;
}