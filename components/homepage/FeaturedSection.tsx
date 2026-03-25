'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ArticleRow } from '@/types/article'
import { getReadingTime } from '@/lib/reading-time'
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
    setSmallArticles(articles.filter(a => a.id !== hero.id).slice(0, 4))
  }, [articles])

  if (!heroArticle) {
    // SSR/loading: show a placeholder to avoid layout shift
    return <div style={{ height: '540px' }} />
  }

  const heroArt = heroArticle.article
  const heroType = heroArt?.article_type ?? ''
  const heroDescription = heroArt?.executive_summary?.short_answer ?? heroArt?.quick_verdict?.one_liner ?? ''
  // Card summary: use card_summary if available, else first complete sentence of verdict
  const heroVerdict = (() => {
    // Priority 1: dedicated card_summary (generated when article is featured)
    const cardSummary = (heroArticle as unknown as Record<string, unknown>).card_summary as string | undefined
    if (cardSummary && cardSummary.trim().length > 0) return cardSummary.trim()

    // Priority 2: first complete sentence of verdict
    const rec = heroArt?.quick_verdict?.recommendation
    if (rec) {
      // Split on first period followed by space or end, but only if >10 chars before it
      const firstSentence = rec.match(/^[^.;!?]+[.;!?]/)
      if (firstSentence) return firstSentence[0].replace(/;$/, '.').trim()
      return rec.split(';')[0].trim()
    }

    const oneLiner = heroArt?.quick_verdict?.one_liner
    if (oneLiner) {
      const firstSentence = oneLiner.match(/^[^.;!?]+[.;!?]/)
      if (firstSentence) return firstSentence[0].trim()
      return oneLiner
    }

    const takeaway = heroArt?.executive_summary?.key_takeaways?.[0]
    if (takeaway) return takeaway
    return ''
  })()
  const heroImg = heroArt?.thumbnail_url
  const heroReadTime = heroArt ? getReadingTime(heroArt) : 0
  const heroDate = new Date(heroArticle.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const heroAuthorName = heroArticle.user_name ?? 'The Brief'
  const heroAuthorInitial = heroAuthorName.charAt(0).toUpperCase()

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <SectionHeader title="Featured" badge="Editor's picks" />

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
          <div className="relative" style={{ height: '220px' }}>
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
            {/* No badge on image — verified status shown in bottom metadata */}
          </div>
          <div className="p-4 flex-1 flex flex-col gap-0">
            {/* 1. Category badge */}
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent)' }}>
              {TYPE_LABELS[heroType] ?? heroType.replace(/_/g, ' ')}
            </p>

            {/* 2. Title */}
            <h3
              className="text-lg font-bold leading-snug mb-1.5 line-clamp-2"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {heroArt?.title}
            </h3>

            {/* 3. Description */}
            {heroDescription && (
              <p className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {heroDescription}
              </p>
            )}

            {/* 4. Verdict box */}
            {heroVerdict && (
              <div
                className="rounded-lg px-3 py-2 mb-2"
                style={{ backgroundColor: '#f0efed' }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Verdict
                  </p>
                </div>
                <p
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}
                >
                  {heroVerdict}
                </p>
              </div>
            )}

            {/* 5. Bottom metadata row */}
            <div
              className="mt-auto pt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {/* Left: author + date */}
              <div className="flex items-center gap-2">
                {heroArticle.user_avatar ? (
                  <img
                    src={heroArticle.user_avatar}
                    alt=""
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  >
                    {heroAuthorInitial}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {heroAuthorName}
                  </p>
                  <p className="text-[10px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                    {heroDate} · {heroReadTime} min read
                  </p>
                </div>
              </div>

              {/* Right: views + fact-checked */}
              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {(heroArticle.view_count ?? 0) > 0 && (
                  <span>{(heroArticle.view_count ?? 0).toLocaleString()} views</span>
                )}
                {heroArticle.verified_at && (
                  <span className="flex items-center gap-0.5" style={{ color: '#059669' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Fact-checked
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Small cards grid */}
        <div
          className="grid gap-[18px]"
          style={{
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
                    className="text-sm font-bold leading-snug line-clamp-2"
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
          .grid[style*="repeat(2"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  )
}
