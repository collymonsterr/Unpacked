import Anthropic from '@anthropic-ai/sdk'
import { createAnthropic } from '@/lib/anthropic-client'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'
import { MODELS } from '@/lib/models'

export const maxDuration = 300 // 5 minutes — admin backfill can process many articles

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()

  // Fetch all complete articles missing suggestion_chips
  const { data: rows, error } = await db
    .from('articles')
    .select('id, query, article')
    .eq('status', 'complete')
    .is('suggestion_chips', null)
    .limit(100)

  if (error) {
    return Response.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return Response.json({ updated: 0, skipped: 0, message: 'No articles missing chips' })
  }

  let updated = 0
  let skipped = 0

  // Process in batches of 10 to avoid Anthropic rate limits
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10)

    await Promise.all(batch.map(async (row) => {
      try {
        const article = row.article as Record<string, unknown> | null
        if (!article) { skipped++; return }

        const verdict = (article.quick_verdict as Record<string, unknown> | undefined)?.one_liner as string ?? ''
        const query = row.query as string ?? ''

        const message = await getAnthropic().messages.create({
          model: MODELS.geminiFlashLite,
          max_tokens: 256,
          system: 'You generate short, punchy article suggestion chips. Return only valid JSON with no commentary.',
          messages: [{
            role: 'user',
            content: `Given this article query and verdict, generate exactly 3 refinement suggestions and 3 related article topics.

Query: ${query}
Verdict: ${verdict}

Return ONLY valid JSON in this exact format:
{"refinements":["suggestion 1","suggestion 2","suggestion 3"],"related":["topic 1","topic 2","topic 3"]}

Refinements should be short imperatives like "Add a budget pick under £100" or "Focus on noise cancellation performance".
Related topics should be short article-worthy questions like "Best wireless earbuds for running" or "ANC vs passive noise isolation".`,
          }],
        })

        const text = message.content?.[0]?.type === 'text' ? message.content[0].text.trim() : ''
        if (!text) { skipped++; return }

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) { skipped++; return }

        const chips = JSON.parse(jsonMatch[0]) as { refinements: string[]; related: string[] }

        // Validate shape
        if (
          !Array.isArray(chips.refinements) || chips.refinements.length === 0 ||
          !Array.isArray(chips.related) || chips.related.length === 0
        ) {
          skipped++
          return
        }

        await db
          .from('articles')
          .update({ suggestion_chips: chips })
          .eq('id', row.id)

        updated++
      } catch {
        skipped++
      }
    }))

    // Brief pause between batches to respect rate limits
    if (i + 10 < rows.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return Response.json({
    updated,
    skipped,
    total: rows.length,
    message: `Backfilled suggestion chips for ${updated} article${updated !== 1 ? 's' : ''}.`,
  })
}
