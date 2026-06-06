/**
 * Reddit native comment fetching.
 *
 * The old "What Reddit is saying" cards displayed Brave's truncated web-search
 * blurb for a reddit.com URL — a page preview, not the best comment. This module
 * reads the *actual* top-voted comments from a thread via Reddit's free public
 * JSON endpoint (append `.json` to any permalink — no auth, no API key), so a
 * vision/selection model can quote real, complete, on-topic owner opinions.
 *
 * Reliability posture (no Reddit app / OAuth — the founder opted for zero-setup):
 *  - Polite, unique User-Agent (Reddit rate-limits/blocks blank UAs hardest).
 *  - Short timeout + one retry on a fallback host (www → old.reddit.com).
 *  - In-memory cache (serverless caveat: per-instance only — same as the Yahoo
 *    Finance / api-usage caches).
 *  - Returns `[]` on ANY failure (403/429/timeout/parse) so callers fall back to
 *    the existing Brave snippet and the pipeline never blocks.
 *
 * Reddit can still block requests from data-center IPs. That's an accepted
 * trade-off of the no-app route: most of the time we get great quotes, and when
 * we don't, the card degrades to today's behaviour — never worse.
 */

export interface RedditComment {
  /** Cleaned, plain-text comment body. */
  body: string
  /** Upvote score. */
  score: number
  /** Comment author handle (without u/), if available. */
  author?: string
  /** Absolute URL to the specific comment. */
  permalink?: string
}

export interface RedditThreadData {
  /** Post-level metadata (num_comments, score) — null if the fetch failed. */
  meta: { num_comments: number; score: number } | null
  /** Ranked, cleaned top comments — [] if none/failed. */
  comments: RedditComment[]
}

const USER_AGENT = 'web:unpacked.fyi:1.0 (article research; +https://unpacked.fyi)'
const DEFAULT_TIMEOUT_MS = 6000
const DEFAULT_LIMIT = 8
const MIN_BODY_CHARS = 40
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

const cache = new Map<string, { at: number; data: RedditThreadData }>()

/**
 * Native Reddit fetching is ON by default. Set REDDIT_NATIVE_API to
 * 'off' | '0' | 'false' to disable and fall back to Brave-only snippets.
 * (Default-on so it works in production without the founder adding env vars.)
 */
export function isRedditNativeEnabled(): boolean {
  const v = (process.env.REDDIT_NATIVE_API ?? '').trim().toLowerCase()
  return v !== 'off' && v !== '0' && v !== 'false'
}

/** Decode the handful of HTML entities Reddit returns even with raw_json=1. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
}

/**
 * Turn a Reddit comment body (markdown) into a clean, display-ready quote:
 * strip blockquote/markdown markers and links, collapse whitespace, then trim
 * to a sentence boundary under `maxChars`. Used for the card snippet.
 */
