'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import AdminAnalytics from '@/components/AdminAnalytics'
import { useAdminMode } from '@/hooks/useAdminMode'
import type { ArticleRow } from '@/types/article'
import { ARTICLE_TYPE_LABELS } from '@/lib/article-config'

export default function AdminDashboard() {
  const isAdmin = useAdminMode()
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles/recent')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      // Sort by view count descending (most popular first)
      const sorted = [...data].sort((a: ArticleRow, b: ArticleRow) => (b.view_count ?? 0) - (a.view_count ?? 0))
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

  async function handlePin(id: string, currentPinned: boolean) {
    const newPinned = !currentPinned
    // Optimistic update
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, pinned: newPinned } : a))
    )
    try {
      const res = await fetch(`/api/articles/${id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      })
      if (!res.ok) {
        // Revert on failure
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, pinned: currentPinned } : a))
        )
      }
    } catch {
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, pinned: currentPinned } : a))
      )
    }
  }

  async function handleToggleHidden(id: string) {
    const article = articles.find(a => a.id === id)
    const currentHidden = !!(article?.article as unknown as Record<string, unknown>)?.hidden_from_homepage
    const newHidden = !currentHidden
    // Optimistic update
    setArticles(prev => prev.map(a => {
      if (a.id !== id || !a.article) return a
      return { ...a, article: { ...a.article, hidden_from_homepage: newHidden } as typeof a.article }
    }))
    try {
      const res = await fetch(`/api/articles/${id}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: newHidden }),
      })
      if (!res.ok) {
        setArticles(prev => prev.map(a => {
          if (a.id !== id || !a.article) return a
          return { ...a, article: { ...a.article, hidden_from_homepage: currentHidden } as typeof a.article }
        }))
      }
    } catch {
      setArticles(prev => prev.map(a => {
        if (a.id !== id || !a.article) return a
        return { ...a, article: { ...a.article, hidden_from_homepage: currentHidden } as typeof a.article }
      }))
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    // Optimistic removal
    const previousArticles = [...articles]
    setArticles((prev) => prev.filter((a) => a.id !== id))
    setConfirmDeleteId(null)
    try {
      const res = await fetch(`/api/articles/${id}/delete`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setArticles(previousArticles)
      }
    } catch {
      setArticles(previousArticles)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReorder(articleId: string, direction: 'up' | 'down') {
    setReorderingId(articleId)
    try {
      const res = await fetch('/api/articles/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, direction }),
      })
      if (res.ok) {
        await fetchArticles()
      }
    } catch {
      // silently fail
    } finally {
      setReorderingId(null)
    }
  }

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
            Triple-click the ArticleAI logo on the homepage to enable admin mode.
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
        <Link
          href="/"
          className="text-sm no-underline transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
        >
          Back to site
        </Link>
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

        {/* Analytics charts */}
        <AdminAnalytics />

        {loading ? (
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
            {/* Desktop table */}
            <div
              className="hidden md:block rounded-xl overflow-hidden"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
              }}
            >
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th
                      className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Article
                    </th>
                    <th
                      className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Type
                    </th>
                    <th
                      className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Views
                    </th>
                    <th
                      className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Created
                    </th>
                    <th
                      className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Pinned
                    </th>
                    <th
                      className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((row, index) => {
                    const title =
                      row.article?.title ?? row.plan?.title ?? row.query
                    const articleType = row.article?.article_type
                    const thumbnailUrl = row.article?.thumbnail_url
                    const createdDate = new Date(row.created_at).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )

                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom:
                            index < articles.length - 1
                              ? '1px solid var(--border)'
                              : 'none',
                        }}
                      >
                        {/* Article info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-shrink-0 rounded-lg overflow-hidden"
                              style={{
                                width: 60,
                                height: 40,
                                backgroundColor: 'var(--bg)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {thumbnailUrl ? (
                                <Image
                                  src={thumbnailUrl}
                                  alt=""
                                  width={60}
                                  height={40}
                                  className="object-cover w-full h-full"
                                  unoptimized
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center text-xs"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  --
                                </div>
                              )}
                            </div>
                            <Link
                              href={`/article/${row.slug}`}
                              className="text-sm font-medium no-underline hover:underline truncate max-w-[280px] block"
                              style={{ color: 'var(--text-primary)' }}
                              title={title}
                            >
                              {title}
                            </Link>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          {articleType && (
                            <span
                              className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: 'var(--accent)',
                                color: '#fff',
                              }}
                            >
                              {ARTICLE_TYPE_LABELS[articleType] ??
                                articleType.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>

                        {/* Views */}
                        <td
                          className="px-4 py-3 text-sm text-right tabular-nums"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {(row.view_count ?? 0).toLocaleString()}
                        </td>

                        {/* Created */}
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {createdDate}
                        </td>

                        {/* Pinned */}
                        <td className="px-4 py-3 text-center">
                          {row.pinned ? (
                            <span title="Pinned" style={{ color: 'var(--accent)' }}>
                              *
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>--</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <ActionButton
                              onClick={() => handleReorder(row.id, 'up')}
                              disabled={reorderingId === row.id || index === 0}
                              title="Move up"
                            >
                              &#9650;
                            </ActionButton>
                            <ActionButton
                              onClick={() => handleReorder(row.id, 'down')}
                              disabled={
                                reorderingId === row.id ||
                                index === articles.length - 1
                              }
                              title="Move down"
                            >
                              &#9660;
                            </ActionButton>
                            <ActionButton
                              onClick={() => handlePin(row.id, !!row.pinned)}
                              title={row.pinned ? 'Unpin' : 'Pin'}
                              active={!!row.pinned}
                            >
                              {row.pinned ? 'Unpin' : 'Pin'}
                            </ActionButton>
                            <ActionButton
                              onClick={() => handleToggleHidden(row.id)}
                              title={(row.article as unknown as Record<string, unknown>)?.hidden_from_homepage ? 'Show on homepage' : 'Hide from homepage'}
                              active={!!(row.article as unknown as Record<string, unknown>)?.hidden_from_homepage}
                            >
                              {(row.article as unknown as Record<string, unknown>)?.hidden_from_homepage ? 'Show' : 'Hide'}
                            </ActionButton>
                            {confirmDeleteId === row.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  disabled={deletingId === row.id}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white disabled:opacity-50"
                                  style={{ backgroundColor: '#dc2626' }}
                                >
                                  {deletingId === row.id
                                    ? 'Deleting...'
                                    : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-xs px-2 py-1 rounded-lg"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <ActionButton
                                onClick={() => setConfirmDeleteId(row.id)}
                                danger
                                title="Delete article"
                              >
                                Delete
                              </ActionButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden flex flex-col gap-3">
              {articles.map((row, index) => {
                const title =
                  row.article?.title ?? row.plan?.title ?? row.query
                const articleType = row.article?.article_type
                const thumbnailUrl = row.article?.thumbnail_url
                const createdDate = new Date(row.created_at).toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )

                return (
                  <div
                    key={row.id}
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="flex-shrink-0 rounded-lg overflow-hidden"
                        style={{
                          width: 60,
                          height: 40,
                          backgroundColor: 'var(--bg)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt=""
                            width={60}
                            height={40}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            --
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/article/${row.slug}`}
                          className="text-sm font-medium no-underline hover:underline block truncate"
                          style={{ color: 'var(--text-primary)' }}
                          title={title}
                        >
                          {title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {articleType && (
                            <span
                              className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: 'var(--accent)',
                                color: '#fff',
                              }}
                            >
                              {ARTICLE_TYPE_LABELS[articleType] ??
                                articleType.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {createdDate}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {(row.view_count ?? 0).toLocaleString()} views
                          </span>
                          {row.pinned && (
                            <span
                              className="text-xs font-medium"
                              style={{ color: 'var(--accent)' }}
                            >
                              Pinned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <ActionButton
                        onClick={() => handleReorder(row.id, 'up')}
                        disabled={reorderingId === row.id || index === 0}
                        title="Move up"
                      >
                        &#9650;
                      </ActionButton>
                      <ActionButton
                        onClick={() => handleReorder(row.id, 'down')}
                        disabled={
                          reorderingId === row.id ||
                          index === articles.length - 1
                        }
                        title="Move down"
                      >
                        &#9660;
                      </ActionButton>
                      <ActionButton
                        onClick={() => handlePin(row.id, !!row.pinned)}
                        title={row.pinned ? 'Unpin' : 'Pin'}
                        active={!!row.pinned}
                      >
                        {row.pinned ? 'Unpin' : 'Pin'}
                      </ActionButton>
                      {confirmDeleteId === row.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white disabled:opacity-50"
                            style={{ backgroundColor: '#dc2626' }}
                          >
                            {deletingId === row.id ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <ActionButton
                          onClick={() => setConfirmDeleteId(row.id)}
                          danger
                          title="Delete article"
                        >
                          Delete
                        </ActionButton>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
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
