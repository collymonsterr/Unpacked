import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'
import { refineArticle } from '@/lib/claude'
import type { ArticleContent } from '@/types/article'

export const maxDuration = 120

/**
 * POST /api/articles/[id]/section-edit
 *
 * Two actions:
 *   { action: 'remove', sectionIndex: number }
 *   { action: 'edit', sectionIndex: number, instruction: string }
 *
 * "remove" deletes the section from the article JSON in-place.
 * "edit" sends a targeted refine call that rewrites ONLY the specified section.
 *
 * Owner-only (or admin). Edits in-place — does NOT create a fork.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  try {
    // Auth check
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const db = getSupabaseAdmin()

    const { data: row, error: fetchErr } = await db
      .from('articles')
      .select('article, user_id, query, generation_options, research_findings')
      .eq('id', id)
      .single()

    if (fetchErr || !row || !row.article) {
      return Response.json({ error: 'Article not found' }, { status: 404 })
    }

    // Permission check: owner or admin
    const isOwner = row.user_id === user.id
    const isAdmin = user.email === process.env.ADMIN_EMAIL || user.id === process.env.ADMIN_USER_ID
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { action, sectionIndex, instruction } = body as {
      action: 'remove' | 'edit'
      sectionIndex: number
      instruction?: string
    }

    const article: ArticleContent = row.article
    if (!article.sections || !Array.isArray(article.sections)) {
      return Response.json({ error: 'Article has no sections' }, { status: 400 })
    }

    if (typeof sectionIndex !== 'number' || sectionIndex < 0 || sectionIndex >= article.sections.length) {
      return Response.json({ error: 'Section index out of range' }, { status: 400 })
    }

    // ── Remove action ──
    if (action === 'remove') {
      const removedType = article.sections[sectionIndex].type
      article.sections.splice(sectionIndex, 1)

      const { error: updateErr } = await db
        .from('articles')
        .update({ article })
        .eq('id', id)

      if (updateErr) {
        console.error('[section-edit] Remove failed:', updateErr.message)
        return Response.json({ error: 'Failed to update article' }, { status: 500 })
      }

      console.log(`[section-edit] Removed section ${sectionIndex} (${removedType}) from ${id}`)
      return Response.json({ success: true, article })
    }

    // ── Edit action ──
    if (action === 'edit') {
      if (!instruction || typeof instruction !== 'string') {
        return Response.json({ error: 'Instruction is required for edit action' }, { status: 400 })
      }

      const sectionHeading = (article.sections[sectionIndex] as { heading?: string }).heading ?? `section ${sectionIndex}`

      // Build research context
      const findings = (row.research_findings ?? []) as Array<{ source: string; content: string }>
      const researchContext = findings.length > 0
        ? findings.slice(0, 15).map(f => `[${f.source}]\n${f.content}`).join('\n\n---\n\n')
        : undefined

      // Targeted refine: instruct the model to change ONLY this section
      const targetedInstruction = `TARGETED SECTION EDIT — Rewrite ONLY section index ${sectionIndex} ("${sectionHeading}") based on this instruction: ${instruction}

CRITICAL: Return the complete article JSON with ONLY section ${sectionIndex} changed. Every other section must be IDENTICAL to the input — same text, same structure, same data. Do NOT change the title, article_type, quick_verdict, executive_summary, or any other section.`

      const { article: refined } = await refineArticle(
        row.query,
        article,
        targetedInstruction,
        row.generation_options ?? {},
        id,
        researchContext,
      )

      // ── Safeguards: preserve everything except the target section ──
      // Force-preserve title, type, verdict, summary
      refined.title = article.title
      refined.article_type = article.article_type
      refined.quick_verdict = article.quick_verdict
      refined.executive_summary = article.executive_summary
      refined.thumbnail_url = article.thumbnail_url
      refined.hero_attribution = article.hero_attribution

      // Force-preserve all non-target sections
      if (Array.isArray(refined.sections) && refined.sections.length > 0) {
        // Ensure section count matches original (model might add/remove)
        const finalSections = [...article.sections]
        // Only take the target section from the refined output
        if (sectionIndex < refined.sections.length) {
          finalSections[sectionIndex] = refined.sections[sectionIndex]
        }
        refined.sections = finalSections
      }

      const { error: updateErr } = await db
        .from('articles')
        .update({ article: refined })
        .eq('id', id)

      if (updateErr) {
        console.error('[section-edit] Edit failed:', updateErr.message)
        return Response.json({ error: 'Failed to update article' }, { status: 500 })
      }

      console.log(`[section-edit] Edited section ${sectionIndex} ("${sectionHeading}") in ${id}`)
      return Response.json({ success: true, article: refined })
    }

    return Response.json({ error: 'Invalid action: must be "remove" or "edit"' }, { status: 400 })
  } catch (err) {
    console.error('[section-edit] Error:', err)
    return Response.json({ error: 'Section edit failed' }, { status: 500 })
  }
}