export function cleanCommentBody(raw: string, maxChars = 280): string {
  let s = decodeEntities(raw)
  // Drop markdown blockquote markers and heading hashes at line starts.
  s = s.replace(/^\s*>+\s?/gm, '').replace(/^\s*#+\s?/gm, '')
  // Markdown links [text](url) → text.
  s = s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
  // Bold/italic/strikethrough/inline-code markers.
  s = s.replace(/[*_`~]+/g, '')
  // Collapse all whitespace (incl. newlines) to single spaces.
  s = s.replace(/\s+/g, ' ').trim()
  // Strip a single layer of wrapping quotes.
  s = s.replace(/^["“'']+|["”'']+$/g, '').trim()

  if (s.length <= maxChars) return s

  // Trim to the last sentence end before maxChars; else hard cut on a word.
  const slice = s.slice(0, maxChars)
  const lastSentence = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '))
  if (lastSentence >= maxChars * 0.5) {
    return slice.slice(0, lastSentence + 1).trim()
  }
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + '…'
}

/** Build the JSON permalink URL for a thread on a given host. */
function buildJsonUrl(threadUrl: string, host: string, limit: number): string | null {
  try {
    const u = new URL(threadUrl)
    if (!/(?:^|\.)reddit\.com$/.test(u.hostname)) return null
    const path = u.pathname.replace(/\/+$/, '') // strip trailing slashes
    if (!path.includes('/comments/')) return null
    return `https://${host}${path}.json?sort=top&limit=${limit}&raw_json=1`
  } catch {
    return null
  }
}

/** Host/query-independent cache key for a thread (its cleaned permalink path). */
function cacheKeyFor(threadUrl: string): string | null {
  try {
    const u = new URL(threadUrl)
    if (!/(?:^|\.)reddit\.com$/.test(u.hostname)) return null
    const path = u.pathname.replace(/\/+$/, '').replace(/\.json$/, '')
    return path.includes('/comments/') ? path : null
  } catch {
    return null
  }
}

interface RawCommentChild {
  kind?: string
  data?: {
    body?: string
    score?: number
    author?: string
    permalink?: string
    stickied?: boolean
    distinguished?: string | null
  }
}

/** Parse Reddit's [post, comments] JSON into ranked, filtered comments. */
function parseComments(json: unknown, limit: number): RedditComment[] {
  if (!Array.isArray(json) || json.length < 2) return []
  const listing = json[1] as { data?: { children?: RawCommentChild[] } }
  const children = listing?.data?.children
  if (!Array.isArray(children)) return []

  const out: RedditComment[] = []
  for (const child of children) {
    if (child?.kind !== 't1') continue // skip "more" / non-comment nodes
    const d = child.data
    if (!d || typeof d.body !== 'string') continue
    const bodyRaw = d.body.trim()
    if (!bodyRaw || bodyRaw === '[deleted]' || bodyRaw === '[removed]') continue
    if (d.stickied || d.distinguished === 'moderator') continue
    if (d.author && d.author.toLowerCase() === 'automoderator') continue
    const body = cleanCommentBody(bodyRaw)
    if (body.length < MIN_BODY_CHARS) continue
    out.push({
      body,
      score: typeof d.score === 'number' ? d.score : 0,
      author: d.author,
      permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : undefined,
    })
  }

  // Highest-voted first.
  out.sort((a, b) => b.score - a.score)
  return out.slice(0, limit)
}

/** Parse the post-level metadata (num_comments, score) from the listing. */
function parsePostMeta(json: unknown): { num_comments: number; score: number } | null {
  if (!Array.isArray(json) || json.length < 1) return null
  const post = (json[0] as { data?: { children?: Array<{ data?: { num_comments?: number; score?: number } }> } })
    ?.data?.children?.[0]?.data
  if (!post) return null
  return {
    num_comments: typeof post.num_comments === 'number' ? post.num_comments : 0,
    score: typeof post.score === 'number' ? post.score : 0,
  }
}

async function fetchOnce(url: string, timeoutMs: number): Promise<unknown | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch a Reddit thread's `.json` ONCE and return both post metadata and the
 * top comments. Cached by permalink so the two consumers — the Brave-research
 * comment-count filter (`fetchRedditMetadata`) and the orchestrator's quote
 * selection — share a single network call instead of fetching the same thread
 * twice. Returns `{ meta: null, comments: [] }` on any failure.
 */
export async function fetchThreadData(
  threadUrl: string,
  opts: { limit?: number; timeoutMs?: number } = {},
): Promise<RedditThreadData> {
  const limit = opts.limit ?? DEFAULT_LIMIT
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const empty: RedditThreadData = { meta: null, comments: [] }

  const key = cacheKeyFor(threadUrl)
  if (!key) return empty

  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data
  }

  const primary = buildJsonUrl(threadUrl, 'www.reddit.com', limit)
  if (!primary) return empty

  // Try www first; on failure retry once on old.reddit.com (often more lenient).
  let json = await fetchOnce(primary, timeoutMs)
  if (!json) {
    const fallback = buildJsonUrl(threadUrl, 'old.reddit.com', limit)
    if (fallback) json = await fetchOnce(fallback, timeoutMs)
  }
  if (!json) {
    cache.set(key, { at: Date.now(), data: empty }) // negative cache to avoid hammering
    return empty
  }

  const data: RedditThreadData = { meta: parsePostMeta(json), comments: parseComments(json, limit) }
  cache.set(key, { at: Date.now(), data })
  return data
}

/**
 * Convenience: just the top comments for a thread (cache-shared with metadata).
 * Returns [] on any failure so callers fall back to the Brave fragment.
 */
export async function fetchTopComments(
  threadUrl: string,
  opts: { limit?: number; timeoutMs?: number } = {},
): Promise<RedditComment[]> {
  return (await fetchThreadData(threadUrl, opts)).comments
}
