import { redis } from "@/lib/redis";

const LOCK_TTL_SECONDS = 60;
const LOCK_PREFIX = "table:lock:";

/**
 * Try to acquire a Redis lock on a table.
 * Returns true if lock acquired, false if already locked by another user.
 */
export async function acquireTableLock(
  tableId: string,
  userId: string,
): Promise<boolean> {
  const key = `${LOCK_PREFIX}${tableId}`;
  const result = await redis.set(key, userId, "EX", LOCK_TTL_SECONDS, "NX");
  return result === "OK";
}

/**
 * Release the lock on a table (only if owned by this user).
 * Returns true if released, false if not owned.
 */
export async function releaseTableLock(
  tableId: string,
  userId: string,
): Promise<boolean> {
  const key = `${LOCK_PREFIX}${tableId}`;
  const current = await redis.get(key);
  if (current !== userId) return false;
  await redis.del(key);
  return true;
}

/**
 * Refresh the TTL of an existing lock (heartbeat).
 */
export async function refreshTableLock(
  tableId: string,
  userId: string,
): Promise<boolean> {
  const key = `${LOCK_PREFIX}${tableId}`;
  const current = await redis.get(key);
  if (current !== userId) return false;
  await redis.expire(key, LOCK_TTL_SECONDS);
  return true;
}

/**
 * Get the current lock holder for a table.
 * Returns userId if locked, null if free.
 */
export async function getTableLockHolder(
  tableId: string,
): Promise<string | null> {
  const key = `${LOCK_PREFIX}${tableId}`;
  return redis.get(key);
}
