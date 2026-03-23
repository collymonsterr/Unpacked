'use client'

import { useRouter } from 'next/navigation'
import type { SuggestionChips as SuggestionChipsType } from '@/types/article'

interface Props {
  chips: SuggestionChipsType
  articleId: string
  onRefine: (instruction: string) => void
  isRefining: boolean
}

/**
 * Renders refinement chips only (outlined orange).
 */
export function RefinementChips({ chips, onRefine, isRefining }: Omit<Props, 'articleId'>) {
  if (!chips.refinements.length) return null

  return (
    <div className="flex flex-col gap-2">
      {chips.refinements.map((chip, i) => (
        <button
          key={i}
          onClick={() => onRefine(chip)}
          disabled={isRefining}
          className="w-full text-sm px-4 py-2.5 rounded-xl text-center transition-all disabled:opacity-40 hover:opacity-80"
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
  )
}

/**
 * Renders related topic chips only (filled orange).
 */
export function RelatedChips({ chips }: { chips: SuggestionChipsType }) {
  const router = useRouter()

  if (!chips.related.length) return null

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
    <div className="flex flex-col gap-2">
      {chips.related.map((chip, i) => (
        <button
          key={i}
          onClick={() => handleRelated(chip)}
          className="w-full text-sm px-4 py-2.5 rounded-xl text-center transition-all hover:opacity-80"
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
  )
}

/**
 * Combined component for backward compatibility.
 */
export default function SuggestionChips({ chips, onRefine, isRefining }: Props) {
  const hasRefinements = chips.refinements.length > 0
  const hasRelated = chips.related.length > 0

  if (!hasRefinements && !hasRelated) return null

  return (
    <div>
      {hasRefinements && (
        <div className={hasRelated ? 'mb-5' : ''}>
          <RefinementChips chips={chips} onRefine={onRefine} isRefining={isRefining} />
        </div>
      )}
      {hasRelated && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
          >
            Related topics
          </p>
          <RelatedChips chips={chips} />
        </div>
      )}
    </div>
  )
}
