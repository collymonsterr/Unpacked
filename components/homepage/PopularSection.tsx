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
  articles: ArticleRow[]
}

export default function PopularSection({ articles }: Props) {
  if (articles.length === 0) return null

  const items = articles.slice(0, 4)

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <SectionHeader title="Most Popular" badge="By views" />

      {/* Desktop: 2x2 image grid (unchanged) */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {items.map((row, rank) => {
          const art = row.article
          const img = art?.thumbnail_url
          const type = art?.article_type ?? ''
          return (
            <Link
              key={row.id}
              href={`/article/${row.slug}`}
              className="rounded-xl overflow-hidden no-underline relative"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Rank badge */}
              <div
                className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                {rank + 1}
              </div>

              <div className="relative" style={{ height: '160px' }}>
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
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent)' }}>
                  {TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
                </p>
                <div className="flex items-start gap-1.5">
                  <h4
                    className="text-base font-bold leading-snug line-clamp-3 mb-1"
                    style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
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
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {row.view_count ?? 0} views
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Mobile: horizontal list cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {items.map((row, rank) => {
          const art = row.article
          const img = art?.thumbnail_url
          const type = art?.article_type ?? ''
          return (
            <Link
              key={row.id}
              href={`/article/${row.slug}`}
              className="flex items-stretch rounded-xl overflow-hidden no-underline"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Thumbnail with rank badge */}
              <div className="relative flex-shrink-0" style={{ width: '80px', minHeight: '80px' }}>
                {img ? (
                  <Image
                    src={img}
                    alt={art?.title ?? ''}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                    <span className="text-lg font-bold" style={{ color: 'var(--accent)', opacity: 0.3 }}>U</span>
                  </div>
                )}
                {/* Rank badge */}
                <div
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                >
                  {rank + 1}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--accent)' }}>
                  {TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
                </p>
                <div className="flex items-start gap-1">
                  <h4
                    className="text-sm font-bold leading-snug line-clamp-2 mb-0.5"
                    style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                  >
                    {art?.title}
                  </h4>
                  {row.fact_check && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {row.view_count ?? 0} views
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
