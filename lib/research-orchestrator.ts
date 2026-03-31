/**
 * Research Orchestrator (Session 1.7A + 1.7B)
 *
 * Receives the plan's research manifest and executes all research in parallel.
 * Then extracts entity cards and builds a synthesis via Haiku.
 *
 * Flow:
 *   1. Promise.all(brave, reddit)       — parallel research
 *   2. compileResearch(results)          — structured findings + summary
 *   3. extractEntityCards(entities, findings) — sync extraction
 *   4. buildSynthesis(cards, findings, plan) — Haiku call (~2-3s)
 *   5. return { findings, summary, entityCards, synthesis }
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ArticlePlan, ResearchManifest, EntityCard, ResearchSynthesis, PlanEntity } from '@/types/article'
import {
  executeBraveQueries,
  compileResearch,
  type SearchResult,
  type ResearchFinding,
} from '@/lib/brave-research'
import { extractEntityCards } from '@/lib/entity-extraction'
import { logApiCall } from '@/lib/api-usage'
import { extractJSON } from '@/lib/utils/extract-json'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
      timeout: 30_000,
    })
  }
  return _anthropic
}

export interface OrchestratedResearchResult {
  /** Condensed summary string for the writing model (backwards compatible) */
  summary: string
  /** Token estimate for the summary */
  tokenEstimate: number
  /** Number of searches performed */
  searchCount: number
  /** Unique sources found */
  sources: Array<{ title: string; url: string }>
  /** Reddit threads found */
  redditThreads: Array<{ title: string; url: string; subreddit: string }>
  /** All structured findings */
  findings: ResearchFinding[]
  /** Structured entity cards extracted from findings */
  entityCards: EntityCard[]
  /** High-level synthesis of research (from Haiku) */
  synthesis: ResearchSynthesis
}

/**
 * Execute all research from the plan's manifest in parallel,
 * then extract entity cards and build synthesis.
 */
export async function executeResearch(
  manifest: ResearchManifest,
  plan: ArticlePlan,
  length: 'quick' | 'standard' | 'deep' = 'standard',
): Promise<OrchestratedResearchResult> {
  const resultsPerQuery = length === 'deep' ? 8 : 6

  console.log(
    `[research-orchestrator] Starting parallel research: ${manifest.brave_queries.length} brave, ${manifest.reddit_queries.length} reddit queries`
  )

  const startTime = Date.now()

  // ── Step 1: Fire all research tasks in parallel ──
  const [braveResults, redditResults] = await Promise.all([
    executeBraveQueries(manifest.brave_queries, resultsPerQuery),
    executeRedditQueries(manifest.reddit_queries, resultsPerQuery),
  ])

  // Merge all results into a single map for compilation
  const allResults = new Map<string, SearchResult[]>()
  for (const [q, r] of braveResults) {
    allResults.set(q, r)
  }
  for (const [q, r] of redditResults) {
    allResults.set(q, r)
  }

  // ── Step 2: Compile into structured findings + summary ──
  const compiled = compileResearch(allResults, plan.entities ?? [])

  const searchElapsed = Date.now() - startTime
  console.log(
    `[research-orchestrator] Search complete in ${searchElapsed}ms: ${compiled.searchCount} searches, ${compiled.findings.length} findings`
  )

  // ── Step 3: Extract entity cards (sync, pure) ──
  let entityCards: EntityCard[] = []
  try {
    let planEntities = plan.entities ?? []

    // Fallback: if plan has no entities, extract them from research findings
    if (planEntities.length === 0 && compiled.findings.length > 0) {
      planEntities = extractEntitiesFromFindings(compiled.findings)
      console.log(`[research-orchestrator] Fallback extracted ${planEntities.length} entities from findings`)
    }

    entityCards = extractEntityCards(planEntities, compiled.findings, plan.article_type)
  } catch (err) {
    console.warn('[research-orchestrator] Entity extraction failed — continuing without cards:', (err as Error).message, (err as Error).stack)
  }

  // ── Step 4: Build synthesis via Haiku ──
  let synthesis: ResearchSynthesis = buildDefaultSynthesis(entityCards, plan)
  try {
    synthesis = await buildSynthesis(entityCards, compiled.findings, plan)
    console.log(`[research-orchestrator] Synthesis complete: winner="${synthesis.likely_winner ?? 'none'}", axes=${synthesis.comparison_axes.length}`)
  } catch (err) {
    console.warn('[research-orchestrator] Synthesis failed — using default:', (err as Error).message)
    // synthesis already has the default
  }

  const totalElapsed = Date.now() - startTime
  console.log(
    `[research-orchestrator] Complete in ${totalElapsed}ms: ${compiled.sources.length} sources, ${entityCards.length} entities, synthesis=${synthesis.thesis_direction ? 'yes' : 'no'}`
  )

  return {
    summary: compiled.summary,
    tokenEstimate: compiled.tokenEstimate,
    searchCount: compiled.searchCount,
    sources: compiled.sources,
    redditThreads: compiled.redditThreads,
    findings: compiled.findings,
    entityCards,
    synthesis,
  }
}

