/**
 * Formats entity cards + synthesis into a structured research section
 * for the writing prompt. Used by both Gemini and Sonnet writers.
 */

import type { EntityCard, ResearchSynthesis } from '@/types/article'

/**
 * Build a structured research section to append after the flat research summary.
 * Returns empty string if no entity cards or synthesis provided.
 */
export function buildStructuredResearchPrompt(
  entityCards?: EntityCard[],
  synthesis?: ResearchSynthesis,
): string {
  if ((!entityCards || entityCards.length === 0) && !synthesis) {
    return ''
  }

  const parts: string[] = [
    '',
    '=== STRUCTURED RESEARCH ===',
    '',
  ]

  // Entity cards section
  if (entityCards && entityCards.length > 0) {
    parts.push('ENTITY CARDS:')
    for (const card of entityCards.slice(0, 8)) {
      parts.push(`[${card.canonical_name}] (${card.type}, relevance: ${card.relevance_score}/100)`)

      if (card.facts.length > 0) {
        parts.push('Key facts:')
        for (const f of card.facts.slice(0, 5)) {
          parts.push(`- ${f.claim} (${f.source}, confidence: ${f.confidence})`)
        }
      }

      if (card.conflicts.length > 0) {
        parts.push(`Conflicts: ${card.conflicts.join('; ')}`)
      }

      if (card.community_sentiment) {
        parts.push(`Reddit says: ${card.community_sentiment.slice(0, 200)}`)
      }

      if (card.product_fields) {
        const pf = card.product_fields
        const specs: string[] = []
        if (pf.price) specs.push(`price: ${pf.price}`)
        if (pf.category) specs.push(`category: ${pf.category}`)
        if (pf.brand) specs.push(`brand: ${pf.brand}`)
        if (pf.key_specs) {
          for (const [k, v] of Object.entries(pf.key_specs)) {
            specs.push(`${k}: ${v}`)
          }
        }
        if (specs.length > 0) {
          parts.push(`Product info: ${specs.join(', ')}`)
        }
      }

      parts.push('') // blank line between entities
    }
  }

  // Synthesis section
  if (synthesis && synthesis.thesis_direction) {
    parts.push('SYNTHESIS:')
    parts.push(`Thesis direction: ${synthesis.thesis_direction}`)

    if (synthesis.likely_winner) {
      parts.push(`Likely winner: ${synthesis.likely_winner}`)
    }

    if (synthesis.comparison_axes.length > 0) {
      parts.push(`Compare on: ${synthesis.comparison_axes.join(', ')}`)
    }

    if (Object.keys(synthesis.strongest_arguments).length > 0) {
      parts.push('Strongest arguments:')
      for (const [entity, arg] of Object.entries(synthesis.strongest_arguments)) {
        parts.push(`- ${entity}: ${arg}`)
      }
    }

    if (synthesis.caveats.length > 0) {
      parts.push(`Key caveats: ${synthesis.caveats.join('; ')}`)
    }

    if (synthesis.community_sentiment_summary) {
      parts.push(`Community sentiment: ${synthesis.community_sentiment_summary}`)
    }

    if (synthesis.key_data_points.length > 0) {
      parts.push(`Key data points: ${synthesis.key_data_points.join('; ')}`)
    }

    if (synthesis.gaps.length > 0) {
      parts.push(`Research gaps: ${synthesis.gaps.join('; ')}`)
    }

    if (synthesis.source_quality) {
      parts.push(`Source quality: ${synthesis.source_quality}`)
    }
  }

  return parts.join('\n')
}
