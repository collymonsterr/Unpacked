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

export default function PopularSection({ articles }: Props) {
  if (articles.length === 0) return null

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <SectionHeader title="Most Popular" badge="By views" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {articles.slice(0, 4).map((row, rank) => {
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
                <h4
                  className="text-base font-bold leading-snug line-clamp-3 mb-1"
                  style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                >
                  {art?.title}
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
