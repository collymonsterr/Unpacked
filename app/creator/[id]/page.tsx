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
    buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
    explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
    news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
    breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
    news: 'News', planning: 'Planning Guide', tutorial: 'Tutorial',
  }
  return labels[type] ?? type.replace(/_/g, ' ')
}

async function getProfile(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data as { display_name?: string; bio?: string; website?: string; twitter_url?: string; linkedin_url?: string; medium_url?: string; is_founding_creator?: boolean } | null
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
            twitterUrl={emptyProfile?.twitter_url}
            linkedinUrl={emptyProfile?.linkedin_url}
            mediumUrl={emptyProfile?.medium_url}
            isFoundingCreator={emptyProfile?.is_founding_creator}
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
          twitterUrl={profile?.twitter_url}
          linkedinUrl={profile?.linkedin_url}
          mediumUrl={profile?.medium_url}
          isFoundingCreator={profile?.is_founding_creator}
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
  twitterUrl,
  linkedinUrl,
  mediumUrl,
  isFoundingCreator,
}: {
  name: string
  avatar: string | null
  articleCount: number
  bio?: string
  website?: string
  twitterUrl?: string
  linkedinUrl?: string
  mediumUrl?: string
  isFoundingCreator?: boolean
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
        <div className="flex items-center gap-2 flex-wrap">
          <h1
            className="text-xl md:text-2xl font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            {name}
          </h1>
          {isFoundingCreator && (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}
            >
              Founding Creator
            </span>
          )}
          {twitterUrl && (
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="X / Twitter"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          )}
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="LinkedIn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          )}
          {mediumUrl && (
            <a
              href={mediumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
              </svg>
            </a>
          )}
        </div>
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
