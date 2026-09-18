'use client'

import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import Link from 'next/link'
import type { ArticleRow } from '@/types/article'
import ArticleGenerating from '@/components/ArticleGenerating'
import ArticleView from '@/components/ArticleView'
import ArticleSkeleton from '@/components/ArticleSkeleton'
import ResearchPreview from '@/components/ResearchPreview'
import SignInGate from '@/components/SignInGate'
import SignInBar from '@/components/SignInBar'
import Navbar from '@/components/ui/Navbar'
import FactCheckBar from '@/components/ui/FactCheckBar'
import { useAdminMode } from '@/hooks/useAdminMode'
import { useUser } from '@/hooks/useUser'
import { addRecentArticle } from '@/lib/recent-articles'
import { clearPendingArticle } from '@/lib/pending-article'

const EditorCoPilot = lazy(() => import('@/components/EditorCoPilot'))

interface Props {
  initialRow: ArticleRow
  linkableArticles?: Array<{ title: string; slug: string }>
  creatorBio?: string
  creatorTwitterUrl?: string
  creatorLinkedinUrl?: string
  creatorMediumUrl?: string
  isFoundingCreator?: boolean
}

export default function ArticlePageClient({ initialRow, linkableArticles, creatorBio, creatorTwitterUrl, creatorLinkedinUrl, creatorMediumUrl, isFoundingCreator }: Props) {
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
    initialRow.status === 'generating' || initialRow.status === 'planning' || initialRow.status === 'awaiting_auth'
  )
  if (isGenerating) wasEverGenerating.current = true

  const isAdmin = useAdminMode()
  const { user, loading: userLoading } = useUser()
  const isOwner = isAdmin || (user != null && row.user_id === user.id)

  // Tab state (Article vs Editor)
  const [activeTab, setActiveTab] = useState<'article' | 'editor'>('article')

  // Unused findings count for EditorBar badge
  const [unusedFindingsCount, setUnusedFindingsCount] = useState(0)

  // Sign-in gate state
  const [gateDismissed, setGateDismissed] = useState(false)
  const [claimInProgress, setClaimInProgress] = useState(false)
  const claimAttempted = useRef(false)

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

  // ── Auto-claim: if user is authenticated and article is awaiting_auth, start writing ──
  useEffect(() => {
    if (userLoading) return // Wait until we know auth state
    if (!user) return // Not logged in
    if (row.status !== 'awaiting_auth') return // Not in gate state
    if (claimAttempted.current) return // Already tried
    claimAttempted.current = true
    setClaimInProgress(true)

    console.log('[article-page] User authenticated, auto-claiming article')
    fetch(`/api/articles/${initialRow.id}/start-writing`, { method: 'POST' })
      .then(res => {
        if (res.ok) {
          // Force a poll to pick up the new status
          poll()
        } else {
          console.error('[article-page] Auto-claim failed:', res.status)
        }
      })
      .catch(err => console.error('[article-page] Auto-claim error:', err))
      .finally(() => setClaimInProgress(false))
  }, [user, userLoading, row.status, initialRow.id, poll])

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

  // Fetch unused findings count for EditorBar badge (owner only)
  useEffect(() => {
    if (!isOwner || !showArticle || !row.article) return

    fetch(`/api/articles/${initialRow.id}/research`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.research_findings) return
        const unused = data.research_findings.filter((f: { used_in_article: boolean }) => !f.used_in_article).length
        if (unused > 0) setUnusedFindingsCount(unused)
      })
      .catch(() => {})
  }, [isOwner, showArticle, row.article, initialRow.id])

  const handleTabClick = useCallback((tab: 'article' | 'editor') => {
    setActiveTab(tab)
  }, [])

  const [timedOut, setTimedOut] = useState(false)
  // eslint-disable-next-line react-hooks/purity -- useRef initial value is set once on mount only
  const pollStartRef = useRef(Date.now())

  // Poll while article is not yet verified (but NOT while awaiting_auth — that's paused)
  useEffect(() => {
    // Stop polling when verified or errored
    if (row.status === 'verified' || row.status === 'error') return
    // Stop polling when awaiting_auth (paused state — no server work happening)
    if (row.status === 'awaiting_auth' && !claimInProgress) return
    // Stop polling when showing a completed article that wasn't freshly generated
    if (showArticle && row.status === 'complete' && !wasEverGenerating.current) return

    // After timeout, keep polling slowly (every 10s) so the article appears automatically
    const pollInterval = timedOut ? 10000 : 2500

    const interval = setInterval(() => {
      if (!timedOut && Date.now() - pollStartRef.current > 5 * 60 * 1000) {
        setTimedOut(true)
      }
      poll()
    }, pollInterval)
    return () => clearInterval(interval)
  }, [row.status, showArticle, poll, timedOut, claimInProgress])

  // Page Visibility API — poll immediately when tab becomes visible
  useEffect(() => {
    if (showArticle && (row.status === 'verified' || !wasEverGenerating.current)) return
    if (row.status === 'awaiting_auth' && !claimInProgress) return
    function handleVisibility() {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [showArticle, row.status, poll, claimInProgress])

  // Clear pending article from localStorage when article is ready
  useEffect(() => {
    if (showArticle && row.article) clearPendingArticle()
  }, [showArticle, row.article])

  // CRITICAL: Direct completion detection
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

  // URL cleanup: replace UUID in URL with clean slug once article is complete
  const urlReplaced = useRef(false)
  useEffect(() => {
    if (urlReplaced.current) return
    if (!showArticle || !row.slug) return

    const currentPath = window.location.pathname
    const isUuidUrl = /\/article\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(currentPath)
    if (!isUuidUrl) return

    const isSlugUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(row.slug)
    if (isSlugUuid) return

    urlReplaced.current = true
    window.history.replaceState(null, '', `/article/${row.slug}`)
  }, [showArticle, row.slug])

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

  // ── Determine which view to show ──
  const showError = row.status === 'error'
  const errorOptions = row.generation_options as Record<string, unknown> | null
  const errorTag = errorOptions?._error as string | undefined
  const errorDetail = errorOptions?._error_detail as string | undefined
  const showAwaitingAuth = !showArticle && !showError && row.status === 'awaiting_auth' && !claimInProgress
  const showGenerating = !showArticle && !showError && !showAwaitingAuth && isGenerating
  const showSkeleton = !showArticle && !showError && !showAwaitingAuth && !showGenerating

  // Show sign-in gate overlay when awaiting auth and user is not logged in
  const showSignInGate = showAwaitingAuth && !user && !gateDismissed
  // Show persistent sign-in bar when gate was dismissed
  const showSignInBottomBar = showAwaitingAuth && !user && gateDismissed

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav — sticky with search */}
      <div
        className="sticky top-0 z-50"
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Navbar showSearch={true} />
      </div>

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
            {errorTag === 'topic_refused'
              ? "This topic hit a safety filter"
              : errorTag === 'provider_unavailable'
                ? 'Article generation is temporarily unavailable'
                : 'Something went wrong generating this article'}
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {errorTag === 'topic_refused'
              ? "One of our verification models flagged this query. This can happen with certain phrasing — try rewording your question or approaching it from a slightly different angle. Most topics work fine on a second attempt."
              : errorTag === 'provider_unavailable'
                ? "One of the AI services we rely on isn't responding right now. It's on our side, not your question — please try again a little later."
                : 'The generation timed out or hit an error. Start a new search to try again.'}
          </p>
          {/* Admin sees the actual cause, so an account-level outage is obvious at a glance */}
          {isAdmin && errorDetail && (
            <p
              className="text-xs mb-6 mx-auto max-w-md rounded-lg px-3 py-2"
              style={{ backgroundColor: '#FDECEA', color: '#9B1C1C', border: '1px solid #F5C2C0' }}
            >
              Admin: {errorDetail}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold no-underline"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
            >
              Ask a new question →
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl text-sm font-medium no-underline"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', fontFamily: 'var(--font-sora)' }}
            >
              Go home
            </Link>
          </div>
        </div>
      ) : showAwaitingAuth ? (
        <>
          <ResearchPreview
            preview={row.research_preview!}
            query={row.query}
            articleId={initialRow.id}
          />
          {showSignInGate && (
            <SignInGate
              articleId={initialRow.id}
              onDismiss={() => setGateDismissed(true)}
            />
          )}
          {showSignInBottomBar && (
            <SignInBar />
          )}
        </>
      ) : showArticle && row.article ? (
        <div
          style={{
            opacity: fadeState === 'article' ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          {/* Tab navigation — only show Editor tab to owner */}
          {isOwner && (
            <div
              className="max-w-[900px] mx-auto px-4 md:px-6 flex gap-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {(['article', 'editor'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className="relative px-4 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-sora)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                  }}
                >
                  {tab === 'article' ? 'Article' : (
                    <span className="flex items-center gap-1.5">
                      Editor
                      {unusedFindingsCount > 0 && activeTab !== 'editor' && (
                        <span
                          className="inline-flex items-center justify-center text-[10px] font-bold rounded-full"
                          style={{
                            backgroundColor: '#BA7517',
                            color: '#fff',
                            minWidth: '18px',
                            height: '18px',
                            padding: '0 5px',
                            fontFamily: 'var(--font-sora)',
                          }}
                        >
                          {unusedFindingsCount}
                        </span>
                      )}
                    </span>
                  )}
                  {activeTab === tab && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: '#BA7517' }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          {activeTab === 'article' ? (
            <ArticleView
              articleRow={row}
              isOwner={isOwner}
              isAdmin={isAdmin}
              isNew={wasEverGenerating.current}
              factCheckStatus={factCheckStatus}
              linkableArticles={linkableArticles}
              creatorBio={creatorBio}
              creatorTwitterUrl={creatorTwitterUrl}
              creatorLinkedinUrl={creatorLinkedinUrl}
              creatorMediumUrl={creatorMediumUrl}
              isFoundingCreator={isFoundingCreator}
              unusedFindingsCount={unusedFindingsCount}
              onSwitchToEditor={() => handleTabClick('editor')}
            />
          ) : (
            <Suspense
              fallback={
                <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-xl h-24 animate-pulse" style={{ backgroundColor: '#f0efed' }} />
                    ))}
                  </div>
                </div>
              }
            >
              <EditorCoPilot
                articleId={row.id}
                articleSlug={row.slug}
                articleType={row.article?.article_type ?? ''}
              />
            </Suspense>
          )}
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

      {/* Fixed bottom fact-check bar */}
      {factCheckStatus !== 'none' && !(showArticle && wasEverGenerating.current && isOwner) && (
        <FactCheckBar
          status={factCheckStatus}
          factCheck={row.fact_check}
          audit={row.fact_check_audit}
        />
      )}
    </div>
  )
}
