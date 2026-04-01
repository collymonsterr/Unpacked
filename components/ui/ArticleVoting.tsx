'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VoteCounts {
  helpful: { helpful: number; not_helpful: number }
  verdict: { convinced: number; not_convinced: number }
}

interface SavedVotes {
  helpful?: 'helpful' | 'not_helpful'
  verdict?: 'convinced' | 'not_convinced'
}

interface Props {
  articleId: string
  hasVerdict: boolean
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  const key = 'unpacked_session_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function loadSavedVotes(articleId: string): SavedVotes {
  try {
    const raw = localStorage.getItem(`unpacked_votes_${articleId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistVote(articleId: string, category: 'helpful' | 'verdict', value: string) {
  try {
    const existing = loadSavedVotes(articleId)
    localStorage.setItem(
      `unpacked_votes_${articleId}`,
      JSON.stringify({ ...existing, [category]: value })
    )
  } catch {}
}

// ── Reason options ────────────────────────────────────────────────────────────

const HELPFUL_REASONS = [
  'Verdict is wrong',
  'Information is outdated',
  'Missing important options',
  'Prices are incorrect',
  'Poor writing',
  'Something else',
]

// ── Main component ────────────────────────────────────────────────────────────

export default function ArticleVoting({ articleId, hasVerdict }: Props) {
  const [counts, setCounts] = useState<VoteCounts>({
    helpful: { helpful: 0, not_helpful: 0 },
    verdict: { convinced: 0, not_convinced: 0 },
  })
  const [voted, setVoted] = useState<SavedVotes>({})
  const [submitting, setSubmitting] = useState(false)

  // Helpfulness feedback state
  const [showHelpfulPanel, setShowHelpfulPanel] = useState(false)
  const [helpfulPanelDone, setHelpfulPanelDone] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [helpfulComment, setHelpfulComment] = useState('')

  // Verdict feedback state
  const [showVerdictPanel, setShowVerdictPanel] = useState(false)
  const [verdictPanelDone, setVerdictPanelDone] = useState(false)
  const [verdictComment, setVerdictComment] = useState('')

  // Fetch counts + restore vote state on mount
  useEffect(() => {
    fetch(`/api/articles/${articleId}/vote`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCounts(data) })
      .catch(() => {})
    setVoted(loadSavedVotes(articleId))
  }, [articleId])

  const postVote = useCallback(async (
    category: 'helpful' | 'verdict',
    value: string,
    extra?: { reason?: string; comment?: string }
  ) => {
    setSubmitting(true)
    try {
      const sessionId = getOrCreateSessionId()
      const body: Record<string, string> = {
        vote_category: category,
        vote_value: value,
        session_id: sessionId,
      }
      if (extra?.reason) body.reason = extra.reason
      if (extra?.comment) body.comment = extra.comment

      const res = await fetch(`/api/articles/${articleId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) persistVote(articleId, category, value)
    } catch {}
    setSubmitting(false)
  }, [articleId])

  const adjustCounts = useCallback((
    category: 'helpful' | 'verdict',
    newVal: string,
    prevVal?: string
  ) => {
    setCounts(prev => {
      if (category === 'helpful') {
        const next = { ...prev.helpful }
        if (prevVal && prevVal in next) {
          next[prevVal as keyof typeof next] = Math.max(0, next[prevVal as keyof typeof next] - 1)
        }
        if (!prevVal || prevVal !== newVal) {
          next[newVal as keyof typeof next]++
        }
        return { ...prev, helpful: next }
      } else {
        const next = { ...prev.verdict }
        if (prevVal && prevVal in next) {
          next[prevVal as keyof typeof next] = Math.max(0, next[prevVal as keyof typeof next] - 1)
        }
        if (!prevVal || prevVal !== newVal) {
          next[newVal as keyof typeof next]++
        }
        return { ...prev, verdict: next }
      }
    })
  }, [])

  // ── Helpfulness handlers ────────────────────────────────────────────────────

  const handleHelpfulClick = useCallback((value: 'helpful' | 'not_helpful') => {
    const prev = voted.helpful
    if (prev === value) return
    setVoted(v => ({ ...v, helpful: value }))
    adjustCounts('helpful', value, prev)
    postVote('helpful', value)
    if (value === 'not_helpful') {
      setShowHelpfulPanel(true)
      setHelpfulPanelDone(false)
    } else {
      setShowHelpfulPanel(false)
    }
  }, [voted, adjustCounts, postVote])

  const handleHelpfulPanelSubmit = useCallback(async () => {
    await postVote('helpful', 'not_helpful', {
      reason: selectedReason ?? undefined,
      comment: helpfulComment || undefined,
    })
    setShowHelpfulPanel(false)
    setHelpfulPanelDone(true)
  }, [postVote, selectedReason, helpfulComment])

  // ── Verdict handlers ────────────────────────────────────────────────────────

  const handleVerdictClick = useCallback((value: 'convinced' | 'not_convinced') => {
    const prev = voted.verdict
    if (prev === value) return
    setVoted(v => ({ ...v, verdict: value }))
    adjustCounts('verdict', value, prev)
    postVote('verdict', value)
    if (value === 'not_convinced') {
      setShowVerdictPanel(true)
      setVerdictPanelDone(false)
    } else {
      setShowVerdictPanel(false)
    }
  }, [voted, adjustCounts, postVote])

  const handleVerdictPanelSubmit = useCallback(async () => {
    await postVote('verdict', 'not_convinced', {
      comment: verdictComment || undefined,
    })
    setShowVerdictPanel(false)
    setVerdictPanelDone(true)
  }, [postVote, verdictComment])

  // Verdict stats line
  const totalVerdictVotes = counts.verdict.convinced + counts.verdict.not_convinced
  const convincedPct =
    totalVerdictVotes >= 5
      ? Math.round((counts.verdict.convinced / totalVerdictVotes) * 100)
      : null

  // Determine if any feedback panel is open
  const feedbackOpen = (showHelpfulPanel && !helpfulPanelDone) || (showVerdictPanel && !verdictPanelDone)

  return (
    <div className="mt-10 mb-8" data-no-print>
      <div style={{ backgroundColor: '#F1EFE8', borderRadius: 12, padding: '1.25rem 1.5rem' }}>

        {/* Two-column layout on desktop: helpfulness left, verdict right */}
        <div className={`${hasVerdict ? 'grid md:grid-cols-2 gap-6' : ''}`}>

          {/* ── Helpfulness ──────────────────────────────────────────────── */}
          <div>
            <p style={{
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 10,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sora)',
            }}>
              Was this helpful?
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <VoteButton
                label="Helpful"
                count={counts.helpful.helpful}
                icon={<ThumbsUpIcon />}
                selected={voted.helpful === 'helpful'}
                selectedColor="amber"
                disabled={submitting}
                onClick={() => handleHelpfulClick('helpful')}
              />
              <VoteButton
                label="Not helpful"
                count={counts.helpful.not_helpful}
                selected={voted.helpful === 'not_helpful'}
                selectedColor="red"
                disabled={submitting}
                onClick={() => handleHelpfulClick('not_helpful')}
              />
            </div>

            {voted.helpful && !showHelpfulPanel && !helpfulPanelDone && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'var(--font-sora)' }}>
                {voted.helpful === 'helpful' ? 'You found this helpful' : 'You marked this as not helpful'}
              </p>
            )}
            {helpfulPanelDone && (
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'var(--font-sora)' }}>
                Thanks for the feedback
              </p>
            )}
          </div>

          {/* ── Verdict (only if article has quick_verdict) ──────────────── */}
          {hasVerdict && (
            <div style={{ borderLeft: undefined }}>
              {/* Vertical divider on desktop via border */}
              <div className="hidden md:block" style={{ borderLeft: '1px solid #D9D4CC', position: 'absolute', top: 0, bottom: 0, left: 0 }} />
              <p style={{
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 10,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sora)',
              }}>
                Was the verdict convincing?
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <VoteButton
                  label="Convinced"
                  count={counts.verdict.convinced}
                  selected={voted.verdict === 'convinced'}
                  selectedColor="amber"
                  disabled={submitting}
                  onClick={() => handleVerdictClick('convinced')}
                />
                <VoteButton
                  label="Not convinced"
                  count={counts.verdict.not_convinced}
                  selected={voted.verdict === 'not_convinced'}
                  selectedColor="red"
                  disabled={submitting}
                  onClick={() => handleVerdictClick('not_convinced')}
                />
              </div>

              {voted.verdict && !showVerdictPanel && !verdictPanelDone && (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'var(--font-sora)' }}>
                  {voted.verdict === 'convinced'
                    ? 'You found the verdict convincing'
                    : 'You marked the verdict as not convincing'}
                </p>
              )}
              {verdictPanelDone && (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'var(--font-sora)' }}>
                  Thanks — noted
                </p>
              )}

              {convincedPct !== null && (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'var(--font-sora)' }}>
                  {convincedPct}% found the verdict convincing · {totalVerdictVotes} votes
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Feedback panels (full-width, below both columns) ────────── */}
        {feedbackOpen && (
          <div style={{ borderTop: '1px solid #D9D4CC', marginTop: 16, paddingTop: 14 }}>
            {/* Helpfulness feedback */}
            {showHelpfulPanel && !helpfulPanelDone && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-sora)' }}>
                  What was wrong with it?
                </p>
                <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 12 }}>
                  {HELPFUL_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(r => r === reason ? null : reason)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 16,
                        fontSize: 12,
                        border: selectedReason === reason ? '1px solid #BA7517' : '1px solid var(--border)',
                        backgroundColor: selectedReason === reason ? '#FAEEDA' : '#fff',
                        color: selectedReason === reason ? '#7C4A00' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-sora)',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s, border-color 0.1s',
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  value={helpfulComment}
                  onChange={e => setHelpfulComment(e.target.value.slice(0, 140))}
                  placeholder="Tell us more (optional)"
                  rows={2}
                  style={{
                    width: '100%',
                    resize: 'none',
                    fontSize: 13,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: '#fff',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sora)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                  <button
                    onClick={handleHelpfulPanelSubmit}
                    disabled={submitting}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: '#BA7517',
                      color: '#fff',
                      border: 'none',
                      fontFamily: 'var(--font-sora)',
                      cursor: submitting ? 'default' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    Submit feedback
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}>
                    {helpfulComment.length} / 140
                  </span>
                </div>
              </div>
            )}

            {/* Verdict feedback */}
            {showVerdictPanel && !verdictPanelDone && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-sora)' }}>
                  What would have changed your mind?
                </p>
                <textarea
                  value={verdictComment}
                  onChange={e => setVerdictComment(e.target.value.slice(0, 140))}
                  placeholder="Optional — tell us what felt wrong"
                  rows={2}
                  style={{
                    width: '100%',
                    resize: 'none',
                    fontSize: 13,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: '#fff',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sora)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                  <button
                    onClick={handleVerdictPanelSubmit}
                    disabled={submitting}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: '#BA7517',
                      color: '#fff',
                      border: 'none',
                      fontFamily: 'var(--font-sora)',
                      cursor: submitting ? 'default' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    Submit
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}>
                    {verdictComment.length} / 140
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer line */}
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 12, fontFamily: 'var(--font-sora)', opacity: 0.6 }}>
          Your vote helps improve Unpacked for everyone
        </p>
      </div>
    </div>
  )
}

// ── VoteButton ────────────────────────────────────────────────────────────────

interface VoteButtonProps {
  label: string
  count: number
  icon?: React.ReactNode
  selected: boolean
  selectedColor: 'amber' | 'red'
  disabled: boolean
  onClick: () => void
}

function VoteButton({ label, count, icon, selected, selectedColor, disabled, onClick }: VoteButtonProps) {
  const activeBg = selectedColor === 'amber' ? '#BA7517' : '#E24B4A'
  const activeBorder = selectedColor === 'amber' ? '#BA7517' : '#E24B4A'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5"
      style={{
        padding: '7px 14px',
        borderRadius: 20,
        border: `1px solid ${selected ? activeBorder : 'var(--border)'}`,
        backgroundColor: selected ? activeBg : '#fff',
        color: selected ? '#fff' : 'var(--text-secondary)',
        fontSize: 13,
        fontFamily: 'var(--font-sora)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}{count > 0 ? ` · ${count}` : ''}
    </button>
  )
}

// ── ThumbsUpIcon ──────────────────────────────────────────────────────────────

function ThumbsUpIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  )
}
