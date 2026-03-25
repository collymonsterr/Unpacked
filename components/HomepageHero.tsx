'use client'

import { useUser } from '@/hooks/useUser'
import SearchForm from './SearchForm'
import ExampleChips from './ExampleChips'

interface Props {
  existingQueries: string[]
}

export default function HomepageHero({ existingQueries }: Props) {
  const { user, loading } = useUser()
  const isLoggedIn = !loading && !!user
  const displayName = user?.user_metadata?.full_name ?? null

  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-16 pb-14">
        {isLoggedIn ? (
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-8 max-w-3xl"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            Welcome back{displayName ? `, ${displayName.split(' ')[0]}` : ''}.
            <br />
            <span style={{ color: 'var(--accent)' }}>What do you want to know today?</span>
          </h1>
        ) : (
          <>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 max-w-3xl"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              Type a Question
              <br />
              Get a Complete
              <br />
              <span style={{ color: 'var(--accent)' }}>Visual Article</span>
            </h1>
            <p
              className="text-lg md:text-xl mb-10 max-w-xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              Researched from real sources. Written with a clear opinion. Ready in under two minutes.
            </p>
          </>
        )}

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
      </section>

      {/* Feature cards — only for logged-out users */}
      {!isLoggedIn && (
        <section className="w-full max-w-5xl mx-auto px-4 md:px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'var(--accent-light)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3
                className="text-base font-bold mb-1.5"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                Visual, not walls of text
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Beautiful, structured articles with images, charts, and interactive tools.
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'var(--accent-light)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3
                className="text-base font-bold mb-1.5"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                Researched, not generated
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                We research websites, forums, Reddit, and X — real opinions into one article.
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'var(--accent-light)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3
                className="text-base font-bold mb-1.5"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                Verified, not guessed
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Each article is independently verified against real sources by a dedicated agent.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
