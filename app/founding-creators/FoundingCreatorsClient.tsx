'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import { useUser } from '@/hooks/useUser'
import { createBrowserSupabase } from '@/lib/supabase'

type AppStatus = 'loading' | 'not_signed_in' | 'no_application' | 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'full'

export default function FoundingCreatorsClient() {
  const { user, loading: userLoading } = useUser()
  const [appStatus, setAppStatus] = useState<AppStatus>('loading')
  const [approvedCount, setApprovedCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (userLoading) return

    fetch('/api/founding')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) {
          setAppStatus('not_signed_in')
          return
        }
        setApprovedCount(data.approvedCount ?? 0)

        if (!data.isAuthenticated) {
          setAppStatus('not_signed_in')
        } else if (data.approvedCount >= 100 && data.status !== 'approved') {
          setAppStatus(data.status === 'pending' ? 'pending' : 'full')
        } else if (data.status === 'pending') {
          setAppStatus('pending')
        } else if (data.status === 'approved') {
          setAppStatus('approved')
        } else if (data.status === 'rejected') {
          setAppStatus('rejected')
        } else if (data.status === 'waitlisted') {
          setAppStatus('waitlisted')
        } else {
          setAppStatus('no_application')
        }
      })
      .catch(() => setAppStatus('not_signed_in'))
  }, [user, userLoading])

  async function handleApply() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/founding', { method: 'POST' })
      const data = await res.json()
      if (data.status === 'waitlisted') {
        setAppStatus('waitlisted')
      } else {
        setAppStatus('pending')
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignIn() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/founding-creators`,
      },
    })
  }

  async function handleWaitlist() {
    setSubmitting(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'founding_waitlist' }),
      })
      setAppStatus('waitlisted')
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium no-underline hidden sm:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            Home
          </Link>
          <UserMenu />
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pt-12 pb-8 text-center">
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full mb-6"
          style={{
            backgroundColor: '#BA7517',
            color: '#fff',
            fontFamily: 'var(--font-sora)',
          }}
        >
          Founding Creator Programme
        </span>

        <h1
          className="text-3xl md:text-5xl font-extrabold leading-tight mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          We&rsquo;re looking for 100 creators to shape Unpacked from day one
        </h1>

        <p
          className="text-lg md:text-xl leading-relaxed mb-8 max-w-2xl mx-auto"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}
        >
          The best platforms are built alongside the people who use them.
          We want creators who care about the quality of what they publish &mdash;
          and who want a say in how things work.
        </p>

        {/* Counter */}
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-xl mb-10"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-extrabold"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
            >
              {approvedCount}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              of 100 spots filled
            </span>
          </div>
          <div
            className="h-2 w-32 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, approvedCount)}%`,
                backgroundColor: approvedCount >= 100 ? '#dc2626' : '#BA7517',
              }}
            />
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pb-12">
        <h2
          className="text-xl md:text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          What founding creators get
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {[
            {
              title: '10 bonus credits every month',
              desc: 'Permanently. On top of whatever plan you choose. These never go away.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              ),
            },
            {
              title: 'Founding Creator badge',
              desc: 'A permanent badge on every article you publish and on your creator profile.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15l-2 5l-3-1l1 3h8l1-3l-3 1l-2-5z" />
                  <circle cx="12" cy="8" r="7" />
                </svg>
              ),
            },
            {
              title: 'Early access to features',
              desc: 'See and test new features before anyone else. Your feedback directly shapes the roadmap.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ),
            },
            {
              title: 'Direct input',
              desc: 'A direct line to the team. Suggest features, report issues, shape the editorial approach.',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="mb-3">{item.icon}</div>
              <h3
                className="text-sm font-bold mb-1"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* What we're looking for */}
        <h2
          className="text-xl md:text-2xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          What we&rsquo;re looking for
        </h2>
        <p
          className="text-sm leading-relaxed mb-6 max-w-xl"
          style={{ color: 'var(--text-secondary)' }}
        >
          We&rsquo;re not asking for a huge commitment. Just genuine interest
          in creating good content and helping us improve.
        </p>

        <div className="space-y-3 mb-12">
          {[
            'Publish at least 2 articles in your first month',
            'Share at least 1 article externally (social, forums, anywhere)',
            'Give us honest feedback when something could be better',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#BA7517"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 flex-shrink-0"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {appStatus === 'loading' && (
            <div className="flex justify-center py-4">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {appStatus === 'not_signed_in' && (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Sign in with Google to apply
              </p>
              <button
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: '#BA7517',
                  color: '#fff',
                  fontFamily: 'var(--font-sora)',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Apply to become a Founding Creator
              </button>
            </>
          )}

          {appStatus === 'no_application' && (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Ready to join? Applications are reviewed manually by the team.
              </p>
              <button
                onClick={handleApply}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: '#BA7517',
                  color: '#fff',
                  fontFamily: 'var(--font-sora)',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}
              >
                {submitting ? 'Submitting...' : 'Apply'}
              </button>
            </>
          )}

          {appStatus === 'pending' && (
            <>
              <div className="flex justify-center mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-light)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <h3
                className="text-base font-bold mb-2"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                Your application is under review
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                We review applications personally. You&rsquo;ll hear back soon.
                In the meantime, start publishing &mdash; it helps your application.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-sm font-semibold no-underline transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent)' }}
              >
                Write your first article &rarr;
              </Link>
            </>
          )}

          {appStatus === 'approved' && (
            <>
              <div className="flex justify-center mb-3">
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}
                >
                  Founding Creator
                </span>
              </div>
              <h3
                className="text-base font-bold mb-2"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                You&rsquo;re a Founding Creator
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Welcome. Your badge is live and your bonus credits are active.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold no-underline transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: '#BA7517',
                  color: '#fff',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                Start writing &rarr;
              </Link>
            </>
          )}

          {appStatus === 'rejected' && (
            <>
              <h3
                className="text-base font-bold mb-2"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                Applications are currently closed
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Thank you for your interest. Keep publishing great content &mdash;
                we may open more spots in the future.
              </p>
            </>
          )}

          {(appStatus === 'full' || appStatus === 'waitlisted') && (
            <>
              <h3
                className="text-base font-bold mb-2"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                {appStatus === 'waitlisted' ? 'You\u2019re on the waitlist' : 'All 100 spots are filled'}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {appStatus === 'waitlisted'
                  ? 'We\u2019ll let you know if a spot opens up.'
                  : 'Join the waitlist and we\u2019ll notify you if spots open up.'}
              </p>
              {appStatus === 'full' && (
                <button
                  onClick={handleWaitlist}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sora)',
                    border: '1px solid var(--border)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Joining...' : 'Join waitlist'}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 md:px-6 py-8 text-center">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Link href="/" className="no-underline hover:underline" style={{ color: 'var(--text-secondary)' }}>
            unpacked.fyi
          </Link>
        </p>
      </footer>
    </div>
  )
}
