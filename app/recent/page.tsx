'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import RecentArticlesDropdown from '@/components/ui/RecentArticlesDropdown'
import { getRecentArticles, clearRecentArticles, type RecentArticle } from '@/lib/recent-articles'

const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buying Guide',
  comparison: 'Comparison',
  decision_guide: 'Decision Guide',
  explainer: 'Explainer',
  news: 'News',
  planning: 'Travel & Living',
  trend_analysis: 'Trend Analysis',
  tutorial: 'Tutorial',
}

export default function RecentPage() {
  const [articles, setArticles] = useState<RecentArticle[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setArticles(getRecentArticles())
    setLoaded(true)
  }, [])

  function handleClear() {
    clearRecentArticles()
    setArticles([])
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <RecentArticlesDropdown />
          <UserMenu />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
        <h1
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Recent Articles
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Articles you&apos;ve visited recently, stored on this device.
        </p>

        {!loaded ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
              You haven&apos;t visited any articles yet.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold no-underline"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
            >
              Browse articles →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {articles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/article/${article.slug}`}
                  className="flex gap-3 p-3 rounded-xl no-underline transition-colors hover:bg-[var(--accent-light)]"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                >
                  {article.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.thumbnailUrl}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-semibold leading-snug line-clamp-2 mb-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {article.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--accent)' }}>
                      {TYPE_LABELS[article.articleType] ?? article.articleType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(article.visitedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={handleClear}
                className="text-xs transition-colors hover:opacity-70"
                style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Clear history
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
