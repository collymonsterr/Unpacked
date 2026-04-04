'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_OPTIONS, type GenerationOptions } from './ArticleOptions'
import { setPendingArticle } from '@/lib/pending-article'
import LimitReachedModal from './LimitReachedModal'

const PLACEHOLDERS = [
  'Best laptops for students under $800...',
  'iPhone 17 vs Galaxy S26...',
  'Best coffee machines from budget to luxury...',
  'Best noise-cancelling headphones under $300...',
  'Best gaming keyboards for under $100...',
  'MacBook Pro vs Dell XPS 15...',
  'Best beginner electric guitars under $500...',
  'Best robot vacuums for pet hair...',
]

// Phase 1 messages — shown on the homepage while planning runs
const PHASE1_MESSAGES = [
  'Reading your question carefully...',
  'Deciding what type of article fits this best...',
  'Planning the research approach...',
  'Working out which sources will matter most...',
  'Starting the research pass...',
]

export default function SearchForm({ autoFocus = true }: { autoFocus?: boolean } = {}) {
  const [query, setQuery] = useState('')
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options] = useState<GenerationOptions>(DEFAULT_OPTIONS)
  const [loadingMsgCount, setLoadingMsgCount] = useState(0)
  const [cachedResult, setCachedResult] = useState<{ slug: string; title: string } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  const [limitModal, setLimitModal] = useState<{ limit: number; nextReset: string } | null>(null)
  const [improveState, setImproveState] = useState<'idle' | 'chip' | 'loading' | 'showing'>('idle')
  const [alternatives, setAlternatives] = useState<string[]>([])
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadingStartRef = useRef(0)
  const improveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Rotate placeholder text
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length
      setPlaceholder(PLACEHOLDERS[i])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Improve prompt — 2 second debounce after 20+ chars
  useEffect(() => {
    if (improveTimerRef.current) {
      clearTimeout(improveTimerRef.current)
      improveTimerRef.current = null
    }

    // Reset chip if user is typing or query is short
    if (query.trim().length < 20 || isLoading) {
      if (improveState === 'chip') setImproveState('idle')
      return
    }

    // Don't show chip again if already showing alternatives or loading
    if (improveState === 'loading' || improveState === 'showing') return

    improveTimerRef.current = setTimeout(() => {
      setImproveState('chip')
    }, 2000)

    return () => {
      if (improveTimerRef.current) {
        clearTimeout(improveTimerRef.current)
        improveTimerRef.current = null
      }
    }
  }, [query, isLoading])

  async function handleImprovePrompt() {
    setImproveState('loading')
    try {
      const res = await fetch('/api/improve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (Array.isArray(data.alternatives) && data.alternatives.length === 3) {
        setAlternatives(data.alternatives)
        setImproveState('showing')
      } else {
        setImproveState('idle')
      }
    } catch {
      setImproveState('idle')
    }
  }

  function handleSelectAlternative(alt: string) {
    setQuery(alt)
    setAlternatives([])
    setImproveState('idle')
  }

  function handleDismissAlternatives() {
    setAlternatives([])
    setImproveState('idle')
  }

  // Phase 1 message ticking — starts when loading begins
  useEffect(() => {
    if (!isLoading) {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
      setLoadingMsgCount(0)
      return
    }

    // Show first message immediately
    setLoadingMsgCount(1)

    // Tick one message every 5 seconds
    loadingIntervalRef.current = setInterval(() => {
      setLoadingMsgCount(prev => {
        const next = prev + 1
        if (next >= PHASE1_MESSAGES.length) {
          if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current)
            loadingIntervalRef.current = null
          }
        }
        return Math.min(next, PHASE1_MESSAGES.length)
      })
    }, 5000)

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
    }
  }, [isLoading])

  // Phase 1 polling — poll for status change from 'planning' to 'generating'
  useEffect(() => {
    if (!pendingId || !pendingSlug) return

    loadingStartRef.current = Date.now()

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/articles/${pendingId}`)
        if (!res.ok) return
        const data = await res.json()

        // Navigate when article moves past planning (writing has started, or paused at auth gate)
        // Use the article ID (UUID) for navigation — the slug may change during generation
        if (data.status === 'generating' || data.status === 'awaiting_auth' || data.status === 'complete' || data.status === 'verified') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          router.push(`/article/${pendingId}`)
          return
        }

        // Fallback: if stuck on 'planning' for >15 seconds, navigate anyway
        if (Date.now() - loadingStartRef.current > 15000) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          router.push(`/article/${pendingId}`)
        }
      } catch {
        // Ignore transient errors
      }
    }, 2500)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [pendingId, router])

  async function handleForceNew() {
    setIsLoading(true)
    setCachedResult(null)
    setError(null)

    try {
      const trimmed = query.trim()
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, options, forceNew: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 403 && data.error === 'limit_reached') {
          setLimitModal({ limit: data.limit, nextReset: data.nextReset })
          setIsLoading(false)
          return
        }
        throw new Error(data.error ?? 'Failed to generate article')
      }

      const { id, slug } = await res.json()
      setPendingArticle(id, slug)

      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}

      try {
        const count = parseInt(localStorage.getItem('articles_generated') ?? '0', 10)
        localStorage.setItem('articles_generated', String(count + 1))
      } catch {}

      setPendingId(id)
      setPendingSlug(slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, options }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 403 && data.error === 'limit_reached') {
          setLimitModal({ limit: data.limit, nextReset: data.nextReset })
          setIsLoading(false)
          return
        }
        throw new Error(data.error ?? 'Failed to generate article')
      }

      const data = await res.json()

      // Handle cached article — show the user an option instead of redirecting
      if (data.cached) {
        setIsLoading(false)
        setCachedResult({ slug: data.slug, title: data.cachedTitle })
        return
      }

      const { id, slug } = data

      // Save pending article for recovery
      setPendingArticle(id, slug)

      // Track ownership
      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}

      // Track article count for education card gating
      try {
        const count = parseInt(localStorage.getItem('articles_generated') ?? '0', 10)
        localStorage.setItem('articles_generated', String(count + 1))
      } catch {}

      // Don't navigate yet — Phase 1 polling will navigate when status changes to 'generating'
      setPendingId(id)
      setPendingSlug(slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  // Loading state — Phase 1: stays on homepage until status changes to 'generating'
  if (isLoading) {
    return (
      <div className="w-full">
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--card)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Static header — always visible, visually separated */}
          <div className="text-center mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
            >
              Building your article — this takes 2–3 minutes, go grab a coffee ☕
            </p>
          </div>

          {/* Animated progress bar */}
          <div
            className="w-48 h-1 rounded-full overflow-hidden mx-auto mb-5"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: 'var(--accent)',
                animation: 'loadingSlide 1.8s ease-in-out infinite',
              }}
            />
          </div>

          {/* Stacking Phase 1 messages */}
          <div className="space-y-2.5 max-w-md mx-auto text-left">
            {PHASE1_MESSAGES.slice(0, loadingMsgCount).map((msg, i) => {
              const isDone = i < loadingMsgCount - 1
              const isCurrent = i === loadingMsgCount - 1
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 transition-all duration-300"
                  style={{
                    opacity: isDone ? 0.5 : 1,
                    animation: isCurrent ? 'fadeInUp 0.3s ease' : undefined,
                  }}
                >
                  {isDone ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                    />
                  )}
                  <span
                    className="text-sm"
                    style={{
                      color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: isCurrent ? 600 : 400,
                      fontFamily: 'var(--font-outfit)',
                    }}
                  >
                    {msg}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <style>{`
          @keyframes loadingSlide {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        {/* Text input card */}
        <div
          className="rounded-2xl overflow-hidden p-2"
          style={{
            backgroundColor: 'var(--card)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid var(--border)',
          }}
        >
          <textarea
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              // Reset improve state on typing
              if (improveState === 'chip' || improveState === 'showing') {
                setImproveState('idle')
                setAlternatives([])
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder={placeholder}
            disabled={isLoading}
            rows={2}
            className="w-full px-4 py-3 text-base outline-none bg-transparent disabled:opacity-50 resize-none"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-outfit)',
              minHeight: '60px',
            }}
            autoFocus={autoFocus}
          />
        </div>

        {/* Improve prompt chip */}
        {improveState === 'chip' && (
          <div className="flex justify-end mt-2 px-1" style={{ animation: 'fadeInChip 200ms ease' }}>
            <button
              type="button"
              onClick={handleImprovePrompt}
              className="text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: '#BA7517',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'var(--font-sora)',
              }}
            >
              ✦ Improve this prompt
            </button>
          </div>
        )}

        {/* Improve prompt — skeleton loading */}
        {improveState === 'loading' && (
          <div className="mt-3 space-y-2 px-1" style={{ animation: 'fadeInCards 150ms ease' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg"
                style={{
                  backgroundColor: '#F0EFED',
                  height: '52px',
                  animation: 'skeletonPulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Improve prompt — alternative cards */}
        {improveState === 'showing' && alternatives.length > 0 && (
          <div className="mt-3 space-y-2 px-1" style={{ animation: 'fadeInCards 150ms ease' }}>
            {alternatives.map((alt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectAlternative(alt)}
                className="w-full text-left rounded-lg transition-all"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #E8E2D9',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-outfit)',
                  cursor: 'pointer',
                  minHeight: '44px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderLeft = '2px solid #BA7517'
                  e.currentTarget.style.backgroundColor = '#FDF6E9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderLeft = '1px solid #E8E2D9'
                  e.currentTarget.style.backgroundColor = '#fff'
                }}
              >
                {alt}
              </button>
            ))}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDismissAlternatives}
                className="text-xs hover:underline"
                style={{
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '2px 4px',
                  fontFamily: 'var(--font-outfit)',
                }}
              >
                ✕ dismiss
              </button>
            </div>
          </div>
        )}

        {/* Buttons row — below the input */}
        <div className="flex items-center gap-3 mt-3 justify-center">
          <button
            type="button"
            disabled={isLoading || !query.trim()}
            onClick={() => {
              if (!query.trim() || isLoading) return
              router.push(`/plan?q=${encodeURIComponent(query.trim())}`)
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-sora)',
              cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Plan first
          </button>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--font-sora)',
              cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Unpack it
          </button>
        </div>
      </form>

      {/* Cached article notification */}
      {cachedResult && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
            We recently wrote an article on this topic
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            &ldquo;{cachedResult.title}&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/article/${cachedResult.slug}`)}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
            >
              Read it →
            </button>
            <button
              onClick={handleForceNew}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              Generate fresh article anyway
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}

      {limitModal && (
        <LimitReachedModal
          open={!!limitModal}
          onClose={() => setLimitModal(null)}
          limit={limitModal.limit}
          nextReset={limitModal.nextReset}
        />
      )}

      <style>{`
        @keyframes fadeInChip {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInCards {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
