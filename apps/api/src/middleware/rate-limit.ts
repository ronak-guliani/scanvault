import { HttpError } from "../http/errors.js";

type LimitScope = "api" | "search" | "upload-minute" | "upload-day";

interface LimitConfig {
  limit: number;
  windowMs: number;
}

const LIMITS: Record<LimitScope, LimitConfig> = {
  api: { limit: 60, windowMs: 60_000 },
  search: { limit: 30, windowMs: 60_000 },
  "upload-minute": { limit: 10, windowMs: 60_000 },
  "upload-day": { limit: 100, windowMs: 24 * 60 * 60_000 }
};

const buckets = new Map<string, number[]>();

function bucketKey(userId: string, scope: LimitScope): string {
  return `${userId}:${scope}`;
}

export async function enforceRateLimit(userId: string, scope: LimitScope): Promise<void> {
  const config = LIMITS[scope];
  const key = bucketKey(userId, scope);
  const now = Date.now();
  const startWindow = now - config.windowMs;

  const existing = buckets.get(key) ?? [];
  const filtered = existing.filter((timestamp) => timestamp >= startWindow);

  if (filtered.length >= config.limit) {
    throw new HttpError(429, "RATE_LIMITED", `Rate limit exceeded for ${scope}`);
  }

  filtered.push(now);
  buckets.set(key, filtered);
}
