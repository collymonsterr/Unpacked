'use client'

import { useState, useMemo, useCallback } from 'react'
import type { RedditThread, RedditSentimentSplit } from '@/types/article'

interface Props {
  threads: RedditThread[]
  sentimentSplit?: RedditSentimentSplit | null
  contextTrigger?: string | null
  threadsAnalysed?: number
  articleId?: string
  isOwner?: boolean
  onThreadsUpdated?: (next: RedditThread[]) => void
}

const DISPLAY_COUNT = 4

/** Get viewpoint styling. */
function viewpointStyle(vp?: 'pro' | 'sceptical' | 'neutral') {
  switch (vp) {
    case 'pro':
      return { pill: { bg: '#EAF3DE', text: '#27500A' } }
    case 'sceptical':
      return { pill: { bg: '#FCEBEB', text: '#791F1F' } }
    default:
      return { pill: { bg: '#F0EFED', text: '#6B6966' } }
  }
}

/** Format comment count with abbreviation. */
function fmtCount(n?: number): string {
  if (!n) return ''
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function RedditSentimentSection({
  threads,
  sentimentSplit,
  contextTrigger,
  threadsAnalysed,
  articleId,
  isOwner = false,
  onThreadsUpdated,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [removingIdx, setRemovingIdx] = useState<number | null>(null)
  const [localThreads, setLocalThreads] = useState<RedditThread[]>(threads)

  // Render gate
  if (!localThreads || localThreads.length < 1) return null

  const hasSentiment = !!sentimentSplit

  const visibleThreads = useMemo(() => {
    if (expanded) return localThreads
    return localThreads.slice(0, DISPLAY_COUNT)
  }, [localThreads, expanded])

  const hasMore = localThreads.length > DISPLAY_COUNT && !expanded
  const reserveCount = Math.max(0, localThreads.length - DISPLAY_COUNT)

  // Collect subreddit names for footer
  const subredditNames = useMemo(() => {
    const subs = new Set<string>()
    for (const t of localThreads) {
      const sub = t.subreddit.startsWith('r/') ? t.subreddit : `r/${t.subreddit}`
      subs.add(sub)
    }
    return Array.from(subs).slice(0, 4)
  }, [localThreads])

  const handleRemove = useCallback(async (idx: number) => {
    if (!articleId) return

    setRemovingIdx(idx)

    // Animate out, then call API
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/articles/${articleId}/remove-quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'reddit_thread', index: idx }),
        })

        if (!res.ok) {
          setRemovingIdx(null)
          return
        }

        const data = await res.json()
        const nextThreads = data.reddit_threads ?? localThreads.filter((_: unknown, i: number) => i !== idx)
        setLocalThreads(nextThreads)
        setRemovingIdx(null)
        onThreadsUpdated?.(nextThreads)
      } catch {
        setRemovingIdx(null)
      }
    }, 300) // match CSS transition duration
  }, [articleId, localThreads, onThreadsUpdated])

  return (
    <div className="mb-8" style={{ borderTop: '3px solid #FF4500', paddingTop: '24px' }}>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Reddit snoo icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#FF4500" />
            <path d="M19.5 12c0-.7-.3-1.3-.8-1.7.1-.4.2-.8.2-1.2 0-3.4-3.8-6.1-8.4-6.1S2.1 5.7 2.1 9.1c0 .4.1.8.2 1.2-.5.4-.8 1-.8 1.7 0 1.1.9 2 2 2 .5 0 1-.2 1.4-.5 1.4 1 3.2 1.6 5.1 1.6h.1l1.7 2.5c.2.3.5.5.9.5h.1c.5 0 .9-.4.9-.9l-.2-.5-.2-1.7c1.3-.4 2.4-1 3.1-1.8.3.2.7.3 1.1.3 1.1 0 2-.9 2-2z" fill="white" />
            <circle cx="8.5" cy="10" r="1.2" fill="#FF4500" />
            <circle cx="15.5" cy="10" r="1.2" fill="#FF4500" />
            <path d="M8.5 13.5c0 0 1 1.5 3.5 1.5s3.5-1.5 3.5-1.5" fill="none" stroke="#FF4500" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            What Reddit is saying
          </h2>
        </div>
        {threadsAnalysed && threadsAnalysed > 0 && (
          <span className="text-xs" style={{ color: '#94918D' }}>
            {threadsAnalysed} threads analysed
          </span>
        )}
      </div>

      {/* ── Sentiment meter + summary ── */}
      <div
        className="mb-5 rounded-xl px-4 py-4"
        style={{ backgroundColor: '#FFF0E6', border: '1px solid #FFD4B8' }}
      >
        {/* Sentiment bar */}
        {hasSentiment && (
          <div className="mb-3">
            {/* Labels */}
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: '#3B6D11' }}>
                {sentimentSplit.pro_label}
              </span>
              <span className="text-xs font-semibold" style={{ color: '#A32D2D' }}>
                {sentimentSplit.sceptical_label}
              </span>
            </div>
            {/* Bar */}
            <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E2D9' }}>
              <div
                className="absolute top-0 left-0 h-full rounded-l-full"
                style={{
                  width: `${sentimentSplit.pro_pct}%`,
                  backgroundColor: '#3B6D11',
                  transition: 'width 0.6s ease',
                }}
              />
              <div
                className="absolute top-0 right-0 h-full rounded-r-full"
                style={{
                  width: `${sentimentSplit.sceptical_pct}%`,
                  backgroundColor: '#A32D2D',
                  transition: 'width 0.6s ease',
                }}
              />
              <div
                className="absolute top-0 h-full"
                style={{ left: '50%', width: '1px', backgroundColor: '#412402', opacity: 0.2 }}
              />
            </div>
            {/* Split summary */}
            {sentimentSplit.summary && (
              <p className="text-xs mt-2 leading-relaxed" style={{ color: '#6B5D3E' }}>
                {sentimentSplit.summary}
              </p>
            )}
          </div>
        )}

        {/* Context trigger */}
        {contextTrigger && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-block shrink-0"
              style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#FF4500' }}
            />
            <span className="text-xs" style={{ color: '#FF4500' }}>
              {contextTrigger}
            </span>
          </div>
        )}
      </div>

      {/* ── Thread cards — full-width stacked (NOT 2-column grid) ── */}
      <div className="flex flex-col" style={{ gap: '10px' }}>
        {visibleThreads.map((thread, i) => {
          const vp = viewpointStyle(thread.viewpoint)
          const isRemoving = removingIdx === i
          const sub = thread.subreddit.startsWith('r/') ? thread.subreddit : `r/${thread.subreddit}`
          const vpLabel = thread.viewpoint === 'pro' && sentimentSplit
            ? sentimentSplit.pro_label
            : thread.viewpoint === 'sceptical' && sentimentSplit
              ? sentimentSplit.sceptical_label
              : null

          return (
            <div
              key={`${thread.url}-${i}`}
              className="group relative rounded-xl p-4 transition-all duration-300"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                opacity: isRemoving ? 0 : 1,
                transform: isRemoving ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              {/* Remove button — owner only */}
              {isOwner && articleId && (
                <button
                  onClick={() => handleRemove(i)}
                  className="absolute top-3 right-3 w-[24px] h-[24px] flex items-center justify-center rounded-full opacity-[0.4] md:opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
                  aria-label="Remove thread"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              {/* Header row: snoo + subreddit + meta + upvotes */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Small Reddit icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="#FF4500" />
                    <path d="M19.5 12c0-.7-.3-1.3-.8-1.7.1-.4.2-.8.2-1.2 0-3.4-3.8-6.1-8.4-6.1S2.1 5.7 2.1 9.1c0 .4.1.8.2 1.2-.5.4-.8 1-.8 1.7 0 1.1.9 2 2 2 .5 0 1-.2 1.4-.5 1.4 1 3.2 1.6 5.1 1.6h.1l1.7 2.5c.2.3.5.5.9.5h.1c.5 0 .9-.4.9-.9l-.2-.5-.2-1.7c1.3-.4 2.4-1 3.1-1.8.3.2.7.3 1.1.3 1.1 0 2-.9 2-2z" fill="white" />
                  </svg>
                  {/* Subreddit name */}
                  <a
                    href={`https://reddit.com/${sub}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold no-underline hover:underline"
                    style={{ color: '#FF4500', fontFamily: 'var(--font-sora)' }}
                  >
                    {sub}
                  </a>
                  {/* Timestamp + comment count */}
                  <span className="text-xs" style={{ color: '#94918D' }}>
                    {thread.time_label && <>{thread.time_label}</>}
                    {thread.time_label && thread.num_comments ? ' · ' : ''}
                    {thread.num_comments ? `${fmtCount(thread.num_comments)} comments` : ''}
                  </span>
                  {/* Viewpoint pill */}
                  {vpLabel && (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: vp.pill.bg, color: vp.pill.text }}
                    >
                      {vpLabel}
                    </span>
                  )}
                </div>
                {/* Upvote count */}
                {thread.score && thread.score > 0 && (
                  <div className="flex items-center gap-1 shrink-0" style={{ color: '#94918D' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    <span className="text-xs font-medium">{fmtCount(thread.score)}</span>
                  </div>
                )}
              </div>

              {/* Thread title as body text */}
              <p
                className="leading-relaxed mb-3"
                style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.7' }}
              >
                {thread.snippet || thread.title}
              </p>

              {/* Read full discussion link — points to the exact quoted comment when available */}
              <a
                href={thread.comment_url || thread.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold no-underline hover:underline inline-flex items-center gap-1"
                style={{ color: '#FF4500' }}
              >
                Read full discussion →
              </a>
            </div>
          )
        })}
      </div>

      {/* ── Load more ── */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setExpanded(true)}
            className="px-4 py-2 rounded-full text-xs font-medium transition-colors duration-150"
            style={{
              backgroundColor: 'transparent',
              color: '#6B6966',
              border: '1px solid #E8E2D9',
              cursor: 'pointer',
            }}
          >
            Load more discussions ({reserveCount} more)
          </button>
        </div>
      )}

      {/* ── Footer ── */}
      <p className="text-center text-[11px] mt-4" style={{ color: '#94918D' }}>
        Curated from {threadsAnalysed ?? localThreads.length} active threads across {subredditNames.join(', ')}
      </p>
    </div>
  )
}
