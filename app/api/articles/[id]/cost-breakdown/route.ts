import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

// Per-model pricing (USD per 1M tokens) — must match lib/api-usage.ts
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-20250414': { input: 0.80, output: 4.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-sonnet-5': { input: 3.00, output: 15.00 }, // TODO: verify Sonnet 5 pricing (placeholder = Sonnet 4)
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-image-1': { input: 5.00, output: 0 },
  'brave-search-api': { input: 100.00, output: 0 },
}

function estimateCost(model: string, inputTokens: number | null, outputTokens: number | null): number {
  const pricing = MODEL_PRICING[model]
    ?? Object.entries(MODEL_PRICING).find(([key]) => model.includes(key))?.[1]
  if (!pricing) return 0
  const inCost = ((inputTokens ?? 0) / 1_000_000) * pricing.input
  const outCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output
  return inCost + outCost
}

// Human-readable labels for call types
const CALL_TYPE_LABELS: Record<string, string> = {
  plan: 'Planning',
  synthesis: 'Research Synthesis',
  blueprint: 'Blueprint',
  write: 'Writing',
  editorial_pass: 'Editorial Pass',
  fact_check_stage1: 'Fact-Check (Extract)',
  fact_check_claims: 'Fact-Check (Verify)',
  fact_check_stage2: 'Fact-Check (Review)',
  fact_check_stage3: 'Fact-Check (Arbitrate)',
  social_content: 'Social Content',
  polymarket_filter: 'Polymarket Filter',
  hero_query: 'Hero Image Query',
  refine: 'Refine',
}

/**
 * GET /api/articles/[id]/cost-breakdown
 *
 * Admin-only endpoint returning:
 * - Per-call detail: every API call with model, tokens, cost, timestamp
 * - Grouped summary: cost and call count per pipeline stage
 * - Timings: pipeline phase durations from generation_options.timings
 * - Total cost from the article record
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

    const auth = await requireAdmin()
    if (!auth.authorized) return auth.error!

    const db = getSupabaseAdmin()

    // Fetch usage logs and article timings in parallel
    const [logsResult, articleResult] = await Promise.all([
      db.from('api_usage_log')
        .select('call_type, model, input_tokens, output_tokens, created_at')
        .eq('article_id', id)
        .order('created_at', { ascending: true }),
      db.from('articles')
        .select('total_cost, generation_options, created_at, status')
        .eq('id', id)
        .single(),
    ])

    if (logsResult.error) {
      return Response.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }

    const logs = logsResult.data ?? []
    const article = articleResult.data

    // ── Per-call detail ──
    const calls = logs.map(log => {
      const cost = estimateCost(log.model, log.input_tokens, log.output_tokens)
      return {
        call_type: log.call_type,
        label: CALL_TYPE_LABELS[log.call_type] ?? log.call_type,
        model: log.model,
        input_tokens: log.input_tokens,
        output_tokens: log.output_tokens,
        cost,
        timestamp: log.created_at,
      }
    })

    // ── Grouped summary by call_type ──
    const grouped: Record<string, { total_cost: number; call_count: number; models: string[] }> = {}
    for (const call of calls) {
      if (!grouped[call.call_type]) {
        grouped[call.call_type] = { total_cost: 0, call_count: 0, models: [] }
      }
      grouped[call.call_type].total_cost += call.cost
      grouped[call.call_type].call_count += 1
      if (!grouped[call.call_type].models.includes(call.model)) {
        grouped[call.call_type].models.push(call.model)
      }
    }

    const breakdown = Object.entries(grouped)
      .map(([call_type, data]) => ({
        call_type,
        label: CALL_TYPE_LABELS[call_type] ?? call_type,
        ...data,
      }))
      .sort((a, b) => b.total_cost - a.total_cost)

    // ── Timings from generation_options ──
    const genOpts = article?.generation_options as Record<string, unknown> | null
    const timings = (genOpts?.timings ?? null) as Record<string, number> | null

    // ── Total cost ──
    const totalCostFromLogs = calls.reduce((sum, c) => sum + c.cost, 0)
    const totalCostFromArticle = article?.total_cost ? Number(article.total_cost) : null

    return Response.json({
      article_id: id,
      status: article?.status ?? 'unknown',
      created_at: article?.created_at ?? null,
      total_cost: totalCostFromArticle ?? totalCostFromLogs,
      total_calls: calls.length,
      breakdown,
      calls,
      timings,
    })
  } catch (err) {
    console.error('[cost-breakdown]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
