'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ArticleOptions, { DEFAULT_OPTIONS, type GenerationOptions } from './ArticleOptions'

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

export default function SearchForm({ autoFocus = true }: { autoFocus?: boolean } = {}) {
  const [query, setQuery] = useState('')
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS)
  const [showOptions, setShowOptions] = useState(false)
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

      // Immediate redirect — no loading messages, no transitions
      router.push(`/article/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
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
              // Auto-expand beyond 2 rows if needed
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
            {isLoading ? 'Creating...' : 'Generate Article'}
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
