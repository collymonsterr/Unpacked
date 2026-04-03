'use client'

import { useState, useRef, useEffect } from 'react'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import NavSearchBar from '@/components/ui/NavSearchBar'
import { CATEGORIES } from '@/lib/category-config'

interface NavbarProps {
  /** Show the search bar — hidden on homepage where the hero search exists */
  showSearch?: boolean
}

interface ActiveCategory {
  slug: string
  name: string
  count: number
}

/**
 * Shared navbar used across all pages.
 * Includes logo, nav links, search bar (optional), and user menu.
 */
export default function Navbar({ showSearch = true }: NavbarProps) {
  const [exploreOpen, setExploreOpen] = useState(false)
  const [activeCategories, setActiveCategories] = useState<ActiveCategory[] | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!exploreOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExploreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exploreOpen])

  // Fetch active categories (cached for 1 hour server-side)
  useEffect(() => {
    fetch('/api/categories/active')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.categories?.length > 0) {
          setActiveCategories(data.categories)
        }
      })
      .catch(() => {
        // Fallback handled below
      })
  }, [])

  // Use active categories if loaded, otherwise fall back to all categories
  const displayCategories = activeCategories ?? CATEGORIES.map(c => ({ slug: c.slug, name: c.name, count: 0 }))

  return (
    <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto gap-3">
      <Logo size="md" />

      <div className="flex items-center gap-3">
        {showSearch && <NavSearchBar />}

        {/* Explore dropdown */}
        <div ref={dropdownRef} className="relative hidden sm:block">
          <button
            onClick={() => setExploreOpen(!exploreOpen)}
            className="text-sm font-medium flex items-center gap-1"
            style={{
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              fontFamily: 'inherit',
            }}
          >
            Explore
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'transform 150ms',
                transform: exploreOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {exploreOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-xl shadow-lg z-50 py-2"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                minWidth: '180px',
              }}
            >
              {displayCategories.map((cat) => (
                <a
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="block px-4 py-2 text-sm no-underline transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-light)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  onClick={() => setExploreOpen(false)}
                >
                  {cat.name}
                </a>
              ))}
            </div>
          )}
        </div>

        <a
          href="/pricing"
          className="text-sm font-medium no-underline hidden sm:block"
          style={{ color: 'var(--text-secondary)' }}
        >
          Pricing
        </a>
        <a
          href="/about"
          className="text-sm font-medium no-underline hidden sm:block"
          style={{ color: 'var(--text-secondary)' }}
        >
          About
        </a>
        <a
          href="/creators"
          className="text-sm font-medium no-underline hidden sm:block"
          style={{ color: 'var(--text-secondary)' }}
        >
          Creators
        </a>
        <UserMenu />
      </div>
    </nav>
  )
}
