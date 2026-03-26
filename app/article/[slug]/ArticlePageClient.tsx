'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { ArticleRow } from '@/types/article'
import ArticleGenerating from '@/components/ArticleGenerating'
import ArticleView from '@/components/ArticleView'
import ArticleSkeleton from '@/components/ArticleSkeleton'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import FactCheckBar from '@/components/ui/FactCheckBar'
import { useAdminMode } from '@/hooks/useAdminMode'
import { useUser } from '@/hooks/useUser'
import { addRecentArticle } from '@/lib/recent-articles'
import { clearPendingArticle } from '@/lib/pending-article'

interface Props {
  initialRow: ArticleRow
}

export default function ArticlePageClient({ initialRow }: Props) {
  const [row, setRow] = useState(initialRow)

  // Determine if article is already complete on initial load
  const articleAlreadyComplete = (initialRow.status === 'complete' || initialRow.status === 'verified') && !!initialRow.article

  // showArticle: true when we should render ArticleView
  const [showArticle, setShowArticle] = useState(articleAlreadyComplete)

  // fadeState controls opacity transitions
  const [fadeState, setFadeState] = useState<'generating' | 'transitioning' | 'article'>(
    articleAlreadyComplete ? 'article' : 'generating'
  )

  // Track whether this article was/is being generated (reactive — updates with row.status)
  const isGenerating = row.status === 'generating' || row.status === 'planning'
  const wasEverGenerating = useRef(
    initialRow.status === 'generating' || initialRow.status === 'planning'
  )
  if (isGenerating) wasEverGenerating.current = true

  const isAdmin = useAdminMode()
  const { user } = useUser()
  const isOwner = isAdmin || (user != null && row.user_id === user.id)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${initialRow.id}`)
      if (!res.ok) return
      const updated: ArticleRow = await res.json()
      // Preserve existing hero image — never allow image → null → image flash
      setRow(prev => {
        if (prev.article?.thumbnail_url && updated.article && !updated.article.thumbnail_url) {
          updated.article.thumbnail_url = prev.article.thumbnail_url
        }
        return updated
      })
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

  const [timedOut, setTimedOut] = useState(false)
  const pollStartRef = useRef(Date.now())

  // Poll while article is not yet verified
  useEffect(() => {
    // Stop polling when verified or errored
    if (row.status === 'verified' || row.status === 'error') return
    // Stop polling when showing a completed article that wasn't freshly generated
    if (showArticle && row.status === 'complete' && !wasEverGenerating.current) return
    if (timedOut) return

    const interval = setInterval(() => {
      if (Date.now() - pollStartRef.current > 3 * 60 * 1000) {
        setTimedOut(true)
        return
      }
      poll()
    }, 2500)
    return () => clearInterval(interval)
  }, [row.status, showArticle, poll, timedOut])

  // Page Visibility API — poll immediately when tab becomes visible
  useEffect(() => {
    if (showArticle && (row.status === 'verified' || !wasEverGenerating.current)) return
    function handleVisibility() {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [showArticle, row.status, poll])

  // Clear pending article from localStorage when article is ready
  useEffect(() => {
    if (showArticle && row.article) clearPendingArticle()
  }, [showArticle, row.article])

  // CRITICAL: Direct completion detection
  // If the article becomes complete/verified and has content, show it — regardless
  // of whether we went through ArticleGenerating or not. This handles:
  // - Page refresh mid-generation where status is already 'complete' on load
  // - Fast articles that complete before ArticleGenerating even mounts
  // - Race conditions where the rendering path was wrong
  useEffect(() => {
    if (showArticle) return // Already showing
    if (!row.article) return // No content yet

    const isComplete = row.status === 'complete' || row.status === 'verified'
    if (!isComplete) return

    // If we were never generating (direct load of completed article), show immediately
    if (!wasEverGenerating.current) {
      setShowArticle(true)
      setFadeState('article')
      return
    }

    // If we were generating and it just completed, do the transition
    // (This is the safety net — ArticleGenerating's onReady should handle this,
    // but if it didn't fire for any reason, this catches it after 2 seconds)
    const timer = setTimeout(() => {
      if (!showArticle) {
        clearPendingArticle()
        setShowArticle(true)
        setFadeState('article')
        window.scrollTo({ top: 0 })
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [row.status, row.article, showArticle])

  // Handle the transition from ArticleGenerating → ArticleView (called by ArticleGenerating)
  const handleArticleReady = useCallback(() => {
    if (showArticle) return
    clearPendingArticle()
    setFadeState('transitioning')
    setTimeout(() => {
      window.scrollTo({ top: 0 })
      setShowArticle(true)
      requestAnimationFrame(() => setFadeState('article'))
    }, 500)
  }, [showArticle])

  // Detect fact-check status
  const factCheckStatus: 'none' | 'checking' | 'verified' = (() => {
    if (row.status === 'verified' && row.fact_check) return 'verified'
    if (row.status === 'complete' && wasEverGenerating.current && !row.fact_check) return 'checking'
    if (row.status === 'complete' && wasEverGenerating.current) return 'checking'
    return 'none'
  })()

  // Determine which view to show
  const showError = row.status === 'error'
  const showGenerating = !showArticle && !showError && isGenerating
  const showSkeleton = !showArticle && !showError && !showGenerating

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
      {showError ? (
        <div className="max-w-[900px] mx-auto px-4 py-20 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'var(--accent-light)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            We couldn&apos;t load this article
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Something went wrong. The article might have been removed, or there was a server issue.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)', cursor: 'pointer' }}
            >
              Try again
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl text-sm font-medium no-underline"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', fontFamily: 'var(--font-sora)' }}
            >
              Go home
            </a>
          </div>
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
            isNew={wasEverGenerating.current}
            factCheckStatus={factCheckStatus}
          />
        </div>
      ) : showGenerating ? (
        <div
          style={{
            opacity: fadeState === 'transitioning' ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        >
          <ArticleGenerating
            row={row}
            onReady={handleArticleReady}
            timedOut={timedOut}
            onRetry={() => {
              setTimedOut(false)
              pollStartRef.current = Date.now()
              poll()
            }}
            onStartOver={() => {
              clearPendingArticle()
              window.location.href = '/'
            }}
          />
        </div>
      ) : showSkeleton ? (
        <ArticleSkeleton
          title={row.plan?.title ?? row.query}
          articleType={row.plan?.article_type}
          verdictPreview={row.plan?.quick_verdict_preview}
          sections={row.plan?.sections_outline ?? []}
          showHero
        />
      ) : null}

      {/* Fixed bottom fact-check bar — only show when FirstDraftBanner is NOT showing */}
      {/* The banner has its own fact-check display to avoid overlap */}
      {factCheckStatus !== 'none' && !(showArticle && wasEverGenerating.current && isOwner) && (
        <FactCheckBar
          status={factCheckStatus}
          factCheck={row.fact_check}
        />
      )}
    </div>
  )
}
