'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'

// Large pool of diverse prompts across all article types
const ALL_EXAMPLES = [
  // Buyer guides
  'Best noise-cancelling headphones under $300',
  'Best standing desks for home offices',
  'Best mirrorless cameras for beginners',
  'Best mechanical keyboards under $100',
  'Best running shoes for flat feet',
  'Best portable monitors for travel',
  'Best air purifiers for allergies',
  'Best espresso machines under $500',
  // Comparisons
  'iPhone 17 vs Galaxy S26',
  'MacBook Air vs Dell XPS 14',
  'Notion vs Obsidian for note-taking',
  'Tesla Model 3 vs BMW i4',
  'Spotify vs Apple Music in 2026',
  'React vs Svelte for new projects',
  // Decision guides
  'Should I rent or buy in 2026?',
  'Is an MBA still worth it?',
  'Lease vs finance a new car',
  'Should I switch to a standing desk?',
  'Is it worth learning to code in 2026?',
  'Should I go freelance or stay employed?',
  // Explainers & tutorials
  'How to start investing with $500',
  'How does the stock market actually work?',
  'What is intermittent fasting and does it work?',
  'How to negotiate a higher salary',
  'How credit scores actually work',
  'How to build a personal brand online',
  // Planning & travel
  'Best cities for remote workers in Europe',
  'Weekend trip to Tokyo: what to do',
  'How to plan a solo backpacking trip',
  'Best Greek islands for couples',
  'A food lover\'s guide to Mexico City',
  // Trend analysis
  'The state of AI in 2026',
  'Are electric cars actually cheaper to own?',
  'Is the housing market about to crash?',
  'What\'s happening with remote work policies?',
]

function shuffleAndPick(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

interface Props {
  existingQueries?: string[]
}

export default function ExampleChips({ existingQueries = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  // Pick 6 random examples on mount, excluding any that match existing articles
  const examples = useMemo(() => {
    const existing = existingQueries.map(q => q.toLowerCase().trim())
    const available = ALL_EXAMPLES.filter(ex => {
      const lower = ex.toLowerCase()
      // Exclude if any existing article query/title closely matches
      return !existing.some(eq =>
        eq.includes(lower) || lower.includes(eq) ||
        // Also check if key words overlap significantly
        eq.split(/\s+/).filter(w => w.length > 3).filter(w => lower.includes(w)).length >= 3
      )
    })
    return shuffleAndPick(available.length >= 6 ? available : ALL_EXAMPLES, 6)
  }, [existingQueries])

  async function handleClick(query: string) {
    if (loading) return
    setLoading(query)

    try {
      const res = await fetch('/api/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!res.ok) throw new Error('Failed')

      const { id, slug } = await res.json()
      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}

      router.push(`/article/${slug}`)
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {examples.map((example) => (
        <button
          key={example}
          onClick={() => handleClick(example)}
          disabled={!!loading}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--card)',
            color: loading === example ? 'var(--accent)' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-outfit)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading === example ? 'Generating...' : example}
        </button>
      ))}
    </div>
  )
}
