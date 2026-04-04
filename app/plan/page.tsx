'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'
import { setPendingArticle } from '@/lib/pending-article'
import { useUser } from '@/hooks/useUser'
// Article type definitions used in TYPE_DESCRIPTIONS

// ═══ Types ═══

interface AngleOption {
  headline: string
  article_type: string
  pitch: string
  questions: string[]
  scope_pills: string[]
}

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

interface RedditThread {
  title: string
  url: string
  subreddit: string
  upvotes?: number
  comment_text?: string
  body?: string
  top_comment?: string
  score?: number
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
    redditThreads: RedditThread[]
  }
  angles: AngleOption[]
  timing: { plan_ms: number; research_ms: number; angles_ms?: number }
}

// Product-focused article types
const PRODUCT_TYPES = new Set(['buyer_guide', 'comparison', 'roundup', 'ranked_list'])

// ═══ Article type descriptions for tooltips ═══
const TYPE_DESCRIPTIONS: Record<string, { name: string; description: string; tags: string[] }> = {
  buyer_guide: { name: 'Buyer Guide', description: 'Helps you pick the right product with a clear winner.', tags: ['Picks a winner', 'Price comparisons', 'Pros & cons', 'Verdict'] },
  comparison: { name: 'Comparison', description: 'Head-to-head between 2-3 specific items.', tags: ['Side-by-side', 'Data tables', 'Clear winner', 'Specs'] },
  explainer: { name: 'Explainer', description: 'Breaks down a complex topic so you actually understand it.', tags: ['Key takeaways', 'Clear structure', 'No jargon'] },
  decision_guide: { name: 'Decision Guide', description: 'Helps you make a personal life or career decision.', tags: ['Trade-offs', 'Recommendation', 'Real scenarios'] },
  how_to: { name: 'How-To', description: 'Step-by-step instructions to get something done.', tags: ['Numbered steps', 'Prerequisites', 'Practical'] },
  roundup: { name: 'Roundup', description: 'Curated list with genuine editorial opinion on each.', tags: ['Ranked list', 'Best overall', 'Mini reviews'] },
  news_analysis: { name: 'News Analysis', description: 'What an event means and what happens next.', tags: ['Implications', 'Predictions', 'Live data'] },
  trend_analysis: { name: 'Trend Analysis', description: 'Is this trend real, overhyped, or misunderstood?', tags: ['Data-driven', 'Timeline', 'Evidence'] },
  breaking_news: { name: 'Breaking News', description: 'Essential picture on a breaking event.', tags: ['Fast', 'Live data', 'What to watch'] },
  deep_dive: { name: 'Deep Dive', description: 'Complete picture on a complex ongoing topic.', tags: ['Comprehensive', 'Bold thesis', 'Evidence-heavy'] },
}

// ═══ Loading messages ═══
const PLAN_MESSAGES = [
  'Researching your question...',
  'Searching sources...',
  'Checking Reddit discussions...',
  'Pulling market data...',
  'Generating angles...',
]

