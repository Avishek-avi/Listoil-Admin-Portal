// Simple in-memory token-bucket rate limiter.
// MVP only — does not survive across serverless instances.
// Replace with @upstash/ratelimit + Redis when infra is ready.

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

const PROFILES = {
    auth: { capacity: 10, refillPerSec: 10 / 60 },        // 10/min
    mutations: { capacity: 60, refillPerSec: 60 / 60 },   // 60/min
    reads: { capacity: 300, refillPerSec: 300 / 60 },     // 300/min
} as const;

export type RateLimitProfile = keyof typeof PROFILES;

export interface RateLimitResult {
    ok: boolean;
    remaining: number;
    retryAfterSec: number;
}

export function rateLimit(key: string, profile: RateLimitProfile): RateLimitResult {
    const cfg = PROFILES[profile];
    const now = Date.now();
    const bucketKey = `${profile}:${key}`;
    const existing = buckets.get(bucketKey);

    let tokens: number;
    if (!existing) {
        tokens = cfg.capacity - 1;
    } else {
        const elapsedSec = (now - existing.updatedAt) / 1000;
        tokens = Math.min(cfg.capacity, existing.tokens + elapsedSec * cfg.refillPerSec);
        tokens -= 1;
    }

    if (tokens < 0) {
        const retryAfterSec = Math.ceil((1 - (existing?.tokens ?? 0)) / cfg.refillPerSec);
        return { ok: false, remaining: 0, retryAfterSec: Math.max(1, retryAfterSec) };
    }

    buckets.set(bucketKey, { tokens, updatedAt: now });
    return { ok: true, remaining: Math.floor(tokens), retryAfterSec: 0 };
}

export function profileForPath(pathname: string, method: string): RateLimitProfile {
    if (pathname.startsWith("/api/auth") || pathname.startsWith("/login")) return "auth";
    if (method === "GET" || method === "HEAD") return "reads";
    return "mutations";
}
