'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ArticleRow } from '@/types/article'
import ArticleGenerating from '@/components/ArticleGenerating'
import ArticleView from '@/components/ArticleView'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import FactCheckBar from '@/components/ui/FactCheckBar'
import { useAdminMode } from '@/hooks/useAdminMode'
import { useUser } from '@/hooks/useUser'
import { addRecentArticle } from '@/lib/recent-articles'

interface Props {
  initialRow: ArticleRow
}

export default function ArticlePageClient({ initialRow }: Props) {
  const [row, setRow] = useState(initialRow)
  const [wasGenerating] = useState(
    initialRow.status === 'generating' || initialRow.status === 'planning'
  )
  const [showArticle, setShowArticle] = useState(
    // If we load a completed article directly (not freshly generated), show it immediately
    (initialRow.status === 'complete' || initialRow.status === 'verified') && !!initialRow.article
  )
  const [fadeState, setFadeState] = useState<'generating' | 'transitioning' | 'article'>(
    showArticle ? 'article' : 'generating'
  )
  const isAdmin = useAdminMode()
  const { user } = useUser()
  const isOwner = isAdmin || (user != null && row.user_id === user.id)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${initialRow.id}`)
      if (!res.ok) return
      const updated: ArticleRow = await res.json()
      setRow(updated)
    } catch {
      // ignore transient fetch errors
    }
  }, [initialRow.id])

  // Track view (debounced: 1 view per article per 5 minutes via localStorage)
  useEffect(() => {
    if (!showArticle || !row.article) return

    const key = `viewed_${initialRow.id}`
    const lastViewed = localStorage.getItem(key)
    const now = Date.now()
    if (lastViewed && now - parseInt(lastViewed, 10) < 5 * 60 * 1000) return

    localStorage.setItem(key, String(now))
    fetch(`/api/articles/${initialRow.id}/view`, { method: 'POST' }).catch(() => {})
  }, [showArticle, row.article, initialRow.id])

  // Track in recent articles history (localStorage)
  useEffect(() => {
    if (!showArticle || !row.article) return
    addRecentArticle({
      title: row.article.title,
      slug: initialRow.slug,
      articleType: row.article.article_type,
      thumbnailUrl: row.article.thumbnail_url ?? undefined,
      visitedAt: Date.now(),
    })
  }, [showArticle, row.article, initialRow.slug])

  // Poll while planning, generating, or waiting for fact-check
  useEffect(() => {
    if (row.status === 'verified' || row.status === 'error') return
    if (showArticle && row.status === 'complete' && !wasGenerating) return

    const interval = setInterval(poll, 2500)
    return () => clearInterval(interval)
  }, [row.status, wasGenerating, showArticle, poll])

  // Handle the transition from generating to article
  const handleArticleReady = useCallback(() => {
    if (showArticle) return // Already showing
    setFadeState('transitioning')
    setTimeout(() => {
      window.scrollTo({ top: 0 })
      setShowArticle(true)
      // Small delay so the DOM renders before we fade in
      requestAnimationFrame(() => {
        setFadeState('article')
      })
    }, 500)
  }, [showArticle])

  // Detect fact-check status
  const factCheckStatus: 'none' | 'checking' | 'verified' = (() => {
    if (row.status === 'verified' && wasGenerating) return 'verified'
    if (row.status === 'verified' && row.fact_check) return 'verified'
    if (row.status === 'complete' && wasGenerating && !row.fact_check) return 'checking'
    // If article was just generated and is complete but fact-check hasn't started yet
    if (row.status === 'complete' && wasGenerating) return 'checking'
    return 'none'
  })()

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav — sticky */}
      <nav
        className="px-6 py-4 flex items-center gap-3 sticky top-0 z-50"
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Logo size="sm" />
        <div className="ml-auto">
          <UserMenu />
        </div>
      </nav>

      {/* Content */}
      {row.status === 'error' ? (
        <div className="max-w-[900px] mx-auto px-4 py-20 text-center">
          <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-sora)' }}>
            Something went wrong
          </p>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            We couldn&apos;t generate this article. This sometimes happens with complex queries.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Go back and try again
          </a>
        </div>
      ) : showArticle && row.article ? (
        <div
          style={{
            opacity: fadeState === 'article' ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <ArticleView
            articleRow={row}
            isOwner={isOwner}
            isAdmin={isAdmin}
            isNew={wasGenerating}
            factCheckStatus={factCheckStatus}
          />
        </div>
      ) : (
        <div
          style={{
            opacity: fadeState === 'transitioning' ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        >
          <ArticleGenerating row={row} onReady={handleArticleReady} />
        </div>
      )}

      {/* Fixed bottom fact-check bar — show whenever we're fact-checking or verified for a fresh article */}
      {factCheckStatus !== 'none' && (
        <FactCheckBar
          status={factCheckStatus}
          factCheck={row.fact_check}
        />
      )}
    </div>
  )
}
