import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { runFactCheck, applyCorrections } from '@/lib/fact-check'
import { isValidUUID } from '@/lib/validate'

export const maxDuration = 120

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 })
  // No rate limiting — fact-check is system-triggered after generation

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

    // Run fact-check via Gemini
    const factCheckResult = await runFactCheck(row.article)

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
        verified_at: new Date().toISOString(),
        status: 'verified',
      })
      .eq('id', id)

    if (updateError) {
      console.error('[fact-check route] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to save fact-check' }, { status: 500 })
    }

    console.log('[fact-check route] Complete for', id.slice(0, 8), ':', factCheckResult.total_issues, 'issues')

    return NextResponse.json({
      fact_check: factCheckResult,
      corrections_applied: factCheckResult.issues.filter(i => i.severity !== 'note').length,
    })
  } catch (err) {
    console.error('[fact-check route] Error:', err)
    return NextResponse.json({ error: 'Fact-check failed' }, { status: 500 })
  }
}
