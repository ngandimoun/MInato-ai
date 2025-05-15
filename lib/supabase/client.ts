// FILE: lib/supabase/client.ts
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';
import { logger } from '@/memory-framework/config'; // Import logger (déjà présent)

// Ensure environment variables are non-null (add !).
// You might have a more robust way to handle this, but this is common.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Utiliser le logger au lieu de throw Error directement au niveau du module pour permettre au reste de l'app de potentiellement logger aussi.
  // Cependant, un throw est justifié ici car l'application ne peut pas fonctionner sans.
  logger.error("CRITICAL: Supabase URL or Anon Key is missing from environment variables for browser client.");
  throw new Error("Supabase URL or Anon Key is missing for browser client.");
}

// Singleton pattern for the browser client
let browserClientInstance: ReturnType<typeof _createBrowserClient> | null = null;

export function getBrowserSupabaseClient() {
  if (!browserClientInstance) {
    browserClientInstance = _createBrowserClient(supabaseUrl, supabaseAnonKey);
    // Utiliser logger.info au lieu de console.log pour la cohérence
    logger.info("[SupabaseClient] Browser Supabase client initialized.");
  }
  return browserClientInstance;
}

// You might also have your SupabaseDB class or admin client setup in a similar shared file,
// but getBrowserSupabaseClient is key for AuthProvider.