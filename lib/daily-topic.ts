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
import { braveNewsSearch, type NewsResult } from '@/lib/brave-research'
import { isStoryTitle } from '@/lib/story-radar'
import { getSupabaseAdmin } from '@/lib/supabase'
import { logApiCall } from '@/lib/api-usage'
import { extractJSON } from '@/lib/utils/extract-json'
import { MODELS } from '@/lib/models'

const HAIKU = MODELS.haiku

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
export interface Beat { category: string; phrases: string[] }
/**
 * Phrases are written as EVENTS ("announced", "launched", "study finds"), not as
 * descriptions of wanting news ("food trend this week"). The old phrasing was a
 * perfect match for SEO listicles optimised for those exact words, which is how
 * "cushcore, the snuggly decor trend" became a published article.
 */
export const BEATS: Beat[] = [
  { category: 'Tech', phrases: ['company announced new device', 'tech product launched this week'] },
  { category: 'AI', phrases: ['AI model released announced', 'AI company announced launch'] },
  { category: 'Science', phrases: ['study finds researchers discovered', 'scientists published findings'] },
  { category: 'Space', phrases: ['spacecraft launched mission', 'astronomers detected discovery'] },
  { category: 'Health', phrases: ['study finds health researchers', 'clinical trial results published'] },
  { category: 'Culture', phrases: ['went viral millions views', 'sparked debate online'] },
  { category: 'Entertainment', phrases: ['film series premiered reviews', 'album released announced tour'] },
  { category: 'Gaming', phrases: ['game launched update announced', 'studio revealed gameplay'] },
  { category: 'Business', phrases: ['company announced acquisition funding', 'startup raised launched'] },
  { category: 'Automotive', phrases: ['automaker unveiled new model', 'EV revealed specifications announced'] },
  { category: 'Food', phrases: ['chain launched menu announced', 'restaurant chain opened recall'] },
  { category: 'Home', phrases: ['company launched appliance product', 'consumer product recall announced'] },
  { category: 'Sports', phrases: ['broke record won championship', 'signed transfer announced'] },
  { category: 'Finance', phrases: ['markets reacted report showed', 'central bank announced rates'] },
]

/** Shared with Story Radar — see lib/story-radar.ts for the pattern list. */
function isStory(r: NewsResult): boolean {
  if (!isStoryTitle(r.title)) return false
  // Undated pages in a news index are almost always evergreen hubs.
  if (!r.age) return false
  return true
}

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

/**
 * Discover real stories for a beat from Brave's NEWS index, dropping anything
 * that isn't an event. Prefers the past day, widening to the week only if the
 * day is thin — the goal is "what happened", not "what ranks".
 */
export async function discover(beat: Beat): Promise<string[]> {
  const collect = async (freshness: 'pd' | 'pw'): Promise<NewsResult[]> => {
    const batches = await Promise.all(
      beat.phrases.map(p => braveNewsSearch(p, 12, freshness).catch(() => [] as NewsResult[]))
    )
    return batches.flat().filter(isStory)
  }

  let stories = await collect('pd')
  if (stories.length < 5) stories = [...stories, ...(await collect('pw'))]

  // De-dupe by title prefix and by host, so one outlet can't fill the list.
  const seenTitle = new Set<string>()
  const perHost = new Map<string, number>()
  const kept: NewsResult[] = []
  for (const r of stories) {
    const key = r.title.slice(0, 60).toLowerCase()
    if (seenTitle.has(key)) continue
    const hostCount = perHost.get(r.hostname) ?? 0
    if (hostCount >= 2) continue
    seenTitle.add(key)
    perHost.set(r.hostname, hostCount + 1)
    kept.push(r)
  }

  // Recency is part of the judgement, so hand the model the age and source.
  return kept.slice(0, 18).map(
    r => `- [${r.age}, ${r.hostname}] ${r.title}${r.snippet ? ` — ${r.snippet.slice(0, 140)}` : ''}`
  )
}

