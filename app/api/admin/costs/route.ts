import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'

export const dynamic = 'force-dynamic'

// Known pricing per million tokens (as of March 2026)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Find matching pricing — try exact match first, then prefix match
  let pricing = PRICING[model]
  if (!pricing) {
    if (model.includes('haiku')) pricing = PRICING['claude-haiku-4-5-20251001']
    else if (model.includes('sonnet')) pricing = PRICING['claude-sonnet-4-20250514']
    else if (model.includes('gemini')) pricing = PRICING['gemini-2.5-flash']
    else pricing = { input: 3.00, output: 15.00 } // Default to Sonnet pricing
  }

  return (inputTokens * pricing.input / 1_000_000) + (outputTokens * pricing.output / 1_000_000)
}

function getProvider(model: string): string {
  if (model.includes('claude') || model.includes('haiku') || model.includes('sonnet')) return 'Anthropic'
  if (model.includes('gemini')) return 'Google Gemini'
  if (model.includes('gpt')) return 'OpenAI'
  return 'Other'
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()

  try {
    // Get all usage logs for current month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { data: logs } = await db
      .from('api_usage_log')
      .select('*')
      .gte('created_at', monthStart.toISOString())
      .order('created_at', { ascending: false })

    const rows = logs ?? []

    // Total cost this month
    let totalCost = 0
    const costByProvider: Record<string, number> = {}

    for (const row of rows) {
      const cost = estimateCost(row.model, row.input_tokens ?? 0, row.output_tokens ?? 0)
      totalCost += cost

      const provider = getProvider(row.model)
      costByProvider[provider] = (costByProvider[provider] ?? 0) + cost
    }

    // Count unique articles this month
    const uniqueArticles = new Set(rows.filter(r => r.article_id).map(r => r.article_id))
    const articlesThisMonth = uniqueArticles.size
    const avgCostPerArticle = articlesThisMonth > 0 ? totalCost / articlesThisMonth : 0

    // Daily costs for last 7 days
    const dailyCosts: { date: string; cost: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]

      const dayCost = rows
        .filter(r => r.created_at.startsWith(dateStr))
        .reduce((sum, r) => sum + estimateCost(r.model, r.input_tokens ?? 0, r.output_tokens ?? 0), 0)

      dailyCosts.push({ date: dateStr, cost: Math.round(dayCost * 100) / 100 })
    }

    // Cost by call type
    const costByType: Record<string, number> = {}
    for (const row of rows) {
      const cost = estimateCost(row.model, row.input_tokens ?? 0, row.output_tokens ?? 0)
      costByType[row.call_type] = (costByType[row.call_type] ?? 0) + cost
    }

    // Fallback stats — last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentRows = rows.filter(r => r.created_at >= oneDayAgo)
    const geminiWritesLast24h = recentRows.filter(r => r.call_type === 'write' && r.model?.includes('gemini')).length
    const geminiFallbacksLast24h = recentRows.filter(r => r.call_type === 'gemini_fallback_write').length
    const totalAttemptedLast24h = geminiWritesLast24h + geminiFallbacksLast24h
    const fallbackRate24h = totalAttemptedLast24h > 0 ? geminiFallbacksLast24h / totalAttemptedLast24h : 0
    // Each fallback costs ~$0.09 more than a successful Gemini write ($0.11 Sonnet avg vs $0.02 Gemini avg)
    const estimatedExtraCost24h = geminiFallbacksLast24h * 0.09

    return NextResponse.json({
      totalCost: Math.round(totalCost * 100) / 100,
      costByProvider: Object.fromEntries(
        Object.entries(costByProvider).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      costByType: Object.fromEntries(
        Object.entries(costByType).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      articlesThisMonth,
      avgCostPerArticle: Math.round(avgCostPerArticle * 100) / 100,
      dailyCosts,
      totalCalls: rows.length,
      fallbackStats: {
        geminiWritesLast24h,
        geminiFallbacksLast24h,
        fallbackRate24h: Math.round(fallbackRate24h * 1000) / 10, // percentage, 1dp
        estimatedExtraCost24h: Math.round(estimatedExtraCost24h * 100) / 100,
      },
      note: 'Costs are estimates based on token counts. Brave Search and OpenAI image costs are not yet tracked.',
    })
  } catch (err) {
    console.error('[admin/costs]', err)
    return NextResponse.json({ error: 'Failed to calculate costs' }, { status: 500 })
  }
}
