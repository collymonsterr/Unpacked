'use client'

import { useState, useEffect } from 'react'
import type { ArticleVisibility } from '@/types/article'

interface FactCheck {
  issues_found?: boolean
  total_issues?: number
  checks_performed?: number
}

interface Props {
  articleId: string
  initialVisibility: ArticleVisibility
  correctionsCount: number
  sourceCount: number
  firstSectionTitle: string
  onPrefillRefine: (text: string) => void
  onScrollToRefine: () => void
  onShare: () => void
  factCheckStatus?: 'none' | 'checking' | 'verified'
  factCheck?: FactCheck | null
}

const ACTION_CHIPS = [
  {
    emoji: '✍️',
    label: 'Change the tone or style',
    description: 'More casual, formal, or opinionated',
    prefill: 'Change the tone to be more [casual / formal / opinionated] — keep the structure and facts the same',
  },
  {
    emoji: '🔄',
    label: 'Swap products or angle',
    description: 'Different brands, price range, or focus',
    prefill: 'Swap out the products for [different brands / different price range] and update the recommendations',
  },
  {
    emoji: '🖼️',
    label: 'Update the images',
    description: 'Replace the hero or swap product photos',
    prefill: 'The images don\'t feel right — suggest better image searches for the hero and product cards',
  },
  {
    emoji: '✂️',
    label: 'Rewrite any section',
    description: 'One part, several sections, or the whole article',
    prefill: '', // Set dynamically with firstSectionTitle
  },
]

export default function FirstDraftBanner({
  articleId,
  initialVisibility,
  correctionsCount,
  sourceCount,
  firstSectionTitle,
  onPrefillRefine,
  onScrollToRefine,
  onShare,
  factCheckStatus = 'none',
  factCheck,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showPill, setShowPill] = useState(false)
  const [showAllChips, setShowAllChips] = useState(false)
  const [copied, setCopied] = useState(false)
  const [visibility, setVisibility] = useState<ArticleVisibility>(initialVisibility)
  const [publishState, setPublishState] = useState<'idle' | 'loading' | 'done'>('idle')

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
    const text = prefill || `Rewrite the "${firstSectionTitle || 'introduction'}" section to be [shorter / more detailed / from a different angle]`
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
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReopen() {
    setShowPill(false)
    setDismissed(false)
    setTimeout(() => setVisible(true), 50)
  }

  async function handlePublish() {
    if (publishState === 'loading' || visibility === 'published') return
    setPublishState('loading')
    try {
      const res = await fetch(`/api/articles/${articleId}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'published' }),
      })
      if (res.ok) {
        setVisibility('published')
        setPublishState('done')
      } else {
        setPublishState('idle')
      }
    } catch {
      setPublishState('idle')
    }
  }

  async function handleShareLinkOnly() {
    try {
      const res = await fetch(`/api/articles/${articleId}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'unlisted' }),
      })
      if (res.ok) setVisibility('unlisted')
    } catch {
      // best-effort
    }
    const shareUrl = `${window.location.origin}/article/${window.location.pathname.split('/').pop()}`
    try { await navigator.clipboard.writeText(window.location.href) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fcCorrections = factCheck?.total_issues ?? correctionsCount

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
        <div className="max-w-[900px] mx-auto px-4 sm:px-5 md:px-10 py-4 sm:py-5 md:py-6 relative">
          {/* Close button — 44px touch target */}
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full transition-colors"
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
                Your first draft is complete — now you&apos;re the editor
              </h3>
            </div>
            {fcCorrections > 0 && (
              <span
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#ecfdf5', color: '#059669' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {fcCorrections} correction{fcCorrections !== 1 ? 's' : ''} applied
              </span>
            )}
          </div>

          {/* Body text */}
          <p className="text-sm mb-4 pr-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            We did the research, built the structure, and fact-checked the claims. Refine it, tweak it, and make it your own before sharing or publishing.
          </p>

          {/* Action chips — 2 visible on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            {ACTION_CHIPS.map((chip, idx) => (
              <button
                key={chip.label}
                onClick={() => handleChipClick(chip.prefill)}
                className={`text-left p-3 rounded-xl transition-all hover:shadow-sm ${
                  idx >= 2 && !showAllChips ? 'hidden sm:block' : ''
                }`}
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
          {/* "More options" toggle — mobile only */}
          {!showAllChips && (
            <button
              onClick={() => setShowAllChips(true)}
              className="text-xs mb-3 sm:hidden"
              style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              More options...
            </button>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:justify-end">
            {/* Share link only — always shown */}
            <button
              onClick={visibility === 'published' ? handleShare : handleShareLinkOnly}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium transition-colors text-center"
              style={{
                backgroundColor: '#fff',
                color: copied ? '#059669' : 'var(--text-secondary)',
                border: '1px solid #E8E3DC',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Link copied ✓' : 'Share link'}
            </button>

            {/* Publish — only shown when not yet published */}
            {visibility !== 'published' && (
              <button
                onClick={handlePublish}
                disabled={publishState === 'loading'}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold transition-colors text-center"
                style={{
                  backgroundColor: publishState === 'done' ? '#059669' : '#1A1714',
                  color: '#fff',
                  cursor: publishState === 'loading' ? 'wait' : 'pointer',
                  opacity: publishState === 'loading' ? 0.7 : 1,
                }}
              >
                {publishState === 'loading' ? 'Publishing…' : publishState === 'done' ? 'Published ✓' : 'Publish →'}
              </button>
            )}
            {visibility === 'published' && (
              <span
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold text-center"
                style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
              >
                Published ✓
              </span>
            )}

            <button
              onClick={handleStartEditing}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold transition-colors text-center"
              style={{
                backgroundColor: '#BA7517',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Start editing →
            </button>
          </div>

          {/* Muted status text below buttons */}
          <p className="text-[10px] text-center sm:text-right mt-2" style={{ color: 'var(--text-secondary)' }}>
            {visibility === 'published'
              ? 'Published — visible on the homepage'
              : visibility === 'unlisted'
              ? 'Shared via link — not listed on the homepage'
              : 'Not published yet — only you can see this article'}
          </p>

          {/* Fact-check bar — inside the banner, below buttons */}
          {factCheckStatus !== 'none' && (
            <>
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid #E8E3DC' }}>
                {factCheckStatus === 'checking' ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                      style={{ borderColor: '#BA7517', borderTopColor: 'transparent' }}
                    />
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="hidden sm:inline">Fact-checking — verifying prices, specs, and claims against live sources...</span>
                      <span className="sm:hidden">Fact-checking your article...</span>
                    </p>
                  </div>
                ) : factCheckStatus === 'verified' ? (
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <p className="text-xs" style={{ color: '#059669' }}>
                      Fact-check complete{fcCorrections > 0 ? ` — ${fcCorrections} correction${fcCorrections !== 1 ? 's' : ''} applied` : ' — all claims verified'}
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
