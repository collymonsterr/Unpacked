/**
 * Daily topic picker for the automated "one fresh article per day" cron.
 *
 * Mirrors what an editor does each morning: scan what's genuinely happening
 * right now across a rotating set of beats (NOT just politics), then pick the
 * single most interesting, current, broadly-useful angle to publish.
 *
 * Pipeline: rotating beat → Brave discovery (fresh, past-week) → Haiku selects
 * ONE concrete Unpacked-style query, avoiding anything we auto-covered recently.
 * Returns null only when there's no usable signal (the cron simply skips that
 * day rather than publishing something stale).
 */

import type Anthropic from '@anthropic-ai/sdk'
import { createAnthropic } from '@/lib/anthropic-client'
import { executeBraveQueries } from '@/lib/brave-research'
import { getSupabaseAdmin } from '@/lib/supabase'
import { logApiCall } from '@/lib/api-usage'
import { extractJSON } from '@/lib/utils/extract-json'
import { MODELS } from '@/lib/models'

const TOPIC_MODEL = MODELS.geminiFlash

export interface DailyTopic {
  /** The Unpacked-style query fed into the generation pipeline. */
  query: string
  /** One-line editor rationale (why this, why now) — stored for the log. */
  rationale: string
  /** Suggested category lens. */
  category: string
}

/**
 * Rotating editorial beats. Deliberately weighted AWAY from partisan politics
 * and toward things people find genuinely interesting. Each beat has a couple
 * of discovery phrases biased toward fresh, concrete happenings.
 */
interface Beat { category: string; phrases: string[] }
const BEATS: Beat[] = [
  { category: 'Tech', phrases: ['new gadget launch this week', 'notable tech product announcement'] },
  { category: 'AI', phrases: ['new AI model or tool released this week', 'AI breakthrough this week'] },
  { category: 'Science', phrases: ['science discovery this week', 'new research finding surprising'] },
  { category: 'Space', phrases: ['space mission news this week', 'astronomy discovery this week'] },
  { category: 'Health', phrases: ['health and nutrition study this week', 'new fitness science finding'] },
  { category: 'Culture', phrases: ['internet culture trend this week', 'viral phenomenon explained this week'] },
  { category: 'Entertainment', phrases: ['big new movie or series buzz this week', 'notable music release this week'] },
  { category: 'Gaming', phrases: ['major video game news this week', 'new game release notable'] },
  { category: 'Business', phrases: ['notable startup or business story this week', 'company news people are discussing'] },
  { category: 'Automotive', phrases: ['new car or EV reveal this week', 'automotive technology news this week'] },
  { category: 'Food', phrases: ['food trend this week', 'restaurant or cooking story this week'] },
  { category: 'Home', phrases: ['home and design trend this week', 'notable consumer product this week'] },
  { category: 'Sports', phrases: ['notable sports story this week not politics', 'sports performance or record this week'] },
  { category: 'Finance', phrases: ['personal finance or markets story this week', 'money trend people are discussing'] },
]

/** Deterministic day counter so the beat rotates day-to-day. */
function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000)
}

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 20_000 })
  }
  return _anthropic
}

/** Pull recent auto-generated topics so we don't repeat ourselves. */
async function recentAutoTopics(): Promise<string[]> {
  try {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString()
    const { data } = await getSupabaseAdmin()
      .from('articles')
      .select('query')
      .filter('generation_options->>source', 'eq', 'daily_cron')
      .gte('created_at', since)
      .limit(30)
    return (data ?? [])
      .map((r: { query?: string }) => r.query)
      .filter((q): q is string => !!q)
  } catch {
    return []
  }
}

