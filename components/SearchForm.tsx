'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const PLACEHOLDERS = [
  'Best laptops for students under $800...',
  'iPhone 17 vs Galaxy S26...',
  'Best coffee machines from budget to luxury...',
  'Best noise-cancelling headphones under $300...',
  'Best gaming keyboards for under $100...',
  'MacBook Pro vs Dell XPS 15...',
  'Best beginner electric guitars under $500...',
  'Best robot vacuums for pet hair...',
]

type MessageSet = Array<{ text: string; icon: string }>

// Guess the query category to show relevant messages before the plan returns
function guessQueryType(query: string): 'product' | 'comparison' | 'explainer' | 'travel' | 'generic' {
  const q = query.toLowerCase()
  if (/\bvs\.?\b|\bversus\b|\bcompare\b|\bor\b.*\bwhich\b/.test(q)) return 'comparison'
  if (/\btravel\b|\bholiday\b|\bvacation\b|\bcity\b|\bcountry\b|\btour\b|\bitinerary\b/.test(q)) return 'travel'
  if (/\bexplain\b|\bwhat is\b|\bhow does\b|\bhow do\b|\bwhy\b|\bguide to\b|\bunderstand\b/.test(q)) return 'explainer'
  if (/\bbest\b|\btop\b|\bunder \$|\bcheap|\bbudget\b|\breview\b|\brecommend\b/.test(q)) return 'product'
  return 'generic'
}

const MESSAGES: Record<string, MessageSet> = {
  product: [
    { text: 'Understanding what you\'re looking for...', icon: '🔍' },
    { text: 'Checking what Reddit actually recommends...', icon: '💬' },
    { text: 'Reading expert reviews and roundups...', icon: '📰' },
    { text: 'Comparing prices across major retailers...', icon: '💰' },
    { text: 'Scanning forums for dealbreakers people mention...', icon: '🗣️' },
    { text: 'Looking for the details most reviews skip...', icon: '🔬' },
    { text: 'Picking the best products to feature...', icon: '⭐' },
    { text: 'Deciding what charts and comparisons to include...', icon: '📊' },
    { text: 'Nearly there — structuring the article...', icon: '✨' },
  ],
  comparison: [
    { text: 'Setting up the head-to-head...', icon: '⚖️' },
    { text: 'Pulling specs and benchmarks for both sides...', icon: '📊' },
    { text: 'Reading expert reviews on each contender...', icon: '📰' },
    { text: 'Checking what owners say after 6 months...', icon: '💬' },
    { text: 'Finding where each one wins and loses...', icon: '🏆' },
    { text: 'Building the comparison matrix...', icon: '📋' },
    { text: 'Forming our verdict...', icon: '🧠' },
    { text: 'Nearly there — finalising the article...', icon: '✨' },
  ],
  travel: [
    { text: 'Checking the latest travel advice...', icon: '✈️' },
    { text: 'Reading local recommendations and tips...', icon: '🗺️' },
    { text: 'Looking at what travellers say on forums...', icon: '💬' },
    { text: 'Checking reviews, prices, and availability...', icon: '🏨' },
    { text: 'Finding hidden gems most guides miss...', icon: '💎' },
    { text: 'Planning the best itinerary...', icon: '📋' },
    { text: 'Nearly there — putting it all together...', icon: '✨' },
  ],
  explainer: [
    { text: 'Gathering the latest research...', icon: '🔍' },
    { text: 'Finding the clearest way to explain this...', icon: '🧠' },
    { text: 'Checking primary sources and data...', icon: '📚' },
    { text: 'Preparing charts and visualisations...', icon: '📈' },
    { text: 'Building worked examples...', icon: '✏️' },
    { text: 'Making sure the facts check out...', icon: '✅' },
    { text: 'Nearly there — structuring the explainer...', icon: '✨' },
  ],
  generic: [
    { text: 'Understanding your query...', icon: '🔍' },
    { text: 'Researching across multiple sources...', icon: '📰' },
    { text: 'Checking forums and discussions...', icon: '💬' },
    { text: 'Gathering data and statistics...', icon: '📊' },
    { text: 'Deciding the best article format...', icon: '📋' },
    { text: 'Planning data visualisations...', icon: '📈' },
    { text: 'Building the article structure...', icon: '🧠' },
    { text: 'Nearly there — finalising the plan...', icon: '✨' },
  ],
}

