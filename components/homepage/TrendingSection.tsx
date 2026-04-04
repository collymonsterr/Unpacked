'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ArticleRow } from '@/types/article'
import SectionHeader from './SectionHeader'

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

interface Props {
  pool: ArticleRow[]
}

export default function TrendingSection({ pool }: Props) {
  const [selected, setSelected] = useState<ArticleRow[]>([])

  useEffect(() => {
    if (pool.length === 0) return

    // Pick 3 from the pool, excluding the last set shown if possible
    let lastShownIds: string[] = []
    try {
      const stored = localStorage.getItem('trendingIds')
      if (stored) lastShownIds = JSON.parse(stored)
    } catch {}

    let candidates = pool.filter(a => !lastShownIds.includes(a.id))

    // If not enough fresh candidates, use full pool
    if (candidates.length < 3) candidates = [...pool]

    // Shuffle and pick 3
    const shuffled = [...candidates].sort(() => Math.random() - 0.5)
    const picks = shuffled.slice(0, 3)

    // Store the new selection
    try {
      localStorage.setItem('trendingIds', JSON.stringify(picks.map(a => a.id)))
    } catch {}

    setSelected(picks)
  }, [pool])

  if (selected.length === 0) return null

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <SectionHeader title="Trending Today" badge="Updated daily" badgeColor="#1a1a1a" />

      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        {today} — {selected.length} new article{selected.length !== 1 ? 's' : ''} today
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {selected.map((row) => {
          const art = row.article
          const img = art?.thumbnail_url
          const type = art?.article_type ?? ''
          return (
            <Link
              key={row.id}
              href={`/article/${row.slug}`}
              className="rounded-xl overflow-hidden no-underline relative"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {/* New tag */}
              <div
                className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                New
              </div>

              <div className="relative" style={{ height: '160px' }}>
                {img ? (
                  <Image
                    src={img}
                    alt={art?.title ?? ''}
                    fill
                    className="object-cover"
                    style={{ opacity: 0.8 }}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: '#2a2a2a' }} />
                )}
              </div>
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent)' }}>
                  {TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
                </p>
                <div className="flex items-start gap-1.5">
                  <h4
                    className="text-base font-bold leading-snug line-clamp-3"
                    style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}
                  >
                    {art?.title}
                  </h4>
                  {row.fact_check && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
