'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const EXAMPLES = [
  'Best noise-cancelling headphones under $300',
  'iPhone 17 vs Galaxy S26',
  'Should I rent or buy in 2026?',
  'How to start investing with $500',
  'Is an MBA still worth it?',
  'Best cities for remote workers in Europe',
]

export default function ExampleChips() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

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
      {EXAMPLES.map((example) => (
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
