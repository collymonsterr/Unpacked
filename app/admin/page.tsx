'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import AdminAnalytics from '@/components/AdminAnalytics'
import AdminUsers from '@/components/AdminUsers'
import AdminCosts from '@/components/AdminCosts'
import { useAdminMode } from '@/hooks/useAdminMode'
import type { ArticleRow } from '@/types/article'
import { ARTICLE_TYPE_LABELS } from '@/lib/article-config'

export default function AdminDashboard() {
  const isAdmin = useAdminMode()
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'costs'>('overview')

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles/recent')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const sorted = [...data].sort((a: ArticleRow, b: ArticleRow) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setArticles(sorted)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  if (!isAdmin) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}
        className="flex flex-col items-center justify-center px-4"
      >
        <div
          className="text-center p-8 rounded-2xl max-w-md w-full"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <h1
            className="text-2xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            Admin Access Required
          </h1>
          <p
            className="text-sm mb-6 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Admin access is restricted to authorised accounts.
          </p>
          <Link
            href="/"
            className="inline-block text-sm font-semibold px-5 py-2.5 rounded-xl no-underline transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <header
        className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span
            className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm no-underline transition-opacity hover:opacity-70 hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            Back to site
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            Admin Dashboard
          </h1>
          <span
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['overview', 'articles', 'costs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-outfit)',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                border: 'none',
              }}
            >
              {tab === 'overview' ? 'Overview' : tab === 'articles' ? 'Articles' : 'Costs'}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <>
            {/* Backfill card summaries for featured articles */}
            {articles.some(a => a.is_featured && !(a as unknown as Record<string, unknown>).card_summary) && (
              <button
                onClick={async () => {
                  const missing = articles.filter(a => a.is_featured && !(a as unknown as Record<string, unknown>).card_summary)
                  for (const a of missing) {
                    await fetch(`/api/articles/${a.id}/featured`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_featured: true }),
                    })
                  }
                  alert(`Triggered card summary generation for ${missing.length} featured article(s). Refresh in a few seconds.`)
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold mb-4"
                style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
              >
                Generate missing card summaries ({articles.filter(a => a.is_featured && !(a as unknown as Record<string, unknown>).card_summary).length})
              </button>
            )}

            <AdminAnalytics />
            <AdminUsers />
          </>
        )}

        {/* Tab: Costs */}
        {activeTab === 'costs' && (
          <AdminCosts />
        )}

        {/* Tab: Articles */}
        {activeTab === 'articles' && !loading && (
          <BackfillChipsButton articles={articles} />
        )}
        {activeTab === 'articles' && (loading ? (
          <div className="flex justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
            />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <p style={{ color: 'var(--text-secondary)' }}>No articles yet.</p>
          </div>
        ) : (
          <>
            {/* Sub-tabs for article filtering */}
            <ArticleSubTabs articles={articles} />
          </>
        ))}
      </main>
    </div>
  )
}

