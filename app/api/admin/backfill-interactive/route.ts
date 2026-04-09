import { NextResponse } from 'next/server'
import { generateInteractiveComponent } from '@/lib/interactive-component'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-check'

export const maxDuration = 300

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  const db = getSupabaseAdmin()

  // Find published articles without interactive_component that have a plan with interactive_component_type
  const { data: articles, error } = await db
    .from('articles')
    .select('id, article, plan, research_findings')
    .eq('status', 'verified')
    .is('interactive_component', null)
    .not('plan', 'is', null)
    .not('article', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }

  // Filter to articles where the plan has interactive_component_type set
  const candidates = articles.filter(
    a => a.plan?.interactive_component_type
  )

  let generated = 0
  let skipped = 0
  let failed = 0

  // Process in batches of 5 with delay
  for (let i = 0; i < candidates.length; i += 5) {
    const batch = candidates.slice(i, i + 5)

    await Promise.all(
      batch.map(async (article) => {
        try {
          const findings = (article.research_findings ?? []) as Array<{ source: string; content: string }>
          const component = await generateInteractiveComponent(
            article.article,
            article.plan,
            findings,
            article.id,
          )

          if (component) {
            await db
              .from('articles')
              .update({ interactive_component: component })
              .eq('id', article.id)
            generated++
          } else {
            skipped++
          }
        } catch (err) {
          console.error(`[backfill-interactive] Failed for ${article.id}:`, (err as Error).message)
          failed++
        }
      })
    )

    // 2-second delay between batches
    if (i + 5 < candidates.length) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  return NextResponse.json({
    total_candidates: candidates.length,
    generated,
    skipped,
    failed,
  })
}
