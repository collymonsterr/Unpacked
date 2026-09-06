'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { typeLabel, type ArticleCardData } from '@/lib/article-card'

interface Props {
  articles: ArticleCardData[]
}

// ── Article Card ──

function ArticleCard({ row }: { row: ArticleCardData }) {
  const img = row.imageUrl
  const readTime = row.readingTime
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
            alt={row.title}
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
        <div className="flex items-start gap-1.5 mb-1" style={{ minHeight: '3.6em' }}>
          <h3
            className="text-base font-bold leading-snug line-clamp-3"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            {row.title}
          </h3>
          {row.hasFactCheck && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          )}
        </div>
        <p className="text-xs mt-auto" style={{ color: 'var(--accent)' }}>
          {typeLabel(row.articleType)}
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

/** Map display filter names to DB category values for filtering and slug generation */
const FILTER_TO_DB: Record<string, string> = {
  'Tech': 'tech',
  'Finance': 'finance',
  'Health': 'health_fitness',
  'Travel': 'travel',
  'Home': 'home_living',
  'Entertainment': 'entertainment',
  'Science': 'science',
  'Business': 'business',
  'Automotive': 'automotive',
  'Culture': 'culture',
  'Current Affairs': 'current_affairs',
  'AI & Future': 'ai_future',
}

/** Map display filter names to URL slugs for "View all" link */
const FILTER_TO_SLUG: Record<string, string> = {
  'Tech': 'tech',
  'Finance': 'finance',
  'Health': 'health',
  'Travel': 'travel',
  'Home': 'home',
  'Entertainment': 'entertainment',
  'Science': 'science',
  'Business': 'business',
  'Automotive': 'automotive',
  'Culture': 'culture',
  'Current Affairs': 'news',
  'AI & Future': 'ai',
}

/** Category resolution (top-level column, else plan) already happened in `toArticleCard()`. */

// ── Main Grid ──

export default function RecentArticlesGrid({ articles }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [visibleCount, setVisibleCount] = useState(24)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Always newest first
  const sorted = [...articles].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const dbValue = FILTER_TO_DB[activeCategory] ?? null
  const filtered = activeCategory === 'All'
    ? sorted
    : sorted.filter((a) => a.category && dbValue && a.category === dbValue)

  if (articles.length === 0) return null

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  // Get the slug for the "View all" link
  const categorySlug = activeCategory !== 'All'
    ? FILTER_TO_SLUG[activeCategory] ?? null
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
