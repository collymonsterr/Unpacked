import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

// Per-model pricing (USD per 1M tokens) — must match lib/api-usage.ts
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-20250414': { input: 0.80, output: 4.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-image-1': { input: 5.00, output: 0 },
}

function estimateCost(model: string, inputTokens: number | null, outputTokens: number | null): number {
  const pricing = MODEL_PRICING[model]
    ?? Object.entries(MODEL_PRICING).find(([key]) => model.includes(key))?.[1]
  if (!pricing) return 0
  const inCost = ((inputTokens ?? 0) / 1_000_000) * pricing.input
  const outCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output
  return inCost + outCost
}

/**
 * GET /api/articles/[id]/cost-breakdown
 *
 * Admin-only endpoint that returns per-call-type cost breakdown from api_usage_log.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()
  const { data: logs, error } = await db
    .from('api_usage_log')
    .select('call_type, model, input_tokens, output_tokens')
    .eq('article_id', id)

  if (error) {
    return Response.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }

  // Group by call_type and compute costs
  const grouped: Record<string, { total_cost: number; call_count: number }> = {}
  for (const log of (logs ?? [])) {
    const cost = estimateCost(log.model, log.input_tokens, log.output_tokens)
    if (!grouped[log.call_type]) {
      grouped[log.call_type] = { total_cost: 0, call_count: 0 }
    }
    grouped[log.call_type].total_cost += cost
    grouped[log.call_type].call_count += 1
  }

  const breakdown = Object.entries(grouped)
    .map(([call_type, data]) => ({ call_type, ...data }))
    .sort((a, b) => b.total_cost - a.total_cost)

  return Response.json({ breakdown })
}
