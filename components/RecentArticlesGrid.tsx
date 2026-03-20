import Image from 'next/image'
import Link from 'next/link'
import type { ArticleRow, ProductCard } from '@/types/article'

interface Props {
  articles: ArticleRow[]
}

function getCardImage(row: ArticleRow): string | null {
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

function ArticleCard({ row }: { row: ArticleRow }) {
  const imageUrl = getCardImage(row)
  const title = row.article?.title ?? row.plan?.title ?? row.query
  const verdict = row.article?.quick_verdict?.one_liner ?? row.plan?.quick_verdict_preview ?? ''
  const type = row.article?.article_type ?? row.plan?.article_type ?? 'buyer_guide'

  return (
    <Link
      href={`/article/${row.slug}`}
      className="group block rounded-2xl overflow-hidden no-underline"
      style={{
        backgroundColor: 'var(--card)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid var(--border)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Image area — flush with card, no separate background */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '4/3' }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-end p-4">
            <span
              className="text-sm font-bold leading-snug line-clamp-2"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}
            >
              {title}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <span
          className="inline-block text-xs font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {getArticleTypeLabel(type)}
        </span>
        <h3
          className="font-bold leading-snug mb-1 line-clamp-2 text-sm"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        {verdict && (
          <p
            className="text-xs line-clamp-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {verdict}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function RecentArticlesGrid({ articles }: Props) {
  if (articles.length === 0) return null

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6 pb-16">
      <h2
        className="text-lg font-bold mb-6"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-secondary)' }}
      >
        Recent Articles
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {articles.map((row) => (
          <ArticleCard key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}
