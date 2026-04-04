'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'
import { DEFAULT_OPTIONS, type GenerationOptions } from '@/components/ArticleOptions'
import { setPendingArticle } from '@/lib/pending-article'
import { useUser } from '@/hooks/useUser'

// Article type display names
const TYPE_LABELS: Record<string, string> = {
  buyer_guide: 'Buyer guide — picking a winner',
  comparison: 'Head-to-head comparison',
  explainer: 'Explainer',
  decision_guide: 'Decision guide',
  how_to: 'How-to guide',
  roundup: 'Roundup',
  news_analysis: 'News analysis',
  trend_analysis: 'Trend analysis',
  breaking_news: 'Breaking news',
  deep_dive: 'Deep dive',
}

// Loading messages
const PLAN_MESSAGES = [
  'Researching your question...',
  'Searching real sources...',
  'Checking Reddit discussions...',
  'Pulling live data...',
  'Synthesising findings...',
]

interface PlanFinding {
  claim: string
  source: string
  source_url?: string
  relevance?: number
}

interface PlanSource {
  title: string
  url: string
}

interface PlanData {
  plan: {
    title: string
    article_type: string
    category?: string
    sections_outline: string[]
    opinion_elements?: {
      controversial_take?: string
      misunderstanding?: string
      prediction?: string
      winner_and_loser?: { winner: string; loser: string; why: string }
    }
    quick_verdict_preview?: string
    research_manifest?: unknown
    suggestion_chips?: string[]
  }
  research: {
    summary: string
    findings: PlanFinding[]
    entityCards: Array<{ canonical_name: string; type: string; facts: Array<{ claim: string; source: string }> }>
    synthesis: {
      thesis_direction: string
      likely_winner: string | null
      caveats: string[]
      community_sentiment_summary: string
      key_data_points: string[]
    }
    liveData: unknown[]
    sources: PlanSource[]
    redditThreads: Array<{ title: string; url: string; subreddit: string }>
  }
  timing: { plan_ms: number; research_ms: number }
}

/** Pick 3 diverse findings — prefer different source domains */
function pickDiverseFindings(findings: PlanFinding[]): PlanFinding[] {
  if (findings.length <= 3) return findings.slice(0, 3)

  const picked: PlanFinding[] = []
  const seenDomains = new Set<string>()

  for (const f of findings) {
    if (picked.length >= 3) break
    // Extract domain from source string
    const domain = f.source.replace(/^via\s+/i, '').split('/')[0].toLowerCase()
    if (!seenDomains.has(domain)) {
      picked.push(f)
      seenDomains.add(domain)
    }
  }

  // Fill remaining slots if we couldn't get 3 unique domains
  if (picked.length < 3) {
    for (const f of findings) {
      if (picked.length >= 3) break
      if (!picked.includes(f)) picked.push(f)
    }
  }

  return picked
}

