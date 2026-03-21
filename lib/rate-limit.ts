/**
 * Simple in-memory sliding window rate limiter.
 * Tracks requests per key (IP or user_id) with automatic cleanup.
 */

const store = new Map<string, number[]>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 3600000
  for (const [key, timestamps] of store) {
    const valid = timestamps.filter(t => t > cutoff)
    if (valid.length === 0) store.delete(key)
    else store.set(key, valid)
  }
}, 300000)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 3600000 // 1 hour
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs
  const timestamps = (store.get(key) ?? []).filter(t => t > cutoff)

  if (timestamps.length >= limit) {
    store.set(key, timestamps)
    return { allowed: false, remaining: 0, limit }
  }

  timestamps.push(now)
  store.set(key, timestamps)
  return { allowed: true, remaining: limit - timestamps.length, limit }
}

/**
 * Get rate limit key and limit from a request.
 * Logged-in users get 10/hr, anonymous get 3/hr.
 */
export function getRateLimitInfo(
  request: Request,
  userId?: string | null
): { key: string; limit: number } {
  if (userId) {
    return { key: `user:${userId}`, limit: 10 }
  }
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  return { key: `ip:${ip}`, limit: 3 }
}
