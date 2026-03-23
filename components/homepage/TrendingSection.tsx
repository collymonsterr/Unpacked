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

export default function TrendingSection({ articles }: Props) {
  if (articles.length === 0) return null

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <SectionHeader title="Trending Today" badge="Updated daily" badgeColor="#1a1a1a" viewAllHref="/" />

      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        {today} — {articles.length} new article{articles.length !== 1 ? 's' : ''} today
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {articles.map((row) => {
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
                <h4
                  className="text-base font-bold leading-snug line-clamp-3"
                  style={{ fontFamily: 'var(--font-sora)', color: '#fff' }}
                >
                  {art?.title}
                </h4>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
