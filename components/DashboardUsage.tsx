'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UsageData {
  tier: string
  articlesUsed: number
  monthlyLimit: number
  bonusCredits: number
  nextReset: string
  isFoundingCreator: boolean
  shareCreditsEarned: number
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  standard: 'Standard',
  pro: 'Pro',
}

export default function DashboardUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    fetch('/api/profile/usage')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUsage(data) })
      .catch(() => {})
  }, [])

  if (!usage) return null

  const percentage = Math.min(100, Math.round((usage.articlesUsed / usage.monthlyLimit) * 100))
  const resetDate = new Date(usage.nextReset)
  const resetLabel = resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3
            className="text-base font-bold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            Your plan
          </h3>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-sora)',
            }}
          >
            {TIER_LABELS[usage.tier] ?? usage.tier}
          </span>
          {usage.isFoundingCreator && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#BA7517', color: '#fff', fontFamily: 'var(--font-sora)' }}
            >
              Founding Creator
            </span>
          )}
        </div>
        <Link
          href="/pricing"
          className="text-xs font-medium no-underline transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          {usage.tier === 'free' ? 'Upgrade' : 'View plans'} &rarr;
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {usage.articlesUsed} of {usage.monthlyLimit} used
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {usage.monthlyLimit - usage.articlesUsed} remaining
          </p>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: percentage >= 100 ? '#dc2626' : percentage >= 80 ? '#BA7517' : '#16a34a',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {usage.bonusCredits > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>{usage.bonusCredits}</span> bonus credit{usage.bonusCredits !== 1 ? 's' : ''}
          </p>
        )}
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Resets {resetLabel}
        </p>
      </div>

      {/* Founding Creator note */}
      {usage.isFoundingCreator && (
        <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
          10 bonus credits added monthly as a Founding Creator
        </p>
      )}

      {/* Share credits */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>{usage.shareCreditsEarned}</span> share credit{usage.shareCreditsEarned !== 1 ? 's' : ''} earned
          </p>
          <Link
            href="/"
            className="text-[11px] font-medium no-underline transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            Share more to earn credits &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
