import { supabase } from "@/lib/supabaseClient";
import { logger } from "../../memory-framework/config";

// Table names (adjust if needed)
const USAGE_TABLE = "tool_usage";
const CONFIG_TABLE = "tool_config";

// In-memory config cache
let toolConfigCache: Record<string, any> = {};
let lastConfigSync = 0;
const CONFIG_CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get per-user/tool usage counters from Supabase.
 * @param userId
 * @param toolName
 * @returns { count: number, lastUsed: string|null }
 */
export async function getUsage(userId: string, toolName: string) {
  const { data, error } = await supabase
    .from(USAGE_TABLE)
    .select("count,last_used")
    .eq("user_id", userId)
    .eq("tool_name", toolName)
    .single();
  if (error) {
    logger.warn(`[ToolUsageStore] getUsage error: ${error.message}`);
    return { count: 0, lastUsed: null };
  }
  return { count: data?.count || 0, lastUsed: data?.last_used || null };
}

/**
 * Increment per-user/tool usage counter in Supabase.
 * @param userId
 * @param toolName
 * @returns updated count
 */
export async function incrementUsage(userId: string, toolName: string) {
  const now = new Date().toISOString();
  // Upsert row
  const { data, error } = await supabase
    .from(USAGE_TABLE)
    .upsert({ user_id: userId, tool_name: toolName, count: 1, last_used: now }, { onConflict: "user_id,tool_name" })
    .select();
  if (error) {
    logger.warn(`[ToolUsageStore] incrementUsage error: ${error.message}`);
    return null;
  }
  // If row existed, increment
  if (data && data.length > 0 && data[0].count !== undefined) {
    const newCount = data[0].count + 1;
    await supabase
      .from(USAGE_TABLE)
      .update({ count: newCount, last_used: now })
      .eq("user_id", userId)
      .eq("tool_name", toolName);
    return newCount;
  }
  return 1;
}

/**
 * Get tool config (timeouts, limits, enabled, etc) from cache or Supabase.
 * @param toolName
 * @returns config object
 */
export async function getConfig(toolName: string) {
  await syncConfigCache();
  return toolConfigCache[toolName] || null;
}

/**
 * Set tool config in Supabase and update cache.
 * @param toolName
 * @param configObj
 */
export async function setConfig(toolName: string, configObj: Record<string, any>) {
  const { error } = await supabase
    .from(CONFIG_TABLE)
    .upsert({ tool_name: toolName, ...configObj }, { onConflict: "tool_name" });
  if (error) {
    logger.warn(`[ToolUsageStore] setConfig error: ${error.message}`);
    return false;
  }
  toolConfigCache[toolName] = configObj;
  return true;
}

/**
 * Sync config cache from Supabase if stale.
 */
export async function syncConfigCache(force = false) {
  const now = Date.now();
  if (!force && now - lastConfigSync < CONFIG_CACHE_TTL_MS) return;
  const { data, error } = await supabase.from(CONFIG_TABLE).select("*");
  if (error) {
    logger.warn(`[ToolUsageStore] syncConfigCache error: ${error.message}`);
    return;
  }
  toolConfigCache = {};
  for (const row of data || []) {
    toolConfigCache[row.tool_name] = row;
  }
  lastConfigSync = now;
} 