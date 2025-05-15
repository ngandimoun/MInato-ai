// FILE: lib/rate-limiter.ts
// (Content from finalcodebase.txt - verified)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { appConfig } from "./config";
import {
  RATE_LIMIT_ID_CHAT,
  RATE_LIMIT_ID_AUDIO_INPUT,
  RATE_LIMIT_ID_REALTIME_SESSION,
  RATE_LIMIT_ID_VISUAL_ANALYSIS_REALTIME,
  RATE_LIMIT_ID_TOOL_EXECUTION,
  RATE_LIMIT_ID_VIDEO_ANALYSIS,
  RATE_LIMIT_ID_USER_PROFILE,
  RATE_LIMIT_ID_FILE_UPLOAD, // Added
} from "./constants";
import { logger } from "../memory-framework/config";

// Configuration des limites
const limits = {
  [RATE_LIMIT_ID_CHAT]: { limit: 30, duration: "60 s" },
  [RATE_LIMIT_ID_AUDIO_INPUT]: { limit: 15, duration: "60 s" },
  [RATE_LIMIT_ID_REALTIME_SESSION]: { limit: 5, duration: "600 s" },
  [RATE_LIMIT_ID_VISUAL_ANALYSIS_REALTIME]: { limit: 25, duration: "60 s" },
  [RATE_LIMIT_ID_TOOL_EXECUTION]: { limit: 40, duration: "60 s" },
  [RATE_LIMIT_ID_VIDEO_ANALYSIS]: { limit: 5, duration: "300 s" },
  [RATE_LIMIT_ID_USER_PROFILE]: { limit: 40, duration: "60 s" },
  [RATE_LIMIT_ID_FILE_UPLOAD]: { limit: 10, duration: "60 s" }, // Added limit for file uploads
} as const;

// Type RateLimitId dérivé automatiquement des clés de 'limits'
type RateLimitId = keyof typeof limits;

let redis: Redis | null = null;
let ratelimitInstances: Map<RateLimitId, Ratelimit> = new Map();

// Initialisation du client Redis et des instances Ratelimit
if (appConfig.upstashRedisUrl && appConfig.upstashRedisToken) {
  try {
    redis = new Redis({
      url: appConfig.upstashRedisUrl,
      token: appConfig.upstashRedisToken,
    });

    // Créer une instance Ratelimit pour chaque limite définie
    for (const id in limits) {
      const key = id as RateLimitId;
      const config = limits[key];
      ratelimitInstances.set(
        key,
        new Ratelimit({
          redis: redis,
          limiter: Ratelimit.slidingWindow(config.limit, config.duration),
          analytics: true, // Activer l'analytique Upstash (optionnel)
          prefix: `ratelimit:${appConfig.nodeEnv}:${key}`, // Préfixe pour éviter les collisions
        })
      );
    }
    if (typeof window === "undefined") {
      logger.info(
        `[Rate Limiter] Initialized with Upstash Redis for limits: ${Object.keys(
          limits
        ).join(", ")}`
      );
    }
  } catch (error: any) {
    logger.error(
      "[Rate Limiter] Failed to initialize Upstash Redis client or Ratelimit instances:",
      error.message
    );
    redis = null;
    ratelimitInstances.clear();
  }
} else if (typeof window === "undefined") {
  logger.warn(
    "[Rate Limiter] Upstash Redis URL or Token not found in config. Rate limiting is DISABLED."
  );
}

/**
 * Checks the rate limit for a given identifier and limit type.
 * Identifier source (API key, IP, user ID) must be determined by the caller.
 *
 * @param identifier - Unique string representing the entity being limited (e.g., userId, ipAddress).
 * @param limitId - The type of limit to check (e.g., RATE_LIMIT_ID_CHAT).
 * @returns An object indicating if the request is allowed (`success`), remaining requests (`remaining`), and reset time (`reset`). Returns `{ success: true, remaining: null }` if rate limiting is disabled or an error occurs.
 */
export async function checkRateLimit(
  identifier: string,
  limitId: RateLimitId
): Promise<{ success: boolean; remaining: number | null; reset?: number }> {
  const ratelimit = ratelimitInstances.get(limitId);

  if (!redis || !ratelimit) {
    // Log only if Redis config was present but initialization failed
    if (appConfig.upstashRedisUrl && appConfig.upstashRedisToken && !redis) {
      // Check if Redis failed specifically
      logger.error(
        `[Rate Limiter] Check failed: Rate limiter instance for '${limitId}' not initialized (Redis client unavailable). Allowing request.`
      );
    } else if (!ratelimit && redis) {
      // Check if specific instance failed
      logger.error(
        `[Rate Limiter] Check failed: Specific Rate limiter instance for '${limitId}' not found. Allowing request.`
      );
    }
    // If intentionally disabled (no credentials), don't log error, just allow.
    return { success: true, remaining: null };
  }

  if (
    !identifier ||
    typeof identifier !== "string" ||
    identifier.trim().length === 0
  ) {
    logger.error(
      `[Rate Limiter] Invalid identifier provided for limit '${limitId}': "${identifier}". Allowing request (cannot enforce).`
    );
    return { success: true, remaining: null };
  }

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      identifier // The identifier for the user/IP/session
    );
    if (!success) {
      logger.warn(
        `[Rate Limiter] DENIED for '${limitId}' (ID: ${identifier.substring(
          0,
          15
        )}...). Remaining: ${remaining}, Limit: ${limit}, Reset: ${new Date(
          reset
        ).toISOString()}`
      );
    }
    return { success, remaining, reset };
  } catch (error: any) {
    logger.error(
      `[Rate Limiter] Error during rate limit check for '${limitId}' (ID: ${identifier.substring(
        0,
        15
      )}...):`,
      error.message
    );
    // Fail open: allow request if rate limiter has an issue
    return { success: true, remaining: null };
  }
}
