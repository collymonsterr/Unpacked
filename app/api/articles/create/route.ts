import { NextRequest } from 'next/server'
import { after } from 'next/server'
import { planArticle, writeArticle } from '@/lib/claude'
import { enrichArticleWithImages, fetchThumbnailImage } from '@/lib/images'
import { pickBestArticleImage } from '@/lib/imagen'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateUniqueSlug } from '@/lib/slug'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 })
    }

    const trimmedQuery = query.trim()

    // Step 1: Plan the article
    const plan = await planArticle(trimmedQuery)

    // Generate unique slug from the planned title
    const slug = await generateUniqueSlug(plan.title)

    // Save to Supabase
    const { data, error } = await getSupabaseAdmin()
      .from('articles')
      .insert({
        slug,
        query: trimmedQuery,
        status: 'generating',
        plan,
        suggestion_chips: plan.suggestion_chips,
      })
      .select('id, slug')
      .single()

    if (error) throw error

    // Run generation after the response is sent
    after(async () => {
      const db = getSupabaseAdmin()
      try {
        const rawArticle = await writeArticle(trimmedQuery, plan)

        // Enrich product images + fetch hero thumbnail in parallel
        const [enrichedArticle, heroUrl] = await Promise.all([
          enrichArticleWithImages(
            rawArticle,
            plan.entities,
            plan.visual_strategy?.image_density
          ),
          fetchThumbnailImage(rawArticle.title, rawArticle.article_type),
        ])

        // Always set a hero image — fall back to best product image if Brave fails
        enrichedArticle.thumbnail_url = heroUrl ?? pickBestArticleImage(enrichedArticle)

        await db
          .from('articles')
          .update({ article: enrichedArticle, status: 'complete' })
          .eq('id', data.id)
      } catch (err) {
        console.error('[generate]', err)
        await db
          .from('articles')
          .update({ status: 'error' })
          .eq('id', data.id)
      }
    })

    return Response.json({ id: data.id, slug: data.slug, plan })
  } catch (err) {
    console.error('[create]', err)
    return Response.json({ error: 'Failed to create article' }, { status: 500 })
  }
}
