/**
 * Brave Video Search — finds YouTube/Vimeo videos for video-topic articles.
 *
 * Used by the research orchestrator when the planner emits `video_queries`.
 * Filters to YouTube and Vimeo only (we know how to embed those).
 *
 * Brave docs: https://api.search.brave.com/app/documentation/video-search
 */

import type { VideoFinding, VideoQuery } from '@/types/article'

interface BraveVideoResult {
  url?: string
  title?: string
  description?: string
  thumbnail?: { src?: string }
  age?: string
  video?: {
    duration?: string
    creator?: string
    publisher?: string
    views?: string | number
  }
  meta_url?: { hostname?: string }
}

interface BraveVideoResponse {
  results?: BraveVideoResult[]
}

const VIDEO_HOST_REGEX = /(?:youtube\.com\/(?:watch|embed|shorts)|youtu\.be\/|vimeo\.com\/)/i

/**
 * Search Brave for videos matching a query. Returns YouTube/Vimeo only.
 * Returns empty array if API key missing or call fails.
 */
async function searchBraveVideos(query: string, count = 10): Promise<VideoFinding[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return []

  try {
    const url = new URL('https://api.search.brave.com/res/v1/videos/search')
    url.searchParams.set('q', query)
    url.searchParams.set('count', String(count))
    url.searchParams.set('safesearch', 'moderate')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.warn(`[brave-video] API error ${res.status}`)
      return []
    }

    const data = (await res.json()) as BraveVideoResponse
    const results = data.results ?? []

    return results
      .filter(r => r.url && VIDEO_HOST_REGEX.test(r.url))
      .map(r => ({
        url: r.url!,
        title: r.title?.trim() ?? '(untitled)',
        channel: r.video?.creator || r.video?.publisher || undefined,
        duration: r.video?.duration ?? undefined,
        published: r.age ?? undefined,
        views: r.video?.views !== undefined ? String(r.video.views) : undefined,
        thumbnail: r.thumbnail?.src ?? undefined,
        description: r.description ?? undefined,
      }))
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError'
    console.warn(`[brave-video] Search failed${isTimeout ? ' (timeout)' : ''}: ${(err as Error).message}`)
    return []
  }
}

/**
 * Run all video queries in parallel, dedupe by URL, return unified pool.
 */
export async function executeVideoQueries(
  queries: VideoQuery[] | undefined,
  perQuery = 8,
): Promise<VideoFinding[]> {
  if (!queries || queries.length === 0) return []

  const results = await Promise.all(
    queries.map(q => searchBraveVideos(q.query, perQuery)),
  )

  // Dedupe by URL — keep first occurrence
  const seen = new Set<string>()
  const merged: VideoFinding[] = []
  for (const batch of results) {
    for (const v of batch) {
      // Normalise YouTube URLs so the same video found via different formats dedupes
      const key = normaliseVideoUrl(v.url)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(v)
    }
  }

  return merged
}

function normaliseVideoUrl(url: string): string {
  // Extract YouTube ID and rebuild canonical form
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)
  if (yt) return `youtube:${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeo) return `vimeo:${vimeo[1]}`
  return url.toLowerCase()
}

/**
 * Format video findings for inclusion in the writer prompt.
 * Returns a string the writer reads to choose which videos to embed.
 */
export function formatVideoFindingsForPrompt(findings: VideoFinding[]): string {
  if (findings.length === 0) {
    return [
      '',
      'VIDEOS: NONE AVAILABLE.',
      'No video search results were available for this article. Do NOT generate video_embed sections — there are no real URLs to embed.',
      '',
    ].join('\n')
  }

  const lines: string[] = [
    '',
    `VIDEOS (${findings.length} real YouTube/Vimeo URLs found via Brave video search — use these EXACT URLs for video_embed sections, never invent URLs):`,
    '',
  ]

  findings.forEach((v, i) => {
    const meta: string[] = []
    if (v.channel) meta.push(v.channel)
    if (v.duration) meta.push(v.duration)
    if (v.views) meta.push(`${v.views} views`)
    if (v.published) meta.push(v.published)
    const metaStr = meta.length ? ` [${meta.join(' · ')}]` : ''
    lines.push(`${i + 1}. ${v.title}${metaStr}`)
    lines.push(`   URL: ${v.url}`)
    if (v.description) lines.push(`   Desc: ${v.description.slice(0, 140)}`)
    lines.push('')
  })

  lines.push('To embed a video, output a section like:')
  lines.push('{ "type": "video_embed", "url": "<exact URL from list above>", "caption": "<one line description>", "context": "<channel · duration · year>" }')
  lines.push('CRITICAL: copy the URL EXACTLY as listed. Do not edit, shorten, or invent URLs. If you cannot find a relevant video in the list above, omit the embed entirely.')

  return lines.join('\n')
}
