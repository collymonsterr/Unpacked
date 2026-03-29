export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
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

async function getProfile(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data as { display_name?: string; bio?: string; website?: string } | null
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const profile = await getProfile(supabase, id)

  // Get creator info from their first article
  const { data } = await supabase
    .from('articles')
    .select('user_name, user_avatar')
    .eq('user_id', id)
    .limit(1)
    .single()

  const name = profile?.display_name || data?.user_name || 'Creator'

  return {
    title: `${name} — Unpacked`,
    description: profile?.bio || `Articles created by ${name} on Unpacked.`,
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
    .in('status', ['complete', 'verified'])
    .eq('visibility', 'published')
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

    const emptyProfile = await getProfile(supabase, id)

    // User exists but has no complete articles
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm font-medium no-underline hidden sm:block" style={{ color: 'var(--text-secondary)' }}>Home</a>
            <UserMenu />
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <ProfileHeader
            name={emptyProfile?.display_name || anyArticle.user_name || 'Creator'}
            avatar={anyArticle.user_avatar}
            articleCount={0}
            bio={emptyProfile?.bio}
            website={emptyProfile?.website}
          />
          <p className="mt-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
            This creator hasn&apos;t published any articles yet.
          </p>
        </div>
      </div>
    )
  }

  // Get creator info
  const firstArticle = articles[0] as ArticleRow
  const profile = await getProfile(supabase, id)
  const creatorName = profile?.display_name || firstArticle.user_name || 'Creator'
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
          bio={profile?.bio}
          website={profile?.website}
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
  bio,
  website,
}: {
  name: string
  avatar: string | null
  articleCount: number
  bio?: string
  website?: string
}) {
  return (
    <div className="flex items-start gap-4">
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
        {bio && (
          <p className="text-sm mt-2" style={{ color: 'var(--text-primary)' }}>
            {bio}
          </p>
        )}
        {website && (
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm mt-1 inline-flex items-center gap-1 no-underline hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
      </div>
    </div>
  )
}
