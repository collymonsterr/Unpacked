'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ArticleRow } from '@/types/article'
import ArticleTypeBadge from '@/components/ui/ArticleTypeBadge'
import { getReadingTime } from '@/lib/reading-time'

interface Props {
  myArticles: ArticleRow[]
  totalViews: number
}

function ArticleCard({ row }: { row: ArticleRow }) {
  const title = row.article?.title ?? row.plan?.title ?? row.query
  const thumbnail = row.article?.thumbnail_url
  const articleType = row.article?.article_type
  const date = new Date(row.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const isComplete = row.status === 'complete' || row.status === 'verified'
  const readTime = row.article ? getReadingTime(row.article) : 0

  return (
    <Link
      href={`/article/${row.slug}`}
      className="group rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="w-full overflow-hidden"
        style={{ aspectRatio: '16 / 9', backgroundColor: 'var(--accent-light)' }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: 'var(--accent)', opacity: 0.3 }}>A</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {articleType && <ArticleTypeBadge type={articleType} />}
          {!isComplete && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: row.status === 'error' ? '#fef2f2' : '#fef3c7',
                color: row.status === 'error' ? '#dc2626' : '#b45309',
              }}
            >
              {row.status}
            </span>
          )}
        </div>
        <h3
          className="text-sm font-bold leading-snug line-clamp-2 mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{date}</p>
          {readTime > 0 && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
              {readTime} min read
            </p>
          )}
          {(row.view_count ?? 0) > 0 && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
              {(row.view_count ?? 0).toLocaleString()} views
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

function ArticleGrid({ articles }: { articles: ArticleRow[] }) {
  const [expandedChain, setExpandedChain] = useState<string | null>(null)

  // Group articles by chain (root_article_id or own id)
  const chains = new Map<string, ArticleRow[]>()
  for (const a of articles) {
    const chainKey = a.root_article_id ?? a.id
    if (!chains.has(chainKey)) chains.set(chainKey, [])
    chains.get(chainKey)!.push(a)
  }

  // Sort each chain by newest first
  for (const [, chain] of chains) {
    chain.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Build display list: latest version of each chain
  const display = Array.from(chains.entries()).map(([chainKey, chain]) => ({
    chainKey,
    latest: chain[0],
    olderVersions: chain.slice(1),
  }))

  // Sort by latest article's creation date
  display.sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime())

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {display.map(({ chainKey, latest, olderVersions }) => (
        <div key={chainKey}>
          <ArticleCard row={latest} />
          {olderVersions.length > 0 && (
            <div className="mt-1.5 px-2">
              <button
                onClick={() => setExpandedChain(expandedChain === chainKey ? null : chainKey)}
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {expandedChain === chainKey ? '▾' : '▸'} {olderVersions.length} previous version{olderVersions.length > 1 ? 's' : ''}
              </button>
              {expandedChain === chainKey && (
                <div className="mt-1.5 space-y-1 pl-2" style={{ borderLeft: '2px solid var(--border)' }}>
                  {olderVersions.map(v => {
                    const vDate = new Date(v.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })
                    return (
                      <Link
                        key={v.id}
                        href={`/article/${v.slug}`}
                        className="block text-xs py-1 no-underline hover:underline"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {vDate} — {v.article?.title?.slice(0, 40) ?? 'Untitled'}...
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function DashboardTabs({ myArticles, totalViews }: Props) {
  const [tab, setTab] = useState<'my' | 'saved'>('my')
  const [savedArticles, setSavedArticles] = useState<ArticleRow[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)

  useEffect(() => {
    if (tab !== 'saved' || savedArticles.length > 0) return
    setLoadingSaved(true)
    fetch('/api/saved-articles?full=true')
      .then(res => res.json())
      .then(data => setSavedArticles(data))
      .catch(() => {})
      .finally(() => setLoadingSaved(false))
  }, [tab, savedArticles.length])

  const tabs = [
    { key: 'my' as const, label: 'My Articles', count: myArticles.length },
    { key: 'saved' as const, label: 'Saved', count: null },
  ]

  return (
    <>
      <div className="flex items-baseline justify-between mb-1">
        <h1
          className="text-2xl md:text-3xl font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Dashboard
        </h1>
        {myArticles.length > 0 && (
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total views</p>
            <p className="text-lg font-bold tabular-nums" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
              {totalViews.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{
              color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-1.5 text-xs" style={{ opacity: 0.6 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'my' ? (
        myArticles.length === 0 ? (
          <div
            className="rounded-2xl px-8 py-16 text-center"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
              No articles yet
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Type a question on the homepage to create your first article.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
            >
              Create an article
            </Link>
          </div>
        ) : (
          <ArticleGrid articles={myArticles} />
        )
      ) : (
        loadingSaved ? (
          <div className="flex justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
            />
          </div>
        ) : savedArticles.length === 0 ? (
          <div
            className="rounded-2xl px-8 py-16 text-center"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
              No saved articles
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Bookmark articles you want to read later and they&apos;ll appear here.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
            >
              Browse articles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedArticles.map(row => <ArticleCard key={row.id} row={row} />)}
          </div>
        )
      )}
    </>
  )
}
