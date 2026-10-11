/**
 * TEMPORARY diagnostic — can Reddit's public, no-auth JSON endpoints be fetched
 * from Vercel serverless IPs? Tries each host for one thread and reports summary
 * counts only (never comment bodies or usernames). 404s in production.
 *
 * GET /api/probe/reddit-thread?url=<reddit thread permalink>
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// lib/reddit-comments.ts keeps its USER_AGENT private, so the probe declares its own.
const USER_AGENT = 'web:fyi.unpacked:v0.1 (thread probe; +https://unpacked.fyi)'
const TIMEOUT_MS = 8000
const ALLOWED_HOSTS = new Set(['reddit.com', 'www.reddit.com', 'old.reddit.com', 'np.reddit.com'])
const THREAD_PATH = /^\/r\/([A-Za-z0-9_]+)\/comments\/([A-Za-z0-9]+)(?:\/.*)?$/
const QUERY = 'limit=500&depth=10&raw_json=1'
const HEADERS = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' }

interface RawNode {
  kind?: string
  data?: {
    title?: string
    num_comments?: number
    children?: unknown[]
    replies?: RawListing | string
  }
}

interface RawListing {
  data?: { children?: RawNode[] }
}

interface ThreadSummary {
  title: string | null
  numCommentsReported: number | null
  t1Count: number
  maxDepth: number
  moreStubs: number
  moreIdsListed: number
}

interface Attempt {
  host: string
  status: number | null
  ok: boolean
  elapsedMs: number
  contentType: string | null
  bodyPreview?: string
  error?: string
  thread?: ThreadSummary
}

/** Walk a comment listing, counting t1 comments, depth, and "more" stubs. */
function walk(children: RawNode[] | undefined, depth: number, acc: ThreadSummary): void {
  if (!Array.isArray(children)) return
  for (const child of children) {
    if (child?.kind === 'more') {
      acc.moreStubs += 1
      acc.moreIdsListed += Array.isArray(child.data?.children) ? child.data.children.length : 0
    } else if (child?.kind === 't1') {
      acc.t1Count += 1
      acc.maxDepth = Math.max(acc.maxDepth, depth)
      const replies = child.data?.replies
      // Reddit sends `replies: ""` for a leaf comment.
      if (replies && typeof replies === 'object') walk(replies.data?.children, depth + 1, acc)
    }
  }
}

/** Summarise Reddit's [post, comments] JSON; null if it isn't that shape. */
function summarise(json: unknown): ThreadSummary | null {
  if (!Array.isArray(json) || json.length < 2) return null
  const [postListing, commentListing] = json as RawListing[]
  const post = postListing?.data?.children?.[0]?.data
  const acc: ThreadSummary = {
    title: typeof post?.title === 'string' ? post.title : null,
    numCommentsReported: typeof post?.num_comments === 'number' ? post.num_comments : null,
    t1Count: 0,
    maxDepth: 0,
    moreStubs: 0,
    moreIdsListed: 0,
  }
  walk(commentListing?.data?.children, 1, acc)
  return acc
}

async function probe(host: string, url: string): Promise<Attempt> {
  const started = Date.now()
  const controller = new AbortController()
  // The timer stays armed through the body read — a stalled body is a failure too.
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const attempt: Attempt = { host, status: null, ok: false, elapsedMs: 0, contentType: null }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })
    attempt.status = res.status
    attempt.ok = res.ok
    attempt.contentType = res.headers.get('content-type')
    const text = await res.text()
    try {
      const summary = summarise(JSON.parse(text))
      if (summary) attempt.thread = summary
      else attempt.error = 'JSON parsed but was not a [post, comments] listing'
    } catch {
      attempt.bodyPreview = text.slice(0, 200) // spot block pages
    }
  } catch (err) {
    attempt.error = controller.signal.aborted
      ? `timeout after ${TIMEOUT_MS}ms`
      : err instanceof Error ? err.message : String(err)
  } finally {
    clearTimeout(timer)
    attempt.elapsedMs = Date.now() - started
  }
  return attempt
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse(null, { status: 404, headers: HEADERS })
  }

  const input = request.nextUrl.searchParams.get('url') ?? ''
  const parsed = URL.canParse(input) ? new URL(input) : null
  const match = parsed?.pathname.match(THREAD_PATH)
  if (
    !parsed || !match || parsed.protocol !== 'https:' || parsed.port !== '' ||
    parsed.username !== '' || parsed.password !== '' || !ALLOWED_HOSTS.has(parsed.hostname)
  ) {
    return NextResponse.json(
      { error: 'url must be an https reddit.com thread permalink: /r/<sub>/comments/<id>' },
      { status: 400, headers: HEADERS },
    )
  }

  // Only the validated sub + id are reused — the outbound hosts are fixed below.
  const path = `/r/${match[1]}/comments/${match[2]}`
  const targets: Array<[string, string]> = [
    ['https://www.reddit.com', `${path}.json?${QUERY}`],
    ['https://old.reddit.com', `${path}.json?${QUERY}`],
    ['https://api.reddit.com', `${path}?${QUERY}`],
  ]

  // Sequential and exhaustive: every host is tried so we learn which ones work.
  const attempts: Attempt[] = []
  for (const [host, hostPath] of targets) {
    attempts.push(await probe(host, host + hostPath))
  }

  return NextResponse.json(
    {
      probedAt: new Date().toISOString(),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
      input,
      attempts,
    },
    { headers: HEADERS },
  )
}
