'use client'

import { useState, useEffect } from 'react'

interface NegativeFeedback {
  id: string
  article_id: string
  article_title: string
  article_slug: string
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

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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

      {negativeFeedback.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No negative feedback yet.
        </p>
      ) : (
        <div className="space-y-3">
          {negativeFeedback.map(f => (
            <div
              key={f.id}
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <a
                  href={`/article/${f.article_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {f.article_title.length > 60 ? f.article_title.slice(0, 60) + '...' : f.article_title}
                </a>
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {f.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
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
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
