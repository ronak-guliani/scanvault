import { HttpError } from "../http/errors.js";
const LIMITS = {
    api: { limit: 60, windowMs: 60_000 },
    search: { limit: 30, windowMs: 60_000 },
    "upload-minute": { limit: 10, windowMs: 60_000 },
    "upload-day": { limit: 100, windowMs: 24 * 60 * 60_000 }
};
const buckets = new Map();
function bucketKey(userId, scope) {
    return `${userId}:${scope}`;
}
export async function enforceRateLimit(userId, scope) {
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
//# sourceMappingURL=rate-limit.js.map