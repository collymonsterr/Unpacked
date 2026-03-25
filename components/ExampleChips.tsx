'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

// Non-product prompts — one of these always goes first
const NON_PRODUCT = [
  'How much do I need to retire at 55 in the UK with a mortgage?',
  'Should I rent or buy in 2026?',
  'Is an MBA still worth it?',
  'How to start investing with $500',
  'How does the stock market actually work?',
  'Is it worth learning to code in 2026?',
  'Should I go freelance or stay employed?',
  'How to negotiate a higher salary',
  'Are electric cars actually cheaper to own?',
  'Is the housing market about to crash?',
  'How much house can I actually afford?',
  'Is paying off your mortgage early worth it?',
  'How much is your commute actually costing you?',
  'Best cities for remote workers in Europe',
  'How to plan a solo backpacking trip',
]

// Product/buyer/comparison prompts — fill the remaining 3 slots
const PRODUCT = [
  'Best noise-cancelling headphones under $300 for long flights',
  'Sony A7 IV vs Canon R6 Mark II — which is better for video?',
  'Best standing desks for home offices',
  'Best mirrorless cameras for beginners',
  'Best mechanical keyboards under $100',
  'Best espresso machines under $500',
  'iPhone 17 vs Galaxy S26',
  'MacBook Air vs Dell XPS 14',
  'Tesla Model 3 vs BMW i4',
  'Best Greek islands for couples',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  existingQueries?: string[]
}

export default function ExampleChips({ existingQueries = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [examples, setExamples] = useState<string[]>([])

  // Randomize on client mount only to avoid hydration mismatch
  useEffect(() => {
    const existing = existingQueries.map(q => q.toLowerCase().trim())
    const isMatch = (ex: string) => {
      const lower = ex.toLowerCase()
      return existing.some(eq =>
        eq.includes(lower) || lower.includes(eq) ||
        eq.split(/\s+/).filter(w => w.length > 3).filter(w => lower.includes(w)).length >= 3
      )
    }

    const availableNonProduct = shuffle(NON_PRODUCT.filter(ex => !isMatch(ex)))
    const availableProduct = shuffle(PRODUCT.filter(ex => !isMatch(ex)))

    // First chip is always non-product, remaining 3 are a mix
    const first = availableNonProduct[0] ?? NON_PRODUCT[0]
    const rest = shuffle([...availableNonProduct.slice(1), ...availableProduct]).slice(0, 3)

    setExamples([first, ...rest])
  }, [existingQueries])

  if (examples.length === 0) return <div className="h-10 mt-4" />

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
    <div className="flex flex-wrap justify-center gap-2 mt-7">
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
