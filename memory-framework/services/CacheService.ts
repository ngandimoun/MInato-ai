// FILE: memory-framework/services/CacheService.ts
// (Content from finalcodebase.txt - verified)
import { Redis } from '@upstash/redis';
import { FrameworkConfig } from '../core/types';
import { generateStableCacheKey } from '../core/utils';
import { logger } from '../config';

/**
 * Provides caching functionality using Upstash Redis.
 */
export class CacheService {
    private redis: Redis | null;
    private config: FrameworkConfig['cache'];
    private isEnabled: boolean;

    constructor(config: FrameworkConfig) {
        this.config = config.cache;

        if (this.config.provider === 'upstash_redis' && this.config.url && this.config.token) {
            try {
                this.redis = new Redis({
                    url: this.config.url,
                    token: this.config.token,
                    // Optional: Add retry logic if needed by the library version
                    // retry: {
                    //     retries: 3,
                    //     factor: 2,
                    //     minTimeout: 1000,
                    // }
                });
                this.isEnabled = true;
                logger.info(
                    `CacheService initialized: Provider=Upstash Redis, EmbeddingTTL=${this.config.embeddingCacheTTLSeconds}s, SearchTTL=${this.config.searchCacheTTLSeconds}s, ExtractionTTL=${this.config.extractionCacheTTLSeconds}s`
                );
            } catch (error: any) {
                 logger.error(`CacheService: Failed to initialize Upstash Redis client: ${error instanceof Error ? error.message : String(error)}`);
                 this.redis = null;
                 this.isEnabled = false;
            }
        } else {
            logger.warn("CacheService: Provider not 'upstash_redis' or missing URL/token credentials. Caching is disabled.");
            this.redis = null;
            this.isEnabled = false;
        }
    }

    async get<T>(prefix: string, input: any): Promise<T | null> {
        if (!this.isEnabled || !this.redis) {
            return null;
        }

        const key = generateStableCacheKey(prefix, input);
        const loggedKey = key.length > 100 ? key.substring(0, 97) + '...' : key;

        try {
            const data = await this.redis.get<T>(key);
            if (data !== null && data !== undefined) {
                logger.debug(`Cache HIT for key prefix "${prefix}"`);
                return data;
            } else {
                logger.debug(`Cache MISS for key prefix "${prefix}"`);
                return null;
            }
        } catch (error: any) {
            logger.error(`CacheService GET error for key starting with "${prefix}" (logged key: "${loggedKey}"): ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    async set<T>(prefix: string, input: any, value: T, ttlSeconds: number): Promise<void> {
        if (!this.isEnabled || !this.redis) {
            return;
        }
        if (typeof ttlSeconds !== 'number' || ttlSeconds <= 0) {
            logger.warn(`CacheService SET skipped: TTL must be a positive number (received ${ttlSeconds}). Key prefix: ${prefix}`);
            return;
        }
        if (value === null || value === undefined) {
            logger.warn(`CacheService SET skipped: Attempted to cache null/undefined value. Key prefix: ${prefix}`);
            return;
        }

        const key = generateStableCacheKey(prefix, input);
        const loggedKey = key.length > 100 ? key.substring(0, 97) + '...' : key;
        const effectiveTTL = Math.ceil(ttlSeconds);

        try {
            // Ensure value is stringified if it's an object/array for Redis
            const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
            const result = await this.redis.set(key, valueToStore, { ex: effectiveTTL });
            if (result === 'OK') {
                 logger.debug(`Cache SET successful for key prefix "${prefix}", TTL: ${effectiveTTL}s`);
            } else {
                 logger.warn(`CacheService SET for key starting with "${prefix}" (logged key: "${loggedKey}") returned non-OK status: ${result}`);
            }
        } catch (error: any) {
            logger.error(`CacheService SET error for key starting with "${prefix}" (logged key: "${loggedKey}"): ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async delete(prefix: string, input: any): Promise<void> {
         if (!this.isEnabled || !this.redis) {
             return;
         }
         const key = generateStableCacheKey(prefix, input);
         const loggedKey = key.length > 100 ? key.substring(0, 97) + '...' : key;

         try {
             const deletedCount = await this.redis.del(key);
             if (deletedCount > 0) {
                logger.info(`Cache DELETE successful for key starting with "${prefix}" (logged key: "${loggedKey}"). Count: ${deletedCount}`);
             } else {
                 logger.debug(`Cache DELETE: Key not found for prefix "${prefix}" (logged key: "${loggedKey}").`);
             }
         } catch (error: any) {
             logger.error(`CacheService DELETE error for key starting with "${prefix}" (logged key: "${loggedKey}"): ${error instanceof Error ? error.message : String(error)}`);
         }
    }

    async deleteByPrefix(pattern: string): Promise<void> {
        if (!this.isEnabled || !this.redis) {
            return;
        }
        if (pattern === '*' || pattern === '*:*') {
             logger.error(`CacheService DELETE by prefix REJECTED: Overly broad pattern "${pattern}" is not allowed. Please be more specific.`);
             return;
        }

        logger.warn(`Cache DELETE by prefix initiated for pattern: "${pattern}" (Ensure pattern ends with * for prefix match, e.g., 'prefix:*')`);
        let cursor = 0;
        let keysDeleted = 0;
        const startTime = Date.now();
        const MAX_ITERATIONS = 1000; // Safety break
        let iterations = 0;

        try {
            do {
                iterations++;
                if (iterations > MAX_ITERATIONS) {
                    logger.error(`Cache DELETE by prefix aborted: Exceeded max iterations (${MAX_ITERATIONS}) for pattern "${pattern}". Some keys might remain.`);
                    break;
                }
                // Fetch keys matching the pattern
                const [nextCursorStr, keys] = await this.redis.scan(cursor, { match: pattern, count: 100 });
                cursor = Number(nextCursorStr);

                if (keys.length > 0) {
                    logger.debug(` -> Cache delete batch: Found ${keys.length} keys matching "${pattern}". Deleting...`);
                    // Delete the found keys
                    const count = await this.redis.del(...keys);
                    keysDeleted += count;
                    logger.debug(` -> Cache delete batch: Deleted ${count} keys.`);
                }
            } while (cursor !== 0);

            const duration = Date.now() - startTime;
            logger.info(`Cache DELETE by prefix completed for pattern "${pattern}". Deleted ${keysDeleted} keys in ${duration}ms across ${iterations} scan iterations.`);
        } catch (error: any) {
             logger.error(`CacheService DELETE by prefix error during scan/delete for pattern "${pattern}": ${error instanceof Error ? error.message : String(error)}`);
             const duration = Date.now() - startTime;
             logger.error(` -> Operation failed after ${duration}ms, ${keysDeleted} keys deleted in ${iterations} iterations.`);
        }
    }

    async close(): Promise<void> {
        if (this.redis && this.isEnabled) {
            logger.info("Attempting to close CacheService Redis connection...");
            try {
                // Newer versions of @upstash/redis might manage connections automatically or use quit()
                // Check the specific version's documentation if explicit close is needed.
                // await this.redis.quit(); // Example if needed
                logger.info("CacheService Redis connection managed automatically (or quit() called if necessary).");
            } catch (error: any) {
                 logger.error(`CacheService error during Redis connection management: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                 // Update state regardless
                 this.redis = null;
                 this.isEnabled = false;
            }
        } else {
             this.redis = null;
             this.isEnabled = false;
        }
    }
}