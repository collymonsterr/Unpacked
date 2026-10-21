/**
 * Story Radar — ranks what people are actually interested in.
 *
 * The daily topic picker used to ask "what did publishers write about?" That is
 * a SUPPLY signal, and supply is full of SEO filler: it is how "cushcore, the
 * snuggly decor trend" became a published article. Radar asks "what are people
 * engaging with?" — a DEMAND signal, which carries hard numbers that filler
 * cannot fake.
 *
 * The strongest guard is CORROBORATION. A story carried by several independent
 * sources, or discussed as well as reported, is real. One listicle is not.
 */
import { braveNewsSearch, type NewsResult } from '@/lib/brave-research'

export interface Candidate {
  title: string
  url: string
  /** Where it came from — 'hn' | 'news'. */
  source: string
  hostname: string
  ageHours: number
  /** Demand signal, when the source exposes one. */
  points?: number
  comments?: number
  snippet?: string
  beat?: string
}

export interface StoryCluster {
  /** Best headline in the cluster. */
  title: string
  url: string
  beat: string
  members: Candidate[]
  /** Distinct hostnames — the corroboration count. */
  sources: number
  totalPoints: number
  totalComments: number
  ageHours: number
  score: number
  /** Human-readable justification, shown with the story when you approve it. */
  evidence: string
}

/**
 * Titles that are not events. Listicles and section pages were the original
 * problem; live blogs and "latest news" hubs are worse, because several outlets
 * run them simultaneously and they CORROBORATE EACH OTHER — three transfer-rumour
 * live blogs looked like a genuine three-source story.
 */
export const NON_STORY_PATTERNS: RegExp[] = [
  /\|\s*(news|gaming news|video game news|home|food|sports)\s*$/i,
  /^(news|gaming|food|sports|business|tech)\s*[-|]/i,
  /\b(list of|release (date|calendar|schedule)|upcoming (games|releases|movies))\b/i,
  /\b\d+\s+(things|ways|tips|trends|gadgets|games|movies|recipes|products|items|reasons)\b/i,
  /\bbest\b[^.]*\b(of|in|for)\s+20\d\d\b/i,
  /\b(trends?|predictions?)\s+(for|of)\s+20\d\d\b/i,
  /\beverything you need to know\b/i,
  /\b(what to watch|what to read|deals? of the (day|week)|roundup|weekly recap)\b/i,
  /\b(wikipedia|newsletters?)\b/i,
  // Live blogs and rolling hubs — never a single event.
  /\blive\s*(updates?|blog|centre|center)\b/i,
  /\blive!/i,
  /\b(latest news|rumou?rs and gossip|transfer (news|market|centre)|as it happened)\b/i,
  /\b(product recalls|recall roundup)\s*$/i,
]

export function isStoryTitle(title: string): boolean {
  if (!title || title.length < 25) return false
  return !NON_STORY_PATTERNS.some(re => re.test(title))
}

/** "www.foxbusiness.com" and "foxbusiness.com" are one outlet, not two. */
export function normaliseHost(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

// ── Collectors ──────────────────────────────────────────────────────────────

/**
 * Hacker News front page via the free Algolia API — no key, real points and
 * comment counts. Skews technical, which is why it is one input and not the
 * only one.
 */
export async function collectHackerNews(): Promise<Candidate[]> {
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30')
    if (!res.ok) return []
    const data = await res.json() as { hits?: Array<Record<string, unknown>> }
    const now = Date.now()
    return (data.hits ?? []).flatMap(h => {
      const title = typeof h.title === 'string' ? h.title : ''
      const createdAt = typeof h.created_at === 'string' ? Date.parse(h.created_at) : NaN
      if (!title || Number.isNaN(createdAt)) return []
      const url = typeof h.url === 'string' && h.url
        ? h.url
        : `https://news.ycombinator.com/item?id=${h.objectID}`
      if (!isStoryTitle(title)) return []
      let hostname = ''
      try { hostname = normaliseHost(new URL(url).hostname) } catch { hostname = 'news.ycombinator.com' }
      return [{
        title,
        url,
        source: 'hn',
        hostname,
        ageHours: (now - createdAt) / 3_600_000,
        points: typeof h.points === 'number' ? h.points : 0,
        comments: typeof h.num_comments === 'number' ? h.num_comments : 0,
      }]
    })
  } catch {
    return []
  }
}

/** Brave news for one beat. Supply signal, but dated and filterable. */
export async function collectNews(beat: string, phrases: string[]): Promise<Candidate[]> {
  const batches = await Promise.all(
    phrases.map(p => braveNewsSearch(p, 12, 'pd').catch(() => [] as NewsResult[]))
  )
  return batches.flat().filter(r => isStoryTitle(r.title)).map(r => ({
    title: r.title,
    url: r.url,
    source: 'news',
    hostname: normaliseHost(r.hostname),
    ageHours: parseAge(r.age),
    snippet: r.snippet,
    beat,
  }))
}

