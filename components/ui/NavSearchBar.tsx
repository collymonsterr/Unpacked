'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { setPendingArticle } from '@/lib/pending-article'

/**
 * Compact search/generate bar for the navbar.
 * Desktop: inline input field. Mobile: icon that expands to full-width bar.
 */
export default function NavSearchBar() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    setIsLoading(true)

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, options: {} }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to generate')
      }

      const data = await res.json()

      if (data.cached) {
        // Cached article exists — go directly
        router.push(`/article/${data.slug}`)
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

      // Navigate to article page — it will show the generating state
      router.push(`/article/${slug}`)
    } catch {
      // On error, navigate to homepage with the query pre-filled
      router.push(`/?q=${encodeURIComponent(trimmed)}`)
    } finally {
      setIsLoading(false)
      setQuery('')
      setExpanded(false)
    }
  }

  return (
    <>
      {/* Desktop: inline search input */}
      <form onSubmit={handleSubmit} className="hidden md:flex items-center relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything..."
          disabled={isLoading}
          className="rounded-full text-sm pl-9 pr-4 py-2 outline-none transition-all"
          style={{
            width: '320px',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-outfit)',
          }}
        />
        {/* Search icon */}
        <svg
          className="absolute left-3 pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        {isLoading && (
          <div
            className="absolute right-3 w-4 h-4 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
          />
        )}
      </form>

      {/* Mobile: search icon button */}
      <button
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-full"
        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}
        onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 100) }}
        aria-label="Search"
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {/* Mobile: expanded search overlay */}
      {expanded && (
        <div
          className="fixed inset-x-0 top-0 z-50 px-4 py-3 md:hidden"
          style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="flex-1 rounded-full text-sm pl-4 pr-4 py-2.5 outline-none"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-outfit)',
              }}
            />
            <button
              type="button"
              onClick={() => { setExpanded(false); setQuery('') }}
              className="text-xs font-medium px-3 py-2"
              style={{ color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              Cancel
            </button>
            {isLoading && (
              <div
                className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
              />
            )}
          </form>
        </div>
      )}
    </>
  )
}
