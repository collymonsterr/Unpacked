'use client'

import { useState, useEffect } from 'react'

interface Props {
  correctionsCount: number
  sourceCount: number
  firstSectionTitle: string
  onPrefillRefine: (text: string) => void
  onScrollToRefine: () => void
  onShare: () => void
}

const ACTION_CHIPS = [
  {
    emoji: '✍️',
    label: 'Change tone or style',
    description: 'More casual, formal, or opinionated',
    prefill: 'Rewrite this article in a more casual and conversational tone',
  },
  {
    emoji: '🔄',
    label: 'Swap out products',
    description: 'Different brands or price range',
    prefill: 'Replace the product recommendations with alternatives at a different price point',
  },
  {
    emoji: '✂️',
    label: 'Rewrite a section',
    description: 'Hover any section to edit it',
    prefill: '', // Will be set dynamically with firstSectionTitle
  },
  {
    emoji: '🎨',
    label: 'Change the angle',
    description: 'Focus on a specific audience',
    prefill: 'Rewrite this article focusing on a specific audience or use case',
  },
]

export default function FirstDraftBanner({
  correctionsCount,
  sourceCount,
  firstSectionTitle,
  onPrefillRefine,
  onScrollToRefine,
  onShare,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showPill, setShowPill] = useState(false)

  // Slide in after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(() => {
      setDismissed(true)
      setShowPill(true)
    }, 450)
  }

  function handleChipClick(prefill: string) {
    const text = prefill || `Rewrite the "${firstSectionTitle || 'introduction'}" section`
    onPrefillRefine(text)
    onScrollToRefine()
    dismiss()
  }

  function handleStartEditing() {
    onScrollToRefine()
    dismiss()
  }

  function handleShare() {
    onShare()
    dismiss()
  }

  function handleReopen() {
    setShowPill(false)
    setDismissed(false)
    setTimeout(() => setVisible(true), 50)
  }

  // Floating pill (shown after dismiss)
  if (dismissed && showPill) {
    return (
      <button
        onClick={handleReopen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:scale-105"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          fontFamily: 'var(--font-sora)',
          cursor: 'pointer',
        }}
      >
        ✍️ Edit this article
      </button>
    )
  }

  if (dismissed) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderTop: '1px solid #E8E3DC',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
        }}
      >
        <div className="max-w-[900px] mx-auto px-5 md:px-10 py-5 md:py-6 relative">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
            title="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Header row */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#FEF3EC' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3
                className="text-base font-bold"
                style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
              >
                Your first draft is ready
              </h3>
            </div>
            {correctionsCount > 0 && (
              <span
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#ecfdf5', color: '#059669' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {correctionsCount} correction{correctionsCount !== 1 ? 's' : ''} applied
              </span>
            )}
          </div>

          {/* Body text */}
          <p className="text-sm mb-4 pr-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            We&apos;ve done the research, compiled {sourceCount > 0 ? `${sourceCount} sources` : 'multiple sources'}, and built the structure. Now make it yours — read it through, change the tone, swap a product, or rewrite a section before you publish.
          </p>

          {/* Action chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {ACTION_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChipClick(chip.prefill)}
                className="text-left p-3 rounded-xl transition-all hover:shadow-sm"
                style={{
                  backgroundColor: '#FAFAF8',
                  border: '1px solid #E8E3DC',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#BA7517'
                  e.currentTarget.style.backgroundColor = '#FFF8EE'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E8E3DC'
                  e.currentTarget.style.backgroundColor = '#FAFAF8'
                }}
              >
                <span className="text-base">{chip.emoji}</span>
                <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {chip.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {chip.description}
                </p>
              </button>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#fff',
                color: 'var(--text-secondary)',
                border: '1px solid #E8E3DC',
                cursor: 'pointer',
              }}
            >
              Looks good — share it
            </button>
            <button
              onClick={handleStartEditing}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                backgroundColor: '#BA7517',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Start editing →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
