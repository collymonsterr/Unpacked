'use client'

import { useState, useEffect } from 'react'

const DOWN_REASONS = [
  'Outdated information',
  'Wrong products or recommendations',
  'Bad images',
  'Too generic or unhelpful',
  'Inaccurate facts or prices',
  'Other',
]

interface Props {
  articleId: string
}

export default function ArticleFeedback({ articleId }: Props) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null)
  const [showReasons, setShowReasons] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set())
  const [comment, setComment] = useState('')
  const [thanks, setThanks] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    try {
      const votes = JSON.parse(localStorage.getItem('article_votes') ?? '{}')
      if (votes[articleId]) {
        setAlreadyVoted(true)
        setVoted(votes[articleId])
      }
    } catch {}
  }, [articleId])

  function toggleReason(reason: string) {
    setSelectedReasons(prev => {
      const next = new Set(prev)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return next
    })
  }

  async function submitFeedback(rating: 'up' | 'down') {
    setSubmitting(true)

    const reasonStr = selectedReasons.size > 0
      ? [...selectedReasons].join(', ') + (comment.trim() ? ` — ${comment.trim()}` : '')
      : comment.trim() || undefined

    try {
      const votes = JSON.parse(localStorage.getItem('article_votes') ?? '{}')
      votes[articleId] = rating
      localStorage.setItem('article_votes', JSON.stringify(votes))
    } catch {}

    try {
      await fetch(`/api/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, reason: reasonStr }),
      })
    } catch {}

    setThanks(true)
    setSubmitting(false)
  }

  if (alreadyVoted && !thanks) return null

  return (
    <div className="mt-8 mb-4">
      {thanks ? (
        <p className="text-sm font-medium text-center" style={{ color: 'var(--text-secondary)' }}>
          Thanks for the feedback! 🙏
        </p>
      ) : voted === 'down' && showReasons ? (
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            What went wrong? Select all that apply.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {DOWN_REASONS.map(reason => {
              const isSelected = selectedReasons.has(reason)
              return (
                <button
                  key={reason}
                  onClick={() => toggleReason(reason)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {reason}
                </button>
              )
            })}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything else you'd like to tell us? (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => submitFeedback('down')}
              disabled={submitting || (selectedReasons.size === 0 && !comment.trim())}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Sending...' : 'Submit feedback'}
            </button>
            <button
              onClick={() => { setShowReasons(false); setVoted(null) }}
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : !voted ? (
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Was this article helpful?
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => submitFeedback('up')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              👍 Yes
            </button>
            <button
              onClick={() => { setVoted('down'); setShowReasons(true) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              👎 Not quite
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
