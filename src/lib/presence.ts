/**
 * "Playing now" presence counter (server side).
 *
 * Each open game tab sends a heartbeat every HEARTBEAT_MS while visible. A tab
 * counts as playing until PRESENCE_WINDOW_MS after its last heartbeat, or until
 * it says goodbye. Stored in a Redis sorted set (member = tab id, score = last
 * heartbeat time), so counting is one ZCOUNT.
 */
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { PRESENCE_WINDOW_MS } from "./presenceConfig";

/** Max heartbeats per visitor IP per minute (one tab sends ~2.4). */
export const RATE_LIMIT_PER_MIN = 60;

const KEY = "presence:play";

export interface PresenceStore {
  /** Record a heartbeat; returns the current count (or limited=true if rejected). */
  beat(id: string, visitor: string, now: number): Promise<{ count: number; limited: boolean }>;
  leave(id: string): Promise<void>;
  count(now: number): Promise<number>;
}

export function isValidTabId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(id);
}

/** Hash the visitor IP so raw addresses are never stored. */
export function visitorKey(ip: string): string {
  return createHash("sha256").update(`santacoindotcom:${ip}`).digest("hex").slice(0, 24);
}

// Runs atomically in Redis: rate-limit the visitor, record the heartbeat,
// prune stale tabs, return [count, heartbeatsThisMinute].
const BEAT_SCRIPT = `
local n = redis.call('INCR', KEYS[2])
if n == 1 then redis.call('EXPIRE', KEYS[2], 120) end
if n <= tonumber(ARGV[4]) then redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2]) end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[3])
return {redis.call('ZCARD', KEYS[1]), n}
`;

export function createRedisStore(redis: Redis): PresenceStore {
  return {
    async beat(id, visitor, now) {
      const minute = Math.floor(now / 60_000);
      const [count, n] = (await redis.eval(
        BEAT_SCRIPT,
        [KEY, `rl:presence:${visitor}:${minute}`],
        [String(now), id, String(now - PRESENCE_WINDOW_MS), String(RATE_LIMIT_PER_MIN)],
      )) as [number, number];
      return { count, limited: n > RATE_LIMIT_PER_MIN };
    },
    async leave(id) {
      await redis.zrem(KEY, id);
    },
    async count(now) {
      return redis.zcount(KEY, now - PRESENCE_WINDOW_MS, "+inf");
    },
  };
}

/** In-process store for local development and tests (not shared between servers). */
export function createMemoryStore(): PresenceStore {
  const seen = new Map<string, number>();
  const rate = new Map<string, number>();
  const prune = (now: number) => {
    for (const [id, t] of seen) if (t < now - PRESENCE_WINDOW_MS) seen.delete(id);
  };
  return {
    async beat(id, visitor, now) {
      const bucket = `${visitor}:${Math.floor(now / 60_000)}`;
      const n = (rate.get(bucket) ?? 0) + 1;
      rate.set(bucket, n);
      const limited = n > RATE_LIMIT_PER_MIN;
      if (!limited) seen.set(id, now);
      prune(now);
      return { count: seen.size, limited };
    },
    async leave(id) {
      seen.delete(id);
    },
    async count(now) {
      prune(now);
      return seen.size;
    },
  };
}

let store: PresenceStore | null | undefined;

/**
 * Redis when the Upstash/Vercel env vars are present. Otherwise an in-memory
 * store in development (or when PRESENCE_MEMORY=1), and null in production so
 * the counter hides itself instead of showing wrong numbers.
 */
export function getPresenceStore(): PresenceStore | null {
  if (store !== undefined) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) store = createRedisStore(new Redis({ url, token }));
  else if (process.env.NODE_ENV !== "production" || process.env.PRESENCE_MEMORY === "1") store = createMemoryStore();
  else store = null;
  return store;
}
