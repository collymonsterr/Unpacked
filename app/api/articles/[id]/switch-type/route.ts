import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireArticleOwner } from '@/lib/auth-check'
import { ARTICLE_TYPE_LIST, isComponentAllowed, getForbiddenComponents } from '@/lib/article-types'
import type { ArticleType, ArticlePlan } from '@/types/article'

/**
 * POST /api/articles/[id]/switch-type
 *
 * Switches an article's type before writing begins.
 * Updates the plan's forbidden/required components for the new type.
 * Only works on articles in awaiting_auth, planning, or generating status.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // UUID validation + auth: only owner or admin may switch type
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ error: 'Invalid article id' }, { status: 400 })
    }
    const auth = await requireArticleOwner(id)
    if (!auth.authorized) return auth.error!

    const body = await request.json()
    const newType = body?.type as string

    if (!newType || !ARTICLE_TYPE_LIST.includes(newType as ArticleType)) {
      return Response.json(
        { error: 'Invalid article type' },
        { status: 400 }
      )
    }

    const db = getSupabaseAdmin()

    // Fetch article
    const { data: article, error } = await db
      .from('articles')
      .select('id, status, plan, research_preview')
      .eq('id', id)
      .single()

    if (error || !article) {
      return Response.json({ error: 'Article not found' }, { status: 404 })
    }

    // Only allow switching before writing completes
    const allowedStatuses = ['awaiting_auth', 'planning', 'generating']
    if (!allowedStatuses.includes(article.status)) {
      return Response.json(
        { error: 'Article type can only be switched before writing completes' },
        { status: 400 }
      )
    }

    if (!article.plan) {
      return Response.json({ error: 'No plan found' }, { status: 400 })
    }

    // Update the plan with the new type and its component rules
    const updatedPlan: ArticlePlan = {
      ...article.plan,
      article_type: newType as ArticleType,
      forbidden_components: getForbiddenComponents(newType as ArticleType),
    }

    // Update research preview if it exists
    const updatedPreview = article.research_preview
      ? { ...article.research_preview, article_type: newType }
      : null

    await db
      .from('articles')
      .update({
        plan: updatedPlan,
        research_preview: updatedPreview,
      })
      .eq('id', id)

    console.log(`[switch-type] Article ${id}: ${article.plan.article_type} → ${newType}`)

    return Response.json({ success: true, newType })
  } catch (err) {
    console.error('[switch-type] Error:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