/** Brave gives ages as "3 hours ago" / "2 days ago". Undated → treat as stale. */
function parseAge(age: string): number {
  if (!age) return 999
  const m = age.match(/(\d+)\s*(minute|hour|day|week|month)/i)
  if (!m) return 999
  const n = Number(m[1])
  switch (m[2].toLowerCase()) {
    case 'minute': return n / 60
    case 'hour': return n
    case 'day': return n * 24
    case 'week': return n * 168
    default: return n * 720
  }
}

// ── Clustering ──────────────────────────────────────────────────────────────

const STOP = new Set([
  'the','a','an','and','or','but','of','to','in','on','at','for','with','by','from',
  'is','are','was','were','be','been','has','have','had','will','would','can','could',
  'this','that','these','those','it','its','as','after','before','new','says','say',
  'how','why','what','when','who','which','you','your','not','no','up','out','about',
])

function tokens(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
  )
}

/** Jaccard overlap — cheap and good enough for "same event?". */
function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const t of a) if (b.has(t)) shared++
  return shared / Math.min(a.size, b.size)
}

/** Group candidates describing the same event. */
export function clusterCandidates(candidates: Candidate[]): Candidate[][] {
  const clusters: { tokens: Set<string>; members: Candidate[] }[] = []
  for (const c of candidates) {
    const t = tokens(c.title)
    const hit = clusters.find(cl => similarity(cl.tokens, t) >= 0.5)
    if (hit) {
      hit.members.push(c)
      for (const tok of t) hit.tokens.add(tok)
    } else {
      clusters.push({ tokens: t, members: [c] })
    }
  }
  return clusters.map(c => c.members)
}

// ── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Score a cluster 0-100. The weights encode the editorial judgement:
 *
 *  - CORROBORATION dominates. Independent sources carrying the same story is the
 *    one thing content farms cannot manufacture.
 *  - VELOCITY beats raw volume — points per hour catches a story on the way up,
 *    not one that peaked yesterday.
 *  - RECENCY decays hard. A two-day-old story is not "what's going on".
 */
export function scoreCluster(members: Candidate[]): StoryCluster {
  const hosts = new Set(members.map(m => m.hostname).filter(Boolean))
  const sources = hosts.size
  const totalPoints = members.reduce((s, m) => s + (m.points ?? 0), 0)
  const totalComments = members.reduce((s, m) => s + (m.comments ?? 0), 0)
  const ageHours = Math.min(...members.map(m => m.ageHours))

  // Engagement per hour, log-damped so one viral post can't swamp everything.
  const velocity = (totalPoints + totalComments * 2) / Math.max(ageHours, 2)
  const velocityScore = Math.min(30, Math.log10(1 + velocity) * 16)

  // Corroboration carries the most weight. Several independent outlets covering
  // the same event is the clearest evidence it matters beyond one community —
  // and it is the one thing an SEO page cannot manufacture.
  const corroborationScore = Math.min(45, (sources - 1) * 16)

  // Recency: full marks under 6h, ~nothing past two days.
  const recencyScore = Math.max(0, 25 * Math.exp(-ageHours / 20))

  // A single source is a tip, not a story. Cap it so no amount of upvotes in one
  // community outranks a genuinely corroborated event. (Before this, "70 Years
  // of Fortran" on HN outranked a five-outlet discovery story.)
  const raw = velocityScore + corroborationScore + recencyScore
  const singleSourcePenalty = sources === 1 ? 0.72 : 1

  const score = Math.round(raw * singleSourcePenalty)

  const best = [...members].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0]
  const parts: string[] = []
  if (totalPoints) parts.push(`${totalPoints} pts / ${totalComments} comments`)
  parts.push(`${sources} source${sources === 1 ? '' : 's'}`)
  parts.push(`${ageHours < 1 ? '<1' : Math.round(ageHours)}h old`)

  return {
    title: best.title,
    url: best.url,
    beat: members.find(m => m.beat)?.beat ?? (best.source === 'hn' ? 'Tech' : 'News'),
    members,
    sources,
    totalPoints,
    totalComments,
    ageHours,
    score,
    evidence: parts.join(' · '),
  }
}

/** Collect, cluster, score, rank. Pure signal — no LLM, no cost beyond Brave. */
export function rankStories(candidates: Candidate[]): StoryCluster[] {
  return clusterCandidates(candidates)
    .map(scoreCluster)
    .sort((a, b) => b.score - a.score)
}
