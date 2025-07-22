import { testToolRouterSchema } from "@/lib/utils/schemaTester";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

async function logProUserQuotas() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("[QUOTAS] Impossible d'initialiser le client Supabase admin.");
    return;
  }
  
  // Get Pro users
  const { data: proUsers, error } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('plan_type', 'PRO');
    
  if (error) {
    console.error("[QUOTAS] Erreur lors de la récupération des utilisateurs Pro:", error);
    return;
  }
  
  if (!proUsers || proUsers.length === 0) {
    console.log("[QUOTAS] Aucun utilisateur Pro trouvé.");
    return;
  }

  // Get current month date range
  const currentMonth = new Date();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const quotaPromises = proUsers.map(async (user) => {
    // Get real-time counts for each user
    const [recordingsResult, imagesResult, videosResult] = await Promise.all([
      supabase.from('audio_recordings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', firstDayOfMonth).lte('created_at', lastDayOfMonth),
      supabase.from('generated_images').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', firstDayOfMonth).lte('created_at', lastDayOfMonth),
      supabase.from('generated_videos').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', firstDayOfMonth).lte('created_at', lastDayOfMonth)
    ]);

    return {
      email: user.email,
      recordings: recordingsResult.count || 0,
      images: imagesResult.count || 0,
      videos: videosResult.count || 0
    };
  });

  const userQuotas = await Promise.all(quotaPromises);
  
  const logMsg = [
    '=========== QUOTAS RESTANTS UTILISATEURS PRO ===========',
    ...userQuotas.map(u => [
      `Utilisateur : ${u.email}`,
      `  Images     : ${u.images} / 30`,
      `  Vidéos     : ${u.videos} / 20`,
      `  Recordings : ${u.recordings} / 20`,
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