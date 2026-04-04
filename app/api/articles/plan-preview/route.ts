import { NextRequest } from 'next/server'
import { planArticle } from '@/lib/claude'
import { executeResearch } from '@/lib/research-orchestrator'
import { createServerSupabase } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { getArticleTypePromptList } from '@/lib/article-types'
import { extractJSON } from '@/lib/utils/extract-json'
import { logApiCall } from '@/lib/api-usage'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 30_000 })
  }
  return _anthropic
}

interface AngleOption {
  headline: string
  article_type: string
  pitch: string
  questions: string[]
  scope_pills: string[]
}

/**
 * POST /api/articles/plan-preview
 *
 * Runs planning (Haiku) + research + angle generation.
 * Returns plan + research + 3 angles with per-angle questions and scope pills.
 *
 * Rate limited: 20/hour per user. Requires auth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = body?.query

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 })
    }

    const trimmedQuery = query.trim()

    // Auth check — plan mode requires authentication
    let userId: string | undefined
    try {
      const supabase = await createServerSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // Not authenticated
    }

    if (!userId) {
      return Response.json(
        { error: 'auth_required', message: 'Sign in to use Plan mode' },
        { status: 401 }
      )
    }

    // Rate limiting: 20/hour, separate key from article creation
    const rateLimitKey = `plan:user:${userId}`
    const rateResult = await checkRateLimit(rateLimitKey, 20)
    if (!rateResult.allowed) {
      return Response.json(
        { error: 'Plan rate limit reached. Try again in a bit.' },
        { status: 429 }
      )
    }

    // Default generation options for planning (standard defaults)
    const generationOptions = { length: 'standard' as const, tone: 'opinionated' as const, visual: 'standard' as const }

    // ── Phase 1: Plan the article ──
    const t0 = Date.now()
    const plan = await planArticle(trimmedQuery, generationOptions)
    const planMs = Date.now() - t0

    // ── Phase 2: Research ──
    const length = 'standard' as const
    const manifest = plan.research_manifest ?? {
      brave_queries: [{ query: trimmedQuery, purpose: 'core_facts' as const }],
      reddit_queries: [{ query: trimmedQuery, subreddits: [] }],
      image_queries: { hero: { query: trimmedQuery, style: 'editorial_photo' as const }, products: [] },
    }
    const t1 = Date.now()
    const research = await executeResearch(manifest, plan, length)
    const researchMs = Date.now() - t1

    // ── Phase 3: Generate angles + summarize Reddit threads (parallel) ──
    const t2 = Date.now()

    // Run angle generation and Reddit summary in parallel
    const [anglesResult, redditSummaries] = await Promise.all([
      (async () => {
        try {
          return await generateAngles(trimmedQuery, plan, research)
        } catch (err) {
          console.warn('[plan-preview] Angle generation failed, using single fallback:', (err as Error).message)
          return [{
            headline: plan.title,
            article_type: plan.article_type,
            pitch: research.synthesis?.thesis_direction
              ? `${research.synthesis.thesis_direction} This article covers the key findings from ${research.findings?.length ?? 0} sources.`
              : `A ${plan.article_type.replace(/_/g, ' ')} covering the essential facts and data. Based on ${research.findings?.length ?? 0} sources.`,
            questions: (plan.sections_outline ?? []).slice(0, 5).filter((s: string) => s.endsWith('?')),
            scope_pills: Array.isArray(plan.suggestion_chips) ? (plan.suggestion_chips as string[]).slice(0, 5) : [],
          }] as AngleOption[]
        }
      })(),
      summarizeRedditThreads(research.redditThreads),
    ])

    const angles = anglesResult
    const anglesMs = Date.now() - t2

    // Merge summaries into Reddit threads
    const enrichedRedditThreads = research.redditThreads.map((t, i) => ({
      ...t,
      summary: redditSummaries[i] ?? undefined,
    }))

    console.log(`[plan-preview] Plan ${planMs}ms + Research ${researchMs}ms + Angles ${anglesMs}ms = ${planMs + researchMs + anglesMs}ms total`)

    // Return everything the plan page needs
    return Response.json({
      plan,
      research: {
        summary: research.summary,
        findings: research.findings.slice(0, 12), // top findings for display
        entityCards: research.entityCards,
        synthesis: research.synthesis,
        liveData: research.liveData,
        sources: research.sources,
        redditThreads: enrichedRedditThreads,
      },
      angles,
      timing: {
        plan_ms: planMs,
        research_ms: researchMs,
        angles_ms: anglesMs,
      },
    })
  } catch (err) {
    const errCode = (err as NodeJS.ErrnoException).code
    console.error('[plan-preview] Failed:', err)

    if (errCode === 'PLANNING_REFUSED') {
      return Response.json(
        { error: 'This topic hit a safety filter. Try rewording your question.' },
        { status: 422 }
      )
    }

    return Response.json({ error: 'Failed to generate plan' }, { status: 500 })
  }
}

/**
 * Generate 3 different article angles using Haiku.
 * Each angle has its own headline, article type, pitch, questions, and scope pills.
 */