// ── Synthesis via Haiku ───────────────────────────────────────────────────────

const SYNTHESIS_SYSTEM = `You are a research analyst preparing a brief for a senior editorial writer. Given structured entity cards and research findings, produce a JSON synthesis that tells the writer:
- What the thesis direction is (the likely editorial angle)
- What axes to compare on (for product/comparison articles)
- Each entity's strongest argument
- Who the likely winner is (or null for non-comparative articles)
- Key caveats and nuances
- Community sentiment summary
- Key data points that must appear in the article
- Source quality assessment
- Gaps in the research

Be concise and direct. This is an internal brief, not the article.
Respond ONLY with valid JSON. No preamble, no markdown fences.`

async function buildSynthesis(
  entityCards: EntityCard[],
  findings: ResearchFinding[],
  plan: ArticlePlan,
): Promise<ResearchSynthesis> {
  // Build a compact input for Haiku
  const entitySummaries = entityCards.slice(0, 8).map(card => {
    const topFacts = card.facts.slice(0, 4).map(f => `${f.claim} (${f.source})`).join('; ')
    return `[${card.canonical_name}] type=${card.type}, relevance=${card.relevance_score}/100, facts: ${topFacts}${card.conflicts.length > 0 ? `, conflicts: ${card.conflicts.join('; ')}` : ''}${card.community_sentiment ? `, reddit: ${card.community_sentiment.slice(0, 100)}` : ''}`
  }).join('\n')

  // Include some non-entity findings for broader context
  const topFindings = findings
    .filter(f => f.content.length > 40)
    .slice(0, 10)
    .map(f => `- ${f.content.slice(0, 150)} (${f.source})`)
    .join('\n')

  const sourceTypes = findings.reduce((acc, f) => {
    acc[f.source_type] = (acc[f.source_type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const userMessage = `Article query: "${plan.title}"
Article type: ${plan.article_type}

ENTITY CARDS:
${entitySummaries || '(no entities)'}

KEY FINDINGS:
${topFindings || '(no findings)'}

SOURCE BREAKDOWN: ${Object.entries(sourceTypes).map(([k, v]) => `${v} ${k}`).join(', ')}

Return JSON:
{
  "thesis_direction": "string — the likely editorial angle in one sentence",
  "comparison_axes": ["string — dimensions to compare on, empty for non-comparative"],
  "strongest_arguments": {"entity_name": "their best case in one sentence"},
  "likely_winner": "entity name or null",
  "caveats": ["string — important nuances"],
  "community_sentiment_summary": "string — what Reddit/forums say overall",
  "key_data_points": ["string — specific facts/numbers that must be in the article"],
  "source_quality": "string — brief assessment of source quality and coverage",
  "gaps": ["string — what the research didn't find"]
}`

  const model = 'claude-haiku-4-5-20251001'
  const message = await getAnthropic().messages.create({
    model,
    max_tokens: 1024,
    system: SYNTHESIS_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  })

  logApiCall({
    callType: 'synthesis',
    model,
    inputTokens: message.usage?.input_tokens,
    outputTokens: message.usage?.output_tokens,
  })

  const text = message.content.find(b => b.type === 'text')?.text ?? ''
  const parsed = JSON.parse(extractJSON(text)) as ResearchSynthesis

  // Validate required fields
  return {
    thesis_direction: parsed.thesis_direction || '',
    comparison_axes: Array.isArray(parsed.comparison_axes) ? parsed.comparison_axes : [],
    strongest_arguments: parsed.strongest_arguments && typeof parsed.strongest_arguments === 'object' ? parsed.strongest_arguments : {},
    likely_winner: parsed.likely_winner ?? null,
    caveats: Array.isArray(parsed.caveats) ? parsed.caveats : [],
    community_sentiment_summary: parsed.community_sentiment_summary || '',
    key_data_points: Array.isArray(parsed.key_data_points) ? parsed.key_data_points : [],
    source_quality: parsed.source_quality || '',
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
  }
}

/**
 * Build a minimal default synthesis from entity cards when Haiku fails.
 */
function buildDefaultSynthesis(entityCards: EntityCard[], plan: ArticlePlan): ResearchSynthesis {
  const topEntity = entityCards.length > 0 ? entityCards[0] : null
  return {
    thesis_direction: plan.quick_verdict_preview || '',
    comparison_axes: [],
    strongest_arguments: {},
    likely_winner: topEntity?.canonical_name ?? null,
    caveats: [],
    community_sentiment_summary: '',
    key_data_points: [],
    source_quality: `${entityCards.length} entities identified`,
    gaps: [],
  }
}

// ── Fallback entity extraction from findings ─────────────────────────────────

/**
 * Extract entity names from research findings when the plan has no entities.
 * Scans for frequently mentioned capitalised multi-word phrases (proper nouns,
 * product names, brand names, organisation names).
 */
function extractEntitiesFromFindings(findings: ResearchFinding[]): PlanEntity[] {
  // Combine all finding content
  const allText = findings.map(f => f.content).join(' ')

  // Match capitalised multi-word phrases (2-5 words, each starting with uppercase)
  // This catches product names like "Ninja Air Fryer", org names like "Bureau of Labor Statistics"
  const phraseRegex = /\b([A-Z][a-z]+(?:\s+(?:of|the|and|for|in|on|by|at|de|la|le|el|van|von|der|den|das|di|du|des)?\s*)?(?:[A-Z][a-z]+(?:\s+(?:of|the|and|for|in|on|by|at)?\s*)?){1,4})\b/g
  const mentions = new Map<string, number>()

  let match
  while ((match = phraseRegex.exec(allText)) !== null) {
    const phrase = match[1].trim()
    // Skip very short or very common phrases
    if (phrase.length < 4) continue
    if (['The', 'This', 'That', 'These', 'Those', 'Here', 'There', 'What', 'When', 'Where', 'Which', 'About', 'After', 'Before', 'Between', 'During', 'Under', 'According'].includes(phrase)) continue
    mentions.set(phrase, (mentions.get(phrase) ?? 0) + 1)
  }

  // Also match single capitalised words that appear very frequently (brand names like "Apple", "Google")
  const singleRegex = /\b([A-Z][a-z]{3,})\b/g
  while ((match = singleRegex.exec(allText)) !== null) {
    const word = match[1]
    if (['This', 'That', 'These', 'Those', 'Here', 'There', 'What', 'When', 'Where', 'Which', 'About', 'After', 'Before', 'Between', 'During', 'Under', 'However', 'According', 'Also', 'Many', 'Most', 'Some', 'Other', 'More', 'Best', 'First', 'Last', 'Just', 'Like', 'Very', 'Even', 'Still', 'While', 'From', 'Into', 'With', 'Over'].includes(word)) continue
    mentions.set(word, (mentions.get(word) ?? 0) + 1)
  }

  // Sort by frequency, take top entities (minimum 2 mentions to filter noise)
  const sorted = [...mentions.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return sorted.map(([name]) => ({
    name,
    product_category: '',
    search_query: name,
  }))
}

// ── Reddit query helper ───────────────────────────────────────────────────────

/**
 * Execute Reddit-specific queries via Brave Search.
 * Appends "reddit" and subreddit names to queries for targeted results.
 */
async function executeRedditQueries(
  redditQueries: ResearchManifest['reddit_queries'],
  resultsPerQuery: number,
): Promise<Map<string, SearchResult[]>> {
  if (!redditQueries || redditQueries.length === 0) {
    return new Map()
  }

  const searchQueries = redditQueries.map(rq => {
    const subs = rq.subreddits.slice(0, 3)
    if (subs.length > 0) {
      return {
        query: `${rq.query} reddit ${subs.map(s => `r/${s}`).join(' ')}`,
        purpose: 'community' as const,
      }
    }
    return {
      query: `${rq.query} reddit`,
      purpose: 'community' as const,
    }
  })

  return executeBraveQueries(searchQueries, resultsPerQuery)
}
