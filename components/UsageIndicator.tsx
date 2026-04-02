'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'

interface UsageData {
  tier: string
  articlesUsed: number
  monthlyLimit: number
  bonusCredits: number
  nextReset: string
}

export default function UsageIndicator() {
  const { user, loading } = useUser()
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    if (loading || !user) return

    fetch('/api/profile/usage')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUsage(data) })
      .catch(() => {})
  }, [user, loading])

  if (!user || !usage) return null

  const remaining = usage.monthlyLimit - usage.articlesUsed
  const atZero = remaining <= 0
  const resetDate = new Date(usage.nextReset)
  const resetLabel = resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div className="mt-3 text-center">
      <p
        className="text-xs"
        style={{
          color: atZero ? '#BA7517' : 'var(--text-secondary)',
          fontFamily: 'var(--font-outfit)',
          fontWeight: atZero ? 600 : 400,
        }}
      >
        {atZero ? (
          <>
            0 remaining &mdash; resets {resetLabel}
            {usage.bonusCredits > 0 && (
              <> &middot; {usage.bonusCredits} bonus credit{usage.bonusCredits !== 1 ? 's' : ''} available</>
            )}
          </>
        ) : (
          <>
            {remaining} of {usage.monthlyLimit} article{usage.monthlyLimit !== 1 ? 's' : ''} remaining
            {usage.bonusCredits > 0 && (
              <> &middot; {usage.bonusCredits} bonus credit{usage.bonusCredits !== 1 ? 's' : ''}</>
            )}
          </>
        )}
      </p>
    </div>
  )
}
