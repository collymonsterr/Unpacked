/**
 * Article Blueprint Generator (Session 1.7C)
 *
 * Produces a structured editorial brief BEFORE prose writing begins.
 * Locks in: thesis, verdict, section structure, evidence mapping,
 * forbidden phrases, and word budgets.
 *
 * Uses Gemini Flash — small structured output, ~5-8 seconds, ~$0.002.
 */

import type { ArticlePlan, EntityCard, ResearchSynthesis, ArticleBlueprint, BlueprintSection } from '@/types/article'
import { ARTICLE_TYPES, type ArticleType } from '@/lib/article-types'
import { FORBIDDEN_PHRASES, getToneDescription } from '@/lib/editorial-rules'
import { extractJSON } from '@/lib/utils/extract-json'
import { logApiCall } from '@/lib/api-usage'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

/**
 * Generate an article blueprint that constrains the prose writing pass.
 *
 * If the call fails, returns a fallback blueprint built from the plan.
 */
export async function generateBlueprint(
  query: string,
  plan: ArticlePlan,
  entityCards: EntityCard[],
  synthesis: ResearchSynthesis,
  researchSummary: string,
  options: Record<string, unknown>,
): Promise<ArticleBlueprint> {
  try {
    return await callBlueprintModel(query, plan, entityCards, synthesis, researchSummary, options)
  } catch (err) {
    console.warn('[blueprint] Generation failed — using fallback:', (err as Error).message)
    return buildFallbackBlueprint(query, plan, synthesis, options)
  }
}

