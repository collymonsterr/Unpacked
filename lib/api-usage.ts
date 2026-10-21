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

// ── Cost estimation per model (USD per 1M tokens) ──────────────────────────

/**
 * USD per 1M tokens. A price ledger keyed by EXACT past model IDs, so historic
 * usage rows still cost out correctly — deliberately not sourced from
 * `lib/models.ts`. When you bump a model there, add its price here.
 *
 * ⚠️ A missing entry silently costs a call at $0. From Aug–Oct 2026 there was no
 * `claude-haiku-4-5-*` row, so every Haiku call — ~75% of Anthropic spend —
 * logged as free. That also blinded the daily cron's monthly budget guard,
 * which sums `articles.total_cost`. Add the row before you ship a model bump.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic — verified against Anthropic's published rates, Oct 2026
  'claude-haiku-5-5': { input: 0.10, output: 0.50 },
  'claude-haiku-4-5': { input: 1.00, output: 5.00 },
  'claude-haiku-4-20250414': { input: 0.80, output: 4.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-sonnet-5-5': { input: 2.00, output: 10.00 },
  'claude-sonnet-5': { input: 2.00, output: 10.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  // Google
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  // OpenAI
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-image-1': { input: 5.00, output: 0 }, // image gen is per-image but log as token cost
  // Brave Search — $5/1000 queries ≈ $0.005/query. We log ~50 nominal input tokens per query
  // so pricing is set to make 50 tokens × $100/M = $0.005
  'brave-search-api': { input: 100.00, output: 0 },
}

/**
 * Estimate the cost of an API call based on model and token counts.
 * Returns cost in USD.
 */
function estimateCost(model: string, inputTokens?: number, outputTokens?: number): number {
  // Find matching pricing (partial match for model variants)
  // Exact match first, then longest prefix — so a dated ID like
  // `claude-haiku-4-5-20251001` resolves to the `claude-haiku-4-5` row. The old
  // code used the FIRST `includes()` hit, which matched nothing for dated Haiku
  // IDs and silently returned 0.
  const pricing = MODEL_PRICING[model]
    ?? Object.entries(MODEL_PRICING)
        .filter(([key]) => model.startsWith(key))
        .sort((a, b) => b[0].length - a[0].length)[0]?.[1]

  if (!pricing) {
    console.warn(`[api-usage] No price for model "${model}" — logging $0. Add it to MODEL_PRICING.`)
    return 0
  }

  const inCost = ((inputTokens ?? 0) / 1_000_000) * pricing.input
  const outCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output
  return inCost + outCost
}

/**
 * Log an API call to the api_usage_log table and increment article's total_cost.
 * Non-blocking — fires and forgets. Never throws.
 */
// Re-export formatCost for backward compat
export { formatCost } from './format-cost'

export function logApiCall(params: {
  callType: string
  model: string
  inputTokens?: number
  outputTokens?: number
  articleId?: string
  errorMessage?: string
}): void {
  try {
    const db = getSupabaseAdmin()
    const cost = estimateCost(params.model, params.inputTokens, params.outputTokens)

    // Insert usage log
    db.from('api_usage_log')
      .insert({
        call_type: params.callType,
        model: params.model,
        input_tokens: params.inputTokens ?? null,
        output_tokens: params.outputTokens ?? null,
        article_id: params.articleId ?? null,
        error_message: params.errorMessage ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('[api-usage] Log failed:', error.message)
      })

    // Increment article's total_cost if we have an article ID and a non-zero cost
    if (params.articleId && cost > 0) {
      db.rpc('increment_article_cost', { p_article_id: params.articleId, p_amount: cost })
        .then(({ error }) => {
          // If RPC doesn't exist, fall back to direct update
          if (error) {
            db.from('articles')
              .select('total_cost')
              .eq('id', params.articleId!)
              .single()
              .then(({ data }) => {
                const current = data?.total_cost ?? 0
                db.from('articles')
                  .update({ total_cost: current + cost })
                  .eq('id', params.articleId!)
                  .then(() => {})
              })
          }
        })
    }
  } catch {
    // Never fail the main operation for logging
  }
}