function BackfillChipsButton({ articles }: { articles: ArticleRow[] }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<string | null>(null)

  const missing = articles.filter(a => !(a as unknown as Record<string, unknown>).suggestion_chips)
  if (missing.length === 0) return null

  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={async () => {
          setStatus('running')
          setResult(null)
          try {
            const res = await fetch('/api/admin/backfill-chips', { method: 'POST' })
            const data = await res.json()
            setResult(data.message ?? `Updated ${data.updated}, skipped ${data.skipped}`)
          } catch {
            setResult('Backfill failed — check server logs')
          } finally {
            setStatus('idle')
          }
        }}
        disabled={status === 'running'}
        className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: status === 'running' ? 'not-allowed' : 'pointer' }}
      >
        {status === 'running' ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
            Generating chips...
          </span>
        ) : (
          `Backfill suggestion chips (${missing.length} missing)`
        )}
      </button>
      {result && (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{result}</span>
      )}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  title,
  danger,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-30"
      style={{
        color: danger
          ? '#dc2626'
          : active
          ? 'var(--accent)'
          : 'var(--text-secondary)',
        backgroundColor: 'transparent',
        border: `1px solid ${danger ? '#fecaca' : 'var(--border)'}`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = danger
            ? '#fef2f2'
            : 'var(--bg)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

// ── Article Sub-Tabs Component ──

function ArticleSubTabs({ articles: initialArticles }: { articles: ArticleRow[] }) {
  const [localArticles, setLocalArticles] = useState(initialArticles)
  const [subTab, setSubTab] = useState<'all' | 'featured' | 'trending' | 'hidden' | 'no-image'>('all')

  // Sync with parent if articles prop changes
  useEffect(() => { setLocalArticles(initialArticles) }, [initialArticles])

  async function toggleFeatured(id: string) {
    const article = localArticles.find(a => a.id === id)
    if (!article) return
    const newVal = !article.is_featured
    setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, is_featured: newVal } : a))
    try {
      const res = await fetch(`/api/articles/${id}/featured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: newVal }),
      })
      if (!res.ok) setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, is_featured: !newVal } : a))
    } catch {
      setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, is_featured: !newVal } : a))
    }
  }

  async function toggleTrending(id: string) {
    const article = localArticles.find(a => a.id === id)
    if (!article) return
    const newVal = !article.is_trending
    setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, is_trending: newVal } : a))
    try {
      const res = await fetch(`/api/articles/${id}/trending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_trending: newVal }),
      })
      if (!res.ok) setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, is_trending: !newVal } : a))
    } catch {
      setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, is_trending: !newVal } : a))
    }
  }

  async function toggleHidden(id: string) {
    const article = localArticles.find(a => a.id === id)
    if (!article) return
    const newVal = !article.hidden_from_homepage
    setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, hidden_from_homepage: newVal } : a))
    try {
      const res = await fetch(`/api/articles/${id}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: newVal }),
      })
      if (!res.ok) setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, hidden_from_homepage: !newVal } : a))
    } catch {
      setLocalArticles(prev => prev.map(a => a.id === id ? { ...a, hidden_from_homepage: !newVal } : a))
    }
  }

  const articles = localArticles

  const featured = articles.filter(a => a.is_featured)
  const trending = articles.filter(a => a.is_trending)
  const hidden = articles.filter(a => a.hidden_from_homepage)
  const noImage = articles.filter(a => !a.article?.thumbnail_url)

  const filteredArticles = (() => {
    switch (subTab) {
      case 'featured': return featured
      case 'trending': return trending
      case 'hidden': return hidden
      case 'no-image': return noImage
      default: return articles
    }
  })()

  const tabs = [
    { id: 'all' as const, label: 'All', count: articles.length },
    { id: 'featured' as const, label: 'Featured', count: featured.length },
    { id: 'trending' as const, label: 'Trending', count: trending.length },
    { id: 'hidden' as const, label: 'Hidden', count: hidden.length },
    { id: 'no-image' as const, label: 'No Image', count: noImage.length },
  ]

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: subTab === tab.id ? 'var(--accent)' : 'transparent',
              color: subTab === tab.id ? '#fff' : 'var(--text-secondary)',
              border: subTab === tab.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                style={{
                  backgroundColor: subTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtered article count */}
      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
        {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
        {subTab === 'featured' && ' in featured pool'}
        {subTab === 'trending' && ' in trending pool'}
        {subTab === 'hidden' && ' hidden from homepage'}
        {subTab === 'no-image' && ' without hero image'}
      </p>

      {/* Article list */}
      <div className="space-y-2">
        {filteredArticles.map((row) => {
          const art = row.article
          const img = art?.thumbnail_url
          const type = art?.article_type ?? ''
          const date = new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          return (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
                {img ? (
                  <Image src={img} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>—</div>
                )}
              </div>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/article/${row.slug}`}
                  className="text-sm font-semibold leading-snug line-clamp-1 no-underline hover:opacity-80"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {art?.title ?? row.query}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--accent)' }}>
                    {(ARTICLE_TYPE_LABELS as Record<string, string>)[type] ?? type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{date}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{row.view_count ?? 0} views</span>
                  {(row.total_cost != null && row.total_cost > 0) && (
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>${Number(row.total_cost).toFixed(3)}</span>
                  )}
                  {/* Pool badges */}
                  {row.is_featured && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3EC', color: '#BA7517' }}>
                      ★ Featured
                    </span>
                  )}
                  {row.is_trending && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3EC', color: '#BA7517' }}>
                      🔥 Trending
                    </span>
                  )}
                </div>
              </div>

              {/* Action icons */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Featured star */}
                <button
                  onClick={() => toggleFeatured(row.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    color: row.is_featured ? '#BA7517' : 'var(--text-secondary)',
                    backgroundColor: row.is_featured ? '#FEF3EC' : 'transparent',
                    cursor: 'pointer',
                  }}
                  title={row.is_featured ? 'Remove from featured' : 'Add to featured'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={row.is_featured ? '#BA7517' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>

                {/* Trending fire */}
                <button
                  onClick={() => toggleTrending(row.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    color: row.is_trending ? '#BA7517' : 'var(--text-secondary)',
                    backgroundColor: row.is_trending ? '#FEF3EC' : 'transparent',
                    cursor: 'pointer',
                  }}
                  title={row.is_trending ? 'Remove from trending' : 'Add to trending'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={row.is_trending ? '#BA7517' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                </button>

                {/* Hidden eye */}
                <button
                  onClick={() => toggleHidden(row.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    color: row.hidden_from_homepage ? '#dc2626' : 'var(--text-secondary)',
                    backgroundColor: row.hidden_from_homepage ? '#fef2f2' : 'transparent',
                    cursor: 'pointer',
                  }}
                  title={row.hidden_from_homepage ? 'Show on homepage' : 'Hide from homepage'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {row.hidden_from_homepage ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>

                {/* Link to article */}
                <Link
                  href={`/article/${row.slug}`}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors no-underline"
                  style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
                  title="View article"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {filteredArticles.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No articles in this view.
        </p>
      )}
    </div>
  )
}