async function generateAngles(
  query: string,
  plan: { article_type: string; title: string; sections_outline: string[]; suggestion_chips?: unknown },
  research: {
    synthesis?: { thesis_direction: string; likely_winner: string | null; key_data_points: string[]; community_sentiment_summary: string } | null
    entityCards?: Array<{ canonical_name: string; type: string; facts: Array<{ claim: string; source: string }> }>
    findings?: Array<{ content?: string; claim?: string; source: string }>
  },
): Promise<AngleOption[]> {
  const typeList = getArticleTypePromptList()

  const synthesisSummary = research.synthesis
    ? `Thesis direction: ${research.synthesis.thesis_direction}\nLikely winner: ${research.synthesis.likely_winner ?? 'none'}\nKey data: ${research.synthesis.key_data_points?.slice(0, 5).join('; ') ?? 'none'}\nCommunity sentiment: ${research.synthesis.community_sentiment_summary ?? 'none'}`
    : 'No synthesis available'

  const entitySummary = (research.entityCards ?? []).slice(0, 6).map(e =>
    `- ${e.canonical_name} (${e.type}): ${e.facts.slice(0, 2).map(f => f.claim).join('; ')}`
  ).join('\n') || '(no entities)'

  const topFindings = (research.findings ?? []).slice(0, 6).map(f =>
    `- ${f.content || f.claim || ''} (${f.source})`
  ).join('\n') || '(no findings)'

  const prompt = `Given this research, generate exactly 3 different article angles for the query: "${query}".

Each angle should use a different article type and take a genuinely different editorial approach.

The original planning classified this as "${plan.article_type}" with title "${plan.title}". Use that as ONE of the three angles (refine the headline if needed), then create two genuinely different approaches.

RESEARCH SYNTHESIS:
${synthesisSummary}

ENTITIES FOUND:
${entitySummary}

TOP FINDINGS:
${topFindings}

VALID ARTICLE TYPES:
${typeList}

For each angle, provide:
- headline: a publication-ready title (engaging, specific, not generic)
- article_type: one of the valid types listed above
- pitch: exactly 2 sentences explaining what this article would argue and why it's interesting
- questions: exactly 5 specific questions that a READER would type into Google or ask a friend about this topic. These must be genuine information-seeking questions, NOT rephrased section headings. Never start a question with "What about". Never reference article sections, components, or formatting (no "comparison matrix", "executive summary", "quick verdict", "stat cards", etc.). A buyer guide asks "Which X has the best Y?", "Is X worth $Z?". An explainer asks "How does X actually work?", "Why is X happening now?". A trend analysis asks "Is X overhyped?", "What's driving the shift to X?".
- scope_pills: 4-5 short phrases (2-5 words each) representing meaningful ways the user could narrow or redirect this specific angle. A buyer guide might offer "Under $150", "Best for meetings", "Wireless only". An explainer might offer "For beginners", "EU regulation focus", "Technical deep dive". A news analysis might offer "Last 7 days only", "US perspective", "Economic impact". Each pill should be relevant to this angle's article type.

Headlines must NEVER reveal the verdict or winner. They should create curiosity, not satisfy it.
Bad: "The 5 Best Cities for Digital Nomads: Chiang Mai Reigns Supreme"
Good: "The 5 Best Cities for Digital Nomads, Ranked by Actual Cost of Living"
Bad: "Best Laptop for Video Editing: The MacBook Pro M3 Wins"
Good: "We Tested 8 Laptops for Video Editing — One Stood Out"
Bad: "Myths About EVs: They're Actually Better Than You Think"
Good: "Myths About EVs That Refuse to Die"

CRITICAL: You MUST return exactly 3 angles. Not 1, not 2 — exactly 3. Each must use a different article_type.

Return ONLY a JSON array of exactly 3 objects with fields: headline, article_type, pitch, questions (array of 5 strings), scope_pills (array of 4-5 strings).`

  const anthropic = getAnthropic()
  const t0 = Date.now()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  })

  const ms = Date.now() - t0
  const usage = response.usage
  await logApiCall({
    model: 'claude-haiku-4-5-20251001',
    callType: 'plan_angles',
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const parsed = extractJSON(text) as unknown as AngleOption[] | null
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Failed to parse angles JSON')
  }

  // Validate and clean each angle
  const cleaned = parsed.slice(0, 3).map(angle => ({
    headline: angle.headline || 'Untitled',
    article_type: angle.article_type || plan.article_type,
    pitch: angle.pitch || '',
    questions: Array.isArray(angle.questions) ? angle.questions.slice(0, 5).filter(Boolean) : [],
    scope_pills: Array.isArray(angle.scope_pills) ? angle.scope_pills.slice(0, 5).filter(Boolean) : [],
  }))

  // Guarantee exactly 3 angles — pad with fallbacks if LLM returned fewer
  while (cleaned.length < 3) {
    const idx = cleaned.length
    const fallbackTypes = ['explainer', 'deep_dive', 'trend_analysis']
    const fallbackType = fallbackTypes[idx % fallbackTypes.length] ?? plan.article_type
    cleaned.push({
      headline: idx === 1
        ? `${query}: What You Need to Know`
        : `The Complete Picture on ${query}`,
      article_type: fallbackType,
      pitch: `A ${fallbackType.replace(/_/g, ' ')} covering the key facts and data from ${research.findings?.length ?? 0} sources.`,
      questions: (plan.sections_outline ?? []).slice(0, 5).filter((s: string) => s.endsWith('?')),
      scope_pills: Array.isArray(plan.suggestion_chips) ? (plan.suggestion_chips as string[]).slice(0, 5) : [],
    })
  }

  return cleaned
}