/** Run Brave discovery for a beat, broadening freshness if the week is quiet. */
async function discover(beat: Beat): Promise<string[]> {
  const collect = async (freshness: 'pw' | 'pm'): Promise<string[]> => {
    const queries = beat.phrases.map(p => ({ query: p, purpose: 'discovery', freshness }))
    const out: string[] = []
    try {
      const map = await executeBraveQueries(queries, 8)
      for (const [, results] of map) {
        for (const r of results) {
          if (r.title) out.push(`- ${r.title}${r.snippet ? ` — ${r.snippet.slice(0, 140)}` : ''}`)
        }
      }
    } catch {
      // Brave failure → empty; caller decides
    }
    // De-dupe by title prefix.
    const seen = new Set<string>()
    return out.filter(line => {
      const key = line.slice(0, 80).toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  let headlines = await collect('pw')
  if (headlines.length < 4) {
    // Quiet week — broaden to the past month.
    const more = await collect('pm')
    const seen = new Set(headlines.map(h => h.slice(0, 80).toLowerCase()))
    for (const h of more) {
      const key = h.slice(0, 80).toLowerCase()
      if (!seen.has(key)) { headlines.push(h); seen.add(key) }
    }
  }
  return headlines.slice(0, 18)
}

const SYSTEM = `You are the editor-in-chief of Unpacked, a publication that turns a single question into an opinionated, visual, fact-checked article that always picks a clear winner or verdict.

You will be given today's fresh headlines from one beat, plus a list of topics we've recently published (do NOT repeat or closely overlap those).

Choose the SINGLE best topic to publish today and express it as the exact query a curious reader would type into Unpacked.

Rules for the query:
- Genuinely current — anchored to something in the headlines, not evergreen filler.
- Specific and concrete — lead with the named product, person, company, game, study, or event.
- Interesting to a broad audience and a good fit for an opinionated verdict ("Is X worth it?", "X vs Y: which wins?", "What the new X actually means").
- 6-14 words. No clickbait, no years unless essential, no hashtags.
- Only name a product, model or event the headlines present as NEW or happening now. Tracker and listicle pages mention older names as examples or history — never build the query around those, and never pair a new release against an outdated one.
- AVOID partisan politics, elections, culture-war flashpoints, tragedy/disaster, and anything we recently covered.

Return ONLY valid JSON, no markdown:
{"query": "the reader-style query", "category": "one-word beat", "rationale": "one sentence: why this, why now"}`

/**
 * Pick today's article topic. Returns null when there's no usable signal.
 */
export async function pickDailyTopic(slot = 0): Promise<DailyTopic | null> {
  // Beat rotates by day; `slot` (0 = morning, 1 = afternoon) offsets to the
  // OPPOSITE side of the ring so two articles on the same day are far-apart
  // categories. Over a week this fans out across the whole beat calendar.
  const beat = BEATS[(dayIndex() + slot * Math.floor(BEATS.length / 2)) % BEATS.length]

  const [headlines, recent] = await Promise.all([discover(beat), recentAutoTopics()])
  if (headlines.length === 0) {
    console.warn('[daily-topic] No discovery headlines for beat', beat.category)
    return null
  }

  const userMessage = `BEAT: ${beat.category}

TODAY'S HEADLINES:
${headlines.join('\n')}

RECENTLY PUBLISHED (avoid these):
${recent.length ? recent.map(r => `- ${r}`).join('\n') : '(none)'}

Return the JSON now.`

  try {
    const message = await getAnthropic().messages.create({
      model: TOPIC_MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })
    logApiCall({
      callType: 'daily_topic',
      model: TOPIC_MODEL,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
    })

    const text = message.content.find(b => b.type === 'text')?.text ?? ''
    const parsed = JSON.parse(extractJSON(text) || text)
    const query = typeof parsed.query === 'string' ? parsed.query.trim() : ''
    if (query.length < 6) {
      console.warn('[daily-topic] Haiku returned an unusable query:', text.slice(0, 120))
      return null
    }
    return {
      query,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      category: typeof parsed.category === 'string' ? parsed.category : beat.category,
    }
  } catch (err) {
    console.error('[daily-topic] Selection failed:', (err as Error).message)
    return null
  }
}
