'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { setPendingArticle } from '@/lib/pending-article'

interface SearchResult {
  id: string
  slug: string
  title: string
  category: string | null
  view_count: number
}

export default function NavSearchBar() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mobileContainerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const router = useRouter()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        mobileContainerRef.current && !mobileContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const searchArticles = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/articles/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setShowDropdown(true)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  function handleInputChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(() => searchArticles(value.trim()), 300)
  }

  async function handleGenerate(q: string) {
    if (!q || isGenerating) return
    setIsGenerating(true)
    setShowDropdown(false)

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, options: {} }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()

      if (data.cached) {
        router.push(`/article/${data.slug}`)
        return
      }

      setPendingArticle(data.id, data.slug)
      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(data.id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}

      router.push(`/article/${data.slug}`)
    } catch {
      router.push(`/?q=${encodeURIComponent(q)}`)
    } finally {
      setIsGenerating(false)
      setQuery('')
      setExpanded(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    // If dropdown is open and there are results, show the full panel
    // If no results or dropdown closed, trigger search first
    if (trimmed.length >= 2) {
      searchArticles(trimmed)
    }
  }

  function navigateToArticle(slug: string) {
    setShowDropdown(false)
    setQuery('')
    setExpanded(false)
    router.push(`/article/${slug}`)
  }

  const formatCategory = (cat: string | null) => {
    if (!cat) return null
    return cat.replace(/_/g, ' ')
  }

  const dropdown = (showDropdown && query.trim().length >= 2) ? (
    <div
      className="absolute left-0 right-0 rounded-xl overflow-hidden"
      style={{
        top: 'calc(100% + 6px)',
        backgroundColor: '#fff',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        maxHeight: 300,
        overflowY: 'auto',
        zIndex: 100,
      }}
    >
      {searching && results.length === 0 && (
        <div className="px-4 py-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Searching...</p>
        </div>
      )}

      {!searching && results.length === 0 && (
        <div className="px-4 py-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No existing articles found</p>
        </div>
      )}

      {results.map(r => (
        <button
          key={r.id}
          onClick={() => navigateToArticle(r.slug)}
          className="w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors"
          style={{
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '0.5px solid var(--border)',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F5F3EE')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {r.title}
          </span>
          {r.category && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider"
              style={{ backgroundColor: '#FAEEDA', color: '#633806' }}
            >
              {formatCategory(r.category)}
            </span>
          )}
          {r.view_count > 0 && (
            <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
              {r.view_count.toLocaleString()} views
            </span>
          )}
        </button>
      ))}

      {/* Generate new article button — always at bottom */}
      <button
        onClick={() => handleGenerate(query.trim())}
        disabled={isGenerating}
        className="w-full text-left px-4 py-3 flex items-center gap-2 transition-colors"
        style={{
          cursor: isGenerating ? 'wait' : 'pointer',
          backgroundColor: 'transparent',
          border: 'none',
          opacity: isGenerating ? 0.6 : 1,
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FAEEDA')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span style={{ fontSize: 14 }}>✨</span>
        <span className="text-sm font-medium" style={{ color: '#BA7517' }}>
          {isGenerating ? 'Generating...' : `Generate a new article on '${query.trim()}'`}
        </span>
      </button>
    </div>
  ) : null

  return (
    <>
      {/* Desktop: inline search input with dropdown */}
      <div ref={containerRef} className="hidden md:block relative">
        <form onSubmit={handleSubmit} className="flex items-center relative">
          <input
            ref={desktopInputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search or ask a question..."
            disabled={isGenerating}
            className="rounded-full text-sm pl-9 pr-4 py-2 outline-none transition-all"
            style={{
              width: '320px',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-outfit)',
            }}
          />
          <svg
            className="absolute left-3 pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          {(isLoading || isGenerating) && (
            <div
              className="absolute right-3 w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
            />
          )}
        </form>
        {dropdown}
      </div>

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
          ref={mobileContainerRef}
          className="fixed inset-x-0 top-0 z-50 px-4 py-3 md:hidden"
          style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search or ask a question..."
              disabled={isGenerating}
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
              onClick={() => { setExpanded(false); setQuery(''); setShowDropdown(false) }}
              className="text-xs font-medium px-3 py-2"
              style={{ color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              Cancel
            </button>
            {isGenerating && (
              <div
                className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
              />
            )}
          </form>

          {/* Mobile autocomplete results */}
          {showDropdown && query.trim().length >= 2 && (
            <div className="mt-2" style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
              {searching && results.length === 0 && (
                <p className="text-xs py-2" style={{ color: 'var(--text-secondary)' }}>Searching...</p>
              )}

              {!searching && results.length === 0 && (
                <p className="text-xs py-2" style={{ color: 'var(--text-secondary)' }}>No existing articles found</p>
              )}

              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigateToArticle(r.slug)}
                  className="w-full text-left py-2.5 flex items-center gap-2"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '0.5px solid var(--border)',
                  }}
                >
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {r.title}
                  </span>
                  {r.category && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider"
                      style={{ backgroundColor: '#FAEEDA', color: '#633806' }}
                    >
                      {formatCategory(r.category)}
                    </span>
                  )}
                </button>
              ))}

              <button
                onClick={() => handleGenerate(query.trim())}
                disabled={isGenerating}
                className="w-full text-left py-3 flex items-center gap-2"
                style={{
                  cursor: isGenerating ? 'wait' : 'pointer',
                  backgroundColor: 'transparent',
                  border: 'none',
                  opacity: isGenerating ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>✨</span>
                <span className="text-sm font-medium" style={{ color: '#BA7517' }}>
                  {isGenerating ? 'Generating...' : `Generate new article on '${query.trim()}'`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
