/**
 * Read-through cache on Workers KV for data that is expensive to compute and
 * fine to serve slightly stale (KV reads are eventually consistent, up to ~60s).
 *
 * Every miss costs a KV write, and the $5 plan includes 1M writes/month against
 * 10M reads, so cache things that are read far more often than they change.
 */
export async function cached<T>(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = await kv.get<T>(`cache:${key}`, "json");
  if (hit !== null) return hit;
  const value = await load();
  await kv.put(`cache:${key}`, JSON.stringify(value), {
    expirationTtl: Math.max(ttlSeconds, 60),
  });
  return value;
}

export function invalidate(kv: KVNamespace, key: string): Promise<void> {
  return kv.delete(`cache:${key}`);
}
