'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { ArticleRow, ProductCard } from '@/types/article'
import { getReadingTime } from '@/lib/reading-time'
import { categoryToSlug } from '@/lib/category-config'

interface Props {
  articles: ArticleRow[]
}

function getCardImage(row: ArticleRow): string | null {
  if (row.article?.thumbnail_url) return row.article.thumbnail_url
  const productCards = row.article?.sections?.filter(
    (s): s is ProductCard => s.type === 'product_card'
  )
  return productCards?.[0]?.image_urls?.[0] ?? productCards?.[0]?.image_url ?? null
}

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  // Legacy types (old articles may still have these)
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

// ── Article Card ──

function ArticleCard({ row }: { row: ArticleRow }) {
  const art = row.article
  const img = getCardImage(row)
  const type = art?.article_type ?? ''
  const readTime = art ? getReadingTime(art) : 0
  const [imgError, setImgError] = useState(false)

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
        {readTime > 0 && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {readTime} min read
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Category Filters ──

const CATEGORY_FILTERS = [
  'All',
  'Tech',
  'Finance',
  'Health',
  'Travel',
  'Home',
  'Entertainment',
  'Science',
  'Business',
  'Automotive',
  'Culture',
  'Current Affairs',
  'AI & Future',
]

/** Map display filter names to DB category names for slug generation */
const FILTER_TO_DB_CATEGORY: Record<string, string> = {
  'Current Affairs': 'News',
  'AI & Future': 'AI',
}

/** Get the category for an article — prefers top-level column, falls back to plan */
function getArticleCategory(row: ArticleRow): string | null {
  if (row.category) return row.category
  if (row.plan?.category) return row.plan.category
  return null
}

// ── Main Grid ──

export default function RecentArticlesGrid({ articles }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [visibleCount, setVisibleCount] = useState(24)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Always newest first
  const sorted = [...articles].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const filtered = activeCategory === 'All'
    ? sorted
    : sorted.filter((a) => {
        const cat = getArticleCategory(a)
        return cat && cat.toLowerCase() === activeCategory.toLowerCase()
      })

  if (articles.length === 0) return null

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  // Get the slug for the "View all" link
  const categorySlug = activeCategory !== 'All'
    ? categoryToSlug(FILTER_TO_DB_CATEGORY[activeCategory] ?? activeCategory)
    : null

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6 pb-16">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2
          className="text-lg font-bold flex-shrink-0"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-secondary)' }}
        >
          Recent Articles
        </h2>

        {/* Category pills — scrollable on mobile */}
        <div className="flex items-center gap-1.5">
          <div
            ref={scrollRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
          >
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setVisibleCount(24) }}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* View all link — shown when a category is active */}
          {categorySlug && (
            <Link
              href={`/category/${categorySlug}`}
              className="text-xs font-medium no-underline whitespace-nowrap flex-shrink-0 ml-1"
              style={{ color: 'var(--accent)' }}
            >
              View all →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((row) => (
          <ArticleCard key={row.id} row={row} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 24)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            Show more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {filtered.length === 0 && activeCategory !== 'All' && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No {activeCategory.toLowerCase()} articles yet.
        </p>
      )}

      {/* Hide scrollbar across browsers */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  )
}
