import type { ArticleContent, ProductCard } from '@/types/article'
import { getReadingTime } from '@/lib/reading-time'

/**
 * The only article fields a listing card ever renders.
 *
 * Homepage and category listings used to hand whole `ArticleRow`s — including the
 * full `article`, `plan` and `fact_check` JSONB — to client components, which put
 * every byte into the RSC payload embedded in the initial HTML (~5.9 MB for 200
 * rows). Cards need about a dozen scalars, so we resolve them on the server and
 * ship only those.
 *
 * Keep this in sync with what the card components actually read; anything added
 * here lands in the initial HTML for every article in the listing.
 */
export interface ArticleCardData {
  id: string
  slug: string
  /** Original user query — used for example-chip de-duplication, not rendered. */
  query: string
  title: string
  articleType: string
  imageUrl: string | null
  /** Short descriptive line under the title on the featured hero card. */
  description: string
  /** Editorial verdict line for the featured hero card's verdict box. */
  verdict: string
  readingTime: number
  category: string | null
  isFeatured: boolean
  isTrending: boolean
  trendingSetAt: string | null
  viewCount: number
  createdAt: string
  userName: string | null
  userAvatar: string | null
  /** Whether a fact-check ran — drives the green shield. The payload itself is not shipped. */
  hasFactCheck: boolean
  verifiedAt: string | null
}

/**
 * Minimum shape `toArticleCard()` needs. `ArticleRow` satisfies it structurally,
 * and so does a narrowed listing query that selects only these columns.
 */
export interface ArticleCardSource {
  id: string
  slug: string
  query?: string | null
  article?: ArticleContent | null
  /** Only `category` and `title` are read — a `plan->>category` projection is enough. */
  plan?: { title?: string | null; category?: string | null } | null
  category?: string | null
  card_summary?: string | null
  is_featured?: boolean | null
  is_trending?: boolean | null
  trending_set_at?: string | null
  view_count?: number | null
  created_at: string
  user_name?: string | null
  user_avatar?: string | null
  /** Read only for `checks_performed` — the rest of the payload is never used. */
  fact_check?: unknown
  verified_at?: string | null
}

/** First image we can show for a card: hero thumbnail, else the top product shot. */
function resolveCardImage(row: ArticleCardSource): string | null {
  if (row.article?.thumbnail_url) return row.article.thumbnail_url
  const productCards = row.article?.sections?.filter(
    (s): s is ProductCard => s.type === 'product_card'
  )
  return productCards?.[0]?.image_urls?.[0] ?? productCards?.[0]?.image_url ?? null
}

/**
 * Card verdict line, in priority order:
 *   1. `card_summary` — written specifically for cards when an article is featured
 *   2. first complete sentence of the verdict recommendation
 *   3. first complete sentence of the verdict one-liner
 *   4. first key takeaway
 */
function resolveVerdict(row: ArticleCardSource): string {
  const cardSummary = row.card_summary
  if (cardSummary && cardSummary.trim().length > 0) return cardSummary.trim()

  const art = row.article

  const rec = art?.quick_verdict?.recommendation
  if (rec) {
    const firstSentence = rec.match(/^[^.;!?]+[.;!?]/)
    if (firstSentence) return firstSentence[0].replace(/;$/, '.').trim()
    return rec.split(';')[0].trim()
  }

  const oneLiner = art?.quick_verdict?.one_liner
  if (oneLiner) {
    const firstSentence = oneLiner.match(/^[^.;!?]+[.;!?]/)
    if (firstSentence) return firstSentence[0].trim()
    return oneLiner
  }

  return art?.executive_summary?.key_takeaways?.[0] ?? ''
}

/**
 * The flat shape a listing query should ask Postgres for: scalars plus a few
 * JSON paths, instead of the whole `article` blob.
 *
 * Selecting `article` whole meant the homepage pulled every article's full body
 * out of the database on every render. These projections are what the cards
 * actually read.
 *
 * `readingTime` is the one casualty — it is computed from the full section text,
 * which is exactly what we are no longer fetching. Cards hide "x min read" when
 * it is 0. Restoring it needs a stored `reading_time` column (see
 * scripts/add-performance-indexes.sql for the follow-up note).
 */
