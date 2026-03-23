'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import type { ArticleRow } from '@/types/article'
import ArticleTypeBadge from './ui/ArticleTypeBadge'
import SignInNudge from './ui/SignInNudge'
import { useUser } from '@/hooks/useUser'

interface Props {
  row: ArticleRow
  onReady?: () => void
  timedOut?: boolean
  onRetry?: () => void
  onStartOver?: () => void
}

// Fun messages shown immediately while plan is loading
const PRE_PLAN_MESSAGES = [
  { text: 'Analysing your query...', delay: 0 },
  { text: 'Searching the internet for answers...', delay: 2000 },
  { text: 'Browsing review sites and expert opinions...', delay: 4500 },
  { text: 'Doom-scrolling Reddit for the real takes...', delay: 7000 },
  { text: 'Checking what Twitter/X has to say...', delay: 9500 },
  { text: 'Consulting with the AI hive mind...', delay: 12000 },
  { text: 'Separating the good advice from the noise...', delay: 14500 },
]

export default function ArticleGenerating({ row, onReady, timedOut, onRetry, onStartOver }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [prePlanMsgCount, setPrePlanMsgCount] = useState(1)
  const [completedMsgs, setCompletedMsgs] = useState(0)
  const [planRevealed, setPlanRevealed] = useState(false)
  const [showEducation, setShowEducation] = useState(false)
  const [showStructure, setShowStructure] = useState(false)
  const [articleReady, setArticleReady] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const readyFired = useRef(false)
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { user } = useUser()

  const plan = row.plan
  const isComplete = row.status === 'complete' || row.status === 'verified'

  const isNewUser = useMemo(() => {
    if (typeof window === 'undefined') return true
    try {
      // Show education card for users with fewer than 10 articles
      // (keeps showing until they're clearly a power user)
      return parseInt(localStorage.getItem('articles_generated') ?? '0', 10) < 10
    } catch { return true }
  }, [])

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Pre-plan: stack fun messages
  useEffect(() => {
    if (plan) return
    const timers = PRE_PLAN_MESSAGES.map((msg, i) => {
      if (i === 0) return null
      return setTimeout(() => setPrePlanMsgCount(i + 1), msg.delay)
    })
    return () => timers.forEach(t => t && clearTimeout(t))
  }, [plan])

  // When plan arrives, reveal
  useEffect(() => {
    if (plan && !planRevealed) {
      const timer = setTimeout(() => setPlanRevealed(true), 300)
      return () => clearTimeout(timer)
    }
  }, [plan, planRevealed])

  // Show education card after a short delay
  useEffect(() => {
    if (planRevealed && isNewUser) {
      const timer = setTimeout(() => setShowEducation(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [planRevealed, isNewUser])

  // Show sign-in nudge ~45s in
  useEffect(() => {
    if (user || !planRevealed) return
    const timer = setTimeout(() => setShowSignIn(true), 40000)
    return () => clearTimeout(timer)
  }, [user, planRevealed])

  // Build post-plan status messages — aim for 15-20 to fill a 2-3 min wait
  const messages = useMemo(() => {
    if (!plan) return []
    const msgs: string[] = []

    // Start with AI-generated loading messages
    if (plan.loading_messages?.length) {
      msgs.push(...plan.loading_messages)
    }

    // Add entity-specific messages
    for (const e of plan.entities ?? []) {
      msgs.push(`Looking up ${e.name}...`)
    }

    // Add research query messages
    for (const q of plan.research_queries ?? []) {
      if (!msgs.some(m => m.includes(q))) {
        msgs.push(`Researching: ${q}`)
      }
    }

    // Pad with generic-but-relevant messages to reach 15+
    const padding = [
      'Cross-referencing sources for accuracy...',
      'Reading expert reviews and opinions...',
      'Checking Reddit for real user experiences...',
      'Comparing data across multiple sources...',
      'Building data visualisations...',
      'Structuring the article for clarity...',
      'Finding the best images...',
      'Deciding what deserves the top spot...',
      'Writing the verdict...',
      'Formatting charts and comparison tables...',
      'Adding editorial commentary...',
      'Polishing the final draft...',
    ]

    let padIdx = 0
    while (msgs.length < 15 && padIdx < padding.length) {
      msgs.push(padding[padIdx++])
    }

    // Always end with these
    msgs.push('Forming an editorial opinion...')
    msgs.push('Writing your article — almost there...')

    return msgs
  }, [plan])

  // Tick messages using setInterval — immune to polling re-renders
  // The key insight: useEffect cleanup runs when deps change, which kills setTimeout timers.
  // Polling updates `plan` reference every 2.5s, so setTimeout-based approaches break.
  // setInterval with a ref guard ensures we only create one interval, ever.
  useEffect(() => {
    if (!plan || messages.length === 0) return
    // Don't start a second interval
    if (messageIntervalRef.current) return

    // Show first 3 immediately
    setCompletedMsgs(3)

    // Tick one message every 5 seconds (fills ~80s with 17 messages)
    const totalMsgs = messages.length
    messageIntervalRef.current = setInterval(() => {
      setCompletedMsgs(prev => {
        const next = prev + 1
        // Stop interval when all messages shown
        if (next >= totalMsgs) {
          if (messageIntervalRef.current) {
            clearInterval(messageIntervalRef.current)
            messageIntervalRef.current = null
          }
        }
        return next
      })
    }, 5000)

    // Cleanup only on unmount
    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current)
        messageIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!plan, messages.length])

  // When article ready — trigger transition
  const triggerReady = useCallback(() => {
    if (readyFired.current) return
    readyFired.current = true
    setCompletedMsgs(999)
    setArticleReady(true)
    setTimeout(() => onReady?.(), 1500)
  }, [onReady])

  useEffect(() => {
    if (isComplete && !readyFired.current) triggerReady()
  }, [isComplete, triggerReady])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
    : `${seconds}s`

  return (
    <div className="max-w-[700px] mx-auto px-4 md:px-6 py-12">

      {/* ══════════════════════════════════════════════════════════════════
          PRE-PLAN: Before we know anything about the article
          ══════════════════════════════════════════════════════════════════ */}
      {!plan && (
        <div className="py-8">
          <div className="text-center mb-8">
            <div className="mb-5"><PulsingIcon /></div>
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

          <div className="space-y-2.5 max-w-md mx-auto">
            {PRE_PLAN_MESSAGES.slice(0, prePlanMsgCount).map((msg, i) => (
              <StatusMessage key={i} text={msg.text} done={i < prePlanMsgCount - 1} current={i === prePlanMsgCount - 1} />
            ))}
          </div>

          <Timer timeStr={timeStr} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          POST-PLAN: We know what we're building
          ORDER: 1. Title  2. Status messages  3. Education  4. Sign-in  5. Structure
          ══════════════════════════════════════════════════════════════════ */}
      {plan && (
        <div className={planRevealed ? 'generation-fade-in' : 'opacity-0'}>

          {/* ─── 1. TITLE + BADGE ─── */}
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

          {/* ─── 2. LIVE STATUS MESSAGES (most important — directly under title) ─── */}
          <div className="space-y-2.5 mb-6">
            {messages.slice(0, completedMsgs + 1).map((msg, i) => (
              <StatusMessage
                key={i}
                text={msg}
                done={i < completedMsgs || articleReady}
                current={i === completedMsgs && !articleReady}
              />
            ))}

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

            {elapsed > 180 && !isComplete && (
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #f0d5be' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>Taking longer than expected</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Complex topics sometimes need a bit more time. Hang tight or head home.</p>
                <a href="/" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Go home</a>
              </div>
            )}
          </div>

          {/* ─── 3. EDUCATION CARD ─── */}
          {showEducation && !articleReady && (
            <div
              className="rounded-xl p-5 mb-4 generation-fade-in"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <p className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
                Did you know? Once your article is ready, you can make it yours:
              </p>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0">🖼️</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Pick your own images</strong> — AI doesn&apos;t always find the perfect photo. Click any image to pick another.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0">✏️</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Rewrite anything</strong> — adjust a single section or the whole article. Change the tone, length, or angle.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0">📊</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Explore further</strong> — at the bottom of your article, you&apos;ll find suggestions to refine or spin off something new.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0">✅</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Independently fact-checked</strong> — a second AI verifies every price, spec, and claim against live sources.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0">💰</span>
                  <span><strong style={{ color: 'var(--text-primary)' }}>Earn from your articles</strong> — coming soon: affiliate links on every product recommendation. Share your article, and earn when readers buy.</span>
                </li>
              </ul>
            </div>
          )}

          {/* ─── 4. SIGN-IN NUDGE ─── */}
          {showSignIn && !articleReady && (
            <div className="mb-4">
              <SignInNudge user={user} articleId={row.id} />
            </div>
          )}

          {/* ─── 5. ARTICLE STRUCTURE (quiet, at the bottom) ─── */}
          {(plan.entities.length > 0 || plan.sections_outline.length > 0) && !articleReady && (
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowStructure(!showStructure)}
                className="flex items-center gap-1.5 text-xs font-medium mb-2"
                style={{ color: 'var(--text-secondary)', opacity: 0.6, cursor: 'pointer' }}
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: showStructure ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                See article structure
              </button>

              {showStructure && (
                <div className="generation-fade-in space-y-3">
                  {plan.entities.length > 0 && (
                    <div>
                      <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                        Topics we&apos;re covering
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.entities.map((entity) => (
                          <span
                            key={entity.name}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                          >
                            {entity.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                      Article sections
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.sections_outline.map((section, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Timer timeStr={timeStr} />
        </div>
      )}

      {/* Timeout state */}
      {timedOut && (
        <div className="py-12 text-center max-w-md mx-auto">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'var(--accent-light)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            Taking longer than expected
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Your article might still be generating. You can check if it&apos;s ready or start fresh.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onRetry}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontFamily: 'var(--font-sora)',
                cursor: 'pointer',
              }}
            >
              Check again
            </button>
            <button
              onClick={onStartOver}
              className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-sora)',
                cursor: 'pointer',
              }}
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function StatusMessage({ text, done, current }: { text: string; done: boolean; current: boolean }) {
  return (
    <div className="flex items-center gap-3 generation-fade-in">
      {done ? (
        <span className="flex-shrink-0 check-pop">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      ) : current ? (
        <div
          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      ) : null}
      <span
        className="text-sm"
        style={{
          color: done ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontWeight: current ? 500 : 400,
        }}
      >
        {text}
      </span>
    </div>
  )
}

function Timer({ timeStr }: { timeStr: string }) {
  return (
    <div className="text-center mt-6">
      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>
        {timeStr}
      </span>
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
