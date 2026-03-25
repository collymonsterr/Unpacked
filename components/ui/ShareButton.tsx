'use client'

import { useState, useCallback } from 'react'

interface Props {
  title: string
  url?: string
  variant?: 'inline' | 'bottom' | 'bottom-row'
}

export default function ShareButton({ title, url, variant = 'inline' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    const shareUrl = url ?? window.location.href

    // Mobile: use native share sheet
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl })
        return
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Desktop: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [title, url])

  if (variant === 'bottom-row') {
    return (
      <button
        onClick={handleShare}
        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{
          backgroundColor: copied ? '#059669' : 'var(--accent)',
          color: '#fff',
          fontFamily: 'var(--font-sora)',
          cursor: 'pointer',
        }}
      >
        {copied ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Link copied!
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share this article
          </>
        )}
      </button>
    )
  }

  if (variant === 'bottom') {
    return (
      <div className="flex justify-center mt-8 mb-4">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            backgroundColor: copied ? '#059669' : 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-sora)',
          }}
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Link copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share this article
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-xs font-medium transition-colors relative py-2 px-1 -my-2 -mx-1"
      style={{ color: copied ? '#059669' : 'var(--text-secondary)', minHeight: '44px', minWidth: '44px' }}
      title="Share article"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  )
}
