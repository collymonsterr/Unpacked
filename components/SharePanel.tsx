'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ArticleRow } from '@/types/article'
import type { SocialContent } from '@/lib/social-content'
import VerdictCard from './share/VerdictCard'
import StatCard from './share/StatCard'

type Tab = 'twitter' | 'linkedin' | 'reddit' | 'cards'
type SharePlatform = 'twitter' | 'linkedin' | 'reddit' | 'copy_link'

interface Props {
  articleRow: ArticleRow
  isOpen: boolean
  onClose: () => void
}

// ── Share credit toast ──────────────────────────────────────────────────────

function ShareCreditToast({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
      style={{
        backgroundColor: '#16a34a',
        color: '#fff',
        fontFamily: 'var(--font-sora)',
        fontSize: '13px',
        fontWeight: 600,
        animation: 'toastSlideUp 0.3s ease-out',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      +1 bonus article earned
    </div>
  )
}

// ── Share credit hook ───────────────────────────────────────────────────────

function useShareCredits(articleId: string) {
  const [earnedPlatforms, setEarnedPlatforms] = useState<string[]>([])
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    fetch(`/api/articles/${articleId}/share-credit`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.platforms) setEarnedPlatforms(data.platforms)
      })
      .catch(() => {})
  }, [articleId])

  const recordCredit = useCallback(async (platform: SharePlatform) => {
    try {
      const res = await fetch(`/api/articles/${articleId}/share-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.credited) {
        setEarnedPlatforms(prev => [...prev, platform])
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    } catch {
      // silently fail
    }
  }, [articleId])

  return { earnedPlatforms, recordCredit, showToast }
}

// ── Copy button with feedback ────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy', onCopy }: { text: string; label?: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text, onCopy])

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      style={{
        backgroundColor: copied ? '#059669' : 'var(--accent, #BA7517)',
        color: '#fff',
        fontFamily: 'var(--font-sora)',
        cursor: 'pointer',
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

// ── Character/word count badge ───────────────────────────────────────────────

function CountBadge({ count, max, unit = 'chars' }: { count: number; max?: number; unit?: string }) {
  const isOver = max != null && count > max
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: isOver ? '#fef2f2' : 'var(--card)',
        color: isOver ? '#dc2626' : 'var(--text-secondary)',
        border: `1px solid ${isOver ? '#fecaca' : 'var(--border)'}`,
        fontFamily: 'var(--font-sora)',
      }}
    >
      {count}{max ? `/${max}` : ''} {unit}
    </span>
  )
}

// ── Tab components ───────────────────────────────────────────────────────────

function TwitterTab({ content, onShare }: { content: SocialContent; onShare: () => void }) {
  const thread = content.twitter_thread
  const fullThread = thread.join('\n\n---\n\n')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
          X / Twitter Thread
        </h3>
        <div className="flex gap-2">
          <CopyButton text={thread[0] ?? ''} label="Copy tweet 1" onCopy={onShare} />
          <CopyButton text={fullThread} label="Copy thread" onCopy={onShare} />
        </div>
      </div>

      <div className="space-y-3">
        {thread.map((tweet, i) => (
          <div
            key={i}
            className="rounded-lg p-3"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start gap-2">
              <span
                className="text-[10px] font-bold mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
              >
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>
                {tweet}
              </p>
            </div>
            <div className="flex justify-end mt-1">
              <CountBadge count={tweet.length} max={280} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LinkedInTab({ content, onShare }: { content: SocialContent; onShare: () => void }) {
  const wordCount = content.linkedin_post.split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
            LinkedIn Post
          </h3>
          <CountBadge count={wordCount} unit="words" />
        </div>
        <CopyButton text={content.linkedin_post} label="Copy post" onCopy={onShare} />
      </div>

      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}
        >
          {content.linkedin_post}
        </p>
      </div>
    </div>
  )
}

function RedditTab({ content, onShare }: { content: SocialContent; onShare: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
          Reddit Post
        </h3>
        <CopyButton text={content.reddit_summary} label="Copy post" onCopy={onShare} />
      </div>

      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}
        >
          {content.reddit_summary}
        </p>
      </div>

      {content.suggested_subreddits.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}>
            Suggested subreddits
          </p>
          <div className="flex flex-wrap gap-2">
            {content.suggested_subreddits.map((sub) => {
              const redditTitle = encodeURIComponent(content.reddit_summary.split('\n')[0] ?? '')
              const redditText = encodeURIComponent(content.reddit_summary)
              const submitUrl = `https://www.reddit.com/r/${sub}/submit?title=${redditTitle}&text=${redditText}`
              return (
                <a
                  key={sub}
                  href={submitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onShare}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-sora)',
                  }}
                >
                  <span>r/{sub}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ImageCardsTab({ content }: { content: SocialContent }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}>
          Shareable Image Cards
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Screenshot these cards to share on Instagram, WhatsApp, or newsletters.
        </p>
      </div>

      <div className="space-y-4">
        {content.image_cards.map((card, i) => (
          <div key={i}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}>
              {card.type} card
            </p>
            {card.type === 'verdict' || card.type === 'comparison' ? (
              <VerdictCard card={card} />
            ) : (
              <StatCard card={card} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Loading state ────────────────────────────────────────────────────────────

function LoadingState({ articleUrl, onCopyLink }: { articleUrl: string; onCopyLink: () => void }) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sora)' }}>
          Generating your share content...
        </span>
      </div>
      <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
        This takes a few seconds. In the meantime:
      </p>
      <CopyButton text={articleUrl} label="Copy article link" onCopy={onCopyLink} />
    </div>
  )
}

// ── Share credit status ─────────────────────────────────────────────────────

function ShareCreditStatus({ earnedPlatforms }: { earnedPlatforms: string[] }) {
  const allPlatforms = ['twitter', 'linkedin', 'reddit', 'copy_link']
  const earned = earnedPlatforms.length
  const total = allPlatforms.length

  if (earned === 0) return null

  const platformLabels: Record<string, string> = {
    twitter: 'X',
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    copy_link: 'Link',
  }

  if (earned >= total) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5" style={{ color: '#16a34a' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span style={{ fontFamily: 'var(--font-sora)' }}>All share credits earned</span>
      </div>
    )
  }

  const earnedLabels = earnedPlatforms.map(p => platformLabels[p] ?? p).join(', ')
  const remaining = total - earned

  return (
    <p className="text-[11px] px-3 py-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sora)' }}>
      Shared on {earnedLabels} · {remaining} more platform{remaining !== 1 ? 's' : ''} available
    </p>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export default function SharePanel({ articleRow, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('twitter')
  const [socialContent, setSocialContent] = useState<SocialContent | null>(
    (articleRow.social_content as SocialContent | null) ?? null,
  )
  const [polling, setPolling] = useState(!socialContent)

  const articleUrl = `https://unpacked.fyi/article/${articleRow.slug}`

  const { earnedPlatforms, recordCredit, showToast } = useShareCredits(articleRow.id)

  // Map tab to platform for credit tracking
  const tabToPlatform: Record<Tab, SharePlatform> = {
    twitter: 'twitter',
    linkedin: 'linkedin',
    reddit: 'reddit',
    cards: 'copy_link', // cards don't map to a specific platform
  }

  const handleShare = useCallback((tab: Tab) => {
    recordCredit(tabToPlatform[tab])
  }, [recordCredit, tabToPlatform])

  // Poll for social content if not yet available
  useEffect(() => {
    if (!isOpen || socialContent || !polling) return

    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/articles/${articleRow.id}/social-content`)
        if (res.ok) {
          const data = await res.json()
          if (data.social_content) {
            setSocialContent(data.social_content as SocialContent)
            setPolling(false)
          }
        }
      } catch {
        // Silently retry
      }
    }, 3000)

    // Stop polling after 30 seconds
    const timeout = setTimeout(() => {
      if (!cancelled) setPolling(false)
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isOpen, socialContent, polling, articleRow.id])

  if (!isOpen) return null

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'twitter', label: 'X / Twitter' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'reddit', label: 'Reddit' },
    { id: 'cards', label: 'Image Cards' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Panel — slides from right */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(520px, 90vw)',
          backgroundColor: 'var(--background, #FAFAF8)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            className="text-base font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            Share
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
            aria-label="Close share panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Share credit status */}
        <ShareCreditStatus earnedPlatforms={earnedPlatforms} />

        {/* Tabs */}
        {socialContent && (
          <div
            className="flex gap-0 px-5 flex-shrink-0 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors relative"
                style={{
                  color: activeTab === id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-sora)',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  border: 'none',
                }}
              >
                {label}
                {activeTab === id && (
                  <div
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!socialContent ? (
            <LoadingState articleUrl={articleUrl} onCopyLink={() => recordCredit('copy_link')} />
          ) : (
            <>
              {activeTab === 'twitter' && <TwitterTab content={socialContent} onShare={() => handleShare('twitter')} />}
              {activeTab === 'linkedin' && <LinkedInTab content={socialContent} onShare={() => handleShare('linkedin')} />}
              {activeTab === 'reddit' && <RedditTab content={socialContent} onShare={() => handleShare('reddit')} />}
              {activeTab === 'cards' && <ImageCardsTab content={socialContent} />}
            </>
          )}
        </div>
      </div>

      <ShareCreditToast show={showToast} />

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes toastSlideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
