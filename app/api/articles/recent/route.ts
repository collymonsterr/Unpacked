import { unstable_cache } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { toArticleCardFromProjection, type ArticleCardData, type ArticleCardProjection } from '@/lib/article-card'
import { DB_TIMEOUT_MS, dbSignal, withTimeout } from '@/lib/db-timeout'

// RelatedArticles renders on EVERY article page and calls this. It used to
// select `plan`, `article` and `suggestion_chips` whole for 100 articles —
// roughly 10MB of TOASTed JSONB read out of Postgres per article view, with no
// timeout and no cache. That is a large share of the Disk IO this project was
// burning (Supabase alert, Nov 2026).
//
// Default response is now the projected card shape, the same one the homepage
// uses. `?full=1` keeps the wide payload for the admin dashboard, which needs
// status and flags and is one signed-in user rather than every reader.
export const maxDuration = 15

const CARD_SELECT =
  'id, slug, query, is_featured, is_trending, trending_set_at, view_count, ' +
  'user_name, user_avatar, verified_at, created_at, card_summary, category, ' +
  'title:article->>title, article_type:article->>article_type, thumbnail_url:article->>thumbnail_url, ' +
  'short_answer:article->executive_summary->>short_answer, ' +
  'one_liner:article->quick_verdict->>one_liner, ' +
  'recommendation:article->quick_verdict->>recommendation, ' +
  'first_takeaway:article->executive_summary->key_takeaways->>0, ' +
  'plan_title:plan->>title, plan_category:plan->>category, ' +
  'fact_check_probe:fact_check->>checks_performed'

const FULL_SELECT =
  'id, slug, query, status, plan, article, hidden_from_homepage, view_count, is_featured, ' +
  'is_trending, trending_set_at, user_id, user_name, user_avatar, fact_check, verified_at, ' +
  'created_at, updated_at, suggestion_chips'

function baseQuery(select: string, limit: number) {
  return getSupabaseAdmin()
    .from('articles')
    .select(select)
    .in('status', ['complete', 'verified'])
    .eq('hidden_from_homepage', false)
    .eq('visibility', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)
    .abortSignal(dbSignal())
}

/** Cached so a burst of article views collapses onto one database read. */
const getRecentCards = unstable_cache(
  async (): Promise<ArticleCardData[]> => {
    const { data, error } = await baseQuery(CARD_SELECT, 100)
    // Throw rather than return []: unstable_cache stores whatever it is given,
    // and caching an empty list would empty "You might also like" for everyone.
    if (error) throw error
    return ((data ?? []) as unknown as ArticleCardProjection[]).map(toArticleCardFromProjection)
  },
  ['recent-articles-cards-v1'],
  { revalidate: 300, tags: ['articles'] }
)

export async function GET(request: Request) {
  const full = new URL(request.url).searchParams.get('full') === '1'

  if (full) {
    // Admin only in practice — uncached so the dashboard reflects edits, but
    // still time-bounded so a slow database cannot pin the function.
    const { data, error } = await withTimeout(
      baseQuery(FULL_SELECT, 100),
      DB_TIMEOUT_MS,
      'recent articles (full)',
      { data: [], error: null } as never
    )
    if (error) return Response.json({ error: 'Failed to fetch articles' }, { status: 500 })
    return Response.json(data ?? [])
  }

  const cards = await withTimeout(getRecentCards(), DB_TIMEOUT_MS, 'recent articles', [] as ArticleCardData[])
  return Response.json(cards)
}
