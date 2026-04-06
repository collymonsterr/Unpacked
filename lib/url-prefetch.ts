/**
 * URL Pre-Fetch Layer
 *
 * Detects URLs in user queries, fetches their content, and returns
 * structured context to inject into the planning prompt.
 *
 * Supported URL types:
 * - Twitter/X tweets (via oEmbed API, Brave fallback)
 * - Reddit posts (via .json endpoint)
 * - General web URLs (via Brave Search snippet)
 */

export interface UrlDetection {
  type: 'tweet' | 'reddit' | 'article'
  url: string
  /** Display label: "@handle" for tweets, "r/subreddit" for Reddit, domain for articles */
  label: string
}

export interface PrefetchedContent {
  type: 'tweet' | 'reddit' | 'article'
  url: string
  /** The extracted text content */
  text: string
  /** Author handle (tweets) or subreddit (Reddit) */
  author: string | null
  /** Source metadata to store on the article record */
  sourceMeta: {
    type: 'tweet' | 'reddit' | 'article'
    url: string
    handle?: string
    author_name?: string
    subreddit?: string
    domain?: string
  }
}

// ── URL Detection ──

const TWEET_PATTERN = /https?:\/\/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/i
const REDDIT_PATTERN = /https?:\/\/(?:www\.)?reddit\.com\/r\/(\w+)\/comments\/(\w+)/i
const GENERAL_URL_PATTERN = /https?:\/\/[^\s,)}\]]+/i

/**
 * Detect URLs in a query string and classify them.
 * Returns an empty array if no URLs found.
 */
export function detectUrls(query: string): UrlDetection[] {
  const detections: UrlDetection[] = []

  // Check for tweet URLs
  const tweetMatch = query.match(TWEET_PATTERN)
  if (tweetMatch) {
    detections.push({
      type: 'tweet',
      url: tweetMatch[0].split('?')[0], // Strip query params like ?s=20
      label: `@${tweetMatch[1]}`,
    })
  }

  // Check for Reddit URLs
  const redditMatch = query.match(REDDIT_PATTERN)
  if (redditMatch) {
    detections.push({
      type: 'reddit',
      url: redditMatch[0].split('?')[0],
      label: `r/${redditMatch[1]}`,
    })
  }

  // Check for general URLs (only if not already matched as tweet or Reddit)
  if (detections.length === 0) {
    const urlMatch = query.match(GENERAL_URL_PATTERN)
    if (urlMatch) {
      try {
        const parsed = new URL(urlMatch[0])
        detections.push({
          type: 'article',
          url: urlMatch[0],
          label: parsed.hostname.replace(/^www\./, ''),
        })
      } catch {
        // Invalid URL — skip
      }
    }
  }

  return detections
}

/**
 * Extract the user's actual request from a query that contains a URL.
 * Returns the query with the URL removed, trimmed.
 */
export function extractUserRequest(query: string): string {
  // Remove all URLs from the query
  const withoutUrls = query
    .replace(/https?:\/\/[^\s,)}\]]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return withoutUrls
}

// ── Content Fetching ──

/**
 * Fetch content for all detected URLs in a query.
 * Returns an array of successfully fetched content (may be empty).
 * Never throws — failures are logged and skipped.
 */
export async function prefetchUrls(detections: UrlDetection[]): Promise<PrefetchedContent[]> {
  const results: PrefetchedContent[] = []

  for (const detection of detections) {
    try {
      let content: PrefetchedContent | null = null

      switch (detection.type) {
        case 'tweet':
          content = await fetchTweetContent(detection.url)
          break
        case 'reddit':
          content = await fetchRedditContent(detection.url)
          break
        case 'article':
          content = await fetchArticleContent(detection.url)
          break
      }

      if (content && content.text.length > 10) {
        results.push(content)
      }
    } catch (err) {
      console.warn(`[url-prefetch] Failed to fetch ${detection.type} at ${detection.url}:`, err instanceof Error ? err.message : err)
    }
  }

  return results
}

/**
 * Fetch tweet content via Twitter oEmbed API (free, no auth).
 * Falls back to Brave Search if oEmbed fails.
 */
