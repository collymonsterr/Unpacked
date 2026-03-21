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
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [thanks, setThanks] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)

  // Check localStorage for previous vote
  useEffect(() => {
    try {
      const votes = JSON.parse(localStorage.getItem('article_votes') ?? '{}')
      if (votes[articleId]) {
        setAlreadyVoted(true)
        setVoted(votes[articleId])
      }
    } catch {}
  }, [articleId])

  async function handleVote(rating: 'up' | 'down', reason?: string) {
    setVoted(rating)

    // Save to localStorage
    try {
      const votes = JSON.parse(localStorage.getItem('article_votes') ?? '{}')
      votes[articleId] = rating
      localStorage.setItem('article_votes', JSON.stringify(votes))
    } catch {}

    try {
      await fetch(`/api/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, reason }),
      })
    } catch {}

    if (rating === 'up') {
      setThanks(true)
      setTimeout(() => setThanks(false), 3000)
    }
  }

  async function handleReason(reason: string) {
    setSelectedReason(reason)
    setShowReasons(false)
    await handleVote('down', reason)
    setThanks(true)
  }

  if (alreadyVoted && !thanks) {
    return null // Already voted, hide the component
  }

  return (
    <div className="mt-8 mb-4 text-center">
      {thanks ? (
        <p
          className="text-sm font-medium transition-opacity duration-500"
          style={{ color: 'var(--text-secondary)' }}
        >
          Thanks for the feedback! 🙏
        </p>
      ) : voted === 'down' && showReasons ? (
        <div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            What went wrong?
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {DOWN_REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => handleReason(reason)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: selectedReason === reason ? 'var(--accent)' : 'var(--card)',
                  color: selectedReason === reason ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      ) : !voted ? (
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Was this article helpful?
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => handleVote('up')}
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
