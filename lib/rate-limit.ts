/**
 * Supabase-backed sliding window rate limiter.
 * Stores rate limit events in the rate_limits table.
 * Works correctly in serverless environments (no in-memory state).
 */

import { getSupabaseAdmin } from '@/lib/supabase'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
}

/**
 * Check whether a request is within the rate limit.
 * Inserts a record and counts recent records for the key within the window.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 3600000 // 1 hour
): Promise<RateLimitResult> {
  const db = getSupabaseAdmin()
  const cutoff = new Date(Date.now() - windowMs).toISOString()

  // Count existing requests within the window
  const { count, error: countError } = await db
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', cutoff)

  if (countError) {
    // If the query fails, allow the request (fail open) but log
    console.error('[rate-limit] Count query failed:', countError.message)
    return { allowed: true, remaining: limit, limit }
  }

  const currentCount = count ?? 0

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, limit }
  }

  // Insert a new record for this request
  const { error: insertError } = await db
    .from('rate_limits')
    .insert({ key })

  if (insertError) {
    console.error('[rate-limit] Insert failed:', insertError.message)
    // Still allow — fail open
    return { allowed: true, remaining: limit - currentCount, limit }
  }

  // Opportunistic cleanup: ~10% of requests, delete records older than 2 hours
  if (Math.random() < 0.1) {
    const oldCutoff = new Date(Date.now() - 7200000).toISOString()
    db.from('rate_limits')
      .delete()
      .lt('created_at', oldCutoff)
      .then(({ error }) => {
        if (error) console.error('[rate-limit] Cleanup failed:', error.message)
      })
  }

  return { allowed: true, remaining: limit - currentCount - 1, limit }
}

/**
 * Get rate limit key and limit from a request.
 * Logged-in users get higher limits than anonymous users.
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
