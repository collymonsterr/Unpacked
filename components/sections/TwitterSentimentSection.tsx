'use client'

import { useCallback, useState } from 'react'
import type { TwitterFinding } from '@/types/article'

interface Props {
  /** Tweet/X findings — render only when there are 2+ */
  findings: TwitterFinding[]
  /** Haiku-generated paragraph summarising the conversation */
  summary?: string | null
  /** Owner-only ✕ removal UI */
  isOwner?: boolean
  /** Article id used by /api/articles/[id]/remove-quote */
  articleId?: string
  /** Optional callback after a successful removal — parent updates its copy */
  onUpdated?: (next: { findings: TwitterFinding[]; summary: string | null }) => void
}

export default function TwitterSentimentSection({
  findings,
  summary,
  isOwner = false,
  articleId,
  onUpdated,
}: Props) {
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  const handleRemove = useCallback(async (id: string) => {
    if (!articleId) return
    setRemovingIds(prev => new Set(prev).add(id))

    try {
      const res = await fetch(`/api/articles/${articleId}/remove-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'twitter', id }),
      })

      if (!res.ok) {
        setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n })
        return
      }

      const data = await res.json()
      setRemovingIds(new Set())
      if (onUpdated) {
        onUpdated({
          findings: Array.isArray(data.twitter_findings) ? data.twitter_findings : [],
          summary: typeof data.twitter_summary === 'string' ? data.twitter_summary : null,
        })
      }
    } catch {
      setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }, [articleId, onUpdated])

  // Render gate: need at least 2 findings to feel like a "conversation"
  if (!findings || findings.length < 2) return null

  // Cap displayed tweets at 4
  const tweets = findings.slice(0, 4)

  return (
    <div className="mb-8" style={{ borderTop: '3px solid #BA7517', paddingTop: '24px' }}>
      {/* Heading */}
      <div className="flex items-center gap-3 mb-5">
        {/* X (Twitter) logo */}
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

      {/* Summary card */}
      {summary && (
        <div
          className="mb-5 rounded-xl px-4 py-4"
          style={{ backgroundColor: '#FAEEDA', color: '#412402' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#412402' }}>
            {summary}
          </p>
        </div>
      )}

      {/* Tweet cards */}
      <div className={`gap-3 ${tweets.length >= 2 ? 'grid md:grid-cols-2' : 'space-y-3'}`}>
        {tweets.map((tweet) => {
          const isRemoving = removingIds.has(tweet.id)
          return (
            <div
              key={tweet.id}
              className="group relative rounded-xl p-4 transition-opacity duration-300"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                opacity: isRemoving ? 0 : 1,
              }}
            >
              {isOwner && articleId && (
                <button
                  onClick={() => handleRemove(tweet.id)}
                  className="absolute top-2 right-2 w-[22px] h-[22px] flex items-center justify-center rounded-full opacity-[0.4] md:opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ color: '#94918D', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}
                  aria-label="Remove tweet"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              {/* Author handle */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: '#BA7517', fontFamily: 'var(--font-sora)' }}
                >
                  @{tweet.author_handle}
                </span>
              </div>

              {/* Tweet snippet */}
              <p
                className="text-sm leading-relaxed mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                {tweet.snippet}
              </p>

              {/* Read thread link */}
              <a
                href={tweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs no-underline hover:underline inline-flex items-center gap-1"
                style={{ color: '#BA7517' }}
              >
                Read thread →
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
