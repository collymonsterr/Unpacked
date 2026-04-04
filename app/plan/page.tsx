'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'
import ArticleOptions, { DEFAULT_OPTIONS, type GenerationOptions } from '@/components/ArticleOptions'
import { setPendingArticle } from '@/lib/pending-article'

// Loading messages while plan + research runs
const PLAN_MESSAGES = [
  'Analysing your question...',
  'Classifying article type...',
  'Planning the research approach...',
  'Searching real sources...',
  'Scanning Reddit discussions...',
  'Compiling research findings...',
  'Building the angle...',
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

function PlanPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') ?? ''

  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'writing'>('loading')
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMsgCount, setLoadingMsgCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS)
  const [showOptions, setShowOptions] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchedRef = useRef(false)

  // Redirect if no query
  useEffect(() => {
    if (!query) router.replace('/')
  }, [query, router])

  // Fetch plan + research
  useEffect(() => {
    if (!query || fetchedRef.current) return
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
  }, [query, retryCount])

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

  // "Write it" handler — sends planData to create API
  async function handleWriteIt() {
    if (!planData) return
    setStatus('writing')

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

      // If cached article returned
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
            {/* Progress bar */}
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

            {/* Stacking messages */}
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
              {error ?? 'Something went wrong'}
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
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
              >
                Try again
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Back to home
              </button>
            </div>
          </div>
        )}

        {/* ── Writing state (after clicking "Write it") ── */}
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
              className="w-10 h-10 rounded-full border-3 border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', borderWidth: '3px' }}
            />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
              Starting your article...
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
              Skipping planning and research — jumping straight to writing
            </p>
          </div>
        )}

        {/* ── Plan card ── */}
        {status === 'ready' && planData && (
          <div className="space-y-6">
            {/* Main plan card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {/* Header: type badge + title */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#FAEEDA', color: '#633806' }}
                  >
                    {planData.plan.article_type.replace(/_/g, ' ')}
                  </span>
                  {planData.plan.category && (
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded"
                      style={{ backgroundColor: '#EDECEA', color: '#666' }}
                    >
                      {planData.plan.category}
                    </span>
                  )}
                </div>
                <h2
                  className="text-lg md:text-xl font-bold leading-snug"
                  style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
                >
                  {planData.plan.title}
                </h2>
              </div>

              {/* Angle / Thesis */}
              {planData.research.synthesis?.thesis_direction && (
                <div className="px-6 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#BA7517', fontFamily: 'var(--font-outfit)' }}>
                    Our angle
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>
                    {planData.research.synthesis.thesis_direction}
                  </p>
                </div>
              )}

              {/* Winner preview */}
              {planData.plan.opinion_elements?.winner_and_loser && (
                <div className="px-6 pb-4">
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: '#F0EFED' }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: '#BA7517', fontFamily: 'var(--font-outfit)' }}>
                      🏆 Winner
                    </p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>
                      {planData.plan.opinion_elements.winner_and_loser.winner}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                      {planData.plan.opinion_elements.winner_and_loser.why}
                    </p>
                  </div>
                </div>
              )}

              {/* Key findings */}
              {planData.research.findings.length > 0 && (
                <div className="px-6 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                    Key findings ({planData.research.findings.length} sources)
                  </p>
                  <div className="space-y-2">
                    {planData.research.findings.slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <div>
                          <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>
                            {f.claim}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {f.source}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections outline */}
              <div className="px-6 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                  Article structure
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {planData.plan.sections_outline.map((section, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: '#EDECEA', color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>

              {/* Community sentiment */}
              {planData.research.synthesis?.community_sentiment_summary && (
                <div className="px-6 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                    Community take
                  </p>
                  <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                    &ldquo;{planData.research.synthesis.community_sentiment_summary}&rdquo;
                  </p>
                </div>
              )}

              {/* Source count strip */}
              <div
                className="px-6 py-3 flex items-center gap-4"
                style={{ borderTop: '1px solid var(--border)', backgroundColor: '#FAFAF8' }}
              >
                <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                  {planData.research.sources.length} web sources
                </span>
                {planData.research.redditThreads.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                    {planData.research.redditThreads.length} Reddit threads
                  </span>
                )}
                {planData.research.liveData?.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                    Live data included
                  </span>
                )}
              </div>
            </div>

            {/* Feedback textarea */}
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wide block mb-2"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}
              >
                Any direction? (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Focus more on budget options, or include UK pricing..."
                rows={3}
                className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-outfit)',
                }}
              />
            </div>

            {/* Article options (collapsed) */}
            <div>
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="text-xs font-medium transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-outfit)',
                }}
              >
                Article options {showOptions ? '▾' : '▸'}
              </button>
              {showOptions && (
                <div className="mt-2">
                  <ArticleOptions value={options} onChange={setOptions} />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 justify-center pt-2">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                Start over
              </button>
              <button
                onClick={handleWriteIt}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sora)',
                }}
              >
                Write it
              </button>
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
