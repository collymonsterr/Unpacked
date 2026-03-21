'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import type { ArticleRow } from '@/types/article'
import ArticleTypeBadge from './ui/ArticleTypeBadge'
import SignInNudge from './ui/SignInNudge'
import { useUser } from '@/hooks/useUser'

interface Props {
  row: ArticleRow
  onReady?: () => void
}

// Fun, personality-driven messages shown immediately while plan is loading
const PRE_PLAN_MESSAGES = [
  { text: 'Analysing your query...', delay: 0 },
  { text: 'Searching the internet for answers...', delay: 2000 },
  { text: 'Browsing review sites and expert opinions...', delay: 4500 },
  { text: 'Doom-scrolling Reddit for real opinions...', delay: 7000 },
  { text: 'Checking what Twitter/X has to say...', delay: 9500 },
  { text: 'Consulting with the AI hive mind...', delay: 12000 },
  { text: 'Separating the good advice from the noise...', delay: 14500 },
]

export default function ArticleGenerating({ row, onReady }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [prePlanMsgCount, setPrePlanMsgCount] = useState(1)
  const [completedMsgs, setCompletedMsgs] = useState(0)
  const [planRevealed, setPlanRevealed] = useState(false)
  const [showEducation, setShowEducation] = useState(false)
  const [articleReady, setArticleReady] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const readyFired = useRef(false)
  const { user } = useUser()

  const plan = row.plan
  const isComplete = row.status === 'complete' || row.status === 'verified'

  // Check if user is new
  const isNewUser = useMemo(() => {
    if (typeof window === 'undefined') return true
    try {
      return parseInt(localStorage.getItem('articles_generated') ?? '0', 10) < 3
    } catch { return true }
  }, [])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Pre-plan: stack fun messages on a timer
  useEffect(() => {
    if (plan) return // Stop once plan arrives
    const timers = PRE_PLAN_MESSAGES.map((msg, i) => {
      if (i === 0) return null // First one shows immediately
      return setTimeout(() => setPrePlanMsgCount(i + 1), msg.delay)
    })
    return () => timers.forEach(t => t && clearTimeout(t))
  }, [plan])

  // When plan arrives, trigger reveal
  useEffect(() => {
    if (plan && !planRevealed) {
      const timer = setTimeout(() => setPlanRevealed(true), 300)
      return () => clearTimeout(timer)
    }
  }, [plan, planRevealed])

  // Show education card
  useEffect(() => {
    if (planRevealed && isNewUser) {
      const timer = setTimeout(() => setShowEducation(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [planRevealed, isNewUser])

  // Show sign-in nudge ~45s in (only if not signed in)
  useEffect(() => {
    if (user || !planRevealed) return
    const timer = setTimeout(() => setShowSignIn(true), 40000)
    return () => clearTimeout(timer)
  }, [user, planRevealed])

  // Build post-plan status messages
  const messages = useMemo(() => {
    if (!plan) return []
    const msgs: string[] = []
    if (plan.loading_messages?.length) {
      msgs.push(...plan.loading_messages)
    } else {
      for (const q of plan.research_queries ?? []) msgs.push(`Researching: ${q}`)
      for (const e of (plan.entities ?? []).slice(0, 3)) msgs.push(`Looking up ${e.name}...`)
    }
    msgs.push('Forming an editorial opinion...')
    msgs.push('Writing your article — the good part...')
    return msgs
  }, [plan])

  // Progress messages paced evenly across ~120s
  useEffect(() => {
    if (!plan || messages.length === 0 || isComplete) return
    const interval = Math.max(8, Math.floor(120 / messages.length))
    const timer = setInterval(() => {
      setCompletedMsgs(prev => prev < messages.length - 1 ? prev + 1 : prev)
    }, interval * 1000)
    return () => clearInterval(timer)
  }, [plan, messages.length, isComplete])

  // When article is ready — trigger transition
  const triggerReady = useCallback(() => {
    if (readyFired.current) return
    readyFired.current = true
    setCompletedMsgs(999) // Mark all messages done
    setArticleReady(true)
    setTimeout(() => onReady?.(), 1500)
  }, [onReady])

  useEffect(() => {
    if (isComplete && !readyFired.current) {
      triggerReady()
    }
  }, [isComplete, triggerReady])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
    : `${seconds}s`

  return (
    <div className="max-w-[700px] mx-auto px-4 md:px-6 py-12">

      {/* ── PRE-PLAN: Fun stacking messages ── */}
      {!plan && (
        <div className="py-8">
          <div className="text-center mb-8">
            <div className="mb-5">
              <PulsingIcon />
            </div>
            <h1
              className="text-2xl md:text-3xl font-extrabold mb-2"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              We&apos;re researching your article
            </h1>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              This usually takes 2–3 minutes.
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              Go grab a coffee ☕
            </p>
          </div>

          {/* Stacking pre-plan messages */}
          <div className="space-y-2.5 max-w-md mx-auto">
            {PRE_PLAN_MESSAGES.slice(0, prePlanMsgCount).map((msg, i) => {
              const isLatest = i === prePlanMsgCount - 1
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 generation-fade-in"
                >
                  {isLatest ? (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <span className="flex-shrink-0 check-pop">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                  <span
                    className="text-sm"
                    style={{
                      color: isLatest ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isLatest ? 500 : 400,
                    }}
                  >
                    {msg.text}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="text-center mt-6">
            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>
              {timeStr}
            </span>
          </div>
        </div>
      )}

      {/* ── POST-PLAN: Title + entities + stacking messages ── */}
      {plan && (
        <div className={planRevealed ? 'generation-fade-in' : 'opacity-0'}>
          {/* Title + badge */}
          <div className="mb-5">
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

          {/* Entities */}
          {plan.entities.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
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
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                    animationDelay: `${(plan.entities.length + i) * 80 + 300}ms`,
                  }}
                >
                  {section}
                </span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} className="mb-5" />

          {/* Stacking status messages */}
          <div className="space-y-2.5 mb-6">
            {messages.slice(0, completedMsgs + 1).map((msg, i) => {
              const isDone = i < completedMsgs || articleReady
              const isCurrent = i === completedMsgs && !articleReady

              return (
                <div key={i} className="flex items-center gap-3 generation-fade-in">
                  {isDone ? (
                    <span className="flex-shrink-0 check-pop">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  ) : isCurrent ? (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                    />
                  ) : null}
                  <span
                    className="text-sm"
                    style={{
                      color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontWeight: isCurrent ? 500 : 400,
                    }}
                  >
                    {msg}
                  </span>
                </div>
              )
            })}

            {/* Article ready! */}
            {articleReady && (
              <div className="flex items-center gap-3 generation-fade-in mt-3">
                <span className="flex-shrink-0 check-pop">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <span className="text-base font-bold" style={{ color: '#16a34a', fontFamily: 'var(--font-sora)' }}>
                  Your article is ready!
                </span>
              </div>
            )}

            {/* Timeout */}
            {elapsed > 180 && !isComplete && (
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                  Taking longer than expected
                </p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Complex topics sometimes need a bit more time. Hang tight or head home.
                </p>
                <a href="/" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  Go home
                </a>
              </div>
            )}
          </div>

          {/* Education card */}
          {showEducation && !articleReady && (
            <div
              className="rounded-xl p-5 generation-fade-in"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <p className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
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
                  <span><strong style={{ color: 'var(--text-primary)' }}>Independently fact-checked</strong> — a second AI verifies prices, specs, and claims.</span>
                </li>
              </ul>
            </div>
          )}

          {/* Sign-in nudge — only for unauthenticated users, after ~45s */}
          {showSignIn && !articleReady && (
            <div className="mt-4">
              <SignInNudge user={user} articleId={row.id} />
            </div>
          )}

          {/* Timer */}
          <div className="text-center mt-6">
            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>
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
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--accent-light)' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </div>
  )
}
