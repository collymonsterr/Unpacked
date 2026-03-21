export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import type { ArticleRow, ProductCard } from '@/types/article'

interface Props {
  params: Promise<{ id: string }>
}

function getCardImage(row: ArticleRow): string | null {
  if (row.article?.thumbnail_url) return row.article.thumbnail_url
  const sections = row.article?.sections ?? []
  const firstCard = sections.find((s): s is ProductCard => s.type === 'product_card')
  return firstCard?.image_urls?.[0] ?? firstCard?.image_url ?? null
}

function getArticleTypeLabel(type: string) {
  const labels: Record<string, string> = {
    buyer_guide: 'Buyer Guide',
    comparison: 'Comparison',
    decision_guide: 'Decision Guide',
    explainer: 'Explainer',
    news: 'News',
    planning: 'Planning Guide',
    trend_analysis: 'Trend Analysis',
    tutorial: 'Tutorial',
  }
  return labels[type] ?? type.replace(/_/g, ' ')
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  // Get creator info from their first article
  const { data } = await supabase
    .from('articles')
    .select('user_name, user_avatar')
    .eq('user_id', id)
    .limit(1)
    .single()

  const name = data?.user_name ?? 'Creator'

  return {
    title: `${name} — ArticleAI`,
    description: `Articles created by ${name} on ArticleAI.`,
  }
}

export default async function CreatorProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  // Get all articles by this creator
  const { data: articles } = await supabase
    .from('articles')
    .select('id, slug, query, status, plan, article, created_at')
    .eq('user_id', id)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })

  if (!articles || articles.length === 0) {
    // Check if the user exists by looking for any article with this user_id
    const { data: anyArticle } = await supabase
      .from('articles')
      .select('user_name, user_avatar')
      .eq('user_id', id)
      .limit(1)
      .single()

    if (!anyArticle) notFound()

    // User exists but has no complete articles
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
          <Logo size="md" />
        </nav>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <ProfileHeader
            name={anyArticle.user_name ?? 'Creator'}
            avatar={anyArticle.user_avatar}
            articleCount={0}
          />
          <p className="mt-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            This creator hasn&apos;t published any articles yet.
          </p>
        </div>
      </div>
    )
  }

  // Get creator info from the first article
  const firstArticle = articles[0] as ArticleRow
  const creatorName = firstArticle.user_name ?? 'Creator'
  const creatorAvatar = firstArticle.user_avatar ?? null

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
      </nav>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-10">
        <ProfileHeader
          name={creatorName}
          avatar={creatorAvatar}
          articleCount={articles.length}
        />
      </div>

      {/* Articles grid */}
      <section className="w-full max-w-6xl mx-auto px-4 md:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(articles as ArticleRow[]).map((row) => {
            const imageUrl = getCardImage(row)
            const title = row.article?.title ?? row.plan?.title ?? row.query
            const type = row.article?.article_type ?? row.plan?.article_type ?? 'buyer_guide'

            return (
              <Link
                key={row.id}
                href={`/article/${row.slug}`}
                className="block rounded-2xl overflow-hidden no-underline group"
                style={{
                  backgroundColor: 'var(--card)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
                  border: '1px solid var(--border)',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-end p-4"
                      style={{ background: 'linear-gradient(135deg, var(--accent-light), var(--card))' }}
                    >
                      <span
                        className="text-sm font-bold leading-snug line-clamp-2"
                        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
                      >
                        {title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <span
                    className="inline-block text-xs font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {getArticleTypeLabel(type)}
                  </span>
                  <h3
                    className="font-bold leading-snug line-clamp-3 text-sm"
                    style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)', minHeight: '3.6em' }}
                  >
                    {title}
                  </h3>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function ProfileHeader({
  name,
  avatar,
  articleCount,
}: {
  name: string
  avatar: string | null
  articleCount: number
}) {
  return (
    <div className="flex items-center gap-4">
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="w-16 h-16 rounded-full flex-shrink-0"
          style={{ border: '3px solid var(--border)' }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <h1
          className="text-xl md:text-2xl font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {name}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {articleCount} {articleCount === 1 ? 'article' : 'articles'} published
        </p>
      </div>
    </div>
  )
}
