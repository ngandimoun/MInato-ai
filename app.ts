import { testToolRouterSchema } from "@/lib/utils/schemaTester";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

async function logProUserQuotas() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[QUOTAS] Impossible d'initialiser le client Supabase admin.");
    return;
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email, monthly_usage')
    .eq('plan_type', 'PRO');
  if (error) {
    console.error("[QUOTAS] Erreur lors de la récupération des quotas:", error);
    return;
  }
  if (!data || data.length === 0) {
    console.log("[QUOTAS] Aucun utilisateur Pro trouvé.");
    return;
  }
  const logMsg = [
    '=========== QUOTAS RESTANTS UTILISATEURS PRO ===========',
    ...data.map(u => [
      `Utilisateur : ${u.email}`,
      `  Images     : ${(u.monthly_usage?.images ?? 0)} / 30`,
      `  Vidéos     : ${(u.monthly_usage?.videos ?? 0)} / 20`,
      `  Recordings : ${(u.monthly_usage?.recordings ?? 0)} / 20`,
      ''
    ].join('\n')),
    '========================================================'
  ].join('\n');
  console.log(logMsg);
}

async function initializeApp() {
  try {
    testToolRouterSchema();
    await logProUserQuotas();
    // ... existing initialization code ...
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
} 