// Transition messages shown briefly before redirecting to the article
const TRANSITION_MESSAGES = [
  { text: 'Your article is being written right now...', icon: '✍️' },
  { text: 'Taking you there — this is worth the wait.', icon: '🚀' },
]

export default function SearchForm() {
  const [query, setQuery] = useState('')
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionIndex, setTransitionIndex] = useState(0)
  const [transitionVisible, setTransitionVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusIndex, setStatusIndex] = useState(0)
  const [statusVisible, setStatusVisible] = useState(true)
  const [activeMessages, setActiveMessages] = useState<MessageSet>(MESSAGES.generic)
  const router = useRouter()
  const statusInterval = useRef<ReturnType<typeof setInterval>>(null)

  // Rotate placeholder text
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % PLACEHOLDERS.length
      setPlaceholder(PLACEHOLDERS[i])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Rotate status messages while loading
  useEffect(() => {
    if (!isLoading) {
      if (statusInterval.current) clearInterval(statusInterval.current)
      return
    }

    setStatusIndex(0)
    setStatusVisible(true)

    statusInterval.current = setInterval(() => {
      setStatusVisible(false)
      setTimeout(() => {
        setStatusIndex((i) => (i + 1) % activeMessages.length)
        setStatusVisible(true)
      }, 300)
    }, 2500)

    return () => {
      if (statusInterval.current) clearInterval(statusInterval.current)
    }
  }, [isLoading, activeMessages.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    setIsLoading(true)
    setError(null)
    setActiveMessages(MESSAGES[guessQueryType(trimmed)])
    setStatusIndex(0)

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to generate article')
      }

      const { id, slug } = await res.json()
      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}

      // Show transition interstitial before redirecting
      setIsLoading(false)
      setIsTransitioning(true)
      setTransitionIndex(0)
      setTransitionVisible(true)

      // Show first message, then second, then redirect
      await new Promise((r) => setTimeout(r, 2500))
      setTransitionVisible(false)
      await new Promise((r) => setTimeout(r, 300))
      setTransitionIndex(1)
      setTransitionVisible(true)
      await new Promise((r) => setTimeout(r, 2000))

      router.push(`/article/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
      setIsTransitioning(false)
    }
  }

  const currentMessage = activeMessages[statusIndex]
  const transitionMessage = TRANSITION_MESSAGES[transitionIndex]

  // Transition interstitial replaces the form
  if (isTransitioning) {
    return (
      <div className="w-full flex flex-col items-center gap-4 py-4">
        <LoadingBar />
        <p
          className="text-base font-semibold text-center transition-all duration-300"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sora)',
            opacity: transitionVisible ? 1 : 0,
            transform: transitionVisible ? 'translateY(0)' : 'translateY(6px)',
          }}
        >
          <span className="mr-2">{transitionMessage.icon}</span>
          {transitionMessage.text}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div
          className="flex flex-col sm:flex-row gap-2 rounded-2xl overflow-hidden p-2"
          style={{
            backgroundColor: 'var(--card)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid var(--border)',
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-base outline-none bg-transparent disabled:opacity-50"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-outfit)',
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-opacity disabled:opacity-40 shrink-0"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              fontFamily: 'var(--font-sora)',
              cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Working...' : 'Generate Article'}
          </button>
        </div>
      </form>

      {/* Status messages while planning */}
      {isLoading && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <LoadingBar />
          </div>
          <p
            className="text-sm font-medium text-center transition-all duration-300"
            style={{
              color: 'var(--text-secondary)',
              opacity: statusVisible ? 1 : 0,
              transform: statusVisible ? 'translateY(0)' : 'translateY(4px)',
            }}
          >
            <span className="mr-1.5">{currentMessage.icon}</span>
            {currentMessage.text}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}

function LoadingBar() {
  return (
    <div
      className="w-48 h-1 rounded-full overflow-hidden"
      style={{ backgroundColor: 'var(--border)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          backgroundColor: 'var(--accent)',
          animation: 'loadingSlide 1.8s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes loadingSlide {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
