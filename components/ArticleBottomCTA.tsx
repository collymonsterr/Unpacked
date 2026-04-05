'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Category-contextual example pills.
 * Each category gets 3–4 example queries a reader of that category might try next.
 */
const CATEGORY_PILLS: Record<string, string[]> = {
  Tech: ['Best laptops under $1000', 'iPhone vs Samsung 2026', 'Best wireless earbuds'],
  Finance: ['Best budgeting apps', 'Roth IRA vs 401k', 'Best credit cards for travel'],
  Health: ['Best running shoes 2026', 'Whey vs plant protein', 'Best fitness trackers'],
  Travel: ['Best carry-on luggage', 'Bali vs Thailand', 'Best travel credit cards'],
  Home: ['Best robot vacuums', 'Air fryer vs convection oven', 'Best mattresses 2026'],
  Entertainment: ['Best streaming services', 'PS6 vs Xbox', 'Best soundbars under $300'],
  Science: ['James Webb latest discoveries', 'Best science podcasts', 'mRNA vs traditional vaccines'],
  Business: ['Best project management tools', 'LLC vs S-Corp', 'Best CRM for startups'],
  Automotive: ['Best electric SUVs 2026', 'Tesla vs Rivian', 'Best dash cams'],
  Culture: ['Best history podcasts', 'Most influential books 2026', 'Best language learning apps'],
  News: ['AI regulation breakdown', 'Climate policy comparison', 'Best news aggregator apps'],
  AI: ['Best AI coding tools', 'ChatGPT vs Claude vs Gemini', 'Best AI image generators'],
}

const DEFAULT_PILLS = ['Best laptops under $1000', 'iPhone vs Samsung', 'Best noise-cancelling headphones']

interface Props {
  isOwner: boolean
  isLoggedIn: boolean
  category: string | null
  query: string
  sourceCount?: number
}

export default function ArticleBottomCTA({ isOwner, isLoggedIn, category, query, sourceCount }: Props) {
  // Version C: Owner sees nothing
  if (isOwner) return null

  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const pills = CATEGORY_PILLS[category ?? ''] ?? DEFAULT_PILLS

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputValue.trim()
    if (!q) return
    router.push(`/?q=${encodeURIComponent(q)}`)
  }

  function handlePillClick(pill: string) {
    router.push(`/?q=${encodeURIComponent(pill)}`)
  }

  function handleFork() {
    router.push(`/?q=${encodeURIComponent(query)}`)
  }

  // Version A: Logged-out — full CTA with icon, heading, subline, stats, search, pills
  // Version B: Logged-in non-owner — lighter version with heading, search, pills, fork
  const showFullCTA = !isLoggedIn

  return (
    <div
      className="mt-12 mb-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FAFAF8 0%, #F5F3EE 100%)',
        border: '1px solid var(--border)',
      }}
      data-no-print
    >
      <div className="px-6 py-8 md:px-10 md:py-10">
        {/* Icon — only for logged-out */}
        {showFullCTA && (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
            style={{ backgroundColor: '#FAEEDA' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
        )}

        {/* Heading */}
        <h3
          className="text-xl md:text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {showFullCTA
            ? 'Have a question? Get your own article.'
            : 'Write your next article'}
        </h3>

        {/* Subline — only for logged-out */}
        {showFullCTA && (
          <p
            className="text-sm md:text-base mb-5"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}
          >
            {sourceCount && sourceCount > 0
              ? `This article was built from ${sourceCount}+ sources, fact-checked by 3 AI models, and delivered in under 3 minutes. Yours can be too.`
              : 'Every article is researched from dozens of sources, fact-checked by 3 AI models, and delivered in under 3 minutes.'}
          </p>
        )}

        {/* Stats strip — only for logged-out */}
        {showFullCTA && (
          <div className="flex flex-wrap gap-4 mb-6">
            {[
              { label: 'Sources researched', value: sourceCount && sourceCount > 0 ? `${sourceCount}+` : '30+' },
              { label: 'AI fact-checkers', value: '3' },
              { label: 'Time to article', value: '<3 min' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="font-semibold" style={{ color: '#BA7517' }}>{stat.value}</span>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search input */}
        <form onSubmit={handleSubmit} className="relative mb-4">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask any question..."
            className="w-full h-12 pl-4 pr-24 rounded-xl text-sm outline-none transition-shadow"
            style={{
              backgroundColor: 'white',
              border: '1.5px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-outfit)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#BA7517'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(186,117,23,0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 h-9 px-4 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: '#BA7517',
              color: 'white',
              fontFamily: 'var(--font-sora)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#A5680F' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#BA7517' }}
          >
            Unpack it
          </button>
        </form>

        {/* Category-contextual example pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {pills.map((pill) => (
            <button
              key={pill}
              onClick={() => handlePillClick(pill)}
              className="px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer"
              style={{
                backgroundColor: 'white',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-outfit)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#BA7517'
                e.currentTarget.style.color = '#BA7517'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Fork option — logged-in non-owner only */}
        {isLoggedIn && (
          <div
            className="pt-4 mt-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={handleFork}
              className="flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#BA7517' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="6" r="3" />
                <path d="M6 9v6c0 3 6 3 6 0V9" />
              </svg>
              Write your own take on &ldquo;{query.length > 50 ? query.slice(0, 47) + '...' : query}&rdquo;
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
