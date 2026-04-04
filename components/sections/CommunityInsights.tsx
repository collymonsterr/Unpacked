'use client'

import { useState, useCallback } from 'react'
import type { CommunityInsights as CommunityInsightsType, ArticleContent } from '@/types/article'

const consensusConfig = {
  strong: { label: 'Mostly positive', color: '#16a34a', bg: '#f0fdf4' },
  mixed: { label: 'Mixed opinions', color: '#d97706', bg: '#fffbeb' },
  divided: { label: 'Divided', color: '#dc2626', bg: '#fff5f5' },
}

const sentimentDot: Record<string, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  mixed: '#d97706',
}

interface Props {
  section: CommunityInsightsType
  isOwner?: boolean
  articleId?: string
  onArticleUpdated?: (article: ArticleContent) => void
}

export default function CommunityInsights({ section, isOwner = false, articleId, onArticleUpdated }: Props) {
  const cfg = consensusConfig[section.consensus] ?? consensusConfig.mixed
  const quotes = section.quotes?.slice(0, 2) ?? []
  const threads = section.reddit_threads?.slice(0, 5) ?? []

  // Track items being removed (fade-out animation)
  const [removingQuotes, setRemovingQuotes] = useState<Set<number>>(new Set())
  const [removingInsights, setRemovingInsights] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const handleRemove = useCallback(async (type: 'quote' | 'insight', index: number) => {
    if (!articleId) return

    // Start fade-out
    if (type === 'quote') {
      setRemovingQuotes(prev => new Set(prev).add(index))
    } else {
      setRemovingInsights(prev => new Set(prev).add(index))
    }

    try {
      const res = await fetch(`/api/articles/${articleId}/remove-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, index }),
      })

      if (!res.ok) {
        // Revert fade
        if (type === 'quote') {
          setRemovingQuotes(prev => { const n = new Set(prev); n.delete(index); return n })
        } else {
          setRemovingInsights(prev => { const n = new Set(prev); n.delete(index); return n })
        }
        return
      }

      const data = await res.json()

      // Clear removing state BEFORE updating parent — otherwise the shifted
      // indices still match the old "removing" set and hide the wrong items.
      setRemovingQuotes(new Set())
      setRemovingInsights(new Set())

      if (data.article && onArticleUpdated) {
        onArticleUpdated(data.article)
      }

      // Toast hint about available Reddit findings
      if (data.availableRedditFindings > 0) {
        setToast(`Removed. ${data.availableRedditFindings} more quote${data.availableRedditFindings === 1 ? '' : 's'} available in Editor's Notes.`)
        setTimeout(() => setToast(null), 4000)
      }
    } catch {
      // Revert fade on error
      if (type === 'quote') {
        setRemovingQuotes(prev => { const n = new Set(prev); n.delete(index); return n })
      } else {
        setRemovingInsights(prev => { const n = new Set(prev); n.delete(index); return n })
      }
    }
  }, [articleId, onArticleUpdated])

  // If the section is empty (all items removed via parent re-render), don't render
  if (quotes.length === 0 && section.insights.length === 0) return null

  return (
    <div className="mb-8" style={{ borderTop: '3px solid #BA7517', paddingTop: '24px' }}>
      {/* Heading + sentiment pill */}
      <div className="flex items-center gap-3 mb-1">
        <h2
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          What real people think
        </h2>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Subheading */}
      <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
        Sourced from Reddit, Twitter/X, and community forums
      </p>

      {/* Consensus summary */}
      <p className="mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {section.consensus_summary}
      </p>

      {/* Pull quotes — between summary and platform cards */}
      {quotes.length > 0 && (
        <div className="mb-5 space-y-3">
          {quotes.map((q, i) => {
            const isRemoving = removingQuotes.has(i)
            // Try to find a matching thread URL for this quote's source
            const sourceMatch = q.source?.match(/r\/(\w+)/i)
            const threadUrl = sourceMatch
              ? threads.find(t => {
                  const tSub = t.subreddit.replace(/^r\//, '')
                  return tSub.toLowerCase() === sourceMatch[1].toLowerCase()
                })?.url
              : undefined

            return (
              <div
                key={i}
                className="group relative pl-4 py-2 transition-opacity duration-300"
                style={{
                  borderLeft: '3px solid #BA7517',
                  opacity: isRemoving ? 0 : 1,
                }}
              >
                {/* Remove button — owner only */}
                {isOwner && articleId && (
                  <button
                    onClick={() => handleRemove('quote', i)}
                    className="absolute top-1 right-1 w-[22px] h-[22px] flex items-center justify-center rounded-full opacity-[0.4] md:opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
                    aria-label="Remove quote"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
                <p
                  className="text-sm leading-relaxed mb-1"
                  style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}
                >
                  &ldquo;{q.text}&rdquo;
                </p>
                {threadUrl ? (
                  <a
                    href={threadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs no-underline hover:underline"
                    style={{ color: '#BA7517' }}
                  >
                    {q.source}
                  </a>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {q.source}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Platform insight cards — grid on desktop */}
      <div className={`gap-3 ${section.insights.length >= 2 ? 'grid md:grid-cols-2' : 'space-y-3'}`}>
        {section.insights.map((insight, i) => {
          const isRemoving = removingInsights.has(i)
          const isLastOdd = section.insights.length >= 2
            && section.insights.length % 2 === 1
            && i === section.insights.length - 1
          return (
          <div
            key={i}
            className={`group relative rounded-xl p-4 transition-opacity duration-300${isLastOdd ? ' md:col-span-2' : ''}`}
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              opacity: isRemoving ? 0 : 1,
            }}
          >
            {/* Remove button — owner only */}
            {isOwner && articleId && (
              <button
                onClick={() => handleRemove('insight', i)}
                className="absolute top-2 right-2 w-[22px] h-[22px] flex items-center justify-center rounded-full opacity-[0.4] md:opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
                aria-label="Remove insight"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: sentimentDot[insight.sentiment] ?? '#6b7280' }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {(() => {
                  // Extract subreddit from source like "Reddit r/headphones" or "Reddit r/headphoneadvice"
                  const subMatch = insight.source.match(/r\/(\w+)/i)
                  if (subMatch) {
                    const sub = subMatch[0] // e.g. "r/headphones"
                    const prefix = insight.source.slice(0, insight.source.indexOf(sub)).trim()
                    return (
                      <>
                        {prefix && <>{prefix} </>}
                        <a
                          href={`https://reddit.com/${sub}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="no-underline hover:underline"
                          style={{ color: '#BA7517' }}
                        >
                          {sub}
                        </a>
                      </>
                    )
                  }
                  return insight.source
                })()}
              </span>
              {/* Reddit icon next to REDDIT label */}
              {insight.source.toLowerCase().includes('reddit') && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4500" className="shrink-0">
                  <circle cx="12" cy="12" r="12" fill="#FF4500" />
                  <path d="M18.5 12.5c0-.5-.2-1-.6-1.3.1-.3.1-.7.1-1 0-2.8-3.1-5-7-5s-7 2.2-7 5c0 .3 0 .7.1 1-.4.3-.6.8-.6 1.3 0 .9.7 1.6 1.6 1.6.4 0 .8-.2 1.1-.4 1.1.8 2.5 1.3 4.1 1.3h.2l1.4 2.1c.2.3.5.4.8.4h.3c.5-.1.8-.6.7-1.1l-.3-1.5c1.1-.3 2-.8 2.6-1.4.3.2.6.3 1 .3.9 0 1.6-.7 1.6-1.6z" fill="#fff" />
                </svg>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {insight.summary}
            </p>
          </div>
          )
        })}
      </div>

      {/* Reddit thread cards */}
      {threads.length > 0 && (
        <div className="mt-5">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
          >
            Related discussions
          </p>
          <div className={`gap-2 ${threads.length >= 2 ? 'grid md:grid-cols-2' : 'space-y-2'}`}>
            {threads.map((thread, i) => (
              <a
                key={i}
                href={thread.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 no-underline transition-colors"
                style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-light)'
                  e.currentTarget.style.borderColor = '#BA7517'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium leading-snug line-clamp-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {thread.title}
                  </p>
                  <a
                    href={`https://reddit.com/${thread.subreddit.startsWith('r/') ? thread.subreddit : 'r/' + thread.subreddit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-0.5 no-underline hover:underline block"
                    style={{ color: '#BA7517' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {thread.subreddit}
                  </a>
                </div>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className="mt-3 text-xs px-3 py-2 rounded-lg generation-fade-in"
          style={{ backgroundColor: '#FDF8F0', color: '#BA7517', border: '1px solid #E8E6E0' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
