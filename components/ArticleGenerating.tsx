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

  // Article-type-aware message sets — each tells the research → analysis → writing → finishing story
  const TYPE_MESSAGES: Record<string, string[]> = {
    buyer_guide: [
      'Pulling from multiple expert sources and review sites...',
      'Checking real user sentiment on Reddit and forums...',
      'Filtering out sponsored content and outdated information...',
      'Comparing specs, performance data, and pricing across options...',
      'Looking for consistent patterns across independent sources...',
      'Identifying where the experts agree — and where they don\'t...',
      'Narrowing down the real contenders from the noise...',
      'Working out which option deserves the top recommendation...',
      'Writing the main sections and product breakdowns...',
      'Assembling data tables and interactive charts...',
      'Adding pricing and availability data...',
      'Writing the verdict...',
      'Fact-checking everything before it reaches you...',
      'Almost there...',
    ],
    comparison: [
      'Researching both options in depth...',
      'Pulling real user experiences from Reddit and review sites...',
      'Mapping out each option\'s strengths and weaknesses...',
      'Finding the edge cases and common complaints...',
      'Checking where expert consensus lands...',
      'Identifying the key trade-offs that actually matter...',
      'Working out which type of person should choose each one...',
      'Writing the head-to-head breakdown...',
      'Assembling the comparison tables...',
      'Fact-checking everything before it reaches you...',
      'Writing the verdict...',
      'Almost there...',
    ],
    explainer: [
      'Researching the background on this topic...',
      'Finding the most authoritative and reliable sources...',
      'Checking for recent developments or updates...',
      'Looking for the clearest explanations and real-world examples...',
      'Breaking the complexity down into logical sections...',
      'Building the structure...',
      'Writing the explanations...',
      'Adding examples and supporting detail...',
      'Fact-checking everything before it reaches you...',
      'Almost there...',
    ],
    news: [
      'Pulling in the latest reporting on this...',
      'Cross-referencing multiple sources for accuracy...',
      'Checking what\'s confirmed versus what\'s still speculation...',
      'Looking at expert reaction and analysis...',
      'Building the timeline of what happened...',
      'Writing the analysis...',
      'Fact-checking everything before it reaches you...',
      'Almost there...',
    ],
    decision_guide: [
      'Pulling from multiple expert sources and review sites...',
      'Checking real user sentiment on Reddit and forums...',
      'Comparing the key factors in this decision...',
      'Looking at real-world experiences from people who\'ve been here...',
      'Identifying what matters most for your specific situation...',
      'Working out the clear recommendation...',
      'Writing the breakdown with all the trade-offs...',
      'Assembling data tables and comparison tools...',
      'Adding pricing and practical details...',
      'Writing the verdict...',
      'Fact-checking everything before it reaches you...',
      'Almost there...',
    ],
    default: [
      'Casting a wide net across sources and databases...',
      'Filtering for quality, relevance, and recency...',
      'Checking community recommendations on Reddit and forums...',
      'Cross-referencing what experts and real users say...',
      'Grouping and organising the strongest findings...',
      'Building the article structure...',
      'Writing the main sections...',
      'Adding the key details and supporting data...',
      'Writing the verdict...',
      'Fact-checking everything before it reaches you...',
      'Almost there...',
    ],
  }

  // Three "long tail" messages shown after the main sequence — at 20s intervals
  const TAIL_MESSAGES = [
    'Still working — complex topics take a little longer...',
    'Almost there — just finishing up the final checks...',
    'Just another minute or so — nearly ready...',
  ]

  // Select message set based on article type, append tail messages
  const messages = useMemo(() => {
    if (!plan) return []
    const articleType = plan.article_type ?? 'default'
    const typeKey = TYPE_MESSAGES[articleType] ? articleType : 'default'
    return [...TYPE_MESSAGES[typeKey], ...TAIL_MESSAGES]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!plan, plan?.article_type])

  // Tick messages: 15s for main sequence, then 20s for tail messages
  // With 14 main msgs at 15s + 3 tail at 20s = ~210s + 60s = ~4.5 min coverage
  useEffect(() => {
    if (!plan || messages.length === 0) return
    if (messageIntervalRef.current) return

    // Show first 2 immediately
    setCompletedMsgs(2)

    const mainCount = messages.length - TAIL_MESSAGES.length
    const totalMsgs = messages.length

    // Start with 15s interval for main messages
    messageIntervalRef.current = setInterval(() => {
      setCompletedMsgs(prev => {
        const next = prev + 1

        // Switch to 20s interval when entering the tail messages
        if (next === mainCount && messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current)
          messageIntervalRef.current = setInterval(() => {
            setCompletedMsgs(p => {
              const n = p + 1
              if (n >= totalMsgs) {
                if (messageIntervalRef.current) {
                  clearInterval(messageIntervalRef.current)
                  messageIntervalRef.current = null
                }
              }
              return n
            })
          }, 20000)
        }

        // Stop if we somehow exceed total
        if (next >= totalMsgs) {
          if (messageIntervalRef.current) {
            clearInterval(messageIntervalRef.current)
            messageIntervalRef.current = null
          }
        }
        return next
      })
    }, 15000)

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current)
        messageIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!plan, messages.length])

  // When article ready — fast-forward remaining messages then transition
  const triggerReady = useCallback(() => {
    if (readyFired.current) return
    readyFired.current = true

    // Clear the normal interval
    if (messageIntervalRef.current) {
      clearInterval(messageIntervalRef.current)
      messageIntervalRef.current = null
    }

    // Fast-forward: tick remaining messages at 300ms each
    const total = messages.length
    const fastForward = setInterval(() => {
      setCompletedMsgs(prev => {
        if (prev >= total) {
          clearInterval(fastForward)
          setArticleReady(true)
          setTimeout(() => onReady?.(), 1000)
          return prev
        }
        return prev + 1
      })
    }, 300)
  }, [onReady, messages.length])

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

          {/* ─── 1. TITLE + BADGE + STATIC SUBTITLE ─── */}
          <div className="mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="mb-2">
              <ArticleTypeBadge type={plan.article_type} />
            </div>
            <h1
              className="text-2xl md:text-3xl font-extrabold leading-tight mb-2"
              style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
            >
              {plan.title}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Real research. Multiple sources. A proper article — not just an AI summary.
            </p>
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
