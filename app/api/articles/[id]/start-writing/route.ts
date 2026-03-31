import { NextRequest } from 'next/server'
import { after } from 'next/server'
import { getSupabaseAdmin, createServerSupabase } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'
import { runWritePipeline } from '@/lib/write-pipeline'
import type { ArticlePlan } from '@/types/article'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  // Require authentication
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  const db = getSupabaseAdmin()

  // Fetch the article
  const { data: row, error: fetchErr } = await db
    .from('articles')
    .select('id, query, status, plan, research_findings, entity_cards, research_synthesis, generation_options')
    .eq('id', id)
    .single()

  if (fetchErr || !row) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  // Only allow starting writing on articles awaiting auth
  if (row.status !== 'awaiting_auth') {
    return Response.json({ error: `Article is in '${row.status}' status, not awaiting_auth` }, { status: 409 })
  }

  // Claim the article for this user
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const isAdmin = adminEmail && user.email && user.email.toLowerCase() === adminEmail.toLowerCase()

  const { error: updateErr } = await db
    .from('articles')
    .update({
      user_id: user.id,
      user_name: user.user_metadata?.full_name ?? null,
      user_avatar: user.user_metadata?.avatar_url ?? null,
      visibility: isAdmin ? 'published' : 'private',
      status: 'generating',
    })
    .eq('id', id)

  if (updateErr) {
    console.error('[start-writing] Failed to claim article:', updateErr)
    return Response.json({ error: 'Failed to claim article' }, { status: 500 })
  }

  console.log('[start-writing] Article claimed by', user.email, '— starting writing pipeline')

  // Reconstruct the research summary from findings for the writing prompt
  // The full research summary was not persisted, but we have findings.
  // We need to rebuild it or pass the findings directly.
  // For now, rebuild a condensed summary from findings.
  const plan = row.plan as ArticlePlan
  const generationOptions = (row.generation_options ?? {}) as Record<string, unknown>
  const findings = (row.research_findings ?? []) as Array<{ content: string; source: string; source_type: string; url: string }>

  // Rebuild a research summary from stored findings
  const summaryParts: string[] = ['RESEARCH SUMMARY', '']
  const keyFindings = findings.filter(f => f.content.length > 30).slice(0, 12)
  if (keyFindings.length > 0) {
    summaryParts.push('KEY FINDINGS:')
    for (const f of keyFindings) {
      summaryParts.push(`- ${f.content.slice(0, 200)}`)
    }
    summaryParts.push('')
  }

  const redditFindings = findings.filter(f => f.source_type === 'reddit').slice(0, 5)
  if (redditFindings.length > 0) {
    summaryParts.push('COMMUNITY SENTIMENT:')
    for (const f of redditFindings) {
      summaryParts.push(`- Reddit (${f.source}): ${f.content.slice(0, 200)}`)
    }
    summaryParts.push('')
  }

  summaryParts.push('SOURCES:')
  const seenUrls = new Set<string>()
  for (const f of findings.slice(0, 15)) {
    if (!seenUrls.has(f.url)) {
      seenUrls.add(f.url)
      summaryParts.push(`- ${f.source} — ${f.url}`)
    }
  }

  const researchSummary = summaryParts.join('\n')

  // Read stored entity cards + synthesis (saved during research phase)
  const entityCards = (row.entity_cards ?? undefined) as import('@/types/article').EntityCard[] | undefined
  const synthesis = (row.research_synthesis ?? undefined) as import('@/types/article').ResearchSynthesis | undefined

  // Kick off writing pipeline in the background
  after(async () => {
    try {
      await runWritePipeline({
        articleId: id,
        query: row.query,
        plan,
        researchSummary,
        generationOptions,
        entityCards,
        synthesis,
      })
    } catch (err) {
      console.error('[start-writing] Pipeline failed:', err)
      await db
        .from('articles')
        .update({ status: 'error' })
        .eq('id', id)
    }
  })

  return Response.json({ success: true })
}
