import { redis } from '@/lib/redis'

export interface RateLimitOptions {
    /** Max requests allowed in the window */
    limit: number
    /** Window duration in seconds */
    windowSec: number
}

export interface RateLimitResult {
    success: boolean
    remaining: number
    resetAt: number
}

/**
 * Check rate limit for a given key (e.g. IP address or user ID).
 * Uses Upstash Redis for distributed rate limiting.
 */
export async function rateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now()
    const windowMs = opts.windowSec * 1000
    const resetAt = now + windowMs

    const redisKey = `ratelimit:${key}`

    // Increment the count for the key
    const count = await redis.incr(redisKey)

    if (count === 1) {
        // First request, set expiration
        await redis.expire(redisKey, opts.windowSec)
    }

    if (count > opts.limit) {
        return { success: false, remaining: 0, resetAt }
    }

    return { success: true, remaining: opts.limit - count, resetAt }
}

/**
 * Get client IP from request headers (works behind proxies/Vercel).
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    return req.headers.get('x-real-ip') ?? 'unknown'
}
