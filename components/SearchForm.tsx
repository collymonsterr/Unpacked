'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ArticleOptions, { DEFAULT_OPTIONS, type GenerationOptions } from './ArticleOptions'
import { setPendingArticle } from '@/lib/pending-article'

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

// Stacking messages shown immediately when user clicks Generate
const LOADING_MESSAGES = [
  'Starting research...',
  'Searching the web for answers...',
  'Finding relevant sources...',
  'Reading expert reviews...',
  'Checking forums and communities...',
  'Gathering real opinions...',
  'Preparing your article...',
]

export default function SearchForm({ autoFocus = true }: { autoFocus?: boolean } = {}) {
  const [query, setQuery] = useState('')
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS)
  const [showOptions, setShowOptions] = useState(false)
  const [loadingMsgCount, setLoadingMsgCount] = useState(0)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

  // Tick loading messages when generating
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

    // Tick one message every 2 seconds
    loadingIntervalRef.current = setInterval(() => {
      setLoadingMsgCount(prev => {
        const next = prev + 1
        if (next >= LOADING_MESSAGES.length) {
          if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current)
            loadingIntervalRef.current = null
          }
        }
        return Math.min(next, LOADING_MESSAGES.length)
      })
    }, 2000)

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
    }
  }, [isLoading])

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
        throw new Error(data.error ?? 'Failed to generate article')
      }

      const { id, slug } = await res.json()

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

      router.push(`/article/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  // Loading state — replaces the form with stacking messages
  if (isLoading) {
    return (
      <div className="w-full">
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            backgroundColor: 'var(--card)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid var(--border)',
          }}
        >
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

          {/* Stacking messages */}
          <div className="space-y-2 max-w-md mx-auto text-left">
            {LOADING_MESSAGES.slice(0, loadingMsgCount).map((msg, i) => {
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

        {/* Buttons row — below the input */}
        <div className="flex items-center gap-3 mt-3 justify-center">
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
            Generate Article
          </button>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-sora)',
              cursor: 'pointer',
            }}
          >
            Article options {showOptions ? '▾' : '▸'}
          </button>
        </div>
      </form>

      {/* Options panel — toggled by button */}
      {showOptions && (
        <div className="mt-3">
          <ArticleOptions value={options} onChange={setOptions} />
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
