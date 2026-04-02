'use client'

import { useEffect, useState } from 'react'

interface LimitReachedModalProps {
  open: boolean
  onClose: () => void
  limit: number
  nextReset: string
  /** Most recent article slug for sharing link */
  recentArticleSlug?: string | null
}

export default function LimitReachedModal({ open, onClose, limit, nextReset, recentArticleSlug }: LimitReachedModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  if (!mounted || !open) return null

  const resetDate = new Date(nextReset)
  const resetLabel = resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-8 max-w-md w-full relative"
        style={{
          backgroundColor: 'var(--card)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: 'var(--accent-light)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4M12 16h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>

        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          You&apos;ve used all {limit} of your free articles this month
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Your next reset is {resetLabel}. In the meantime, you can share articles to earn bonus credits or explore our paid plans.
        </p>

        <div className="flex flex-col gap-3">
          {recentArticleSlug && (
            <a
              href={`/article/${recentArticleSlug}`}
              className="w-full py-3 rounded-xl text-sm font-semibold text-center no-underline transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontFamily: 'var(--font-sora)',
              }}
            >
              Share articles to earn bonus credits
            </a>
          )}
          <a
            href="/pricing"
            className="w-full py-3 rounded-xl text-sm font-semibold text-center no-underline transition-opacity hover:opacity-90"
            style={{
              backgroundColor: recentArticleSlug ? 'transparent' : 'var(--accent)',
              color: recentArticleSlug ? 'var(--text-primary)' : '#fff',
              border: recentArticleSlug ? '1px solid var(--border)' : 'none',
              fontFamily: 'var(--font-sora)',
            }}
          >
            Upgrade your plan
          </a>
        </div>
      </div>
    </div>
  )
}
