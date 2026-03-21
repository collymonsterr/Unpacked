'use client'

import { useEffect, useState, useMemo } from 'react'
import type { ArticleRow } from '@/types/article'
import ArticleTypeBadge from './ui/ArticleTypeBadge'

interface Props {
  row: ArticleRow
  onReady?: () => void
}

export default function ArticleGenerating({ row, onReady }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [completedMsgs, setCompletedMsgs] = useState<number>(0)
  const [planRevealed, setPlanRevealed] = useState(false)
  const [showEducation, setShowEducation] = useState(false)
  const [articleReady, setArticleReady] = useState(false)

  const plan = row.plan
  const isComplete = row.status === 'complete' || row.status === 'verified'

  // Check if user is new (fewer than 3 articles generated)
  const isNewUser = useMemo(() => {
    if (typeof window === 'undefined') return true
    try {
      return parseInt(localStorage.getItem('articles_generated') ?? '0', 10) < 3
    } catch {
      return true
    }
  }, [])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // When plan arrives, trigger reveal animation
  useEffect(() => {
    if (plan && !planRevealed) {
      const timer = setTimeout(() => setPlanRevealed(true), 300)
      return () => clearTimeout(timer)
    }
  }, [plan, planRevealed])

  // Show education card after plan reveals
  useEffect(() => {
    if (planRevealed && isNewUser) {
      const timer = setTimeout(() => setShowEducation(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [planRevealed, isNewUser])

  // Build status messages from plan data
  const messages = useMemo(() => {
    if (!plan) return []
    const msgs: string[] = []

    // Use AI-generated loading_messages if available
    if (plan.loading_messages?.length) {
      msgs.push(...plan.loading_messages)
    } else {
      // Fallback: build from research_queries + entities
      for (const q of plan.research_queries ?? []) {
        msgs.push(`Researching: ${q}`)
      }
      for (const e of (plan.entities ?? []).slice(0, 3)) {
        msgs.push(`Looking up ${e.name}...`)
      }
    }

    // Always end with these
    msgs.push('Forming an editorial opinion...')
    msgs.push('Writing your article — the good part...')

    return msgs
  }, [plan])

  // Progress messages on a timer — evenly paced across expected 120s
  useEffect(() => {
    if (!plan || messages.length === 0 || isComplete) return

    const interval = Math.max(8, Math.floor(120 / messages.length))
    const timer = setInterval(() => {
      setCompletedMsgs(prev => {
        if (prev < messages.length - 1) return prev + 1
        return prev
      })
    }, interval * 1000)

    return () => clearInterval(timer)
  }, [plan, messages.length, isComplete])

  // When article is ready, show final message then trigger transition
  useEffect(() => {
    if (isComplete && !articleReady) {
      setCompletedMsgs(messages.length) // Complete all messages
      setArticleReady(true)
      const timer = setTimeout(() => onReady?.(), 1200)
      return () => clearTimeout(timer)
    }
  }, [isComplete, articleReady, messages.length, onReady])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
    : `${seconds}s`

  return (
    <div className="max-w-[700px] mx-auto px-4 md:px-6 py-12">

      {/* Phase A: Pre-plan — "We're building your article" */}
      {!plan && (
        <div className="text-center py-16 generation-fade-in">
          <div className="mb-6">
            <PulsingIcon />
          </div>
          <h1
            className="text-2xl md:text-3xl font-extrabold mb-3"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            We&apos;re researching your article
          </h1>
          <p
            className="text-base md:text-lg mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            We&apos;re searching the web, reading reviews, checking Reddit, and writing something worth reading.
          </p>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            This usually takes 2–3 minutes — go grab a coffee ☕
          </p>
          <p
            className="text-sm mt-6"
            style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
          >
            &ldquo;{row.query}&rdquo;
          </p>
        </div>
      )}

      {/* Phase A continued: Plan revealed */}
      {plan && (
        <div className={planRevealed ? 'generation-fade-in' : 'opacity-0'}>
          {/* Title + badge */}
          <div className="mb-6">
            <div className="mb-2">
              <ArticleTypeBadge type={plan.article_type} />
            </div>
            <h1
              className="text-2xl md:text-3xl font-extrabold leading-tight"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {plan.title}
            </h1>
          </div>

          {/* Entities — what we're researching */}
          {plan.entities.length > 0 && (
            <div className="mb-5">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Researching
              </p>
              <div className="flex flex-wrap gap-2">
                {plan.entities.map((entity, i) => (
                  <span
                    key={entity.name}
                    className="px-3 py-1 rounded-full text-sm font-medium generation-stagger"
                    style={{
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent)',
                      animationDelay: `${i * 150}ms`,
                    }}
                  >
                    {entity.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sections outline */}
          <div className="mb-6">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Building
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.sections_outline.map((section, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-lg generation-stagger"
                  style={{
                    backgroundColor: 'var(--card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    animationDelay: `${(plan.entities.length + i) * 100 + 300}ms`,
                  }}
                >
                  {section}
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} className="mb-6" />

          {/* Phase B: Stacking status messages */}
          <div className="space-y-2.5 mb-6">
            {messages.slice(0, completedMsgs + 1).map((msg, i) => {
              const isDone = i < completedMsgs
              const isCurrent = i === completedMsgs && !articleReady

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 generation-fade-in"
                  style={{ animationDelay: '0ms' }}
                >
                  {isDone || articleReady ? (
                    <span className="flex-shrink-0 check-pop">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  ) : isCurrent ? (
                    <span className="flex-shrink-0">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                      />
                    </span>
                  ) : null}
                  <span
                    className="text-sm"
                    style={{
                      color: isDone ? 'var(--text-secondary)' : isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isCurrent ? 500 : 400,
                    }}
                  >
                    {msg}
                  </span>
                </div>
              )
            })}

            {/* "Your article is ready!" */}
            {articleReady && (
              <div className="flex items-center gap-3 generation-fade-in mt-4">
                <span className="flex-shrink-0 check-pop">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <span
                  className="text-base font-bold"
                  style={{ color: '#16a34a', fontFamily: 'var(--font-sora)' }}
                >
                  Your article is ready!
                </span>
              </div>
            )}

            {/* Timeout warning */}
            {elapsed > 180 && !isComplete && (
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>
                  Taking longer than expected
                </p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Complex topics sometimes need a bit more time. You can wait or try again.
                </p>
                <div className="flex gap-2">
                  <a
                    href="/"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    Go home
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Education card — only for new users */}
          {showEducation && !articleReady && (
            <div
              className="rounded-xl p-5 generation-fade-in"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <p
                className="text-sm font-bold mb-3"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                While you wait — here&apos;s what you can do once it&apos;s ready:
              </p>
              <ul className="space-y-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">✏️</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Rewrite or refine</strong> — change the tone, rewrite a section, or shift the whole angle.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">🖼️</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Swap out images</strong> — click the refresh icon on any image to pull a different one.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">🔄</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Spin off a new article</strong> — use the suggestion chips to explore related topics.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">✅</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Independently fact-checked</strong> — a second AI verifies all prices, specs, and claims.</span>
                </li>
              </ul>
            </div>
          )}

          {/* Elapsed timer */}
          <div className="text-center mt-8">
            <span
              className="text-xs font-mono tabular-nums"
              style={{ color: 'var(--text-secondary)', opacity: 0.4 }}
            >
              {timeStr}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function PulsingIcon() {
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
      style={{ backgroundColor: 'var(--accent-light)' }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-pulse"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </div>
  )
}
