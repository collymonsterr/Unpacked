'use client'

import { useRouter } from 'next/navigation'
import type { SuggestionChips as SuggestionChipsType } from '@/types/article'

interface Props {
  chips: SuggestionChipsType
  articleId: string
  onRefine: (instruction: string) => void
  isRefining: boolean
}

export default function SuggestionChips({ chips, onRefine, isRefining }: Props) {
  const router = useRouter()

  async function handleRelated(query: string) {
    const res = await fetch('/api/articles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    if (res.ok) {
      const { id, slug } = await res.json()
      try {
        const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
        owned.push(id)
        localStorage.setItem('owned_articles', JSON.stringify(owned))
      } catch {}
      router.push(`/article/${slug}`)
    }
  }

  return (
    <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
      {chips.refinements.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            Refine This Article
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.refinements.map((chip, i) => (
              <button
                key={i}
                onClick={() => onRefine(chip)}
                disabled={isRefining}
                className="text-sm px-4 py-2 rounded-full transition-all disabled:opacity-40 hover:opacity-80"
                style={{
                  border: '1.5px solid var(--accent)',
                  color: 'var(--accent)',
                  backgroundColor: 'transparent',
                  cursor: isRefining ? 'not-allowed' : 'pointer',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {chips.related.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            Related Articles
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.related.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleRelated(chip)}
                className="text-sm px-4 py-2 rounded-full transition-all hover:opacity-80"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {chip} →
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