async function fetchTweetContent(url: string): Promise<PrefetchedContent | null> {
  const handleMatch = url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status/)
  const handle = handleMatch?.[1] ?? null

  // Attempt 1: oEmbed API
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Unpacked/1.0' },
      signal: AbortSignal.timeout(8000),
    })

    if (res.ok) {
      const data = await res.json() as { html?: string; author_name?: string }
      if (data.html) {
        // Strip HTML tags to get plain text
        const text = data.html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<blockquote[^>]*>/gi, '')
          .replace(/<\/blockquote>/gi, '')
          .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        if (text.length > 10) {
          console.log(`[url-prefetch] Tweet fetched via oEmbed: @${handle}, ${text.length} chars`)
          return {
            type: 'tweet',
            url,
            text,
            author: handle ? `@${handle}` : data.author_name ?? null,
            sourceMeta: {
              type: 'tweet',
              url,
              handle: handle ?? undefined,
              author_name: data.author_name ?? undefined,
            },
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[url-prefetch] oEmbed failed for ${url}:`, err instanceof Error ? err.message : err)
  }

  // Attempt 2: Brave Search for the tweet URL
  try {
    const braveContent = await fetchViaBrave(url)
    if (braveContent) {
      console.log(`[url-prefetch] Tweet fetched via Brave fallback: @${handle}, ${braveContent.length} chars`)
      return {
        type: 'tweet',
        url,
        text: braveContent,
        author: handle ? `@${handle}` : null,
        sourceMeta: {
          type: 'tweet',
          url,
          handle: handle ?? undefined,
        },
      }
    }
  } catch {
    // Both methods failed
  }

  console.warn(`[url-prefetch] Could not fetch tweet content for ${url}`)
  return null
}

/**
 * Fetch Reddit post content via the .json endpoint.
 */
async function fetchRedditContent(url: string): Promise<PrefetchedContent | null> {
  const subredditMatch = url.match(/reddit\.com\/r\/(\w+)/)
  const subreddit = subredditMatch?.[1] ?? null

  try {
    // Reddit's .json endpoint returns the post data
    const jsonUrl = url.replace(/\/$/, '') + '.json'
    const res = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Unpacked/1.0 (article research platform)',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`Reddit returned ${res.status}`)

    const data = await res.json()
    // Reddit returns an array: [post_listing, comments_listing]
    const post = data?.[0]?.data?.children?.[0]?.data
    if (!post) throw new Error('No post data found')

    const title = post.title ?? ''
    const selftext = post.selftext ?? ''
    const author = post.author ?? null
    const score = post.score ?? 0
    const numComments = post.num_comments ?? 0

    const text = [
      `Title: ${title}`,
      selftext ? `\n${selftext}` : '',
      `\nPosted by u/${author} · ${score} upvotes · ${numComments} comments`,
    ].filter(Boolean).join('')

    console.log(`[url-prefetch] Reddit post fetched: r/${subreddit}, ${text.length} chars`)

    return {
      type: 'reddit',
      url,
      text,
      author: author ? `u/${author}` : null,
      sourceMeta: {
        type: 'reddit',
        url,
        subreddit: subreddit ?? undefined,
      },
    }
  } catch (err) {
    console.warn(`[url-prefetch] Reddit fetch failed:`, err instanceof Error ? err.message : err)

    // Fallback to Brave
    try {
      const braveContent = await fetchViaBrave(url)
      if (braveContent) {
        return {
          type: 'reddit',
          url,
          text: braveContent,
          author: null,
          sourceMeta: {
            type: 'reddit',
            url,
            subreddit: subreddit ?? undefined,
          },
        }
      }
    } catch {
      // Both failed
    }

    return null
  }
}

/**
 * Fetch article content via Brave Search snippet.
 */
async function fetchArticleContent(url: string): Promise<PrefetchedContent | null> {
  let domain: string
  try {
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }

  const braveContent = await fetchViaBrave(url)
  if (braveContent) {
    console.log(`[url-prefetch] Article fetched via Brave: ${domain}, ${braveContent.length} chars`)
    return {
      type: 'article',
      url,
      text: braveContent,
      author: null,
      sourceMeta: {
        type: 'article',
        url,
        domain,
      },
    }
  }

  return null
}

/**
 * Use Brave Search to find a specific URL and extract its snippet/description.
 * This is a fallback method when direct fetching isn't possible.
 */
async function fetchViaBrave(url: string): Promise<string | null> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return null

  try {
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(url)}&count=3`
    const res = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null
    const data = await res.json()

    // Look for the exact URL in results, or the closest match
    const results = data?.web?.results ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exactMatch = results.find((r: any) => r.url === url)
    const bestMatch = exactMatch ?? results[0]

    if (bestMatch) {
      const parts: string[] = []
      if (bestMatch.title) parts.push(bestMatch.title)
      if (bestMatch.description) parts.push(bestMatch.description)
      // Some Brave results include extra_snippets with more content
      if (bestMatch.extra_snippets?.length) {
        parts.push(...bestMatch.extra_snippets.slice(0, 3))
      }
      const text = parts.join('\n\n').trim()
      if (text.length > 20) return text
    }
  } catch {
    // Brave search failed
  }

  return null
}

// ── Context Injection ──

/**
 * Build the context string to prepend to the planning prompt.
 * This gives the planner the actual content from referenced URLs.
 */
export function buildPrefetchContext(contents: PrefetchedContent[], userRequest: string): string {
  if (contents.length === 0) return userRequest

  const blocks = contents.map(c => {
    const typeLabel = c.type === 'tweet' ? 'Tweet' : c.type === 'reddit' ? 'Reddit Post' : 'Article'
    const authorLabel = c.author ? ` by ${c.author}` : ''
    return `[${typeLabel}${authorLabel}]:\n${c.text}`
  })

  const contextBlock = `REFERENCED CONTENT (the user pasted a URL — this is the actual content from that URL, use it as the primary source for planning):\n---\n${blocks.join('\n---\n')}\n---`

  // If there's a user request beyond the URL, include it
  if (userRequest.length > 5) {
    return `${contextBlock}\n\nUSER REQUEST:\n${userRequest}`
  }

  // URL only, no additional instructions
  return `${contextBlock}\n\nWrite an article based on this content. Pick the most appropriate article type and angle.`
}
