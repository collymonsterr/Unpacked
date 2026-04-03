import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CATEGORIES, CATEGORY_BY_SLUG, slugToDbCategory } from '@/lib/category-config'
import Navbar from '@/components/ui/Navbar'
import Footer from '@/components/ui/Footer'
import CategoryPageClient from './CategoryPageClient'

export const dynamic = 'force-dynamic'

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

async function getCategoryArticles(categoryName: string, sort: string, page: number) {
  const { getSupabaseAdmin } = await import('@/lib/supabase')
  const db = getSupabaseAdmin()

  // Get total count
  const { count: totalCount } = await db
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('category', categoryName)
    .in('status', ['complete', 'verified'])
    .eq('visibility', 'published')

  // Build query with sort
  let query = db
    .from('articles')
    .select('id, slug, query, status, plan, article, suggestion_chips, category, view_count, user_id, user_name, user_avatar, fact_check, verified_at, created_at, updated_at')
    .eq('category', categoryName)
    .in('status', ['complete', 'verified'])
    .eq('visibility', 'published')

  if (sort === 'popular') {
    query = query.order('view_count', { ascending: false, nullsFirst: false })
  } else if (sort === 'verified') {
    query = query.order('verified_at', { ascending: false, nullsFirst: false })
  } else {
    // Default: most recent
    query = query.order('created_at', { ascending: false })
  }

  const offset = (page - 1) * ITEMS_PER_PAGE
  query = query.range(offset, offset + ITEMS_PER_PAGE - 1)

  const { data } = await query

  return {
    articles: data ?? [],
    totalCount: totalCount ?? 0,
    totalPages: Math.ceil((totalCount ?? 0) / ITEMS_PER_PAGE),
  }
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
