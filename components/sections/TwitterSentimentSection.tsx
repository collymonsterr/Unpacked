'use client'

import { useState, useMemo } from 'react'
import type { TwitterFinding, TwitterSentimentSplit } from '@/types/article'

interface Props {
  findings: TwitterFinding[]
  summary?: string | null
  sentimentSplit?: TwitterSentimentSplit
  contextTrigger?: string | null
  postsAnalysed?: number
  articleId?: string
}

type ViewFilter = 'all' | 'pro' | 'sceptical'

/** Truncate at sentence boundary if over 200 chars. */
function truncateSnippet(text: string, max = 200): string {
  if (text.length <= max) return text
  // Find last sentence boundary before max
  const slice = text.slice(0, max)
  const lastPeriod = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '))
  if (lastPeriod > max * 0.4) return slice.slice(0, lastPeriod + 1) + '...'
  return slice.trimEnd() + '...'
}

/** Get viewpoint styling. */
function viewpointStyle(vp?: 'pro' | 'sceptical' | 'neutral') {
  switch (vp) {
    case 'pro':
      return {
        avatar: { bg: '#EAF3DE', text: '#27500A' },
        border: '#3B6D11',
        pill: { bg: '#EAF3DE', text: '#27500A' },
      }
    case 'sceptical':
      return {
        avatar: { bg: '#FCEBEB', text: '#791F1F' },
        border: '#A32D2D',
        pill: { bg: '#FCEBEB', text: '#791F1F' },
      }
    default:
      return {
        avatar: { bg: '#F0EFED', text: '#6B6966' },
        border: 'transparent',
        pill: { bg: '#F0EFED', text: '#6B6966' },
      }
  }
}