async function callBlueprintModel(
  query: string,
  plan: ArticlePlan,
  entityCards: EntityCard[],
  synthesis: ResearchSynthesis,
  researchSummary: string,
  options: Record<string, unknown>,
): Promise<ArticleBlueprint> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const typeConfig = ARTICLE_TYPES[plan.article_type as ArticleType]
  const lengthOption = (options?.length as string) ?? 'standard'
  const toneOption = (options?.tone as string) ?? 'opinionated'
  const targetWords = getTargetWordCount(plan.article_type as ArticleType, lengthOption)
  const toneDesc = getToneDescription(typeConfig?.tone ?? '')

  // Build compact entity summaries (top 3 facts each)
  const entitySummaries = entityCards.slice(0, 8).map(card => {
    const facts = card.facts.slice(0, 3).map(f => `${f.claim} (${f.source})`).join('; ')
    return `- ${card.canonical_name} (${card.type}): ${facts}${card.conflicts.length > 0 ? ` | CONFLICTS: ${card.conflicts.join('; ')}` : ''}`
  }).join('\n')

  const prompt = `You are the editorial director at Unpacked. Your job is to create a BLUEPRINT that a writer will follow exactly. This is not an article — it's a structured plan that locks in every editorial decision.

ARTICLE QUERY: "${query}"
ARTICLE TYPE: ${plan.article_type} — ${typeConfig?.description ?? ''}
TONE: ${toneDesc}
${toneOption === 'balanced' ? 'NOTE: The reader chose "balanced" tone — still take positions but acknowledge counter-arguments more.' : ''}
${toneOption === 'casual' ? 'NOTE: The reader chose "casual" tone — conversational, shorter sentences, more personality.' : ''}
TARGET LENGTH: ~${targetWords} words total

PLANNED SECTIONS:
${(plan.sections ?? plan.sections_outline.map(h => ({ heading: h, purpose: '' }))).map((s, i) => `${i + 1}. ${typeof s === 'string' ? s : s.heading}${typeof s !== 'string' && s.purpose ? ` — ${s.purpose}` : ''}`).join('\n')}

ENTITY CARDS:
${entitySummaries || '(no entities)'}

SYNTHESIS:
- Thesis direction: ${synthesis.thesis_direction || 'not determined'}
- Likely winner: ${synthesis.likely_winner || 'none'}
- Comparison axes: ${synthesis.comparison_axes.join(', ') || 'none'}
- Key data points: ${synthesis.key_data_points.join('; ') || 'none'}
- Caveats: ${synthesis.caveats.join('; ') || 'none'}
- Community says: ${synthesis.community_sentiment_summary || 'no data'}
- Research gaps: ${synthesis.gaps.join('; ') || 'none'}

REQUIRED COMPONENTS: ${typeConfig?.requiredComponents.join(', ') ?? 'none'}
FORBIDDEN COMPONENTS: ${JSON.stringify(plan.forbidden_components ?? typeConfig?.forbiddenComponents ?? [])}
VERDICT REQUIRED: ${typeConfig?.verdictRequired ? 'YES' : 'NO'}
VERDICT STYLE: ${typeConfig?.verdictStyle ?? 'none'}

YOUR TASK:
1. Write a specific THESIS — the article's central argument in one sentence. No hedging.
2. Write the exact VERDICT text that will appear in the verdict box. Must be specific and decisive.${typeConfig?.verdictRequired === false ? ' (Optional for this article type — include only if it adds value.)' : ''}
3. For each section, specify: what it must cover, which entity card facts to reference, a word budget, and which visual components belong there.
4. List things the article must NOT say — unsupported claims, tangential angles, hedging language.
5. Word budgets must sum to approximately ${targetWords} words (±10%).

Return ONLY valid JSON:
{
  "thesis": "string — the central argument",
  "verdict_statement": "string — exact text for the verdict box",
  "winner": "string or null — entity name for product articles",
  "sections": [
    {
      "id": "section_01",
      "heading": "string",
      "purpose": "string — what this section achieves",
      "key_points": ["string — specific points to cover"],
      "evidence_ids": ["entity_001 — which entity cards to reference"],
      "target_words": 200,
      "components": ["comparison_table", "stat_cards — visual components for this section"]
    }
  ],
  "evidence_map": {"section_01": ["entity_001", "entity_002"]},
  "what_not_to_say": ["string — specific claims or angles to avoid"],
  "forbidden_phrases": ["string — phrases that must never appear"],
  "tone_notes": "string — specific tone guidance for this article",
  "target_word_count": ${targetWords}
}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')

    // Log usage
    try {
      logApiCall({
        callType: 'blueprint',
        model: 'gemini-2.5-flash',
        inputTokens: Math.round(prompt.length / 3.8),
        outputTokens: Math.round(text.length / 3.8),
      })
    } catch { /* non-critical */ }

    const parsed = JSON.parse(extractJSON(text)) as ArticleBlueprint

    // Validate and normalise
    return normaliseBlueprint(parsed, plan, targetWords)
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

/**
 * Validate and fill in missing fields on a parsed blueprint.
 */
function normaliseBlueprint(
  raw: Partial<ArticleBlueprint>,
  plan: ArticlePlan,
  targetWords: number,
): ArticleBlueprint {
  const sections: BlueprintSection[] = Array.isArray(raw.sections)
    ? raw.sections.map((s, i) => ({
        id: s.id || `section_${String(i + 1).padStart(2, '0')}`,
        heading: s.heading || `Section ${i + 1}`,
        purpose: s.purpose || '',
        key_points: Array.isArray(s.key_points) ? s.key_points : [],
        evidence_ids: Array.isArray(s.evidence_ids) ? s.evidence_ids : [],
        target_words: typeof s.target_words === 'number' ? s.target_words : Math.round(targetWords / (raw.sections?.length || 5)),
        components: Array.isArray(s.components) ? s.components : [],
      }))
    : []

  // Merge standard forbidden phrases with any blueprint-specific ones
  const blueprintForbidden = Array.isArray(raw.forbidden_phrases) ? raw.forbidden_phrases : []
  const allForbidden = [...new Set([...FORBIDDEN_PHRASES, ...blueprintForbidden])]

  return {
    thesis: raw.thesis || '',
    verdict_statement: raw.verdict_statement || '',
    winner: raw.winner ?? null,
    sections,
    evidence_map: raw.evidence_map && typeof raw.evidence_map === 'object' ? raw.evidence_map : {},
    what_not_to_say: Array.isArray(raw.what_not_to_say) ? raw.what_not_to_say : [],
    forbidden_phrases: allForbidden,
    tone_notes: raw.tone_notes || '',
    target_word_count: typeof raw.target_word_count === 'number' ? raw.target_word_count : targetWords,
  }
}

/**
 * Build a fallback blueprint from plan data when the model call fails.
 */
function buildFallbackBlueprint(
  query: string,
  plan: ArticlePlan,
  synthesis: ResearchSynthesis,
  options: Record<string, unknown>,
): ArticleBlueprint {
  const typeConfig = ARTICLE_TYPES[plan.article_type as ArticleType]
  const lengthOption = (options?.length as string) ?? 'standard'
  const targetWords = getTargetWordCount(plan.article_type as ArticleType, lengthOption)
  const sectionSources = plan.sections ?? plan.sections_outline.map(h => ({ heading: h, purpose: '' }))

  const sections: BlueprintSection[] = sectionSources.map((s, i) => {
    const heading = typeof s === 'string' ? s : s.heading
    const purpose = typeof s === 'string' ? '' : s.purpose
    return {
      id: `section_${String(i + 1).padStart(2, '0')}`,
      heading,
      purpose,
      key_points: [],
      evidence_ids: [],
      target_words: Math.round(targetWords / sectionSources.length),
      components: [],
    }
  })

  return {
    thesis: synthesis.thesis_direction || plan.quick_verdict_preview || '',
    verdict_statement: plan.quick_verdict_preview || '',
    winner: synthesis.likely_winner ?? null,
    sections,
    evidence_map: {},
    what_not_to_say: [],
    forbidden_phrases: [...FORBIDDEN_PHRASES],
    tone_notes: getToneDescription(typeConfig?.tone ?? ''),
    target_word_count: targetWords,
  }
}

/**
 * Calculate target word count from article type and length option.
 */
function getTargetWordCount(articleType: ArticleType, lengthOption: string): number {
  const config = ARTICLE_TYPES[articleType]
  if (!config) return 1200

  const { min, max } = config.lengthRange
  switch (lengthOption) {
    case 'quick': return min
    case 'deep': return max
    default: return Math.round((min + max) / 2)
  }
}

/**
 * Format a blueprint into a prompt section for the prose writer.
 */
export function formatBlueprintForPrompt(blueprint: ArticleBlueprint): string {
  const parts: string[] = [
    '',
    '=== ARTICLE BLUEPRINT (FOLLOW THIS EXACTLY) ===',
    '',
    `THESIS: ${blueprint.thesis}`,
    `VERDICT: ${blueprint.verdict_statement}`,
  ]

  if (blueprint.winner) {
    parts.push(`WINNER: ${blueprint.winner}`)
  }

  parts.push('')
  parts.push('SECTIONS (write in this exact order):')

  for (const s of blueprint.sections) {
    parts.push(``)
    parts.push(`## ${s.heading}`)
    if (s.purpose) parts.push(`Purpose: ${s.purpose}`)
    if (s.key_points.length > 0) parts.push(`Must cover: ${s.key_points.join('; ')}`)
    if (s.evidence_ids.length > 0) parts.push(`Evidence to reference: ${s.evidence_ids.join(', ')}`)
    parts.push(`Word budget: ~${s.target_words} words`)
    if (s.components.length > 0) parts.push(`Components: ${s.components.join(', ')}`)
  }

  parts.push('')
  if (blueprint.what_not_to_say.length > 0) {
    parts.push('WHAT NOT TO SAY:')
    for (const x of blueprint.what_not_to_say) {
      parts.push(`- ${x}`)
    }
    parts.push('')
  }

  // Include a sample of forbidden phrases (not all 50 — too noisy)
  const sampleForbidden = blueprint.forbidden_phrases.slice(0, 20)
  parts.push('FORBIDDEN PHRASES (never use these — this is a sample, the full list is enforced):')
  for (const x of sampleForbidden) {
    parts.push(`- "${x}"`)
  }

  parts.push('')
  if (blueprint.tone_notes) {
    parts.push(`TONE: ${blueprint.tone_notes}`)
  }
  parts.push(`TARGET TOTAL: ~${blueprint.target_word_count} words`)
  parts.push('')
  parts.push('=== END BLUEPRINT ===')

  return parts.join('\n')
}
