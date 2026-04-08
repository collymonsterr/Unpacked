import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'
import { requireArticleOwner } from '@/lib/auth-check'
import type { ArticleContent, ArticleSection } from '@/types/article'

export const maxDuration = 30

/**
 * POST /api/articles/[id]/edit-full
 *
 * Document-style full-article edit. Accepts:
 *   {
 *     title: string,
 *     sections: ArticleSection[]   // full updated sections array (post-edit + post-reorder)
 *   }
 *
 * Patches the article JSONB directly — no AI model call. Compares each section
 * against the original to detect changes, and marks any modified section with
 * `edited: true` in the JSON for future "Edited — not verified" display.
 *
 * Owner-only (or admin). Rejects unknown section indices, refuses to add/remove
 * sections (length must equal original), and never alters structured-component
 * data (charts, tables, calculators, product cards) — for those, only `heading`
 * is allowed to change, and only when the section type supports it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) {
    return Response.json({ error: 'Invalid article ID' }, { status: 400 })
  }

  // Auth: owner or admin
  const auth = await requireArticleOwner(id)
  if (!auth.authorized) return auth.error!

  let body: { title?: unknown; sections?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const newTitle = typeof body.title === 'string' ? body.title.trim() : ''
  const newSections = Array.isArray(body.sections) ? (body.sections as ArticleSection[]) : null

  if (!newTitle) {
    return Response.json({ error: 'Title is required' }, { status: 400 })
  }
  if (!newSections) {
    return Response.json({ error: 'Sections array is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row, error: fetchErr } = await db
    .from('articles')
    .select('article')
    .eq('id', id)
    .single()

  if (fetchErr || !row?.article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  const original: ArticleContent = row.article
  if (!Array.isArray(original.sections)) {
    return Response.json({ error: 'Article has no sections' }, { status: 400 })
  }

  if (newSections.length !== original.sections.length) {
    return Response.json(
      { error: 'Section count mismatch — adding/removing sections is not allowed via this endpoint' },
      { status: 400 }
    )
  }

  // Build the merged sections array. For each incoming section, look up the
  // original by id (when reordered) — we use the (type + heading + content
  // signature) of the original at the matching original index, but allow the
  // client to send the whole section object so reordering works trivially.
  //
  // The client sends sections in the desired final order. Each section MUST
  // include an `_originalIndex` field so we can find its source-of-truth row
  // and verify nothing structural was tampered with.
  const merged: ArticleSection[] = []
  let editCount = 0

  for (let i = 0; i < newSections.length; i++) {
    const incoming = newSections[i] as ArticleSection & { _originalIndex?: number; edited?: boolean }
    const originalIdx = typeof incoming._originalIndex === 'number' ? incoming._originalIndex : i

    if (originalIdx < 0 || originalIdx >= original.sections.length) {
      return Response.json(
        { error: `Invalid _originalIndex ${originalIdx} at position ${i}` },
        { status: 400 }
      )
    }

    const source = original.sections[originalIdx]
    if (source.type !== incoming.type) {
      return Response.json(
        { error: `Section type mismatch at position ${i} (got ${incoming.type}, expected ${source.type})` },
        { status: 400 }
      )
    }

    // Build the patched section: clone the original, then overlay the
    // editable text fields based on type. Anything not whitelisted is
    // preserved from the original — clients cannot tamper with structured data.
    const patched = applyEditableFields(source, incoming)
    const changed = patched.changed
    if (changed) editCount++

    merged.push(patched.section)
  }

  const titleChanged = newTitle !== original.title

  const updatedArticle: ArticleContent = {
    ...original,
    title: newTitle,
    sections: merged,
  }

  const { error: updateErr } = await db
    .from('articles')
    .update({ article: updatedArticle, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) {
    console.error('[edit-full] Update failed:', updateErr.message)
    return Response.json({ error: 'Failed to save article' }, { status: 500 })
  }

  console.log(
    `[edit-full] Saved article ${id}: title ${titleChanged ? 'changed' : 'unchanged'}, ${editCount} sections edited`
  )

  return Response.json({
    success: true,
    article: updatedArticle,
    titleChanged,
    sectionsEdited: editCount,
  })
}

// ── Editable field whitelist ────────────────────────────────────────────────
//
// For each section type we expose ONLY the fields that the document editor
// is allowed to mutate. Everything else is preserved from the original row,
// even if the client tries to send it. This is the security boundary.

interface PatchResult {
  section: ArticleSection
  changed: boolean
}

function applyEditableFields(
  original: ArticleSection,
  incoming: ArticleSection,
): PatchResult {
  // Always preserve the original object as the base — never trust the client
  // for anything outside the whitelist.
  const next = { ...original } as ArticleSection & { edited?: boolean }
  let changed = false

  switch (original.type) {
    case 'content_section': {
      const inc = incoming as { heading?: string; content?: string }
      const newHeading = typeof inc.heading === 'string' ? inc.heading : original.heading
      const newContent = typeof inc.content === 'string' ? inc.content : original.content
      if (newHeading !== original.heading || newContent !== original.content) {
        changed = true
      }
      ;(next as { heading: string; content: string }).heading = newHeading
      ;(next as { heading: string; content: string }).content = newContent
      break
    }
    case 'big_statement': {
      const inc = incoming as { content?: { statement?: string } }
      const newStatement = typeof inc.content?.statement === 'string'
        ? inc.content.statement
        : original.content.statement
      if (newStatement !== original.content.statement) {
        changed = true
      }
      ;(next as { content: { statement: string } }).content = { statement: newStatement }
      break
    }
    case 'product_card': {
      // Heading + opinion + verdict are editable text. Specs/price/links stay locked.
      const inc = incoming as { heading?: string; opinion?: string; verdict?: string }
      const newHeading = typeof inc.heading === 'string' ? inc.heading : original.heading
      const newOpinion = typeof inc.opinion === 'string' ? inc.opinion : original.opinion
      const newVerdict = typeof inc.verdict === 'string' ? inc.verdict : original.verdict
      if (
        newHeading !== original.heading ||
        newOpinion !== original.opinion ||
        newVerdict !== original.verdict
      ) {
        changed = true
      }
      ;(next as { heading: string; opinion: string; verdict: string }).heading = newHeading
      ;(next as { heading: string; opinion: string; verdict: string }).opinion = newOpinion
      ;(next as { heading: string; opinion: string; verdict: string }).verdict = newVerdict
      break
    }
    case 'image_section': {
      // Image data is locked — only heading is editable.
      const inc = incoming as { heading?: string }
      if (typeof inc.heading === 'string' && inc.heading !== original.heading) {
        changed = true
        ;(next as { heading?: string }).heading = inc.heading
      }
      break
    }
    // Structured components: only the heading is editable.
    case 'comparison_table':
    case 'warning_box':
    case 'price_tier_breakdown':
    case 'community_insights':
    case 'head_to_head':
    case 'who_this_is_for':
    case 'bar_chart':
    case 'comparison_matrix':
    case 'pie_chart':
    case 'line_chart':
    case 'stat_cards':
    case 'treemap':
    case 'timeline':
    case 'interactive_calculator':
    case 'ranked_item':
    case 'myth_reality': {
      const inc = incoming as { heading?: string }
      if (typeof inc.heading === 'string' && inc.heading !== (original as { heading?: string }).heading) {
        changed = true
        ;(next as { heading?: string }).heading = inc.heading
      }
      break
    }
    // Sections without an editable surface in the document editor.
    case 'sources':
    case 'further_reading':
    case 'live_data_card':
      break
  }

  if (changed) {
    next.edited = true
  }

  return { section: next, changed }
}
