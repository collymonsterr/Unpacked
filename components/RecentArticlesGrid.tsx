'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ArticleRow, ProductCard } from '@/types/article'
import { useAdminMode } from '@/hooks/useAdminMode'

interface Props {
  articles: ArticleRow[]
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

function ArticleCard({
  row,
  index,
  total,
  isAdmin,
  onMove,
  moving,
}: {
  row: ArticleRow
  index: number
  total: number
  isAdmin: boolean
  onMove: (id: string, direction: 'up' | 'down') => void
  moving: string | null
}) {
  const imageUrl = getCardImage(row)
  const title = row.article?.title ?? row.plan?.title ?? row.query
  const verdict = row.article?.quick_verdict?.one_liner ?? row.plan?.quick_verdict_preview ?? ''
  const type = row.article?.article_type ?? row.plan?.article_type ?? 'buyer_guide'
  const isMoving = moving === row.id

  return (
    <div className="relative group">
      <Link
        href={`/article/${row.slug}`}
        className="block rounded-2xl overflow-hidden no-underline"
        style={{
          backgroundColor: 'var(--card)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          opacity: isMoving ? 0.6 : 1,
        }}
      >
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

        <div className="p-4">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {getArticleTypeLabel(type)}
          </span>
          <h3
            className="font-bold leading-snug line-clamp-3 text-sm"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
        </div>
      </Link>

      {/* Admin reorder buttons */}
      {isAdmin && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {index > 0 && (
            <button
              onClick={(e) => { e.preventDefault(); onMove(row.id, 'up') }}
              disabled={!!moving}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
              title="Move up"
            >
              ▲
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={(e) => { e.preventDefault(); onMove(row.id, 'down') }}
              disabled={!!moving}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
              title="Move down"
            >
              ▼
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function RecentArticlesGrid({ articles: initialArticles }: Props) {
  const isAdmin = useAdminMode()
  const [articles, setArticles] = useState(initialArticles)
  const [moving, setMoving] = useState<string | null>(null)

  if (articles.length === 0) return null

  async function handleMove(articleId: string, direction: 'up' | 'down') {
    setMoving(articleId)

    // Optimistic reorder in UI
    const idx = articles.findIndex((a) => a.id === articleId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= articles.length) {
      setMoving(null)
      return
    }

    const newArticles = [...articles]
    const temp = newArticles[idx]
    newArticles[idx] = newArticles[swapIdx]
    newArticles[swapIdx] = temp
    setArticles(newArticles)

    try {
      await fetch('/api/articles/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, direction }),
      })
    } catch {
      // Revert on failure
      setArticles(articles)
    } finally {
      setMoving(null)
    }
  }

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6 pb-16">
      <h2
        className="text-lg font-bold mb-6"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-secondary)' }}
      >
        Recent Articles
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {articles.map((row, i) => (
          <ArticleCard
            key={row.id}
            row={row}
            index={i}
            total={articles.length}
            isAdmin={isAdmin}
            onMove={handleMove}
            moving={moving}
          />
        ))}
      </div>
    </section>
  )
}
