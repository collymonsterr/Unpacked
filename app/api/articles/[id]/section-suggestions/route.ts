import { NextRequest } from 'next/server'
import { createServerSupabase, getSupabaseAdmin } from '@/lib/supabase'
import { isValidUUID } from '@/lib/validate'

/**
 * POST /api/articles/[id]/section-suggestions
 *
 * Returns 3-4 contextual replacement suggestions for a section by comparing
 * the section content against unused research findings and entity cards.
 *
 * Body: { sectionIndex: number }
 * Returns: { suggestions: string[] }
 *
 * No AI call — pure data comparison. Fast.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const db = getSupabaseAdmin()
    const { data: row, error: fetchErr } = await db
      .from('articles')
      .select('article, user_id, research_findings, entity_cards')
      .eq('id', id)
      .single()

    if (fetchErr || !row) {
      return Response.json({ error: 'Article not found' }, { status: 404 })
    }

    const isOwner = row.user_id === user.id
    const isAdmin = user.email === process.env.ADMIN_EMAIL || user.id === process.env.ADMIN_USER_ID
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { sectionIndex } = body as { sectionIndex: number }

    const article = row.article
    if (!article?.sections || typeof sectionIndex !== 'number' || sectionIndex < 0 || sectionIndex >= article.sections.length) {
      return Response.json({ suggestions: [] })
    }

    const section = article.sections[sectionIndex]
    const sectionText = JSON.stringify(section).toLowerCase()

    // Collect all names/topics already mentioned in the article
    const fullArticleText = JSON.stringify(article).toLowerCase()

    const suggestions: string[] = []

    // Strategy 1: Find entity cards not mentioned in THIS section but available in research
    const entityCards = (row.entity_cards ?? []) as Array<{
      canonical_name: string
      type: string
      product_fields?: { category?: string; brand?: string; key_specs?: Record<string, string> }
      facts: Array<{ fact: string }>
    }>

    // Entities mentioned in the article but NOT in this section
    const sectionEntities = entityCards.filter(e => sectionText.includes(e.canonical_name.toLowerCase()))
    const unusedInSection = entityCards.filter(e =>
      !sectionText.includes(e.canonical_name.toLowerCase()) &&
      fullArticleText.includes(e.canonical_name.toLowerCase())
    )
    const unusedAnywhere = entityCards.filter(e =>
      !fullArticleText.includes(e.canonical_name.toLowerCase())
    )

    // Prioritize entities not used anywhere in the article
    for (const entity of unusedAnywhere.slice(0, 2)) {
      if (entity.type === 'product') {
        suggestions.push(`Add ${entity.canonical_name}${entity.product_fields?.brand ? ` by ${entity.product_fields.brand}` : ''}`)
      } else {
        suggestions.push(`Cover ${entity.canonical_name}`)
      }
    }

    // Then entities used elsewhere but not in this section
    for (const entity of unusedInSection.slice(0, 2)) {
      if (suggestions.length >= 4) break
      if (entity.type === 'product') {
        suggestions.push(`Compare with ${entity.canonical_name}`)
      } else {
        suggestions.push(`Include ${entity.canonical_name} perspective`)
      }
    }

    // Strategy 2: Research findings not used in the article
    const findings = (row.research_findings ?? []) as Array<{
      id: string
      source: string
      content: string
      used_in_article: boolean
    }>

    const unusedFindings = findings.filter(f => !f.used_in_article)
    for (const finding of unusedFindings.slice(0, 3)) {
      if (suggestions.length >= 4) break
      // Extract a meaningful topic from the finding
      const firstSentence = finding.content.split(/[.!?]/)[0]?.trim()
      if (firstSentence && firstSentence.length > 15 && firstSentence.length < 100) {
        suggestions.push(firstSentence)
      }
    }

    // Strategy 3: Structural suggestions based on section type
    if (suggestions.length < 3) {
      const sectionType = section.type
      if (sectionType === 'content_section') {
        if (entityCards.length >= 2 && !fullArticleText.includes('comparison_table')) {
          suggestions.push('Price comparison table')
        }
        if (sectionEntities.length > 0) {
          suggestions.push(`Pros and cons breakdown`)
        }
      } else if (sectionType === 'product_card') {
        const productName = (section as { name?: string }).name ?? 'this product'
        suggestions.push(`Budget alternative to ${productName}`)
      }
    }

    return Response.json({ suggestions: suggestions.slice(0, 4) })
  } catch (err) {
    console.error('[section-suggestions]', err)
    return Response.json({ suggestions: [] })
  }
}