// ── Option pill selector ──
function OptionPills({ label, options, value, onChange }: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)', minWidth: '50px' }}>
        {label}
      </span>
      <div className="flex gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="text-xs font-medium px-3 py-1.5 transition-all"
            style={{
              borderRadius: '8px',
              backgroundColor: value === opt.value ? '#BA7517' : '#EDECEA',
              color: value === opt.value ? '#fff' : '#5F5E5A',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PlanPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useUser()
  const query = searchParams.get('q') ?? ''

  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'writing'>('loading')
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMsgCount, setLoadingMsgCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [length, setLength] = useState<string>('standard')
  const [tone, setTone] = useState<string>('opinionated')
  const [retryCount, setRetryCount] = useState(0)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchedRef = useRef(false)

  // Redirect if no query
  useEffect(() => {
    if (!query) router.replace('/')
  }, [query, router])

  // Auth gate — redirect to sign-in if not authenticated
  useEffect(() => {
    if (authLoading || !query) return
    if (!user) {
      // Redirect to Google OAuth, then back to this page
      const returnUrl = `/plan?q=${encodeURIComponent(query)}`
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
      window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`
    }
  }, [user, authLoading, query])

  // Fetch plan + research (only when authenticated)
  useEffect(() => {
    if (!query || fetchedRef.current || authLoading || !user) return
    fetchedRef.current = true

    async function fetchPlan() {
      try {
        const res = await fetch('/api/articles/plan-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })

        if (!res.ok) {
          const data = await res.json()
          if (data.error === 'auth_required') {
            // Shouldn't happen since we gate above, but handle gracefully
            router.push('/')
            return
          }
          throw new Error(data.error ?? 'Failed to generate plan')
        }

        const data = await res.json()
        setPlanData(data)
        setStatus('ready')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setStatus('error')
      }
    }

    fetchPlan()
  }, [query, retryCount, authLoading, user, router])

  // Loading message ticker
  useEffect(() => {
    if (status !== 'loading') {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
      return
    }

    setLoadingMsgCount(1)
    loadingIntervalRef.current = setInterval(() => {
      setLoadingMsgCount(prev => {
        const next = prev + 1
        if (next >= PLAN_MESSAGES.length) {
          if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current)
            loadingIntervalRef.current = null
          }
        }
        return Math.min(next, PLAN_MESSAGES.length)
      })
    }, 4000)

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
    }
  }, [status])

  // "Write it" handler
  async function handleWriteIt() {
    if (!planData) return
    setStatus('writing')

    const options: GenerationOptions = {
      length: length as 'quick' | 'standard' | 'deep',
      tone: tone as 'opinionated' | 'balanced' | 'casual',
      visual: 'standard',
    }

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          options,
          planData: {
            plan: planData.plan,
            research: planData.research,
            userFeedback: feedback.trim() || undefined,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create article')
      }

      const data = await res.json()

      if (data.cached) {
        router.push(`/article/${data.slug}`)
        return
      }

      const { id, slug } = data
      setPendingArticle(id, slug)
      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}
      try {
        const count = parseInt(localStorage.getItem('articles_generated') ?? '0', 10)
        localStorage.setItem('articles_generated', String(count + 1))
      } catch {}

      router.push(`/article/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('ready')
    }
  }

  if (!query) return null

  // Show nothing while auth is loading (will redirect if needed)
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const totalSources = planData
    ? planData.research.sources.length + planData.research.redditThreads.length
    : 0

  const diverseFindings = planData ? pickDiverseFindings(planData.research.findings) : []

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-10 pb-20">
        {/* Query display */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
            Your question
          </p>
          <h1
            className="text-xl md:text-2xl font-bold leading-snug"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            {query}
          </h1>
        </div>

        {/* ── Loading state ── */}
        {status === 'loading' && (
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="w-48 h-1 rounded-full overflow-hidden mx-auto mb-6"
              style={{ backgroundColor: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: 'var(--accent)',
                  animation: 'planLoadingSlide 1.8s ease-in-out infinite',
                }}
              />
            </div>

            <div className="space-y-2.5 max-w-md mx-auto">
              {PLAN_MESSAGES.slice(0, loadingMsgCount).map((msg, i) => {
                const isDone = i < loadingMsgCount - 1
                const isCurrent = i === loadingMsgCount - 1
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 transition-all duration-300"
                    style={{
                      opacity: isDone ? 0.5 : 1,
                      animation: isCurrent ? 'planFadeInUp 0.3s ease' : undefined,
                    }}
                  >
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <div
                        className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                      />
                    )}
                    <span
                      className="text-sm"
                      style={{
                        color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                        fontWeight: isCurrent ? 600 : 400,
                        fontFamily: 'var(--font-outfit)',
                      }}
                    >
                      {msg}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {status === 'error' && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="text-sm mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>
              {error === 'Plan rate limit reached. Try again in a bit.'
                ? error
                : "We couldn\u2019t research this topic. Try rephrasing your question."}
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => {
                  setError(null)
                  setPlanData(null)
                  setLoadingMsgCount(0)
                  fetchedRef.current = false
                  setRetryCount(c => c + 1)
                  setStatus('loading')
                }}
                className="px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', borderRadius: '8px' }}
              >
                Try again
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '8px' }}
              >
                Back to home
              </button>
            </div>
          </div>
        )}

        {/* ── Writing state ── */}
        {status === 'writing' && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', borderWidth: '3px', borderStyle: 'solid' }}
            />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              Starting your article...
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
              Skipping planning and research — jumping straight to writing
            </p>
          </div>
        )}

        {/* ── Plan card (3 sections) ── */}
        {status === 'ready' && planData && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* ─── Section 1: The angle ─── */}
            <div className="p-6 pb-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: '#BA7517', fontFamily: 'var(--font-outfit)' }}
                >
                  {TYPE_LABELS[planData.plan.article_type] ?? planData.plan.article_type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                  Based on {totalSources} sources
                </p>
              </div>

              {planData.research.synthesis?.thesis_direction ? (
                <p
                  className="leading-relaxed"
                  style={{ fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}
                >
                  {planData.research.synthesis.thesis_direction}
                </p>
              ) : (
                <p
                  className="leading-relaxed"
                  style={{ fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}
                >
                  {planData.plan.title}
                </p>
              )}
            </div>

            {/* ─── Section 2: Key findings ─── */}
            {diverseFindings.length > 0 && (
              <div className="px-6 pb-5">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                  style={{ color: '#BA7517', fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em' }}
                >
                  What the research turned up
                </p>
                <div className="space-y-3">
                  {diverseFindings.map((f, i) => {
                    // Extract domain for display
                    const sourceDisplay = f.source_url
                      ? `via ${new URL(f.source_url).hostname.replace(/^www\./, '')}`
                      : f.source
                        ? `via ${f.source.replace(/^via\s+/i, '')}`
                        : ''
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                          <circle cx="12" cy="12" r="10" stroke="#BA7517" strokeWidth="1.5" />
                          <polyline points="9 12 11 14 15 10" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div>
                          <p
                            className="leading-snug"
                            style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}
                          >
                            {f.claim}
                          </p>
                          {sourceDisplay && (
                            <p className="mt-0.5" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {sourceDisplay}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ─── Section 3: Options + feedback ─── */}
            <div className="px-6 pt-5 pb-6" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Options pills */}
              <div className="space-y-3 mb-5">
                <OptionPills
                  label="Length"
                  options={[
                    { value: 'quick', label: 'Quick' },
                    { value: 'standard', label: 'Standard' },
                    { value: 'deep', label: 'Deep' },
                  ]}
                  value={length}
                  onChange={setLength}
                />
                <OptionPills
                  label="Tone"
                  options={[
                    { value: 'opinionated', label: 'Opinionated' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'casual', label: 'Casual' },
                  ]}
                  value={tone}
                  onChange={setTone}
                />
              </div>

              {/* Feedback input */}
              <div className="mb-5">
                <label
                  className="text-xs block mb-1.5"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}
                >
                  Anything to add or change?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. 'I mostly use Premiere Pro' or 'Skip Apple, I need Windows'"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm outline-none resize-none"
                  style={{
                    backgroundColor: '#FAFAF8',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-outfit)',
                  }}
                />
              </div>

              {/* Action buttons — right-aligned */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2.5 text-sm font-medium"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-sora)',
                  }}
                >
                  Start over
                </button>
                <button
                  onClick={handleWriteIt}
                  className="px-6 py-2.5 font-semibold text-sm transition-opacity"
                  style={{
                    backgroundColor: '#BA7517',
                    color: '#fff',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-sora)',
                  }}
                >
                  Write it
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes planLoadingSlide {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes planFadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }} />}>
      <PlanPageContent />
    </Suspense>
  )
}
