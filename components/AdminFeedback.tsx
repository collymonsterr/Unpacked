'use client'

import { useState, useEffect } from 'react'

interface NegativeFeedback {
  id: string
  article_id: string
  article_title: string | null
  article_slug: string | null
  resolved: boolean
  reasons: string[]
  comment: string | null
  created_at: string
}

interface FeedbackData {
  negativeFeedback: NegativeFeedback[]
  summary: {
    totalWeek: number
    positivePercent: number
    topReasons: Array<{ reason: string; count: number }>
  }
}

const REASON_LABELS: Record<string, string> = {
  inaccurate: 'Inaccurate info',
  bad_images: 'Bad images',
  too_long: 'Too long',
  weak_verdict: 'Weak verdict',
  missing_info: 'Missing key info',
}

export default function AdminFeedback() {
  const [data, setData] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleResolved(id: string) {
    if (!data || togglingIds.has(id)) return
    const item = data.negativeFeedback.find(f => f.id === id)
    if (!item) return

    const newResolved = !item.resolved
    // Optimistic update
    setData(prev => prev ? {
      ...prev,
      negativeFeedback: prev.negativeFeedback.map(f =>
        f.id === id ? { ...f, resolved: newResolved } : f
      ),
    } : null)
    setTogglingIds(prev => new Set(prev).add(id))

    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved: newResolved }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback
      setData(prev => prev ? {
        ...prev,
        negativeFeedback: prev.negativeFeedback.map(f =>
          f.id === id ? { ...f, resolved: !newResolved } : f
        ),
      } : null)
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h2
          className="text-lg font-bold mb-4"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Feedback
        </h2>
        <div className="animate-pulse h-32 rounded-xl" style={{ backgroundColor: 'var(--border)' }} />
      </div>
    )
  }

  if (!data) return null

  const { summary, negativeFeedback } = data

  // Sort: unresolved first, then resolved
  const sorted = [...negativeFeedback].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="mb-8">
      <h2
        className="text-lg font-bold mb-4"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Feedback
      </h2>

      {/* Weekly summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)' }}
          >
            {summary.totalWeek}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Votes this week</p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-2xl font-bold"
            style={{
              fontFamily: 'var(--font-sora)',
              color: summary.positivePercent >= 70 ? '#2D8A4E' : summary.positivePercent >= 50 ? '#BA7517' : '#C13A28',
            }}
          >
            {summary.positivePercent}%
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Positive</p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            Top issues
          </p>
          {summary.topReasons.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>None yet</p>
          ) : (
            summary.topReasons.slice(0, 3).map(({ reason, count }) => (
              <p key={reason} className="text-xs" style={{ color: 'var(--text-primary)' }}>
                {REASON_LABELS[reason] ?? reason} <span style={{ color: 'var(--text-secondary)' }}>({count})</span>
              </p>
            ))
          )}
        </div>
      </div>

      {/* Negative feedback list */}
      <h3
        className="text-base font-bold mb-3"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Recent Negative Feedback
      </h3>

      {sorted.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No negative feedback yet.
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map(f => (
            <div
              key={f.id}
              className="rounded-xl p-4 transition-opacity"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                opacity: f.resolved ? 0.5 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Resolved checkbox */}
                  <button
                    onClick={() => toggleResolved(f.id)}
                    className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{
                      border: f.resolved ? '1.5px solid #2D8A4E' : '1.5px solid var(--border)',
                      backgroundColor: f.resolved ? '#2D8A4E' : 'transparent',
                      cursor: 'pointer',
                    }}
                    title={f.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  >
                    {f.resolved && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  {/* Article title — clickable link or "Deleted article" */}
                  {f.article_slug && f.article_title ? (
                    <a
                      href={`/article/${f.article_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate"
                      style={{
                        color: 'var(--accent)',
                        textDecoration: f.resolved ? 'line-through' : 'none',
                      }}
                    >
                      {f.article_title.length > 60 ? f.article_title.slice(0, 60) + '...' : f.article_title}
                    </a>
                  ) : (
                    <span
                      className="text-sm italic"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Deleted article
                    </span>
                  )}
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {f.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 ml-7">
                  {f.reasons.map(r => (
                    <span
                      key={r}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#FAEEDA', color: '#633806' }}
                    >
                      {REASON_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              )}

              {f.comment && (
                <p className="text-xs leading-relaxed ml-7" style={{ color: 'var(--text-secondary)' }}>
                  &ldquo;{f.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
