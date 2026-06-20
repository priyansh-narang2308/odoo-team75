import { redis } from "@/lib/redis";

const ORDER_CACHE_PREFIX = "order:cache:";
const ORDER_CACHE_TTL = 300; // 5 minutes

/**
 * Cache an order's state in Redis for fast reads.
 */
export async function cacheOrder(
  orderId: string,
  data: unknown
): Promise<void> {
  await redis.setex(
    `${ORDER_CACHE_PREFIX}${orderId}`,
    ORDER_CACHE_TTL,
    JSON.stringify(data)
  );
}

/**
 * Get cached order state.
 */
export async function getCachedOrder<T>(orderId: string): Promise<T | null> {
  const raw = await redis.get(`${ORDER_CACHE_PREFIX}${orderId}`);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/**
 * Invalidate cached order (call after mutations).
 */
export async function invalidateOrderCache(orderId: string): Promise<void> {
  await redis.del(`${ORDER_CACHE_PREFIX}${orderId}`);
}

/**
 * Track an active table session (which customerId is at tableId).
 */
export async function setTableSession(
  tableId: string,
  customerId: string
): Promise<void> {
  await redis.setex(`table:session:${tableId}`, 86400, customerId); // 24h
}

export async function getTableSession(
  tableId: string
): Promise<string | null> {
  return redis.get(`table:session:${tableId}`);
}

export async function clearTableSession(tableId: string): Promise<void> {
  await redis.del(`table:session:${tableId}`);
}
