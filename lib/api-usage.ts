import { getSupabaseAdmin } from '@/lib/supabase'

// In-memory dedup guard: prevents duplicate API calls for the same article+callType within 5 minutes
const recentCalls = new Map<string, number>()
const DEDUP_WINDOW_MS = 5 * 60 * 1000

/**
 * Check if this call type has already been made for this article recently.
 * Returns true if it's a duplicate (should be skipped), false if it's safe to proceed.
 */
export function isDuplicateCall(articleId: string | undefined, callType: string): boolean {
  if (!articleId) return false // No article ID = can't dedup (e.g. planning before article exists)

  const key = `${articleId}:${callType}`
  const lastCall = recentCalls.get(key)
  const now = Date.now()

  if (lastCall && now - lastCall < DEDUP_WINDOW_MS) {
    console.warn(`[api-usage] DUPLICATE BLOCKED: ${callType} for article ${articleId.slice(0, 8)} — last called ${Math.round((now - lastCall) / 1000)}s ago`)
    return true
  }

  recentCalls.set(key, now)

  // Cleanup old entries periodically
  if (recentCalls.size > 100) {
    for (const [k, v] of recentCalls) {
      if (now - v > DEDUP_WINDOW_MS) recentCalls.delete(k)
    }
  }

  return false
}

/**
 * Log an API call to the api_usage_log table.
 * Non-blocking — fires and forgets. Never throws.
 */
export function logApiCall(params: {
  callType: string
  model: string
  inputTokens?: number
  outputTokens?: number
  articleId?: string
}): void {
  try {
    const db = getSupabaseAdmin()
    db.from('api_usage_log')
      .insert({
        call_type: params.callType,
        model: params.model,
        input_tokens: params.inputTokens ?? null,
        output_tokens: params.outputTokens ?? null,
        article_id: params.articleId ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('[api-usage] Log failed:', error.message)
      })
  } catch {
    // Never fail the main operation for logging
  }
}
