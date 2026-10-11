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
import { createAnthropic } from '@/lib/anthropic-client'
import type { ArticlePlan, ResearchManifest, EntityCard, ResearchSynthesis, PlanEntity, LiveDataQuery, TwitterFinding, TwitterSentimentSplit, RedditSentimentSplit, RedditThread, VideoFinding } from '@/types/article'
import { executeVideoQueries } from '@/lib/brave-video-search'
import {
  executeBraveQueries,
  compileResearch,
  normalizeRedditUrl,
  type SearchResult,
  type ResearchFinding,
} from '@/lib/brave-research'
import { extractEntityCards } from '@/lib/entity-extraction'
import { fetchTopComments, isRedditNativeEnabled, type RedditComment } from '@/lib/reddit-comments'
import { MODELS } from '@/lib/models'
import { logApiCall } from '@/lib/api-usage'
import { extractJSON } from '@/lib/utils/extract-json'
import { searchPolymarket, type PolymarketResult } from '@/lib/data-sources/polymarket'
import { fetchQuotes, searchFinanceSymbols, type YahooFinanceResult } from '@/lib/data-sources/yahoo-finance'
import { fetchGoogleTrends, type GoogleTrendsResult } from '@/lib/data-sources/google-trends'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
      timeout: 30_000,
    })
  }
  return _anthropic
}

/**
 * Strip leading emoji-tally markers from Reddit snippets.
 * Some Reddit users format their posts with sentiment tallies like
 * "✅131 😐10 ❌17 | TL;DR: ..." which look garbled when rendered as
 * a plain snippet. This strips the tally prefix and leading separators.
 */
function sanitizeRedditSnippet(snippet: string): string {
  // Match runs of emoji + number pairs (at least 2), followed by optional separators
  return snippet.replace(/^[\s]*(?:[✅❌😐⚠️👍👎⭐🔥💀🏆⬆️⬇️🟢🔴🟡]\s*\d+\s*){2,}[|·:—\-–\s]*/u, '').trim()
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
  /** Reddit threads found (enriched with metadata when available) */
  redditThreads: Array<{ title: string; url: string; subreddit: string; num_comments?: number; score?: number }>
  /** All structured findings */
  findings: ResearchFinding[]
  /** Structured entity cards extracted from findings */
  entityCards: EntityCard[]
  /** High-level synthesis of research (from Haiku) */
  synthesis: ResearchSynthesis
  /** Live data results from Polymarket, Yahoo Finance, Google Trends */
  liveData: Record<string, unknown>[]
  /** Tweet/X findings sourced via Brave site:x.com searches */
  twitterFindings: TwitterFinding[]
  /** One-paragraph Haiku-generated summary of the X conversation, or null when no findings */
  twitterSummary: string | null
  /** Sentiment split percentages + labels from Haiku classification */
  twitterSentimentSplit: TwitterSentimentSplit | null
  /** Context trigger — "Trending after [event]" — from Haiku, or null */
  twitterContextTrigger: string | null
  /** Total raw results analysed before filtering to final findings */
  twitterPostsAnalysed: number
  /** Reddit threads as top-level data (full pool for remove/replace mechanic) */
  redditThreadsPool: RedditThread[]
  /** Haiku-generated summary of Reddit discussion, or null */
  redditSummary: string | null
  /** Reddit sentiment split from Haiku classification */
  redditSentimentSplit: RedditSentimentSplit | null
  /** Reddit context trigger — "Trending after [event]" — from Haiku, or null */
  redditContextTrigger: string | null
  /** Total Reddit threads analysed */
  redditThreadsAnalysed: number
  /** YouTube/Vimeo videos found via Brave video search (only when planner emits video_queries) */
  videoFindings: VideoFinding[]
}

/**
 * Execute all research from the plan's manifest in parallel,
 * then extract entity cards and build synthesis.
 */