/**
 * Summarize Reddit threads using Haiku to generate one-sentence community insights.
 * Returns an array of summaries aligned with the input threads array.
 * Falls back to empty strings on failure (caller uses thread title as fallback).
 */
async function summarizeRedditThreads(
  threads: Array<{ title: string; url: string; subreddit: string; num_comments?: number; score?: number }>
): Promise<string[]> {
  if (!threads || threads.length === 0) return []

  try {
    const threadList = threads.slice(0, 5).map((t, i) =>
      `${i + 1}. [r/${t.subreddit}] "${t.title}"${t.num_comments ? ` (${t.num_comments} comments)` : ''}`
    ).join('\n')

    const prompt = `For each Reddit thread below, write a one-sentence summary of what the community likely thinks based on the thread title and subreddit context. Focus on the consensus view, the main debate, or the most surprising insight. Write from the community's perspective, not as a description of the thread.

Bad example: "r/aigear on Reddit: Soundcore Work AI Voice Recorder review | Cult of Mac"
Good example: "Most users say the Soundcore records well in quiet rooms but picks up too much background noise in open offices."

Bad example: "r/RewindAI on Reddit: Honest review after daily use"
Good example: "Daily users report the promise doesn't match reality — transcription accuracy drops significantly after the first hour of continuous use."

THREADS:
${threadList}

Return ONLY a JSON array of ${threads.slice(0, 5).length} strings, one summary per thread, in the same order. Each summary should be a single sentence, 15-30 words.`

    const anthropic = getAnthropic()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const usage = response.usage
    await logApiCall({
      model: 'claude-haiku-4-5-20251001',
      callType: 'plan_reddit_summary',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const parsed = extractJSON(text) as unknown as string[] | null
    if (!parsed || !Array.isArray(parsed)) return threads.map(() => '')

    // Pad to match thread count
    while (parsed.length < threads.length) parsed.push('')
    return parsed.slice(0, threads.length)
  } catch (err) {
    console.warn('[plan-preview] Reddit summary failed, falling back to titles:', (err as Error).message)
    return threads.map(() => '')
  }
}