const SYSTEM = `You are the editor-in-chief of Unpacked, a publication that turns a single question into an opinionated, visual, fact-checked article that always picks a clear winner or verdict.

You will be given today's fresh headlines from one beat, plus a list of topics we've recently published (do NOT repeat or closely overlap those).

Each headline is given as: [age, source] Headline — snippet.

Choose the SINGLE best topic to publish today and express it as the exact query a curious reader would type into Unpacked.

PUBLISHING NOTHING IS A VALID AND RESPECTED ANSWER. We would rather publish four strong articles a week than seven weak ones. If no headline clears the bar below, return {"query": null, "rationale": "why nothing qualified"}. Do not stretch to fill the slot.

A headline clears the bar only if ALL of these hold:
- It reports a SPECIFIC EVENT that happened — something launched, was announced, was discovered, broke a record, was recalled, was acquired. Not a trend piece, not a ranking, not a "what to expect", not advice.
- A reader would plausibly type a question about it into a search box.
- There is a real question to answer — is it worth it, what does it mean, which is better. If the headline already fully answers itself, there is no article in it.
- It is recent. Prefer hours/days old over a week old.

Rules for the query:
- Specific and concrete — lead with the named product, person, company, game, study or event.
- A good fit for an opinionated verdict.
- VARY THE SHAPE. Pick whichever form the story actually calls for, and do not default to one:
    "Is X worth it?"            — launches, products, releases a reader might buy or try
    "X vs Y: which wins?"       — two comparable things landed at once
    "What does X mean for Y?"   — deals, policy, results with consequences for someone
    "Why did X happen?"         — a surprising event with a cause worth explaining
    "Is X actually any good?"   — something widely hyped
  Never write "what does X actually mean" as a reflex. If a reader would more naturally ask whether the thing is any good, ask that instead.
- 6-14 words. No clickbait, no years unless essential, no hashtags.
- Only name something the headlines present as NEW or happening now. Never build a query around a name that appears as an example, a historical mention, or part of a list — and never pair a new release against an outdated one.
- AVOID partisan politics, elections, culture-war flashpoints, tragedy/disaster, and anything we recently covered.

Reject outright: trend round-ups, "best of" lists, release calendars, product predictions for a future year, and anything whose source is a listicle rather than a report.

Return ONLY valid JSON, no markdown:
{"query": "the reader-style query" or null, "category": "one-word beat", "rationale": "one sentence: why this, why now — or why nothing qualified"}`

/**
 * Pick today's article topic. Returns null when there's no usable signal.
 */
export async function pickDailyTopic(slot = 0): Promise<DailyTopic | null> {
  // Beat rotates by day; `slot` (0 = morning, 1 = afternoon) offsets to the
  // OPPOSITE side of the ring so two articles on the same day are far-apart
  // categories. Over a week this fans out across the whole beat calendar.
  const beat = BEATS[(dayIndex() + slot * Math.floor(BEATS.length / 2)) % BEATS.length]

  const headlines = await discover(beat)
  if (headlines.length === 0) {
    console.warn('[daily-topic] No usable stories for beat', beat.category)
    return null
  }
  return pickTopicForBeat(beat, headlines)
}

/**
 * Choose a topic from already-discovered headlines. Split out from
 * `pickDailyTopic()` so `scripts/preview-daily-topics.ts` can dry-run the
 * judgement across every beat without generating anything.
 *
 * Returns null when nothing clears the bar — a deliberate outcome, not a failure.
 */
export async function pickTopicForBeat(beat: Beat, headlines: string[]): Promise<DailyTopic | null> {
  const recent = await recentAutoTopics()

  const userMessage = `BEAT: ${beat.category}

TODAY'S HEADLINES:
${headlines.join('\n')}

RECENTLY PUBLISHED (avoid these):
${recent.length ? recent.map(r => `- ${r}`).join('\n') : '(none)'}

Return the JSON now.`

  try {
    const message = await getAnthropic().messages.create({
      model: HAIKU,
      max_tokens: 250,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })
    logApiCall({
      callType: 'daily_topic',
      model: HAIKU,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
    })

    const text = message.content.find(b => b.type === 'text')?.text ?? ''
    const parsed = JSON.parse(extractJSON(text) || text)

    // `null` is a deliberate "nothing worth publishing today", not a failure.
    if (parsed.query === null) {
      console.log(`[daily-topic] Nothing cleared the bar for ${beat.category}: ${parsed.rationale ?? 'no reason given'}`)
      return null
    }

    const query = typeof parsed.query === 'string' ? parsed.query.trim() : ''
    if (query.length < 6) {
      console.warn('[daily-topic] Unusable query returned:', text.slice(0, 120))
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