export async function executeResearch(
  manifest: ResearchManifest,
  plan: ArticlePlan,
  length: 'quick' | 'standard' | 'deep' = 'standard',
  articleId?: string,
): Promise<OrchestratedResearchResult> {
  const resultsPerQuery = length === 'deep' ? 8 : 6

  const liveDataQueries = manifest.live_data ?? []
  const startTime = Date.now()

  // ── Step 1: Fire all research tasks in parallel ──
  const [braveResults, redditResults, twitterResult, liveData, videoFindings] = await Promise.all([
    executeBraveQueries(manifest.brave_queries, resultsPerQuery),
    executeRedditQueries(manifest.reddit_queries, resultsPerQuery),
    executeTwitterQueries(manifest.twitter_queries, resultsPerQuery, plan.article_type),
    executeLiveDataQueries(liveDataQueries, plan, articleId),
    executeVideoQueries(manifest.video_queries, length === 'deep' ? 10 : 8),
  ])
  const twitterFindings = twitterResult.findings
  const twitterPostsAnalysed = twitterResult.rawCount
  const searchMs = Date.now() - startTime

  // Merge all results into a single map for compilation
  const allResults = new Map<string, SearchResult[]>()
  for (const [q, r] of braveResults) {
    allResults.set(q, r)
  }
  for (const [q, r] of redditResults) {
    allResults.set(q, r)
  }

  // ── Step 2: Compile into structured findings + summary ──
  const compiled = await compileResearch(allResults, plan.entities ?? [])

  // ── Step 3: Extract entity cards (sync, pure) ──
  const entityStart = Date.now()
  let entityCards: EntityCard[] = []
  try {
    let planEntities = plan.entities ?? []

    // Fallback: if plan has no entities, extract them from research findings
    if (planEntities.length === 0 && compiled.findings.length > 0) {
      planEntities = extractEntitiesFromFindings(compiled.findings)
    }

    entityCards = extractEntityCards(planEntities, compiled.findings, plan.article_type)
  } catch (err) {
    console.warn('[research] Entity extraction failed:', (err as Error).message)
  }
  const entityMs = Date.now() - entityStart

  // ── Step 3b: Deduplicate Reddit threads by normalised URL + content similarity ──
  const seenRedditUrls = new Set<string>()
  const seenRedditSnippets = new Set<string>()
  const dedupedRedditThreads = (compiled.redditThreads ?? []).filter(t => {
    const norm = normalizeRedditUrl(t.url)
    if (seenRedditUrls.has(norm)) return false
    seenRedditUrls.add(norm)
    // Also dedupe by title prefix (first 80 chars) to catch same thread surfaced via different URLs
    const titleKey = t.title?.slice(0, 80).toLowerCase().trim()
    if (titleKey && seenRedditSnippets.has(titleKey)) return false
    if (titleKey) seenRedditSnippets.add(titleKey)
    return true
  })

  // ── Step 3c: Get REAL top comments for the most-engaged threads (Reddit native) ──
  // The card quote used to be Brave's truncated page blurb. Instead, read the actual
  // top-voted comments from each thread's public .json so Haiku can quote a real,
  // complete, on-topic owner opinion. These are almost always CACHE HITS: the Brave
  // comment-count filter (enrichAndFilterRedditThreads) already fetched each thread's
  // .json and cached its comments via the shared fetchThreadData(), so this adds ~0
  // extra Reddit requests. Capped, graceful — empty map on any failure falls back to
  // the Brave snippet below.
  const MAX_COMMENT_THREADS = 6
  let commentsByUrl = new Map<string, RedditComment[]>()
  if (isRedditNativeEnabled() && dedupedRedditThreads.length > 0) {
    const ranked = [...dedupedRedditThreads]
      .sort((a, b) => ((b.score ?? 0) + (b.num_comments ?? 0)) - ((a.score ?? 0) + (a.num_comments ?? 0)))
      .slice(0, MAX_COMMENT_THREADS)
    try {
      const fetched = await Promise.all(
        ranked.map(async t => [t.url, await fetchTopComments(t.url, { limit: 8 })] as const),
      )
      commentsByUrl = new Map(fetched.filter(([, c]) => c.length > 0))
      const withComments = commentsByUrl.size
      if (withComments > 0) console.log(`[research] Reddit native: real comments for ${withComments}/${ranked.length} threads`)
    } catch (err) {
      console.warn('[research] Reddit comment fetch failed — using Brave snippets:', (err as Error).message)
    }
  }

  // ── Step 4: Build synthesis (Haiku) + Twitter summary (Haiku) + Reddit summary (Haiku) in parallel ──
  const synthStart = Date.now()

  // Build enriched reddit threads carrying real comments (for selection) plus the
  // Brave fragment as a fallback snippet.
  // IMPORTANT: Only match the Brave finding by exact URL. The old fallback (any
  // finding from the same subreddit) caused duplicate-looking cards when two threads
  // from the same subreddit both got the same finding's content as their snippet.
  const redditThreadsForSynthesis = dedupedRedditThreads.map(t => {
    const matchingFinding = compiled.findings.find(f => f.url === t.url)
    const rawSnippet = matchingFinding?.content?.slice(0, 200) ?? undefined
    return {
      ...t,
      snippet: rawSnippet ? sanitizeRedditSnippet(rawSnippet) : undefined,
      comments: commentsByUrl.get(t.url) ?? [],
    }
  })

  const [synthesisResult, twitterSynthesis, redditSynthesis] = await Promise.all([
    buildSynthesis(entityCards, compiled.findings, plan).catch(err => {
      console.warn('[research] Synthesis failed — using default:', (err as Error).message)
      return buildDefaultSynthesis(entityCards, plan)
    }),
    summariseTwitterFindings(twitterFindings, plan).catch(err => {
      console.warn('[research] Twitter summary failed:', (err as Error).message)
      return null
    }),
    summariseRedditFindings(redditThreadsForSynthesis, plan).catch(err => {
      console.warn('[research] Reddit summary failed:', (err as Error).message)
      return null
    }),
  ])
  const synthesis: ResearchSynthesis = synthesisResult
  const synthMs = Date.now() - synthStart

  // Apply viewpoint tags from Haiku classification back to Twitter findings
  if (twitterSynthesis?.viewpoints?.length) {
    for (let vi = 0; vi < twitterSynthesis.viewpoints.length && vi < twitterFindings.length; vi++) {
      twitterFindings[vi].viewpoint = twitterSynthesis.viewpoints[vi]
    }
  }

  // Apply Haiku's per-thread selection: quote the chosen REAL comment when one was
  // picked (bestComments[i] is 1-based; 0 = nothing worth quoting), otherwise fall
  // back to the Brave fragment. Also carry the exact comment permalink.
  const redditThreadsPool: RedditThread[] = dedupedRedditThreads.map((t, i) => {
    const enriched = redditThreadsForSynthesis[i]
    const comments = enriched?.comments ?? []
    const bestIdx = redditSynthesis?.bestComments?.[i] ?? 0
    const chosen = bestIdx >= 1 && comments[bestIdx - 1] ? comments[bestIdx - 1] : null
    return {
      ...t,
      snippet: chosen ? chosen.body : enriched?.snippet,
      viewpoint: redditSynthesis?.viewpoints?.[i] ?? undefined,
      comment_url: chosen?.permalink,
    }
  })

  const totalElapsed = Date.now() - startTime
  console.log(
    `[research] Complete in ${totalElapsed}ms: search=${searchMs}ms entity=${entityMs}ms synthesis=${synthMs}ms | ${compiled.searchCount} searches, ${entityCards.length} entities, ${liveData.length} live data, ${twitterFindings.length} tweets (${twitterPostsAnalysed} analysed), ${redditThreadsPool.length} reddit threads, ${videoFindings.length} videos`
  )

  return {
    summary: compiled.summary,
    tokenEstimate: compiled.tokenEstimate,
    searchCount: compiled.searchCount,
    sources: compiled.sources,
    redditThreads: dedupedRedditThreads,
    findings: compiled.findings,
    entityCards,
    synthesis,
    liveData,
    twitterFindings,
    twitterSummary: twitterSynthesis?.summary ?? null,
    twitterSentimentSplit: twitterSynthesis?.sentimentSplit ?? null,
    twitterContextTrigger: twitterSynthesis?.contextTrigger ?? null,
    twitterPostsAnalysed,
    redditThreadsPool,
    redditSummary: redditSynthesis?.summary ?? null,
    redditSentimentSplit: redditSynthesis?.sentimentSplit ?? null,
    redditContextTrigger: redditSynthesis?.contextTrigger ?? null,
    redditThreadsAnalysed: dedupedRedditThreads.length,
    videoFindings,
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

  const model = MODELS.geminiFlash
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

// ── Live data query execution ─────────────────────────────────────────────────

// ── Post-fetch quality filters ──────────────────────────────────────────────

// News article types get relaxed live data thresholds — their value comes from real-time context
const NEWS_TYPES = new Set(['news_analysis', 'breaking_news', 'trend_analysis'])

// Standard thresholds (non-news)
const POLYMARKET_MIN_VOLUME = 500_000 // $500k minimum for trustworthy odds
const GOOGLE_TRENDS_MIN_SPIKE = 50 // 50% change minimum to be interesting
const YAHOO_FINANCE_MIN_MOVE = 0.5 // ±0.5% minimum daily move

// News thresholds (relaxed — show more data for current events)
const NEWS_POLYMARKET_MIN_VOLUME = 100_000 // $100k — lower bar for news context
// Google Trends: no threshold for news (all results kept)
// Yahoo Finance: no threshold for news (all tickers kept)

/**
 * Filter Polymarket results by volume threshold.
 */
function filterPolymarketByVolume(results: Record<string, unknown>[], isNews: boolean): Record<string, unknown>[] {
  const threshold = isNews ? NEWS_POLYMARKET_MIN_VOLUME : POLYMARKET_MIN_VOLUME
  return results.filter(r => {
    const volume = typeof r.volume === 'number' ? r.volume : 0
    if (volume < threshold) {
      console.log(`[live-data-filter] Polymarket DISCARDED: "${String(r.question ?? '').slice(0, 60)}" — volume $${Math.round(volume).toLocaleString()} < $${threshold.toLocaleString()} threshold`)
      return false
    }
    return true
  })
}

/**
 * Filter Google Trends results — news articles keep all results, others require ≥50% spike.
 */
function filterGoogleTrendsBySpike(results: Record<string, unknown>[], isNews: boolean): Record<string, unknown>[] {
  if (isNews) return results // News articles: show all trends data regardless of spike
  return results.filter(r => {
    const changePercent = typeof r.changePercent === 'number' ? r.changePercent : 0
    const trend = typeof r.trend === 'string' ? r.trend : 'stable'
    if (Math.abs(changePercent) >= GOOGLE_TRENDS_MIN_SPIKE || trend === 'rising' || trend === 'peaking') {
      return true
    }
    console.log(`[live-data-filter] Google Trends DISCARDED: "${String(r.query ?? '')}" — change ${changePercent}%, trend "${trend}" (flat/declining, no spike ≥${GOOGLE_TRENDS_MIN_SPIKE}%)`)
    return false
  })
}

/**
 * Filter Yahoo Finance results — news articles keep all tickers, others require ±0.5% move.
 */
function filterYahooFinanceByMovement(results: Record<string, unknown>[], isNews: boolean): Record<string, unknown>[] {
  if (results.length === 0) return results
  if (isNews) return results // News articles: show all tickers regardless of daily move
  const hasSignificantMove = results.some(r => {
    const pct = typeof r.changePercent === 'number' ? r.changePercent : 0
    return Math.abs(pct) >= YAHOO_FINANCE_MIN_MOVE
  })
  if (!hasSignificantMove) {
    const symbols = results.map(r => `${String(r.symbol ?? '?')} (${typeof r.changePercent === 'number' ? r.changePercent.toFixed(2) : '0'}%)`).join(', ')
    console.log(`[live-data-filter] Yahoo Finance DISCARDED: all tickers flat — ${symbols} (threshold ±${YAHOO_FINANCE_MIN_MOVE}%)`)
    return []
  }
  return results
}

/**
 * Execute live data queries (Polymarket, Yahoo Finance, Google Trends) in parallel.
 * Returns an array of results as Record<string, unknown> for storage and writing prompt injection.
 * Failures are caught per-source — never blocks the pipeline.
 * Post-fetch filters discard low-quality data (low volume, flat trends, flat prices).
 */
async function executeLiveDataQueries(
  queries: LiveDataQuery[],
  plan?: ArticlePlan,
  articleId?: string,
  synthesis?: { thesis_direction?: string },
): Promise<Record<string, unknown>[]> {
  if (!queries || queries.length === 0) return []

  // Collect results per source for filtering
  const polymarketResults: Record<string, unknown>[] = []
  const yahooResults: Record<string, unknown>[] = []
  const trendsResults: Record<string, unknown>[] = []

  const tasks = queries.map(async (q) => {
    try {
      switch (q.source) {
        case 'polymarket': {
          // Pass article context for Haiku LLM relevance filtering
          const articleContext = plan ? {
            title: plan.title ?? '',
            thesis: synthesis?.thesis_direction ?? plan.quick_verdict_preview ?? '',
            articleType: plan.article_type ?? '',
            articleId,
          } : undefined
          const markets = await searchPolymarket(q.query ?? '', articleContext)
          for (const m of markets) {
            polymarketResults.push(m as unknown as Record<string, unknown>)
          }
          break
        }
        case 'yahoo_finance': {
          let symbols = q.symbols ?? []
          // If no symbols provided, search for them using the query
          if (symbols.length === 0 && q.query) {
            symbols = await searchFinanceSymbols(q.query)
          }
          if (symbols.length > 0) {
            const quotes = await fetchQuotes(symbols, q.timeframe)
            for (const quote of quotes) {
              yahooResults.push(quote as unknown as Record<string, unknown>)
            }
          }
          break
        }
        case 'google_trends': {
          const trendsResult = await fetchGoogleTrends(q.query ?? '')
          // Drop series with no real signal (empty, or a flat near-zero line) so
          // the writer never embeds a dead "0/100" chart. Mirrors hasTrendsSignal()
          // in components/sections/LiveDataCard.tsx, which hides older ones.
          const tv = (trendsResult?.timelineData ?? []).map(d => Number(d.value)).filter(Number.isFinite)
          const trendsHasSignal = tv.length >= 4 && Math.max(...tv) >= 10 && tv.filter(v => v > 0).length >= Math.ceil(tv.length / 4)
          if (trendsResult && !trendsHasSignal) {
            console.log(`[research-orchestrator] Google Trends: no usable signal for "${(q.query ?? '').slice(0, 40)}" — skipped`)
          }
          if (trendsResult && trendsHasSignal) {
            trendsResults.push(trendsResult as unknown as Record<string, unknown>)
          }
          break
        }
      }
    } catch (err) {
      console.warn(`[research-orchestrator] Live data query failed (${q.source}):`, (err as Error).message)
    }
  })

  await Promise.all(tasks)

  // ── Post-fetch quality filters (relaxed for news article types) ──
  const isNews = NEWS_TYPES.has(plan?.article_type ?? '')
  const filteredPolymarket = filterPolymarketByVolume(polymarketResults, isNews)
  const filteredYahoo = filterYahooFinanceByMovement(yahooResults, isNews)
  const filteredTrends = filterGoogleTrendsBySpike(trendsResults, isNews)

  const results = [...filteredPolymarket, ...filteredYahoo, ...filteredTrends]

  // Deduplicate Yahoo Finance results — same ticker can come from multiple queries
  const seen = new Set<string>()
  const deduped = results.filter(r => {
    if (r.source === 'yahoo_finance' && typeof r.symbol === 'string') {
      const key = r.symbol.toUpperCase()
      if (seen.has(key)) return false
      seen.add(key)
    }
    return true
  })

  const discarded = (polymarketResults.length - filteredPolymarket.length) +
    (yahooResults.length - filteredYahoo.length) +
    (trendsResults.length - filteredTrends.length)

  console.log(`[research-orchestrator] Live data: ${deduped.length} results from ${queries.length} queries${discarded > 0 ? ` (${discarded} discarded by quality filters)` : ''}${deduped.length < results.length ? `, ${results.length - deduped.length} duplicates removed` : ''}`)
  return deduped
}

// ── Reddit query helper ───────────────────────────────────────────────────────

/** Brave freshness values we support — narrow set, validated before forwarding. */
type RedditFreshness = 'pd' | 'pw' | 'pm'
const VALID_FRESHNESS: ReadonlySet<string> = new Set(['pd', 'pw', 'pm'])

/**
 * Normalise a single reddit query entry from any of the legacy/cached shapes:
 *  - plain string                              → { query, subreddits: [], freshness: undefined }
 *  - { query, subreddits }                     → freshness left undefined (no time filter)
 *  - { query, subreddits, freshness }          → freshness validated
 *  - { query, freshness } (no subreddits)      → subreddits defaulted to []
 *  - freshness === 'none' or unknown           → treated as undefined (no time filter)
 */
function normaliseRedditQuery(raw: unknown): { query: string; subreddits: string[]; freshness?: RedditFreshness } {
  if (typeof raw === 'string') {
    return { query: raw, subreddits: [] }
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { query?: unknown; subreddits?: unknown; freshness?: unknown }
    const query = typeof obj.query === 'string' ? obj.query : ''
    const subreddits = Array.isArray(obj.subreddits)
      ? obj.subreddits.filter((s): s is string => typeof s === 'string')
      : []
    const freshnessRaw = typeof obj.freshness === 'string' ? obj.freshness : undefined
    const freshness = freshnessRaw && VALID_FRESHNESS.has(freshnessRaw)
      ? (freshnessRaw as RedditFreshness)
      : undefined
    return { query, subreddits, freshness }
  }
  return { query: '', subreddits: [] }
}

/**
 * Execute Reddit-specific queries via Brave Search.
 * Appends "reddit" and subreddit names to queries for targeted results.
 * Each query carries an optional freshness value (pd/pw/pm) forwarded to Brave
 * as a per-query time filter — set by the planner based on what each query is
 * actually trying to find. See planning prompt in lib/claude.ts.
 */
/**
 * FUTURE: Reddit native API swap (clean swap when env var / feature flag is set)
 * ────────────────────────────────────────────────────────────────────────────────
 * Endpoint: GET https://www.reddit.com/search.json
 * Auth: none required (free public endpoint)
 * Params: q (query), sort (new/top/relevance), t (hour/day/week/month/year/all),
 *   limit (up to 100), restrict_sr (true to limit to specific subreddit)
 * Per-subreddit: GET https://www.reddit.com/r/{subreddit}/search.json
 * Response includes: title, url, selftext, score, num_comments, created_utc,
 *   subreddit, author, permalink
 * When active: fetch from Reddit directly for fresher results and richer metadata.
 *   Sort by 'top' with time filter mapped from freshness (pd→day, pw→week, pm→month).
 *   No need for Brave intermediary. Increase fetch to 15-20 threads per article.
 * Implementation: add if (process.env.REDDIT_NATIVE_API) branch at top of
 *   this function, return same Map<string, SearchResult[]> shape.
 */
async function executeRedditQueries(
  redditQueries: ResearchManifest['reddit_queries'],
  resultsPerQuery: number,
): Promise<Map<string, SearchResult[]>> {
  if (!redditQueries || redditQueries.length === 0) {
    return new Map()
  }

  const searchQueries = redditQueries.map(rawQuery => {
    const rq = normaliseRedditQuery(rawQuery)
    const subs = rq.subreddits.slice(0, 3)
    const queryString = subs.length > 0
      ? `${rq.query} reddit ${subs.map(s => `r/${s}`).join(' ')}`
      : `${rq.query} reddit`
    return {
      query: queryString,
      purpose: 'community' as const,
      freshness: rq.freshness,
    }
  })

  return executeBraveQueries(searchQueries, resultsPerQuery)
}

// ── Twitter/X query helper ────────────────────────────────────────────────────

const TWITTER_URL_PATTERN = /(?:^|\/)x\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/i
const MIN_TWEET_SNIPPET = 50
const MAX_TWITTER_FINDINGS = 12

/** Decode HTML entities that Brave Search returns in snippets. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * Normalise a single twitter query entry from any of the legacy/cached shapes:
 *  - plain string                              → { query, freshness: undefined }
 *  - { query }                                 → freshness left undefined
 *  - { query, freshness }                      → freshness validated
 *  - freshness === 'none' or unknown           → treated as undefined
 */
function normaliseTwitterQuery(raw: unknown): { query: string; freshness?: RedditFreshness } {
  if (typeof raw === 'string') {
    return { query: raw }
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { query?: unknown; freshness?: unknown }
    const query = typeof obj.query === 'string' ? obj.query : ''
    const freshnessRaw = typeof obj.freshness === 'string' ? obj.freshness : undefined
    const freshness = freshnessRaw && VALID_FRESHNESS.has(freshnessRaw)
      ? (freshnessRaw as RedditFreshness)
      : undefined
    return { query, freshness }
  }
  return { query: '' }
}

/**
 * Execute Twitter/X queries via Brave Search using site:x.com.
 * Filters to results that match the canonical x.com/{handle}/status/{id} pattern,
 * extracts the author handle, applies a minimum snippet length, dedupes by tweet id,
 * and caps total findings at MAX_TWITTER_FINDINGS.
 *
 * Each query carries an optional freshness value (pd/pw/pm) forwarded to Brave
 * as a per-query time filter — set by the planner based on what each query is
 * actually trying to find. See planning prompt in lib/claude.ts.
 *
 * Failures inside Brave never block the pipeline — empty result is returned.
 */
interface TwitterSearchResult {
  findings: TwitterFinding[]
  rawCount: number  // total results before filtering — used as "posts analysed" signal
}

/** Extract TwitterFindings from a Brave results map. */
function extractFindings(
  resultsMap: Map<string, SearchResult[]>,
  seenTweetIds: Set<string>,
  maxFindings: number,
): { findings: TwitterFinding[]; rawCount: number } {
  const findings: TwitterFinding[] = []
  let rawCount = 0

  for (const [, results] of resultsMap) {
    rawCount += results.length
    for (const r of results) {
      if (findings.length >= maxFindings) break

      const match = r.url.match(TWITTER_URL_PATTERN)
      if (!match) continue

      const author_handle = match[1]
      const tweetId = match[2]
      if (seenTweetIds.has(tweetId)) continue

      const snippet = decodeHtmlEntities((r.snippet ?? '').trim())
      if (snippet.length < MIN_TWEET_SNIPPET) continue

      // Skip junk handles often returned by Brave (e.g. /i/ pages, search pages)
      if (!/^[A-Za-z0-9_]{1,15}$/.test(author_handle)) continue
      if (author_handle.toLowerCase() === 'i') continue

      seenTweetIds.add(tweetId)
      findings.push({
        id: `tweet_${tweetId}`,
        author_handle,
        snippet,
        url: `https://x.com/${author_handle}/status/${tweetId}`,
      })
    }
    if (findings.length >= maxFindings) break
  }
  return { findings, rawCount }
}

/** Contested article types get two-pass balanced search. */
const CONTESTED_TYPES = new Set(['news_analysis', 'breaking_news', 'trend_analysis', 'deep_dive'])

/**
 * FUTURE: TwitterAPI.io integration (clean swap when env var is set)
 * ─────────────────────────────────────────────────────────────────
 * Endpoint: GET https://api.twitterapi.io/twitter/tweet/advanced_search
 * Auth: X-API-Key header (env: TWITTER_API_KEY)
 * Query format: same keywords but without site:x.com prefix
 * Response includes: full tweet text, author handle, display name,
 *   follower count, likes, retweets, reply count, exact timestamp, tweet URL
 * When active: populate TwitterFinding with real engagement data instead
 *   of Brave-inferred approximations. Sort by engagement (likes + retweets)
 *   to surface important voices. Increase fetch to 50-60 tweets per article
 *   since the API is fast and flat rate.
 * Implementation: add if (process.env.TWITTER_API_KEY) branch at top of
 *   this function, return same TwitterSearchResult shape.
 */
async function executeTwitterQueries(
  twitterQueries: ResearchManifest['twitter_queries'],
  resultsPerQuery: number,
  articleType?: string,
): Promise<TwitterSearchResult> {
  if (!twitterQueries || twitterQueries.length === 0) {
    return { findings: [], rawCount: 0 }
  }

  // Coerce + ensure each query targets x.com via site: prefix.
  const searchQueries = twitterQueries.map(rawQuery => {
    const tq = normaliseTwitterQuery(rawQuery)
    const queryString = /\bsite:x\.com\b/i.test(tq.query)
      ? tq.query
      : `site:x.com ${tq.query}`
    return {
      query: queryString,
      purpose: 'community' as const,
      freshness: tq.freshness,
    }
  }).filter(q => q.query.replace(/site:x\.com/i, '').trim().length > 0)

  if (searchQueries.length === 0) return { findings: [], rawCount: 0 }

  let resultsMap: Map<string, SearchResult[]>
  try {
    resultsMap = await executeBraveQueries(searchQueries, resultsPerQuery)
  } catch (err) {
    console.warn('[research] Twitter Brave search failed:', (err as Error).message)
    return { findings: [], rawCount: 0 }
  }

  // Retry-without-freshness fallback: Brave's x.com index is small and often
  // returns nothing for queries with a freshness window. For any query that had
  // freshness set AND came back empty, retry once without the freshness param.
  const retryQueries = searchQueries.filter(q => {
    if (!q.freshness) return false
    const existing = resultsMap.get(q.query) ?? []
    return existing.length === 0
  })
  if (retryQueries.length > 0) {
    try {
      const retryMap = await executeBraveQueries(
        retryQueries.map(q => ({ query: q.query, purpose: q.purpose })),
        resultsPerQuery,
      )
      let recovered = 0
      for (const [q, results] of retryMap) {
        if (results.length > 0) {
          resultsMap.set(q, results)
          recovered++
        }
      }
      if (recovered > 0) {
        console.log(`[research] Twitter: retried ${retryQueries.length} empty queries without freshness, recovered ${recovered}`)
      }
    } catch (err) {
      console.warn('[research] Twitter retry failed:', (err as Error).message)
    }
  }

  const seenTweetIds = new Set<string>()
  const { findings, rawCount } = extractFindings(resultsMap, seenTweetIds, MAX_TWITTER_FINDINGS)

  console.log(`[research] Twitter: ${findings.length} findings from ${searchQueries.length} queries (${rawCount} raw results)`)
  return { findings, rawCount }
}

// ── Twitter sentiment summary (Haiku) ─────────────────────────────────────────

const TWITTER_SUMMARY_SYSTEM = `You are analysing what people are actually saying on X (Twitter) about a topic. You will be given a small set of tweet snippets with author handles. Return a JSON object with the following fields:

1. "summary": ONE short paragraph (2-3 sentences, max ~60 words) capturing the prevailing sentiment, the main camps if there is disagreement, and any standout reactions.
2. "viewpoints": an array with one entry per tweet (same order as input). Each entry is one of "pro", "sceptical", or "neutral" — classifying whether that tweet supports the main thesis/topic, opposes/criticises it, or takes no clear side.
3. "sentiment_split": an object with:
   - "pro_label": a short label (2-5 words) for the supporting position (e.g. "Sanctions working", "Launch on track")
   - "sceptical_label": a short label (2-5 words) for the opposing position (e.g. "Sceptical of impact", "Over budget and late")
   - "pro_pct": integer percentage of posts that are pro
   - "sceptical_pct": integer percentage that are sceptical
   - "neutral_pct": integer percentage that are neutral
   - "summary": one plain-English sentence describing the split (e.g. "Critics outnumber supporters roughly 3:2, with most scepticism focused on cost overruns.")
   The three percentages MUST sum to 100.
4. "context_trigger": a short string like "Trending after TSMC announced suspension of orders" if the tweets reference a specific triggering event, or null if no clear trigger.
5. "relevant_count": integer — how many of the input tweets are genuinely ABOUT the article's subject (discussing it directly, not merely sharing a keyword, not off-topic, not spam). Be strict; 0 is a valid answer. The page hides this panel when fewer than 2 are relevant.

HARD RULES for the summary paragraph:
- Never use generic phrases like "users are talking about", "the community is buzzing", "people have mixed feelings", "X users had a lot to say", "the discourse online".
- Never invent quotes or attributions.
- Never reference individual handles unless the tweet content makes them notable.
- Do NOT use hashtags or emoji.
- If the tweets contradict each other, say so directly.
- Write in the voice of an editor describing the conversation, not a marketer.

Return ONLY valid JSON. No markdown, no backticks, no preamble.`

interface TwitterSynthesisResult {
  summary: string
  sentimentSplit: TwitterSentimentSplit | null
  contextTrigger: string | null
  viewpoints: Array<'pro' | 'sceptical' | 'neutral'>
}

async function summariseTwitterFindings(
  findings: TwitterFinding[],
  plan: ArticlePlan,
): Promise<TwitterSynthesisResult | null> {
  if (!findings || findings.length < 2) return null

  const tweetList = findings
    .slice(0, MAX_TWITTER_FINDINGS)
    .map((f, i) => `${i + 1}. @${f.author_handle}: ${f.snippet.slice(0, 280)}`)
    .join('\n')

  const userMessage = `Topic: "${plan.title}"
Article type: ${plan.article_type}

TWEETS FROM X:
${tweetList}

Return the JSON now.`

  const model = MODELS.geminiFlash
  const message = await getAnthropic().messages.create({
    model,
    max_tokens: 512,
    system: TWITTER_SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  })

  logApiCall({
    callType: 'twitter_summary',
    model,
    inputTokens: message.usage?.input_tokens,
    outputTokens: message.usage?.output_tokens,
  })

  const text = message.content.find(b => b.type === 'text')?.text ?? ''

  try {
    const parsed = JSON.parse(extractJSON(text) || text)
    const summary = (parsed.summary ?? '').trim()
    if (!summary) return null

    // Build sentiment split
    const split = parsed.sentiment_split
    let sentimentSplit: TwitterSentimentSplit | null = null
    if (split && typeof split.pro_pct === 'number') {
      sentimentSplit = {
        pro_label: split.pro_label ?? 'Supporting',
        sceptical_label: split.sceptical_label ?? 'Sceptical',
        pro_pct: split.pro_pct,
        sceptical_pct: split.sceptical_pct ?? (100 - split.pro_pct),
        neutral_pct: split.neutral_pct ?? 0,
        summary: split.summary ?? '',
        ...(typeof parsed.relevant_count === 'number' && { relevant_count: parsed.relevant_count }),
      }
    }

    // Build viewpoints array
    const viewpoints: Array<'pro' | 'sceptical' | 'neutral'> = (parsed.viewpoints ?? []).map((v: string) => {
      if (v === 'pro' || v === 'sceptical' || v === 'neutral') return v
      return 'neutral'
    })

    const contextTrigger = typeof parsed.context_trigger === 'string' ? parsed.context_trigger : null

    return { summary, sentimentSplit, contextTrigger, viewpoints }
  } catch {
    // Fallback: treat entire response as plain summary text (backwards compat)
    const cleaned = text.trim()
    return cleaned.length > 0
      ? { summary: cleaned, sentimentSplit: null, contextTrigger: null, viewpoints: [] }
      : null
  }
}

// ── Reddit sentiment summary (Haiku) ────────────────────────────────────────

const REDDIT_SUMMARY_SYSTEM = `You are a senior editor analysing what people actually say on Reddit about a topic. You will be given a small set of Reddit threads (subreddit, score, comment count, title). Most threads also list their top real comments, numbered. Return a JSON object with the following fields:

1. "summary": ONE short paragraph (3-4 sentences, max ~80 words) capturing the prevailing sentiment, the main camps if there is disagreement, and any standout community reactions. Be specific — reference actual subreddit communities and their stances.
2. "viewpoints": an array with one entry per thread (same order as input). Each entry is one of "pro", "sceptical", or "neutral" — classifying whether that thread/community supports the main thesis/topic, opposes/criticises it, or takes no clear side.
3. "best_comments": an array with one entry per thread (same order as input). For each thread, SELECT the single best comment to quote and return its number (the integer shown before the comment). Return 0 if the thread lists no comments, or if NONE of its comments is worth quoting.
   Choose the comment that is:
   - A substantive, genuine opinion or first-hand experience clearly ABOUT the article's subject.
   - Representative of that thread's stance and interesting to a reader.
   REJECT (return 0 rather than pick a bad one): sarcasm, jokes, one-liners with no substance, questions, off-topic comments, comments about a DIFFERENT product/model than the subject, and pure meta/moderation.
   You are SELECTING an existing comment by its number — never write, paraphrase, or invent quote text.
4. "sentiment_split": an object with:
   - "pro_label": a short label (2-5 words) for the supporting position (e.g. "Expecting prolonged hold", "Bullish on outcome")
   - "sceptical_label": a short label (2-5 words) for the opposing position (e.g. "Frustrated with pace", "Calling it overhyped")
   - "pro_pct": integer percentage of threads that are pro
   - "sceptical_pct": integer percentage that are sceptical
   - "neutral_pct": integer percentage that are neutral
   - "summary": one plain-English sentence describing the split (e.g. "r/economics leans cautiously optimistic while r/personalfinance voices practical frustration.")
   The three percentages MUST sum to 100.
5. "context_trigger": a short string like "Surge in discussion after Fed announcement" if the threads reference a specific triggering event, or null if no clear trigger.
6. "relevant_count": integer — how many of the input threads are genuinely ABOUT the article's subject (title or real comments discuss it directly; not general-purpose weekly threads, not off-topic, not merely sharing a keyword). Be strict; 0 is a valid answer. The page hides this panel when fewer than 2 are relevant.

HARD RULES:
- Base the summary and sentiment on the REAL comments shown, not the titles alone.
- NEVER use generic phrases like "opinions are mixed", "the community is divided", "redditors are talking about", "there's a lot of discussion".
- Be specific: name subreddits, reference actual stances, describe the tension.
- Never invent quotes or attributions. "best_comments" must only ever contain numbers that appear in the input.
- Do NOT use hashtags or emoji.
- If the subreddits contradict each other, say so directly with subreddit names.
- Write in the voice of an editor describing the conversation, not a marketer.

Return ONLY valid JSON. No markdown, no backticks, no preamble.`

interface RedditSynthesisResult {
  summary: string
  sentimentSplit: RedditSentimentSplit | null
  contextTrigger: string | null
  viewpoints: Array<'pro' | 'sceptical' | 'neutral'>
  /** Per-thread 1-based index of the chosen comment to quote; 0 = none. */
  bestComments: number[]
}

async function summariseRedditFindings(
  threads: Array<{ title: string; url: string; subreddit: string; num_comments?: number; score?: number; snippet?: string; comments?: RedditComment[] }>,
  plan: ArticlePlan,
): Promise<RedditSynthesisResult | null> {
  if (!threads || threads.length < 2) return null

  const threadList = threads
    .map((t, i) => {
      const meta = [t.subreddit]
      if (t.score) meta.push(`${t.score} upvotes`)
      if (t.num_comments) meta.push(`${t.num_comments} comments`)
      const header = `${i + 1}. [${meta.join(', ')}] ${t.title}`
      // Prefer listing the real top comments so Haiku can SELECT one by number.
      if (t.comments && t.comments.length > 0) {
        const commentLines = t.comments
          .map((c, ci) => `   ${ci + 1}) (${c.score} upvotes) ${c.body.slice(0, 240)}`)
          .join('\n')
        return `${header}\n   TOP COMMENTS:\n${commentLines}`
      }
      // No real comments available — fall back to the Brave fragment, no selectable comments.
      const snippet = t.snippet ? `\n   (preview only, no comments) ${t.snippet.slice(0, 200)}` : ''
      return `${header}${snippet}`
    })
    .join('\n')

  const userMessage = `Topic: "${plan.title}"
Article type: ${plan.article_type}

REDDIT THREADS:
${threadList}

Return the JSON now.`

  const model = MODELS.geminiFlash
  const message = await getAnthropic().messages.create({
    model,
    max_tokens: 512,
    system: REDDIT_SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  })

  logApiCall({
    callType: 'reddit_summary',
    model,
    inputTokens: message.usage?.input_tokens,
    outputTokens: message.usage?.output_tokens,
  })

  const text = message.content.find(b => b.type === 'text')?.text ?? ''

  try {
    const parsed = JSON.parse(extractJSON(text) || text)
    const summary = (parsed.summary ?? '').trim()
    if (!summary) return null

    const split = parsed.sentiment_split
    let sentimentSplit: RedditSentimentSplit | null = null
    if (split && typeof split.pro_pct === 'number') {
      sentimentSplit = {
        pro_label: split.pro_label ?? 'Supporting',
        sceptical_label: split.sceptical_label ?? 'Sceptical',
        pro_pct: split.pro_pct,
        sceptical_pct: split.sceptical_pct ?? (100 - split.pro_pct),
        neutral_pct: split.neutral_pct ?? 0,
        summary: split.summary ?? '',
        ...(typeof parsed.relevant_count === 'number' && { relevant_count: parsed.relevant_count }),
      }
    }

    const viewpoints: Array<'pro' | 'sceptical' | 'neutral'> = (parsed.viewpoints ?? []).map((v: string) => {
      if (v === 'pro' || v === 'sceptical' || v === 'neutral') return v
      return 'neutral'
    })

    // Validate each selected comment index against that thread's available comments.
    const rawBest: unknown[] = Array.isArray(parsed.best_comments) ? parsed.best_comments : []
    const bestComments: number[] = threads.map((t, i) => {
      const n = Number(rawBest[i])
      const available = t.comments?.length ?? 0
      if (!Number.isInteger(n) || n < 1 || n > available) return 0
      return n
    })

    const contextTrigger = typeof parsed.context_trigger === 'string' ? parsed.context_trigger : null

    return { summary, sentimentSplit, contextTrigger, viewpoints, bestComments }
  } catch {
    const cleaned = text.trim()
    return cleaned.length > 0
      ? { summary: cleaned, sentimentSplit: null, contextTrigger: null, viewpoints: [], bestComments: [] }
      : null
  }
}
