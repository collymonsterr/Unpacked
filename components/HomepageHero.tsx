'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import SearchForm from './SearchForm'
import ExampleChips from './ExampleChips'
import UsageIndicator from './UsageIndicator'
import { setPendingArticle } from '@/lib/pending-article'

const ONBOARDING_PROMPTS = [
  { category: 'Tech', query: 'Is the iPhone 16 Pro worth upgrading to?' },
  { category: 'Finance', query: 'Should I invest in index funds or individual stocks?' },
  { category: 'Health', query: 'What\'s the healthiest cooking oil to use daily?' },
  { category: 'Travel', query: 'Is Dubai worth visiting in summer?' },
  { category: 'Home', query: 'Are standing desks actually better for you?' },
  { category: 'News', query: 'What\'s really happening with the US economy right now?' },
]

interface Props {
  existingQueries: string[]
}

export default function HomepageHero({ existingQueries }: Props) {
  const { user, loading } = useUser()
  const router = useRouter()
  const isLoggedIn = !loading && !!user
  const displayName = user?.user_metadata?.full_name ?? null
  const firstName = displayName ? displayName.split(' ')[0] : null

  // Check if this is a first-time user (zero articles)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [checkedFirstTime, setCheckedFirstTime] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) {
      setCheckedFirstTime(true)
      return
    }

    fetch('/api/profile/article-count')
      .then(res => res.json())
      .then(data => {
        if (data.count === 0) setIsFirstTime(true)
        setCheckedFirstTime(true)
      })
      .catch(() => setCheckedFirstTime(true))
  }, [user, loading])

  async function handleOnboardingClick(query: string) {
    if (onboardingLoading) return
    setOnboardingLoading(query)

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error('Failed')
      const { id, slug } = await res.json()
      setPendingArticle(id, slug)
      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}
      router.push(`/article/${id}`)
    } catch {
      setOnboardingLoading(null)
    }
  }

  // Show onboarding hero for first-time logged-in users
  const showOnboarding = isLoggedIn && checkedFirstTime && isFirstTime

  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-16 pb-14">
        {showOnboarding ? (
          // ── Onboarding Hero ──
          <>
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Welcome to Unpacked{firstName ? `, ${firstName}` : ''}
            </h1>
            <p
              className="text-base md:text-lg mb-10 max-w-xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              Ask any question and get a complete, researched article in minutes.
            </p>

            <div className="w-full max-w-2xl">
              <SearchForm />

              <p
                className="text-sm mt-8 mb-4"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}
              >
                Or try one of these to get started
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {ONBOARDING_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.query}
                    onClick={() => handleOnboardingClick(prompt.query)}
                    disabled={!!onboardingLoading}
                    className="rounded-xl p-4 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      cursor: onboardingLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wide block mb-1"
                      style={{ color: '#BA7517' }}
                    >
                      {prompt.category}
                    </span>
                    <span
                      className="text-sm leading-snug block"
                      style={{
                        color: onboardingLoading === prompt.query ? 'var(--accent)' : 'var(--text-primary)',
                        fontFamily: 'var(--font-outfit)',
                      }}
                    >
                      {onboardingLoading === prompt.query ? 'Generating...' : prompt.query}
                    </span>
                  </button>
                ))}
              </div>

              <p
                className="text-center mt-6"
                style={{ fontSize: '13px', color: '#999', fontFamily: 'var(--font-outfit)' }}
              >
                You have 3 free articles this month
              </p>
            </div>
          </>
        ) : isLoggedIn ? (
          // ── Returning User Hero ──
          <>
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-8 max-w-3xl"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Welcome back{displayName ? `, ${displayName.split(' ')[0]}` : ''}.
              <br />
              <span style={{ color: 'var(--accent)' }}>What do you want to know today?</span>
            </h1>
            <div className="w-full max-w-2xl">
              <SearchForm />
              <ExampleChips existingQueries={existingQueries} />
              <UsageIndicator />
              <p className="text-center mt-4" style={{ fontSize: '13px', color: '#999', fontFamily: 'var(--font-outfit)' }}>
                Want to publish under your name?{' '}
                <a href="/creators" className="no-underline hover:opacity-80" style={{ color: '#999', textDecoration: 'underline' }}>
                  Learn how →
                </a>
              </p>
            </div>
          </>
        ) : (
          // ── Logged-Out Hero ──
          <>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 max-w-3xl"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Ask Anything. Get the
              <br />
              <span style={{ color: '#BA7517' }}>Best Answer on the Internet.</span>
            </h1>
            <p
              className="text-lg md:text-xl mb-10 max-w-xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              A complete visual article — researched, fact-checked, and ready in three minutes.
            </p>
            <div className="w-full max-w-2xl">
              <SearchForm />
              <ExampleChips existingQueries={existingQueries} />
              <p className="text-center mt-4" style={{ fontSize: '13px', color: '#999', fontFamily: 'var(--font-outfit)' }}>
                Want to publish under your name?{' '}
                <a href="/creators" className="no-underline hover:opacity-80" style={{ color: '#999', textDecoration: 'underline' }}>
                  Learn how →
                </a>
              </p>
            </div>
          </>
        )}
      </section>

    </>
  )
}