// ═══ Helper: sanitize description text from research ═══
function sanitizeDescription(raw: string): string {
  if (!raw) return ''
  let text = raw
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  // Remove first-person Reddit-style text
  text = text.replace(/^(I |My |We |IMO |IMHO |Personally,?\s)/i, '')
  text = text.replace(/\b(I think|I believe|I've found|I use|I bought|my wife|my husband)\b/gi, '')
  // Remove markdown artifacts
  text = text.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // Clean up excess whitespace
  text = text.replace(/\s{2,}/g, ' ').trim()
  // Take first sentence only (up to 100 chars)
  const firstSentence = text.match(/^[^.!?]+[.!?]/)
  if (firstSentence && firstSentence[0].length <= 100) {
    text = firstSentence[0]
  } else {
    text = text.slice(0, 80)
    // Don't cut mid-word
    const lastSpace = text.lastIndexOf(' ')
    if (lastSpace > 40) text = text.slice(0, lastSpace)
  }
  return text.trim()
}

// ═══ Helper: clean price string ═══
function cleanPrice(raw: string): string | undefined {
  const match = raw.match(/[\$£€][\d,.]+/)
  return match?.[0] ?? undefined
}

// ═══ Helper: extract products from entity cards ═══
function extractProducts(entityCards: PlanData['research']['entityCards']): Array<{ name: string; description: string; price?: string }> {
  return entityCards
    .filter(e => e.type === 'product' || e.type === 'service' || e.type === 'tool' || e.type === 'device')
    .map(e => {
      const priceFact = e.facts.find(f => /price|cost|\$|£|€/i.test(f.claim))
      const descFact = e.facts.find(f => !/price|cost|\$|£|€/i.test(f.claim))
      return {
        name: e.canonical_name,
        description: sanitizeDescription(descFact?.claim ?? ''),
        price: priceFact ? cleanPrice(priceFact.claim) : undefined,
      }
    })
    .slice(0, 8)
}

// ═══ Helper: extract best findings from synthesis/research ═══
function extractFindings(research: PlanData['research']): Array<{ text: string; sources: string }> {
  const findings: Array<{ text: string; sources: string }> = []

  // Prefer synthesis key_data_points — they're the most structured
  if (research.synthesis?.key_data_points?.length) {
    for (const dp of research.synthesis.key_data_points.slice(0, 6)) {
      if (dp && dp.length > 10) {
        findings.push({ text: dp, sources: '' })
      }
    }
  }

  // Fill from entity card facts
  if (findings.length < 4 && research.entityCards?.length) {
    for (const card of research.entityCards) {
      if (findings.length >= 4) break
      for (const fact of card.facts) {
        if (findings.length >= 4) break
        // Skip if too similar to existing
        if (findings.some(f => f.text.includes(fact.claim.slice(0, 20)))) continue
        findings.push({ text: fact.claim, sources: `via ${fact.source}` })
      }
    }
  }

  // Fill from research findings
  if (findings.length < 4 && research.findings?.length) {
    for (const f of research.findings) {
      if (findings.length >= 4) break
      if (findings.some(ex => ex.text.includes(f.claim.slice(0, 20)))) continue
      const source = f.source_url
        ? `via ${new URL(f.source_url).hostname.replace(/^www\./, '')}`
        : f.source ? `via ${f.source.replace(/^via\s+/i, '')}` : ''
      findings.push({ text: f.claim, sources: source })
    }
  }

  return findings.slice(0, 6)
}

// ═══ Helper: extract Reddit sentiment ═══
function extractRedditSentiment(threads: RedditThread[]): Array<{ quote: string; subreddit: string; upvotes?: number }> {
  return threads
    .filter(t => (t.comment_text || t.body || t.top_comment || t.title)?.length > 20)
    .map(t => ({
      quote: (t.comment_text || t.top_comment || t.body || t.title).slice(0, 200),
      subreddit: t.subreddit || 'reddit',
      upvotes: t.upvotes ?? t.score,
    }))
    .slice(0, 5)
}

// ═══ Type Tooltip Component (click/tap + hover) ═══
function TypeTooltip({ type, children }: { type: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const info = TYPE_DESCRIPTIONS[type] ?? { name: type.replace(/_/g, ' '), description: '', tags: [] }

  // Close on outside click/tap
  useEffect(() => {
    if (!show) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [show])

  return (
    <span
      ref={ref}
      className="relative inline-block"
      onClick={(e) => { e.stopPropagation(); setShow(prev => !prev) }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute z-50 rounded-lg p-3 shadow-lg"
          style={{
            backgroundColor: '#2C2C2A',
            width: '280px',
            top: '100%',
            left: '0',
            marginTop: '6px',
          }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: '#fff' }}>{info.name}</p>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{info.description}</p>
          <div className="flex flex-wrap gap-1">
            {info.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}

// ═══ Removable Item Component ═══
function RemovableItem({
  children,
  removed,
  onRemove,
  onUndo,
  className = '',
}: {
  children: React.ReactNode
  removed: boolean
  onRemove: () => void
  onUndo: () => void
  className?: string
}) {
  return (
    <div
      className={`group relative transition-opacity duration-200 ${className}`}
      style={{ opacity: removed ? 0.35 : 1 }}
    >
      {children}
      {removed ? (
        <button
          onClick={onUndo}
          className="absolute top-1 right-1 text-[11px] font-medium px-2 py-0.5 rounded"
          style={{ color: '#BA7517', cursor: 'pointer', backgroundColor: '#FDF8F0' }}
        >
          Undo
        </button>
      ) : (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 w-[22px] h-[22px] flex items-center justify-center rounded-full opacity-[0.4] md:opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      )}
    </div>
  )
}

// ═══ Add Item Input ═══
function AddItemInput({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium mt-2"
        style={{ color: '#BA7517', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        + {placeholder}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); setText(''); setOpen(false) } }}
        placeholder={placeholder}
        autoFocus
        className="flex-1 text-xs px-3 py-1.5 outline-none"
        style={{ border: '1px solid #E8E6E0', borderRadius: '6px', color: '#1A1714', fontFamily: 'var(--font-outfit)' }}
      />
      <button
        onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(''); setOpen(false) } }}
        className="text-xs font-medium px-3 py-1.5 rounded"
        style={{ backgroundColor: '#BA7517', color: '#fff', cursor: 'pointer', border: 'none' }}
      >
        Add
      </button>
      <button
        onClick={() => { setText(''); setOpen(false) }}
        className="text-xs"
        style={{ color: '#94918D', cursor: 'pointer', background: 'none', border: 'none' }}
      >
        Cancel
      </button>
    </div>
  )
}

// ═══ Section Header with Count ═══
function SectionHeader({ label, count }: { label: string; count: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#BA7517', fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <span className="text-[11px]" style={{ color: '#94918D', fontFamily: 'var(--font-outfit)' }}>
        {count}
      </span>
    </div>
  )
}


// ═══════════════════════════════════════════════════
// ═══ MAIN PLAN PAGE COMPONENT ═══
// ═══════════════════════════════════════════════════

function PlanPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useUser()
  const query = searchParams.get('q') ?? ''

  // Core state
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'writing'>('loading')
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMsgCount, setLoadingMsgCount] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fetchedRef = useRef(false)

  // ── Angle selection ──
  const [selectedAngle, setSelectedAngle] = useState(0)

  // ── Per-angle state: scope pills, questions (keyed by angle index) ──
  const [activeScopePills, setActiveScopePills] = useState<Record<number, Set<number>>>({})
  const [removedQuestions, setRemovedQuestions] = useState<Record<number, Set<number>>>({})
  const [addedQuestions, setAddedQuestions] = useState<Record<number, string[]>>({})

  // ── Findings state (NOT per-angle) ──
  const [removedFindings, setRemovedFindings] = useState<Set<number>>(new Set())
  const [addedFindings, setAddedFindings] = useState<string[]>([])

  // ── Products state (NOT per-angle, but visibility depends on angle) ──
  const [removedProducts, setRemovedProducts] = useState<Set<number>>(new Set())
  const [addedProducts, setAddedProducts] = useState<string[]>([])

  // ── Sentiment state (NOT per-angle) ──
  const [removedSentiment, setRemovedSentiment] = useState<Set<number>>(new Set())
  const [promotedSentiment, setPromotedSentiment] = useState<Set<number>>(new Set())

  // ── Options ──
  const [selectedLength, setSelectedLength] = useState<'quick' | 'standard' | 'deep'>('standard')
  const [selectedTone, setSelectedTone] = useState<'opinionated' | 'balanced' | 'technical'>('opinionated')
  const [feedback, setFeedback] = useState('')

  // Redirect if no query
  useEffect(() => {
    if (!query) router.replace('/')
  }, [query, router])

  // Auth gate
  useEffect(() => {
    if (authLoading || !query) return
    if (!user) {
      const returnUrl = `/plan?q=${encodeURIComponent(query)}`
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`
      window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`
    }
  }, [user, authLoading, query])

  // Fetch plan + research + angles
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
    }, 3500)

    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
    }
  }, [status])

  // ── Derived data ──
  const angles = planData?.angles ?? []
  const currentAngle = angles[selectedAngle]
  const allFindings = planData ? extractFindings(planData.research) : []
  const allProducts = planData ? extractProducts(planData.research.entityCards) : []
  const allSentiment = planData ? extractRedditSentiment(planData.research.redditThreads) : []
  const showProducts = currentAngle ? PRODUCT_TYPES.has(currentAngle.article_type) : false

  // Current angle's questions (base + added)
  const currentQuestions = currentAngle?.questions ?? []
  const currentAddedQuestions = addedQuestions[selectedAngle] ?? []
  const currentRemovedQuestions = removedQuestions[selectedAngle] ?? new Set()
  const currentScopePills = currentAngle?.scope_pills ?? []
  const currentActivePills = activeScopePills[selectedAngle] ?? new Set()

  // Counts
  const includedFindings = allFindings.length + addedFindings.length - removedFindings.size
  const totalFindings = allFindings.length + addedFindings.length
  const includedQuestions = currentQuestions.length + currentAddedQuestions.length - currentRemovedQuestions.size
  const totalQuestions = currentQuestions.length + currentAddedQuestions.length
  const includedProducts = allProducts.length + addedProducts.length - removedProducts.size
  const totalProducts = allProducts.length + addedProducts.length

  // Sentiment counts
  const activeSentimentCount = Math.min(3, allSentiment.length) - removedSentiment.size + promotedSentiment.size
  const reserveCount = allSentiment.length > 3 ? allSentiment.length - 3 - promotedSentiment.size : 0

  // ── Angle switch handler ──
  const handleAngleSwitch = useCallback((idx: number) => {
    setSelectedAngle(idx)
    // Scope pills and questions swap instantly — per-angle state preserved
  }, [])

  // ── Toggle scope pill ──
  const toggleScopePill = useCallback((pillIdx: number) => {
    setActiveScopePills(prev => {
      const current = new Set(prev[selectedAngle] ?? [])
      if (current.has(pillIdx)) current.delete(pillIdx)
      else current.add(pillIdx)
      return { ...prev, [selectedAngle]: current }
    })
  }, [selectedAngle])

  // ── "Write it" handler ──
  async function handleWriteIt() {
    if (!planData || !currentAngle) return
    setStatus('writing')

    // Collect all selections
    const activeFindings = allFindings
      .map((f, i) => ({ ...f, idx: i }))
      .filter((_, i) => !removedFindings.has(i))
      .map(f => f.text)
      .concat(addedFindings)

    const excludedFindings = allFindings
      .filter((_, i) => removedFindings.has(i))
      .map(f => f.text)

    const activeQuestionsList = currentQuestions
      .filter((_, i) => !currentRemovedQuestions.has(i))
      .concat(currentAddedQuestions)

    const activePillTexts = currentScopePills.filter((_, i) => currentActivePills.has(i))

    const includedProductNames = allProducts
      .filter((_, i) => !removedProducts.has(i))
      .map(p => p.name)
      .concat(addedProducts)

    const excludedProductNames = allProducts
      .filter((_, i) => removedProducts.has(i))
      .map(p => p.name)

    const activeSentimentQuotes = allSentiment
      .filter((_, i) => {
        if (i < 3) return !removedSentiment.has(i)
        return promotedSentiment.has(i)
      })
      .map(s => `"${s.quote}" — r/${s.subreddit}${s.upvotes ? ` (${s.upvotes} upvotes)` : ''}`)

    // Build the editorial brief for the blueprint prompt
    const editorialBrief = [
      `Article type: ${currentAngle.article_type}`,
      `Headline: ${currentAngle.headline}`,
      activePillTexts.length > 0 ? `Scope constraints: ${activePillTexts.join(', ')}` : '',
      showProducts && includedProductNames.length > 0 ? `Products to cover: ${includedProductNames.join(', ')}` : '',
      showProducts && excludedProductNames.length > 0 ? `Do NOT cover these products: ${excludedProductNames.join(', ')}` : '',
      activeFindings.length > 0 ? `Key findings to incorporate: ${activeFindings.join('; ')}` : '',
      excludedFindings.length > 0 ? `Do NOT reference: ${excludedFindings.join('; ')}` : '',
      activeQuestionsList.length > 0 ? `Questions to answer: ${activeQuestionsList.join('; ')}` : '',
      activeSentimentQuotes.length > 0 ? `Community perspectives to reference: ${activeSentimentQuotes.join(' | ')}` : '',
      feedback.trim() ? `User notes: ${feedback.trim()}` : '',
      `Length: ${selectedLength === 'quick' ? '500-800 words' : selectedLength === 'deep' ? '2,500-4,000 words' : '1,200-2,000 words'}`,
      `Tone: ${selectedTone === 'opinionated' ? 'Opinionated — picks winners, takes strong positions' : selectedTone === 'balanced' ? 'Balanced — presents all sides, lets reader decide' : 'Technical — assumes expertise, skips the basics'}`,
    ].filter(Boolean).join('\n')

    const options = {
      length: selectedLength,
      tone: selectedTone,
      visual: 'standard' as const,
    }

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          options,
          planData: {
            plan: {
              ...planData.plan,
              // Override with selected angle
              title: currentAngle.headline,
              article_type: currentAngle.article_type,
            },
            research: planData.research,
            userFeedback: editorialBrief,
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
      } catch { /* ignore */ }
      try {
        const count = parseInt(localStorage.getItem('articles_generated') ?? '0', 10)
        localStorage.setItem('articles_generated', String(count + 1))
      } catch { /* ignore */ }

      router.push(`/article/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('ready')
    }
  }

  if (!query) return null

  // Auth loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-10 pb-20">
        {/* Query display */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
            Your question
          </p>
          <h1 className="text-xl md:text-2xl font-bold leading-snug" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            {query}
          </h1>
        </div>

        {/* ── Loading state ── */}
        {status === 'loading' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="w-48 h-1 rounded-full overflow-hidden mx-auto mb-6" style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-full rounded-full" style={{ backgroundColor: 'var(--accent)', animation: 'planLoadingSlide 1.8s ease-in-out infinite' }} />
            </div>
            <div className="space-y-2.5 max-w-md mx-auto">
              {PLAN_MESSAGES.slice(0, loadingMsgCount).map((msg, i) => {
                const isDone = i < loadingMsgCount - 1
                const isCurrent = i === loadingMsgCount - 1
                return (
                  <div key={i} className="flex items-center gap-2.5 transition-all duration-300" style={{ opacity: isDone ? 0.5 : 1, animation: isCurrent ? 'planFadeInUp 0.3s ease' : undefined }}>
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                    )}
                    <span className="text-sm" style={{ color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400, fontFamily: 'var(--font-outfit)' }}>
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
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>
              {error === 'Plan rate limit reached. Try again in a bit.' ? error : "We couldn\u2019t research this topic. Try rephrasing your question."}
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => { setError(null); setPlanData(null); setLoadingMsgCount(0); fetchedRef.current = false; setRetryCount(c => c + 1); setStatus('loading') }}
                className="px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', borderRadius: '8px', border: 'none' }}
              >
                Try again
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '8px', backgroundColor: 'transparent' }}
              >
                Back to home
              </button>
            </div>
          </div>
        )}

        {/* ── Writing state ── */}
        {status === 'writing' && (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="w-10 h-10 rounded-full border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent', borderWidth: '3px', borderStyle: 'solid' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>Starting your article...</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>Skipping planning and research — jumping straight to writing</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ═══ THE PLAN CARD ═══ */}
        {/* ═══════════════════════════════════════════ */}
        {status === 'ready' && planData && (
          <div className="space-y-4">

            {/* ─── SECTION: Angle Selection ─── */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="p-6">
                <SectionHeader label="Choose your angle" count={`${angles.length} ${angles.length === 1 ? 'option' : 'options'}`} />
                <div className="space-y-3">
                  {angles.map((angle, i) => (
                    <button
                      key={i}
                      onClick={() => handleAngleSwitch(i)}
                      className="w-full text-left rounded-xl p-4 transition-all duration-150 flex items-start gap-3"
                      style={{
                        border: `1.5px solid ${selectedAngle === i ? '#BA7517' : '#E8E6E0'}`,
                        backgroundColor: selectedAngle === i ? '#FDF8F0' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-snug mb-1.5" style={{ fontSize: '15px', color: '#1A1714' }}>
                          {angle.headline}
                        </p>
                        <TypeTooltip type={angle.article_type}>
                          <span
                            className="inline-block text-[11px] font-medium px-2 py-0.5 mb-2"
                            style={{ backgroundColor: '#EDECEA', color: '#5F5E5A', borderRadius: '6px', cursor: 'default' }}
                          >
                            {TYPE_DESCRIPTIONS[angle.article_type]?.name ?? angle.article_type.replace(/_/g, ' ')}
                          </span>
                        </TypeTooltip>
                        <p className="text-[13px] leading-relaxed" style={{ color: '#6B6B6B' }}>
                          {angle.pitch}
                        </p>
                      </div>
                      {/* Radio dot */}
                      <div
                        className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ border: `2px solid ${selectedAngle === i ? '#BA7517' : '#D3D1C7'}` }}
                      >
                        {selectedAngle === i && (
                          <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: '#BA7517' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Scope Pills ─── */}
              {currentScopePills.length > 0 && (
                <div className="px-6 pb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#94918D', fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em' }}>
                    Narrow your focus
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentScopePills.map((pill, i) => {
                      const isActive = currentActivePills.has(i)
                      return (
                        <button
                          key={`${selectedAngle}-${i}`}
                          onClick={() => toggleScopePill(i)}
                          className="text-xs font-medium px-3 py-2 min-h-[44px] flex items-center transition-all duration-150"
                          style={{
                            borderRadius: '8px',
                            backgroundColor: isActive ? '#FDF8F0' : '#fff',
                            border: `1.5px solid ${isActive ? '#BA7517' : '#E8E6E0'}`,
                            color: isActive ? '#BA7517' : '#5F5E5A',
                            cursor: 'pointer',
                          }}
                        >
                          {pill}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: '#94918D', fontStyle: 'italic' }}>
                    These help focus the article on what matters to you
                  </p>
                </div>
              )}
            </div>

            {/* ─── SECTION: Products (conditional) ─── */}
            {showProducts && allProducts.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <SectionHeader label="Products to include" count={`${includedProducts} of ${totalProducts} included`} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allProducts.map((product, i) => (
                    <RemovableItem
                      key={i}
                      removed={removedProducts.has(i)}
                      onRemove={() => setRemovedProducts(prev => new Set(prev).add(i))}
                      onUndo={() => setRemovedProducts(prev => { const n = new Set(prev); n.delete(i); return n })}
                      className="rounded-lg p-3"
                    >
                      <div style={{ border: '1px solid #E8E6E0', borderRadius: '8px', padding: '10px 12px' }}>
                        <p className="text-[13px] font-medium" style={{ color: '#1A1714', textDecoration: removedProducts.has(i) ? 'line-through' : 'none' }}>
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="text-[11px] mt-0.5" style={{ color: '#6B6B6B' }}>{product.description.slice(0, 80)}</p>
                        )}
                        {product.price && (
                          <p className="text-xs font-medium mt-1" style={{ color: '#BA7517' }}>{product.price}</p>
                        )}
                      </div>
                    </RemovableItem>
                  ))}
                  {addedProducts.map((name, i) => (
                    <div key={`added-${i}`} className="rounded-lg p-3" style={{ border: '1px solid #E8E6E0', borderRadius: '8px', padding: '10px 12px' }}>
                      <p className="text-[13px] font-medium" style={{ color: '#1A1714' }}>{name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#BA7517' }}>Added by you</p>
                    </div>
                  ))}
                </div>
                <AddItemInput placeholder="Add a product" onAdd={name => setAddedProducts(prev => [...prev, name])} />
              </div>
            )}

            {/* ─── SECTION: Research Findings ─── */}
            {allFindings.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <SectionHeader label="Key findings" count={`${includedFindings} of ${totalFindings} included`} />
                <div className="space-y-3">
                  {allFindings.map((finding, i) => (
                    <RemovableItem
                      key={i}
                      removed={removedFindings.has(i)}
                      onRemove={() => setRemovedFindings(prev => new Set(prev).add(i))}
                      onUndo={() => setRemovedFindings(prev => { const n = new Set(prev); n.delete(i); return n })}
                    >
                      <div className="flex items-start gap-2.5">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                          <circle cx="12" cy="12" r="10" stroke="#BA7517" strokeWidth="1.5" />
                          <polyline points="9 12 11 14 15 10" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="pr-6">
                          <p style={{ fontSize: '13px', lineHeight: '1.55', color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)', textDecoration: removedFindings.has(i) ? 'line-through' : 'none' }}>
                            {finding.text}
                          </p>
                          {finding.sources && (
                            <p className="mt-0.5" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{finding.sources}</p>
                          )}
                        </div>
                      </div>
                    </RemovableItem>
                  ))}
                  {addedFindings.map((text, i) => (
                    <div key={`added-${i}`} className="flex items-start gap-2.5">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" stroke="#BA7517" strokeWidth="1.5" />
                        <polyline points="9 12 11 14 15 10" fill="none" stroke="#BA7517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div>
                        <p style={{ fontSize: '13px', lineHeight: '1.55', color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>{text}</p>
                        <p className="mt-0.5" style={{ fontSize: '11px', color: '#BA7517' }}>Added by you</p>
                      </div>
                    </div>
                  ))}
                </div>
                <AddItemInput placeholder="Add something the research missed" onAdd={text => setAddedFindings(prev => [...prev, text])} />
              </div>
            )}

            {/* ─── SECTION: Questions ─── */}
            {currentQuestions.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <SectionHeader label="Questions this article will answer" count={`${includedQuestions} of ${totalQuestions} included`} />
                <div className="space-y-2.5">
                  {currentQuestions.map((q, i) => (
                    <RemovableItem
                      key={`${selectedAngle}-q-${i}`}
                      removed={currentRemovedQuestions.has(i)}
                      onRemove={() => setRemovedQuestions(prev => {
                        const current = new Set(prev[selectedAngle] ?? [])
                        current.add(i)
                        return { ...prev, [selectedAngle]: current }
                      })}
                      onUndo={() => setRemovedQuestions(prev => {
                        const current = new Set(prev[selectedAngle] ?? [])
                        current.delete(i)
                        return { ...prev, [selectedAngle]: current }
                      })}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 mt-0.5 text-[13px]" style={{ color: '#BA7517' }}>→</span>
                        <p className="pr-6" style={{ fontSize: '13px', lineHeight: '1.55', color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)', textDecoration: currentRemovedQuestions.has(i) ? 'line-through' : 'none' }}>
                          {q}
                        </p>
                      </div>
                    </RemovableItem>
                  ))}
                  {currentAddedQuestions.map((q, i) => (
                    <div key={`added-q-${i}`} className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 mt-0.5 text-[13px]" style={{ color: '#BA7517' }}>→</span>
                      <div>
                        <p style={{ fontSize: '13px', lineHeight: '1.55', color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>{q}</p>
                        <p style={{ fontSize: '11px', color: '#BA7517' }}>Added by you</p>
                      </div>
                    </div>
                  ))}
                </div>
                <AddItemInput
                  placeholder="Add a question"
                  onAdd={q => setAddedQuestions(prev => ({ ...prev, [selectedAngle]: [...(prev[selectedAngle] ?? []), q] }))}
                />
              </div>
            )}

            {/* ─── SECTION: Community Sentiment ─── */}
            {allSentiment.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <SectionHeader
                  label="Community sentiment"
                  count={allSentiment.length >= 3 ? `${activeSentimentCount} active · ${Math.max(0, reserveCount)} reserve` : `${allSentiment.length} quotes`}
                />
                <div className="space-y-2.5">
                  {/* Active (first 3) */}
                  {allSentiment.slice(0, 3).map((s, i) => (
                    <RemovableItem
                      key={i}
                      removed={removedSentiment.has(i)}
                      onRemove={() => setRemovedSentiment(prev => new Set(prev).add(i))}
                      onUndo={() => setRemovedSentiment(prev => { const n = new Set(prev); n.delete(i); return n })}
                    >
                      <div className="pl-3 py-2 pr-7" style={{ borderLeft: `3px solid ${removedSentiment.has(i) ? '#D3D1C7' : '#BA7517'}` }}>
                        <p className="text-[13px] italic leading-relaxed" style={{ color: 'var(--text-primary)', textDecoration: removedSentiment.has(i) ? 'line-through' : 'none' }}>
                          &ldquo;{s.quote}&rdquo;
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                          r/{s.subreddit}{s.upvotes ? ` · ${s.upvotes} upvotes` : ''}
                        </p>
                      </div>
                    </RemovableItem>
                  ))}
                  {/* Reserve (4+) */}
                  {allSentiment.slice(3).map((s, rawIdx) => {
                    const i = rawIdx + 3
                    const isPromoted = promotedSentiment.has(i)
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (!isPromoted) setPromotedSentiment(prev => new Set(prev).add(i))
                        }}
                        className="w-full text-left transition-opacity"
                        style={{ opacity: isPromoted ? 1 : 0.4, cursor: isPromoted ? 'default' : 'pointer', background: 'none', border: 'none', padding: 0 }}
                      >
                        <div className="pl-3 py-2" style={{ borderLeft: `3px solid ${isPromoted ? '#BA7517' : '#D3D1C7'}` }}>
                          <p className="text-[13px] italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            &ldquo;{s.quote}&rdquo;
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                            r/{s.subreddit}{s.upvotes ? ` · ${s.upvotes} upvotes` : ''}
                            {!isPromoted && <span style={{ color: '#BA7517', marginLeft: '6px' }}>Click to include</span>}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ─── SECTION: Length & Tone ─── */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start" style={{ borderBottom: 'none' }}>
                {/* Length column */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#BA7517', fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em' }}>
                    Length
                  </p>
                  <div className="space-y-2">
                    {([
                      { value: 'quick' as const, label: 'Quick', desc: '500–800 words' },
                      { value: 'standard' as const, label: 'Standard', desc: '1,200–2,000 words' },
                      { value: 'deep' as const, label: 'Deep', desc: '2,500–4,000 words' },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedLength(opt.value)}
                        className="w-full text-left flex items-center gap-2.5 transition-all duration-150"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1.5px solid ${selectedLength === opt.value ? '#BA7517' : '#E8E6E0'}`,
                          backgroundColor: selectedLength === opt.value ? '#FDF8F0' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          className="w-[16px] h-[16px] rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ border: `2px solid ${selectedLength === opt.value ? '#BA7517' : '#D3D1C7'}` }}
                        >
                          {selectedLength === opt.value && <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: '#BA7517' }} />}
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#1A1714' }}>{opt.label}</p>
                          <p className="text-[11px]" style={{ color: '#94918D' }}>{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone column */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#BA7517', fontFamily: 'var(--font-outfit)', letterSpacing: '0.06em' }}>
                    Tone
                  </p>
                  <div className="space-y-2">
                    {([
                      { value: 'opinionated' as const, label: 'Opinionated', desc: 'Picks winners, takes strong positions.' },
                      { value: 'balanced' as const, label: 'Balanced', desc: 'Presents all sides, lets you decide.' },
                      { value: 'technical' as const, label: 'Technical', desc: 'Assumes expertise, skips the basics.' },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedTone(opt.value)}
                        className="w-full text-left flex items-center gap-2.5 transition-all duration-150"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1.5px solid ${selectedTone === opt.value ? '#BA7517' : '#E8E6E0'}`,
                          backgroundColor: selectedTone === opt.value ? '#FDF8F0' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          className="w-[16px] h-[16px] rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ border: `2px solid ${selectedTone === opt.value ? '#BA7517' : '#D3D1C7'}` }}
                        >
                          {selectedTone === opt.value && <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: '#BA7517' }} />}
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#1A1714' }}>{opt.label}</p>
                          <p className="text-[11px]" style={{ color: '#94918D' }}>{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION: Feedback & Actions ─── */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <p className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                Anything else?
              </p>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="e.g. 'I mainly need this for client meetings' or 'Price matters more than features'"
                rows={3}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none mb-5"
                style={{
                  backgroundColor: '#FAFAF8',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-outfit)',
                }}
              />
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2.5 text-sm font-medium"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '8px', fontFamily: 'var(--font-sora)', backgroundColor: 'transparent' }}
                >
                  Start over
                </button>
                <button
                  onClick={handleWriteIt}
                  className="px-6 py-2.5 font-semibold text-sm transition-opacity"
                  style={{ backgroundColor: '#BA7517', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontFamily: 'var(--font-sora)', border: 'none' }}
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
