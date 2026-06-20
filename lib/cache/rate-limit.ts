import { redis } from "@/lib/redis";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp
}

/**
 * Sliding window rate limiter using Redis.
 * @param key      Unique key (e.g., "ratelimit:login:ip:1.2.3.4")
 * @param limit    Max requests
 * @param windowMs Window in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: now + windowMs,
    };
  } catch (err) {
    console.warn(`[RateLimit] Redis failed for ${key}, allowing request.`);
    return {
      success: true,
      remaining: limit,
      reset: now + windowMs,
    };
  }
}

/**
 * Convenience: rate limit by IP for auth endpoints.
 * 10 requests per minute.
 */
export async function rateLimitAuth(ip: string): Promise<RateLimitResult> {
  return rateLimit(`ratelimit:auth:${ip}`, 10, 60 * 1000);
}

/**
 * Convenience: rate limit payment endpoints.
 * 5 requests per minute.
 */
export async function rateLimitPayment(ip: string): Promise<RateLimitResult> {
  return rateLimit(`ratelimit:payment:${ip}`, 5, 60 * 1000);
}
