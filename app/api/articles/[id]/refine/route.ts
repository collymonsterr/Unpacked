import { NextRequest } from 'next/server'
import { refineArticle } from '@/lib/claude'
import { enrichArticleWithImages } from '@/lib/images'
import { getSupabaseAdmin } from '@/lib/supabase'
import { checkRateLimit, getRateLimitInfo } from '@/lib/rate-limit'
import { generateUniqueSlug } from '@/lib/slug'
import { requireAuth } from '@/lib/auth-check'
import { isValidUUID } from '@/lib/validate'

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUUID(id)) return Response.json({ error: 'Invalid article ID' }, { status: 400 })

  // Refine creates a fork — any authenticated user can do this
  const auth = await requireAuth()
  if (!auth.authorized) return auth.error!

  // Rate limiting — refine is cheaper, allow more
  const { key } = getRateLimitInfo(request)
  const rateResult = await checkRateLimit(`refine:${key}`, 20)
  if (!rateResult.allowed) {
    return Response.json({ error: "You've reached the refinement limit. Try again in a bit." }, { status: 429 })
  }

  const { instruction } = await request.json()

  if (!instruction || typeof instruction !== 'string') {
    return Response.json({ error: 'Instruction is required' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { data: row, error: fetchError } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !row || !row.article) {
    return Response.json({ error: 'Article not found' }, { status: 404 })
  }

  try {
    // Use the generation options stored on the source article for regional consistency
    const storedOptions = row.generation_options ?? undefined

    const { article: refined, suggestion_chips } = await refineArticle(
      row.query,
      row.article,
      instruction,
      storedOptions
    )

    const enriched = await enrichArticleWithImages(refined, row.plan?.entities ?? [])

    // Preserve hero image from parent
    if (!enriched.thumbnail_url && row.article.thumbnail_url) {
      enriched.thumbnail_url = row.article.thumbnail_url
    }

    // Determine the root article ID
    const rootId = row.root_article_id ?? row.id

    // Create a new child article instead of modifying in-place
    const newSlug = await generateUniqueSlug(enriched.title ?? row.article.title)
    const { data: newArticle, error: insertError } = await db
      .from('articles')
      .insert({
        slug: newSlug,
        query: row.query,
        status: 'complete',
        plan: row.plan,
        article: enriched,
        suggestion_chips,
        user_id: row.user_id,
        user_name: row.user_name,
        user_avatar: row.user_avatar,
        generation_options: storedOptions ?? null,
        parent_article_id: id,
        root_article_id: rootId,
      })
      .select('id, slug, article, suggestion_chips')
      .single()

    if (insertError || !newArticle) {
      console.error('[refine] Insert error:', insertError?.message)
      return Response.json({ error: 'Failed to save refined article' }, { status: 500 })
    }

    return Response.json({
      article: newArticle.article,
      suggestion_chips: newArticle.suggestion_chips,
      newArticleId: newArticle.id,
      newSlug: newArticle.slug,
    })
  } catch (err) {
    console.error('[refine]', err)
    return Response.json({ error: 'Refinement failed' }, { status: 500 })
  }
}
