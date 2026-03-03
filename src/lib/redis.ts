import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

/**
 * Returns an Upstash Redis client if env vars are configured, otherwise null.
 * Allows the app to run locally without KV — KV features degrade gracefully.
 */
export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}
