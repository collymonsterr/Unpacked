'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type VoteState = 'default' | 'good' | 'needs_work' | 'submitted'

const REASONS = [
  { label: 'Inaccurate info', value: 'inaccurate' },
  { label: 'Bad images', value: 'bad_images' },
  { label: 'Too long', value: 'too_long' },
  { label: 'Weak verdict', value: 'weak_verdict' },
  { label: 'Missing key info', value: 'missing_info' },
] as const

const GOOD_LOCK_DELAY = 5000

function getStorageKey(articleId: string) {
  return `unpacked_feedback_${articleId}`
}

export default function ArticleVoting({ articleId }: { articleId: string }) {
  const [state, setState] = useState<VoteState>('default')
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [locked, setLocked] = useState(false)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const lockTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Check if already voted (localStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(articleId))
      if (stored) {
        setState('submitted')
        setLocked(true)
      }
    } catch {}
  }, [articleId])

  // Lock positive vote on navigation away
  const lockGoodVote = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    setLocked(true)
    localStorage.setItem(getStorageKey(articleId), 'good')
  }, [articleId])

  useEffect(() => {
    if (state !== 'good' || locked) return

    const handleVisibility = () => {
      if (document.hidden) lockGoodVote()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', lockGoodVote)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', lockGoodVote)
    }
  }, [state, locked, lockGoodVote])

  // Clean up lock timer on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    }
  }, [])

  const handleVote = async (vote: 'good' | 'needs_work') => {
    if (locked) return

    if (vote === 'good') {
      // Cancel any pending lock timer (switching from needs_work back)
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)

      setState('good')
      setSelectedReasons([])
      setComment('')

      // Submit the positive vote
      try {
        await fetch(`/api/articles/${articleId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote: 'good' }),
        })
      } catch {}

      // Lock after 5 seconds
      lockTimerRef.current = setTimeout(() => {
        setLocked(true)
        localStorage.setItem(getStorageKey(articleId), 'good')
      }, GOOD_LOCK_DELAY)
    } else {
      // Cancel any pending lock timer (switching from good)
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)

      setState('needs_work')
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }

  const handleSubmitFeedback = async () => {
    setSubmitting(true)
    try {
      await fetch(`/api/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote: 'needs_work',
          reasons: selectedReasons.length > 0 ? selectedReasons : undefined,
          comment: comment.trim() || undefined,
        }),
      })
      localStorage.setItem(getStorageKey(articleId), 'needs_work')
      setState('submitted')
      setLocked(true)
    } catch {
      setState('submitted')
      setLocked(true)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleReason = (value: string) => {
    setSelectedReasons(prev =>
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value]
    )
  }

  if (state === 'submitted') {
    return (
      <div
        className="my-8 mx-auto rounded-xl px-6 py-4 text-center"
        data-no-print
        style={{ maxWidth: 640, backgroundColor: '#F5F3EE' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Thanks for your feedback
        </p>
      </div>
    )
  }

  const goodActive = state === 'good'
  const needsWorkActive = state === 'needs_work'
  const canClickGood = !locked && state !== 'good'
  const canClickNeedsWork = !locked && state !== 'needs_work'

  return (
    <div
      className="my-8 mx-auto rounded-xl"
      data-no-print
      style={{
        maxWidth: 640,
        backgroundColor: '#F5F3EE',
        padding: '1.25rem 1.5rem',
      }}
    >
      <p
        className="mb-0.5"
        style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}
      >
        Rate this article
      </p>
      <p className="mb-4" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Your feedback helps surface the best content
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => handleVote('good')}
          disabled={!canClickGood}
          className="transition-all"
          style={{
            padding: '8px 18px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            cursor: canClickGood ? 'pointer' : 'default',
            border: goodActive ? '1.5px solid #5DCAA5' : '1px solid var(--border)',
            backgroundColor: goodActive ? '#E1F5EE' : '#fff',
            color: goodActive ? '#085041' : 'var(--text-primary)',
            opacity: needsWorkActive && locked ? 0.3 : 1,
          }}
        >
          👍 Good article
        </button>

        <button
          onClick={() => handleVote('needs_work')}
          disabled={!canClickNeedsWork}
          className="transition-all"
          style={{
            padding: '8px 18px',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            cursor: canClickNeedsWork ? 'pointer' : 'default',
            border: needsWorkActive ? '1.5px solid #F09595' : '1px solid var(--border)',
            backgroundColor: needsWorkActive ? '#FCEBEB' : '#fff',
            color: needsWorkActive ? '#791F1F' : 'var(--text-primary)',
            opacity: goodActive && locked ? 0.3 : 1,
          }}
        >
          👎 Needs work
        </button>

        {goodActive && (
          <span style={{ fontSize: 13, color: '#085041', fontWeight: 500 }}>
            Thanks for your feedback!
          </span>
        )}
      </div>

      {needsWorkActive && (
        <div
          ref={feedbackRef}
          className="mt-4 rounded-xl"
          style={{
            backgroundColor: '#fff',
            border: '1px solid var(--border)',
            padding: '1rem 1.25rem',
          }}
        >
          <p
            className="mb-3"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}
          >
            What could be improved?
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {REASONS.map(({ label, value }) => {
              const selected = selectedReasons.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleReason(value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 16,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: selected ? '1.5px solid #EF9F27' : '1px solid var(--border)',
                    backgroundColor: selected ? '#FAEEDA' : '#F5F3EE',
                    color: selected ? '#633806' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Anything else? (optional)"
            maxLength={500}
            style={{
              width: '100%',
              height: 60,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: '#fff',
              fontSize: 13,
              color: 'var(--text-primary)',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmitFeedback}
              disabled={submitting}
              style={{
                padding: '7px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: submitting ? 'wait' : 'pointer',
                backgroundColor: '#BA7517',
                color: '#fff',
                border: 'none',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Sending...' : 'Submit feedback'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
