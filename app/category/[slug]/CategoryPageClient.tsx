'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getReadingTime } from '@/lib/reading-time'
import type { ArticleRow, ProductCard } from '@/types/article'

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
  { value: 'verified', label: 'Most verified' },
]

function getCardImage(row: ArticleRow): string | null {
  if (row.article?.thumbnail_url) return row.article.thumbnail_url
  const productCards = row.article?.sections?.filter(
    (s): s is ProductCard => s.type === 'product_card'
  )
  return productCards?.[0]?.image_urls?.[0] ?? productCards?.[0]?.image_url ?? null
}

function ArticleCard({ row }: { row: ArticleRow }) {
  const art = row.article
  const img = getCardImage(row)
  const type = art?.article_type ?? ''
  const readTime = art ? getReadingTime(art) : 0
  const [imgError, setImgError] = useState(false)

  const dateStr = new Date(row.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link
      href={`/article/${row.slug}`}
      className="rounded-xl overflow-hidden no-underline flex flex-col"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="relative" style={{ height: '180px' }}>
        {img && !imgError ? (
          <Image
            src={img}
            alt={art?.title ?? ''}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
            <span className="text-3xl font-bold" style={{ color: 'var(--accent)', opacity: 0.3 }}>U</span>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3
          className="text-base font-bold leading-snug line-clamp-3 mb-1"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)', minHeight: '3.6em' }}
        >
          {art?.title}
        </h3>
        <p className="text-xs mt-auto" style={{ color: 'var(--accent)' }}>
          {TYPE_LABELS[type] ?? type.replace(/_/g, ' ')}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {row.user_name && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {row.user_name}
            </p>
          )}
          <span className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>&middot;</span>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {dateStr}
          </p>
          {readTime > 0 && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>&middot;</span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {readTime} min read
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

interface Props {
  articles: ArticleRow[]
  totalCount: number
  totalPages: number
  currentPage: number
  currentSort: string
  slug: string
  categoryName: string
}

export default function CategoryPageClient({
  articles,
  totalCount,
  totalPages,
  currentPage,
  currentSort,
  slug,
  categoryName,
}: Props) {
  const router = useRouter()

  function handleSortChange(newSort: string) {
    router.push(`/category/${slug}?sort=${newSort}&page=1`)
  }

  function handlePageChange(newPage: number) {
    router.push(`/category/${slug}?sort=${currentSort}&page=${newPage}`)
  }

  // Empty state
  if (totalCount === 0) {
    return (
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-20">
        <div className="text-center py-16">
          <p
            className="text-lg mb-4"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}
          >
            No articles in {categoryName} yet. Be the first to write one.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold no-underline"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Write an article
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
      {/* Sort dropdown */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <select
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="text-sm rounded-lg px-3 py-2 outline-none"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-outfit)',
            cursor: 'pointer',
          }}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Article grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((row) => (
          <ArticleCard key={row.id} row={row as ArticleRow} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => {
              // Show first, last, current, and neighbours
              if (p === 1 || p === totalPages) return true
              if (Math.abs(p - currentPage) <= 1) return true
              return false
            })
            .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) {
                acc.push('ellipsis')
              }
              acc.push(p)
              return acc
            }, [])
            .map((item, i) => {
              if (item === 'ellipsis') {
                return (
                  <span key={`e-${i}`} className="px-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    ...
                  </span>
                )
              }
              const isActive = item === currentPage
              return (
                <button
                  key={item}
                  onClick={() => handlePageChange(item)}
                  className="w-9 h-9 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'var(--card)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: isActive ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {item}
                </button>
              )
            })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