export interface ArticleCardProjection {
  id: string
  slug: string
  query?: string | null
  title?: string | null
  article_type?: string | null
  thumbnail_url?: string | null
  short_answer?: string | null
  one_liner?: string | null
  recommendation?: string | null
  first_takeaway?: string | null
  plan_title?: string | null
  plan_category?: string | null
  category?: string | null
  card_summary?: string | null
  is_featured?: boolean | null
  is_trending?: boolean | null
  trending_set_at?: string | null
  view_count?: number | null
  created_at: string
  user_name?: string | null
  user_avatar?: string | null
  fact_check_probe?: unknown
  verified_at?: string | null
}

/** First complete sentence, used for verdict lines. */
function firstSentence(text: string): string {
  const match = text.match(/^[^.;!?]+[.;!?]/)
  if (match) return match[0].replace(/;$/, '.').trim()
  return text.split(';')[0].trim()
}

/** Same verdict priority as `resolveVerdict()`, over projected columns. */
function projectedVerdict(row: ArticleCardProjection): string {
  if (row.card_summary && row.card_summary.trim()) return row.card_summary.trim()
  if (row.recommendation) return firstSentence(row.recommendation)
  if (row.one_liner) return firstSentence(row.one_liner)
  return row.first_takeaway ?? ''
}

/**
 * Did a fact-check actually check anything?
 *
 * Both call sites below used to test the value for mere truthiness, which was
 * wrong in two different ways: the full `fact_check` JSONB is a truthy object
 * even when `checks_performed` is 0, and the projected form arrives from
 * Postgres as the *string* `"0"`, which is truthy too. Articles written while
 * the fact-check provider was down carry `{ checks_performed: 0 }`, so every
 * one of them was showing a green "Verified" shield for a check that never ran.
 */
function performedChecks(value: unknown): boolean {
  if (value == null) return false
  // `fact_check->>checks_performed` comes back as a string.
  if (typeof value === 'string' || typeof value === 'number') return Number(value) > 0
  if (typeof value === 'object') {
    return Number((value as { checks_performed?: unknown }).checks_performed ?? 0) > 0
  }
  return false
}

/** Build a card from a projected listing row. Server-side only. */
export function toArticleCardFromProjection(row: ArticleCardProjection): ArticleCardData {
  return {
    id: row.id,
    slug: row.slug,
    query: row.query ?? '',
    title: row.title ?? row.plan_title ?? row.query ?? '',
    articleType: row.article_type ?? '',
    imageUrl: row.thumbnail_url ?? null,
    description: row.short_answer ?? row.one_liner ?? '',
    verdict: projectedVerdict(row),
    // Unknown without the body — cards hide it when 0.
    readingTime: 0,
    category: row.category ?? row.plan_category ?? null,
    isFeatured: row.is_featured === true,
    isTrending: row.is_trending === true,
    trendingSetAt: row.trending_set_at ?? null,
    viewCount: row.view_count ?? 0,
    createdAt: row.created_at,
    userName: row.user_name ?? null,
    userAvatar: row.user_avatar ?? null,
    hasFactCheck: performedChecks(row.fact_check_probe),
    verifiedAt: row.verified_at ?? null,
  }
}

/** Project a full DB row down to what a listing card renders. Server-side only. */
export function toArticleCard(row: ArticleCardSource): ArticleCardData {
  const art = row.article

  return {
    id: row.id,
    slug: row.slug,
    query: row.query ?? '',
    title: art?.title ?? row.plan?.title ?? row.query ?? '',
    articleType: art?.article_type ?? '',
    imageUrl: resolveCardImage(row),
    description: art?.executive_summary?.short_answer ?? art?.quick_verdict?.one_liner ?? '',
    verdict: resolveVerdict(row),
    readingTime: art ? getReadingTime(art) : 0,
    category: row.category ?? row.plan?.category ?? null,
    isFeatured: row.is_featured === true,
    isTrending: row.is_trending === true,
    trendingSetAt: row.trending_set_at ?? null,
    viewCount: row.view_count ?? 0,
    createdAt: row.created_at,
    userName: row.user_name ?? null,
    userAvatar: row.user_avatar ?? null,
    hasFactCheck: performedChecks(row.fact_check),
    verifiedAt: row.verified_at ?? null,
  }
}

/** Shared display labels for article types across all listing cards. */
export const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  ranked_list: 'Ranked List', myth_buster: 'Myth Buster',
  timeline_article: 'Timeline', visual_list: 'Visual List',
  // Legacy types (old articles may still have these)
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}
