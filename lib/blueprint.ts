/**
 * Article Blueprint Generator (Session 1.7C)
 *
 * Produces a structured editorial brief BEFORE prose writing begins.
 * Locks in: thesis, verdict, section structure, evidence mapping,
 * forbidden phrases, and word budgets.
 *
 * Uses Gemini Flash — small structured output, ~5-8 seconds, ~$0.002.
 */

import type { ArticlePlan, EntityCard, ResearchSynthesis, ArticleBlueprint, BlueprintSection, OpinionElements } from '@/types/article'
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
  liveData?: Record<string, unknown>[],
): Promise<ArticleBlueprint> {
  try {
    return await callBlueprintModel(query, plan, entityCards, synthesis, researchSummary, options, liveData)
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
  liveData?: Record<string, unknown>[],
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
${toneOption === 'technical' ? 'NOTE: The reader chose "technical" tone — write for an expert audience, assume domain knowledge, skip introductory explanations, go deeper on specifics and methodology.' : ''}
TARGET LENGTH: ~${targetWords} words total
${(options as Record<string, unknown>)?._userFeedback ? `\nREADER FEEDBACK (incorporate this direction into your blueprint):\n"${(options as Record<string, unknown>)._userFeedback}"\n` : ''}

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

${buildLiveDataContext(liveData)}
REQUIRED COMPONENTS: ${typeConfig?.requiredComponents.join(', ') ?? 'none'}
FORBIDDEN COMPONENTS: ${JSON.stringify(plan.forbidden_components ?? typeConfig?.forbiddenComponents ?? [])}
VERDICT REQUIRED: ${typeConfig?.verdictRequired ? 'YES' : 'NO'}
VERDICT STYLE: ${typeConfig?.verdictStyle ?? 'none'}

TYPE-SPECIFIC BLUEPRINT GUIDANCE:
${plan.article_type === 'ranked_list' ? `RANKED LIST: Plan a numbered section skeleton with rank positions. Use research findings to determine which items to rank and in what order. Each section should cover one ranked item with evidence for its position. Include intro, rank sections, and verdict.` : ''}${plan.article_type === 'myth_buster' ? `MYTH BUSTER: Plan myth/reality pair sections. Use research and Reddit data to identify common beliefs that are wrong or misleading. Each section covers one myth and its evidence-based debunking. Include intro, myth sections, and verdict on the biggest misconception.` : ''}${plan.article_type === 'timeline_article' ? `TIMELINE ARTICLE: Plan chronological sections with key dates identified from research. Each section covers a period or event. The overall narrative should show cause and effect. Include intro (why this history matters now), timeline entries, and conclusion with lessons/predictions.` : ''}${plan.article_type === 'visual_list' ? `VISUAL LIST: Plan item sections where each item needs a specific image search query. Use research to identify visually rich items. Each section covers one item with image + narrative. The ONLY sections allowed are: one brief intro, the visual items, and one brief conclusion (2-3 sentences). Do NOT plan any analytical sections like "Key Takeaways", "Things to Watch Out For", "Tips", or summary sections. Set executive_summary key_takeaways and watch_out_for to empty arrays.` : ''}

HEADLINE RULE: The article headline must NOT contain the verdict, winner, or conclusion. The headline promises what the reader will discover. The introduction establishes the question without answering it. The verdict section at the end is where the answer lives. Plan the article to build tension toward the conclusion.

YOUR TASK:

OPINION ELEMENTS (generate these BEFORE the section plan):

Before planning sections, produce these four elements. They will be used as mandatory inputs to the article:

1. THE CONTROVERSIAL TAKE: One statement that at least 30% of readers would disagree with or find surprising. Not clickbait — a genuine editorial position supported by evidence. This drives engagement.

2. THE MISUNDERSTANDING: One thing most people get wrong about this topic. This creates "I didn't know that" moments and makes the article feel like it's teaching something, not just summarising.

3. THE PREDICTION: One specific, time-bound, falsifiable prediction about what happens next. Not vague ("things will change") but specific ("by 2028, X will Y"). This creates shareability.

4. THE WINNER AND LOSER: Who benefits and who gets hurt. Not abstract ("consumers benefit") but specific ("Netflix wins, traditional cable loses" or "homeowners in Dubai benefit, first-time buyers get squeezed"). This creates narrative tension.

These four elements must appear prominently in the article — in big statement blocks, in the opening paragraphs, or as the thesis of key sections. They must NOT be buried in the middle of body paragraphs.

IMPORTANT: These must be grounded in the research evidence and entity cards. Strong opinions supported by data, not hot takes invented from nothing. If the research doesn't support a controversial position, the controversial_take should be the most surprising factual finding instead.

BIG STATEMENT PLACEMENT:
In the sections array, include 3-5 sections with type "big_statement". Each contains a single bold sentence. Place them:
- After the executive summary section
- Between major content sections (at natural argument transitions)
- Before the verdict/conclusion section

Each big_statement should be drawn from the opinion_elements. Map them:
- controversial_take → big statement after the intro
- misunderstanding → big statement before or after the section that corrects it
- prediction → big statement in the "what happens next" area
- winner_and_loser → big statement near the verdict

Do NOT place two big_statement sections consecutively. Always have content between them.

SECTION PLANNING:
1. Write a specific THESIS — the article's central argument in one sentence. No hedging.
2. Write the exact VERDICT text that will appear in the verdict box. Must be specific and decisive.${typeConfig?.verdictRequired === false ? ' (Optional for this article type — include only if it adds value.)' : ''}
3. For each section, specify: what it must cover, which entity card facts to reference, a word budget, and which visual components belong there.
4. List things the article must NOT say — unsupported claims, tangential angles, hedging language.
5. Word budgets are HARD LIMITS, not aspirational targets. Each section must stay within ±10% of its budget. Total article must NOT exceed ${targetWords} words. Shorter is always better.
6. ANTI-REPETITION: Each section must introduce NEW information. If a fact or argument appeared in an earlier section, do not repeat it. The verdict should not restate the executive summary — verdict = conclusion, summary = context.
7. STRUCTURE: Any section containing 3+ comparable items (features, pros, cons, options, reasons) should specify bullet/list format in key_points. Never bury a list inside a paragraph.
8. VISUAL DENSITY RULE: ${targetWords >= 2500 ? `At ${targetWords}+ words, this article MUST include at least 2 data visualization components (bar_chart, comparison_matrix, pie_chart, line_chart, stat_cards, or timeline) to break up long text. Assign them to specific sections.` : 'Include visual components where they add value — stat_cards for key numbers, charts for trends or comparisons.'}
9. CHART DATA RULE: Only assign chart components (bar_chart, line_chart, pie_chart) to sections where the entity cards or research provide SPECIFIC NUMBERS to plot. If a section has qualitative information but no hard data, use stat_cards or bullet points instead. Never plan a chart that would require the writer to invent data points.

Return ONLY valid JSON:
{
  "thesis": "string — the central argument",
  "verdict_statement": "string — exact text for the verdict box",
  "winner": "string or null — entity name for product articles",
  "opinion_elements": {
    "controversial_take": "string — surprising editorial position supported by evidence",
    "misunderstanding": "string — what most people get wrong about this topic",
    "prediction": "string — specific, time-bound, falsifiable prediction",
    "winner_and_loser": "string — who benefits and who gets hurt, with specifics"
  },
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
  const timeoutId = setTimeout(() => controller.abort(), 45_000)

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          // Disable thinking mode — blueprint is structured output, not reasoning
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    // Use last non-thinking part (Gemini 2.5 Flash thinking puts thoughts in earlier parts)
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const textParts = parts.filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
    const text = textParts.length > 0 ? textParts[textParts.length - 1].text : null
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
 * Build live data context section for the blueprint prompt.
 * Tells the blueprint which live data sources survived quality filters.
 */
function buildLiveDataContext(liveData?: Record<string, unknown>[]): string {
  if (!liveData || liveData.length === 0) {
    return 'LIVE DATA: None available. Do not allocate space for live data components.\n'
  }

  const sources = new Map<string, string[]>()
  for (const d of liveData) {
    const source = String(d.source ?? 'unknown')
    if (!sources.has(source)) sources.set(source, [])
    if (source === 'polymarket') {
      sources.get(source)!.push(`"${String(d.question ?? '').slice(0, 80)}"`)
    } else if (source === 'yahoo_finance') {
      sources.get(source)!.push(`${String(d.symbol ?? '')} ($${String(d.price ?? '')}, ${String(d.changePercent ?? '0')}%)`)
    } else if (source === 'google_trends') {
      sources.get(source)!.push(`"${String(d.query ?? '')}" (trend: ${String(d.trend ?? 'unknown')}, ${String(d.changePercent ?? '0')}% change)`)
    }
  }

  const lines = ['LIVE DATA AVAILABLE (passed quality filters — plan section placement for these):']
  for (const [source, items] of sources) {
    lines.push(`- ${source}: ${items.join(', ')}`)
  }
  lines.push('Place live_data_card components near the top of the article, after the executive summary.')
  lines.push('')

  return lines.join('\n')
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

  // Normalise opinion elements
  const rawOE = raw.opinion_elements as Partial<OpinionElements> | undefined
  const opinion_elements: OpinionElements | undefined = rawOE && typeof rawOE === 'object'
    ? {
        controversial_take: rawOE.controversial_take || '',
        misunderstanding: rawOE.misunderstanding || '',
        prediction: rawOE.prediction || '',
        winner_and_loser: rawOE.winner_and_loser || '',
      }
    : undefined

  return {
    thesis: raw.thesis || '',
    verdict_statement: raw.verdict_statement || '',
    winner: raw.winner ?? null,
    opinion_elements,
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

  if (blueprint.opinion_elements) {
    const oe = blueprint.opinion_elements
    parts.push('')
    parts.push('OPINION ELEMENTS (weave these prominently into the article and big statements):')
    if (oe.controversial_take) parts.push(`- CONTROVERSIAL TAKE: ${oe.controversial_take}`)
    if (oe.misunderstanding) parts.push(`- MISUNDERSTANDING: ${oe.misunderstanding}`)
    if (oe.prediction) parts.push(`- PREDICTION: ${oe.prediction}`)
    if (oe.winner_and_loser) parts.push(`- WINNER & LOSER: ${oe.winner_and_loser}`)
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
