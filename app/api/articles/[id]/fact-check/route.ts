import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { runTripleFactCheck, applyCorrections } from '@/lib/fact-check'
import { isValidUUID } from '@/lib/validate'
import { requireAdmin } from '@/lib/auth-check'

export const maxDuration = 120

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 })

  // Admin-only: triggering a fact-check costs ~$0.05–$0.10 per run and mutates
  // the article. Pipeline-internal calls use the library directly, not this route.
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.error!

  try {
    const supabase = getSupabaseAdmin()

    // Fetch article
    const { data: row, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !row?.article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const articleType = row.article.article_type ?? row.plan?.article_type ?? ''
    const category = row.plan?.category ?? ''

    // Run triple fact-check
    const { factCheck: factCheckResult, audit: factCheckAudit } = await runTripleFactCheck(
      row.article,
      articleType,
      category,
      id,
    )

    // Apply corrections if issues found
    let updatedArticle = row.article
    if (factCheckResult.issues_found && factCheckResult.issues.length > 0) {
      updatedArticle = applyCorrections(row.article, factCheckResult)
    }

    // Save results
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        article: updatedArticle,
        fact_check: factCheckResult,
        fact_check_audit: factCheckAudit,
        verified_at: new Date().toISOString(),
        status: 'verified',
      })
      .eq('id', id)

    if (updateError) {
      console.error('[fact-check route] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to save fact-check' }, { status: 500 })
    }

    console.log(`[fact-check route] Complete for ${id.slice(0, 8)}: ${factCheckAudit.stages_run} stages, ${factCheckResult.total_issues} issues`)

    return NextResponse.json({
      fact_check: factCheckResult,
      audit: factCheckAudit,
      corrections_applied: factCheckResult.issues.filter(i => i.severity !== 'note').length,
    })
  } catch (err) {
    console.error('[fact-check route] Error:', err)
    return NextResponse.json({ error: 'Fact-check failed' }, { status: 500 })
  }
}
