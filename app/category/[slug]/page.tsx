import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CATEGORIES, CATEGORY_BY_SLUG, slugToDbCategory } from '@/lib/category-config'
import Navbar from '@/components/ui/Navbar'
import Footer from '@/components/ui/Footer'
import { unstable_cache } from 'next/cache'
import { LISTING_EXCLUDED_SLUGS, isHiddenFromListings } from '@/lib/seo-canonical'
import { DB_TIMEOUT_MS, dbSignal, withTimeout } from '@/lib/db-timeout'
import CategoryPageClient from './CategoryPageClient'

// Paginated and sortable via searchParams, so the route is dynamic — but the
// underlying query is cached per (category, sort, page). These pages produced
// every 300s timeout in the 14-15 Oct incidents: crawlers walk all 12 of them.
export const dynamic = 'force-dynamic'
export const maxDuration = 20

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

export async function generateStaticParams() {
  return CATEGORIES.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const config = CATEGORY_BY_SLUG.get(slug)
  if (!config) return {}

  return {
    title: `${config.name} Articles — Unpacked`,
    description: config.description,
    openGraph: {
      title: `${config.name} Articles — Unpacked`,
      description: config.description,
      url: `https://unpacked.fyi/category/${slug}`,
      siteName: 'Unpacked',
      type: 'website',
    },
    alternates: {
      canonical: `https://unpacked.fyi/category/${slug}`,
    },
  }
}

const ITEMS_PER_PAGE = 12

const getCategoryArticlesCached = unstable_cache(
  async (categoryName: string, sort: string, page: number) => {
  const { getSupabaseAdmin } = await import('@/lib/supabase')
  const db = getSupabaseAdmin()

  // 301'd duplicate slugs are excluded in SQL — filtering after the fact would
  // leave short pages, since the range is applied server-side.
  const excluded = `(${LISTING_EXCLUDED_SLUGS.map(sl => `"${sl}"`).join(',')})`

  // Get total count
  const { count: totalCount } = await db
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('category', categoryName)
    .in('status', ['complete', 'verified'])
    .eq('visibility', 'published')
    .not('slug', 'in', excluded)
    .abortSignal(dbSignal())

  // Build query with sort
  let query = db
    .from('articles')
    .select('id, slug, query, status, plan, article, suggestion_chips, category, view_count, user_id, user_name, user_avatar, fact_check, verified_at, created_at, updated_at')
    .eq('category', categoryName)
    .in('status', ['complete', 'verified'])
    .eq('visibility', 'published')
    .not('slug', 'in', excluded)

  if (sort === 'popular') {
    query = query.order('view_count', { ascending: false, nullsFirst: false })
  } else if (sort === 'verified') {
    query = query.order('verified_at', { ascending: false, nullsFirst: false })
  } else {
    // Default: most recent
    query = query.order('created_at', { ascending: false })
  }

  const offset = (page - 1) * ITEMS_PER_PAGE
  query = query.range(offset, offset + ITEMS_PER_PAGE - 1).abortSignal(dbSignal())

  const { data, error } = await query
  // Never cache a failed query as an empty category.
  if (error) throw error

  return {
    // Belt and braces: catches pipeline debris that is not also a redirect source.
    articles: (data ?? []).filter(r => !isHiddenFromListings(r.slug as string)),
    totalCount: totalCount ?? 0,
    totalPages: Math.ceil((totalCount ?? 0) / ITEMS_PER_PAGE),
  }
  },
  ['category-articles-v1'],
  { revalidate: 120, tags: ['articles'] }
)

/** Empty category beats a hung page when the database stalls. */
async function getCategoryArticles(categoryName: string, sort: string, page: number) {
  return withTimeout(
    getCategoryArticlesCached(categoryName, sort, page),
    DB_TIMEOUT_MS,
    `category ${categoryName} p${page}`,
    { articles: [], totalCount: 0, totalPages: 0 }
  )
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { page: pageParam, sort: sortParam } = await searchParams

  const config = CATEGORY_BY_SLUG.get(slug)
  if (!config) notFound()

  const dbCategory = slugToDbCategory(slug)
  if (!dbCategory) notFound()

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const sort = ['recent', 'popular', 'verified'].includes(sortParam ?? '') ? sortParam! : 'recent'

  const { articles, totalCount, totalPages } = await getCategoryArticles(dbCategory, sort, page)

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12 pb-10">
        <h1
          className="text-3xl md:text-4xl font-extrabold mb-3"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {config.name}
        </h1>
        <p
          className="text-base md:text-lg mb-2 max-w-2xl"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}
        >
          {config.description}
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
          {totalCount} article{totalCount !== 1 ? 's' : ''} in {config.name}
        </p>
      </section>

      {/* Articles */}
      <CategoryPageClient
        articles={articles}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={page}
        currentSort={sort}
        slug={slug}
        categoryName={config.name}
      />

      <Footer />
    </div>
  )
}
