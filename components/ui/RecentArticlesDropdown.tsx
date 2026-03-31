'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getRecentArticles, clearRecentArticles, type RecentArticle } from '@/lib/recent-articles'

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer Guide', comparison: 'Comparison', decision_guide: 'Decision Guide',
  explainer: 'Explainer', how_to: 'How-To', roundup: 'Roundup',
  news_analysis: 'News Analysis', trend_analysis: 'Trend Analysis',
  breaking_news: 'Breaking News', deep_dive: 'Deep Dive',
  news: 'News', planning: 'Travel & Living', tutorial: 'Tutorial',
}

export default function RecentArticlesDropdown() {
  const [open, setOpen] = useState(false)
  const [articles, setArticles] = useState<RecentArticle[]>([])
  const ref = useRef<HTMLDivElement>(null)

  // Load from localStorage when dropdown opens
  useEffect(() => {
    if (open) {
      setArticles(getRecentArticles())
    }
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleClear() {
    clearRecentArticles()
    setArticles([])
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors"
        style={{
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
          backgroundColor: open ? 'var(--accent-light)' : 'transparent',
        }}
        title="Recently visited articles"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-xs font-medium hidden sm:inline">Recent</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-50 w-72 sm:w-80"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
            >
              Recently visited
            </p>
          </div>

          {articles.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Articles you visit will appear here
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {articles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/article/${article.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 no-underline transition-colors hover:bg-[var(--accent-light)]"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {article.thumbnailUrl && (
                    <img
                      src={article.thumbnailUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0 mt-0.5"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium leading-snug line-clamp-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {article.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {TYPE_LABELS[article.articleType] ?? article.articleType.replace(/_/g, ' ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {articles.length > 0 && (
            <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleClear}
                className="text-xs transition-colors hover:opacity-70"
                style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
