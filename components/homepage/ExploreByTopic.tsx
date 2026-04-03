'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

/** Preferred display order — categories appear in this sequence */
const DISPLAY_ORDER = [
  'tech', 'ai', 'finance', 'health', 'news', 'travel',
  'business', 'science', 'home', 'entertainment', 'culture', 'automotive',
]

/** Fallback: all 12 categories shown if API fails */
const ALL_CATEGORIES = [
  { name: 'Tech', slug: 'tech' },
  { name: 'AI & Future', slug: 'ai' },
  { name: 'Finance', slug: 'finance' },
  { name: 'Health', slug: 'health' },
  { name: 'News', slug: 'news' },
  { name: 'Travel', slug: 'travel' },
  { name: 'Business', slug: 'business' },
  { name: 'Science', slug: 'science' },
  { name: 'Home', slug: 'home' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Culture', slug: 'culture' },
  { name: 'Automotive', slug: 'automotive' },
]

interface ActiveCategory {
  slug: string
  name: string
  count: number
}

export default function ExploreByTopic() {
  const [categories, setCategories] = useState<ActiveCategory[]>(ALL_CATEGORIES.map(c => ({ ...c, count: 0 })))

  useEffect(() => {
    fetch('/api/categories/active')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.categories?.length > 0) {
          // Sort by preferred display order
          const sorted = [...data.categories].sort((a: ActiveCategory, b: ActiveCategory) => {
            const ai = DISPLAY_ORDER.indexOf(a.slug)
            const bi = DISPLAY_ORDER.indexOf(b.slug)
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
          })
          setCategories(sorted)
        }
        // If empty or null, keep fallback (all categories)
      })
      .catch(() => {
        // Keep fallback
      })
  }, [])

  if (categories.length === 0) return null

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-6 py-2">
      <p
        className="text-center mb-5"
        style={{
          fontSize: '13px',
          fontWeight: 500,
          textTransform: 'uppercase' as const,
          letterSpacing: '1.5px',
          color: '#888780',
        }}
      >
        Explore by topic
      </p>

      <div
        className="flex flex-wrap justify-center mx-auto"
        style={{ gap: '8px', maxWidth: '680px' }}
      >
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="no-underline explore-chip"
            style={{
              fontSize: '14px',
              fontWeight: 500,
              padding: '9px 20px',
              borderRadius: '8px',
              backgroundColor: '#EDECEA',
              color: '#5F5E5A',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      <style>{`
        .explore-chip:hover {
          background-color: #BA7517 !important;
          color: #fff !important;
        }
        @media (max-width: 640px) {
          .explore-chip {
            font-size: 13px !important;
            padding: 8px 16px !important;
          }
        }
      `}</style>
    </section>
  )
}