export default function TwitterSentimentSection({
  findings,
  summary,
  sentimentSplit,
  contextTrigger,
  postsAnalysed,
  articleId,
}: Props) {
  const [filter, setFilter] = useState<ViewFilter>('all')
  const [expanded, setExpanded] = useState(false)

  // Render gate
  if (!findings || findings.length < 2) return null

  const hasSentiment = !!sentimentSplit

  // Filter tweets by viewpoint
  const filteredTweets = useMemo(() => {
    const all = findings
    if (filter === 'all') return all
    return all.filter(t => t.viewpoint === filter)
  }, [findings, filter])

  // Show 4 initially, rest on expand
  const visibleTweets = expanded ? filteredTweets : filteredTweets.slice(0, 4)
  const hasMore = filteredTweets.length > 4 && !expanded

  // Interleave pro/sceptical in "All voices" view
  const displayTweets = useMemo(() => {
    if (filter !== 'all' || !hasSentiment) return visibleTweets
    const pro = visibleTweets.filter(t => t.viewpoint === 'pro')
    const sceptical = visibleTweets.filter(t => t.viewpoint === 'sceptical')
    const neutral = visibleTweets.filter(t => t.viewpoint === 'neutral' || !t.viewpoint)
    const interleaved: TwitterFinding[] = []
    const maxLen = Math.max(pro.length, sceptical.length)
    for (let i = 0; i < maxLen; i++) {
      if (pro[i]) interleaved.push(pro[i])
      if (sceptical[i]) interleaved.push(sceptical[i])
    }
    interleaved.push(...neutral)
    return interleaved
  }, [visibleTweets, filter, hasSentiment])

  return (
    <div className="mb-8" style={{ borderTop: '3px solid #BA7517', paddingTop: '24px' }}>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="#BA7517"
            aria-hidden="true"
            className="shrink-0"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            What people are saying on X
          </h2>
        </div>
        {postsAnalysed && postsAnalysed > 0 && (
          <span className="text-xs" style={{ color: '#94918D' }}>
            {postsAnalysed} posts analysed
          </span>
        )}
      </div>

      {/* ── Sentiment meter + summary ── */}
      <div
        className="mb-5 rounded-xl px-4 py-4"
        style={{ backgroundColor: '#FDF6E9', border: '1px solid #F0D9A8' }}
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
              {/* Pro fill (left) */}
              <div
                className="absolute top-0 left-0 h-full rounded-l-full"
                style={{
                  width: `${sentimentSplit.pro_pct}%`,
                  backgroundColor: '#3B6D11',
                  transition: 'width 0.6s ease',
                }}
              />
              {/* Sceptical fill (right) */}
              <div
                className="absolute top-0 right-0 h-full rounded-r-full"
                style={{
                  width: `${sentimentSplit.sceptical_pct}%`,
                  backgroundColor: '#A32D2D',
                  transition: 'width 0.6s ease',
                }}
              />
              {/* Centre divider */}
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

        {/* Summary paragraph */}
        {summary && (
          <p className="text-sm leading-relaxed" style={{ color: '#412402' }}>
            {summary}
          </p>
        )}

        {/* Context trigger */}
        {contextTrigger && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-block shrink-0"
              style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#BA7517' }}
            />
            <span className="text-xs" style={{ color: '#BA7517' }}>
              {contextTrigger}
            </span>
          </div>
        )}
      </div>

      {/* ── Tab navigation ── */}
      {hasSentiment && (
        <div className="flex gap-1 mb-4">
          {(['all', 'pro', 'sceptical'] as ViewFilter[]).map(tab => {
            const isActive = filter === tab
            let label = 'All voices'
            if (tab === 'pro') label = `${sentimentSplit.pro_label} (${sentimentSplit.pro_pct}%)`
            if (tab === 'sceptical') label = `${sentimentSplit.sceptical_label} (${sentimentSplit.sceptical_pct}%)`
            return (
              <button
                key={tab}
                onClick={() => { setFilter(tab); setExpanded(false) }}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150"
                style={{
                  backgroundColor: isActive ? '#BA7517' : 'transparent',
                  color: isActive ? '#fff' : '#6B6966',
                  border: isActive ? '1px solid #BA7517' : '1px solid #E8E2D9',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Tweet cards ── */}
      <div className={`gap-3 ${displayTweets.length >= 2 ? 'grid md:grid-cols-2' : 'space-y-3'}`}>
        {displayTweets.map((tweet) => {
          const vp = viewpointStyle(tweet.viewpoint)
          const initial = (tweet.author_handle[0] ?? 'X').toUpperCase()
          const vpLabel = tweet.viewpoint === 'pro' && sentimentSplit
            ? sentimentSplit.pro_label
            : tweet.viewpoint === 'sceptical' && sentimentSplit
              ? sentimentSplit.sceptical_label
              : null

          return (
            <div
              key={tweet.id}
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderLeft: tweet.viewpoint && tweet.viewpoint !== 'neutral'
                  ? `3px solid ${vp.border}`
                  : '1px solid var(--border)',
                borderTopLeftRadius: tweet.viewpoint && tweet.viewpoint !== 'neutral' ? 0 : undefined,
                borderBottomLeftRadius: tweet.viewpoint && tweet.viewpoint !== 'neutral' ? 0 : undefined,
              }}
            >
              {/* Handle row */}
              <div className="flex items-center gap-2.5 mb-2">
                {/* Letter avatar */}
                <div
                  className="flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: vp.avatar.bg,
                    color: vp.avatar.text,
                  }}
                >
                  {initial}
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}
                >
                  @{tweet.author_handle}
                </span>
              </div>

              {/* Viewpoint pill */}
              {vpLabel && (
                <div className="mb-2">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: vp.pill.bg, color: vp.pill.text }}
                  >
                    {vpLabel}
                  </span>
                </div>
              )}

              {/* Tweet text */}
              <p
                className="text-sm leading-relaxed mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                {truncateSnippet(tweet.snippet)}
              </p>

              {/* Bottom row */}
              <div className="flex items-center justify-end">
                <a
                  href={tweet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold no-underline hover:underline inline-flex items-center gap-1"
                  style={{ color: '#BA7517' }}
                >
                  Read thread →
                </a>
              </div>
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
            Load more voices
          </button>
        </div>
      )}

      {/* ── Footer ── */}
      <p className="text-center text-[11px] mt-4" style={{ color: '#94918D' }}>
        Curated from {postsAnalysed ?? findings.length} recent posts
        {hasSentiment ? ' using deliberate viewpoint balancing' : ''}
      </p>
    </div>
  )
}
