'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ArticleRow } from '@/types/article'
import SectionHeader from './SectionHeader'

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buying Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', news: 'News', planning: 'Travel & Living',
  trend_analysis: 'Trend Analysis', tutorial: 'Tutorial',
}

interface Props {
  articles: ArticleRow[]
}

export default function FeaturedSection({ articles }: Props) {
  const [heroArticle, setHeroArticle] = useState<ArticleRow | null>(null)
  const [smallArticles, setSmallArticles] = useState<ArticleRow[]>([])

  useEffect(() => {
    if (articles.length === 0) return

    const storedHeroId = localStorage.getItem('featuredHeroId')
    const hasVisited = localStorage.getItem('hasVisitedFeatured')

    let hero: ArticleRow

    if (!hasVisited || !storedHeroId) {
      // First visit: use position 1 article
      hero = articles.find(a => a.featured_position === 1) ?? articles[0]
      localStorage.setItem('featuredHeroId', hero.id)
      localStorage.setItem('hasVisitedFeatured', 'true')
    } else {
      // Returning visitor: random, excluding previous hero
      const candidates = articles.filter(a => a.id !== storedHeroId)
      hero = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : articles[0]
      localStorage.setItem('featuredHeroId', hero.id)
    }

    setHeroArticle(hero)
    setSmallArticles(articles.filter(a => a.id !== hero.id).slice(0, 6))
  }, [articles])

  if (!heroArticle) {
    // SSR/loading: show a placeholder to avoid layout shift
    return <div style={{ height: '540px' }} />
  }

  const heroArt = heroArticle.article
  const heroType = heroArt?.article_type ?? ''
  const heroVerdict = heroArt?.quick_verdict?.one_liner ?? heroArt?.executive_summary?.short_answer ?? ''
  const heroImg = heroArt?.thumbnail_url

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <SectionHeader title="Featured" badge="Editor's picks" viewAllHref="/" />

      <div
        className="grid gap-[18px]"
        style={{
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
          height: '540px',
        }}
      >
        {/* Hero card */}
        <Link
          href={`/article/${heroArticle.slug}`}
          className="rounded-2xl overflow-hidden no-underline flex flex-col"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div className="relative" style={{ height: '260px' }}>
            {heroImg ? (
              <Image
                src={heroImg}
                alt={heroArt?.title ?? ''}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: 'var(--accent-light)' }} />
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--accent)' }}>
              {TYPE_LABELS[heroType] ?? heroType.replace(/_/g, ' ')}
            </p>
            <h3
              className="text-lg font-bold leading-snug mb-2 line-clamp-3"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {heroArt?.title}
            </h3>
            {heroVerdict && (
              <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {heroVerdict}
              </p>
            )}
            <div className="mt-auto flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {heroArticle.view_count ? (
                <span>{heroArticle.view_count} views</span>
              ) : null}
              {heroArticle.verified_at && (
                <span className="flex items-center gap-1" style={{ color: '#059669' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Verified
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Small cards grid */}
        <div
          className="grid gap-[18px]"
          style={{
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, 1fr)',
          }}
        >
          {smallArticles.map((row) => {
            const art = row.article
            const img = art?.thumbnail_url
            const type = art?.article_type ?? ''
            return (
              <Link
                key={row.id}
                href={`/article/${row.slug}`}
                className="rounded-xl overflow-hidden no-underline flex flex-col"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="relative flex-1 min-h-0">
                  {img ? (
                    <Image
                      src={img}
                      alt={art?.title ?? ''}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: 'var(--accent-light)' }} />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--accent)' }}>
                    {TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
                  </p>
                  <h4
                    className="text-xs font-bold leading-snug line-clamp-2"
                    style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                  >
                    {art?.title}
                  </h4>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Mobile override */}
      <style>{`
        @media (max-width: 768px) {
          .grid[style*="2fr"] {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
          .grid[style*="repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  )
}
