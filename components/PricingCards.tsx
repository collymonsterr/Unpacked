'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'
import { Suspense } from 'react'

function PricingCardsInner() {
  const { user, loading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [waitlistState, setWaitlistState] = useState<Record<string, 'idle' | 'loading' | 'done'>>({
    standard: 'idle',
    pro: 'idle',
  })

  // Auto-join waitlist if redirected back with ?join=standard or ?join=pro
  const autoJoinTier = searchParams.get('join')
  if (autoJoinTier && user && !loading && ['standard', 'pro'].includes(autoJoinTier) && waitlistState[autoJoinTier] === 'idle') {
    joinWaitlist(autoJoinTier)
  }

  async function joinWaitlist(tier: string) {
    if (!user) {
      // Redirect to sign in, then back to /pricing with join param
      const supabase = createBrowserSupabase()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/pricing?join=${tier}` },
      })
      return
    }

    setWaitlistState(prev => ({ ...prev, [tier]: 'loading' }))
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      if (res.ok) {
        setWaitlistState(prev => ({ ...prev, [tier]: 'done' }))
        // Clear join param from URL
        if (autoJoinTier) {
          router.replace('/pricing', { scroll: false })
        }
      }
    } catch {
      setWaitlistState(prev => ({ ...prev, [tier]: 'idle' }))
    }
  }

  function handleFreeCTA() {
    if (user) return // Disabled when logged in
    const supabase = createBrowserSupabase()
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Everything you need to get started',
      features: [
        '3 articles per month',
        'Full-quality research and writing',
        'Triple-verified fact-checking',
        'All 10 article types',
        'Share to earn bonus credits',
      ],
      cta: user ? "You're on the Free plan" : 'Get started',
      ctaDisabled: !!user,
      onCTA: handleFreeCTA,
      highlight: false,
      tier: 'free',
    },
    {
      name: 'Standard',
      price: '$12',
      period: '/month',
      badge: 'Most popular',
      description: 'For creators who publish regularly',
      features: [
        '15 articles per month',
        'Everything in Free',
        'Sonnet writing toggle',
        '5 refinements per article',
        'CMS and Substack export',
        'Custom creator CTA on articles',
      ],
      cta: waitlistState.standard === 'done'
        ? "You're on the list"
        : waitlistState.standard === 'loading'
        ? 'Joining...'
        : 'Join the waitlist',
      ctaDisabled: waitlistState.standard !== 'idle',
      onCTA: () => joinWaitlist('standard'),
      highlight: true,
      tier: 'standard',
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'For power users and publishers',
      features: [
        '60 articles per month',
        'Everything in Standard',
        'Sonnet always on',
        '10 refinements per article',
        'Custom branding',
        'Creator analytics',
        'Priority generation',
      ],
      cta: waitlistState.pro === 'done'
        ? "You're on the list"
        : waitlistState.pro === 'loading'
        ? 'Joining...'
        : 'Join the waitlist',
      ctaDisabled: waitlistState.pro !== 'idle',
      onCTA: () => joinWaitlist('pro'),
      highlight: false,
      tier: 'pro',
    },
  ]

  // On mobile, reorder: Standard first
  const mobileTiers = [tiers[1], tiers[0], tiers[2]]

  return (
    <>
      {/* Desktop: 3-column, Standard in centre */}
      <div className="hidden md:grid md:grid-cols-3 gap-6 items-start">
        {tiers.map((t) => (
          <TierCard key={t.tier} {...t} />
        ))}
      </div>

      {/* Mobile: stacked, Standard first */}
      <div className="flex flex-col gap-6 md:hidden">
        {mobileTiers.map((t) => (
          <TierCard key={t.tier} {...t} />
        ))}
      </div>

      {/* Waitlist confirmation toast */}
      {(waitlistState.standard === 'done' || waitlistState.pro === 'done') && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50"
          style={{
            backgroundColor: 'var(--text-primary)',
            color: '#fff',
            fontFamily: 'var(--font-outfit)',
          }}
        >
          <p className="text-sm font-medium">
            You&apos;re on the list. We&apos;ll notify you when paid plans go live.
          </p>
        </div>
      )}
    </>
  )
}

function TierCard({
  name,
  price,
  period,
  badge,
  description,
  features,
  cta,
  ctaDisabled,
  onCTA,
  highlight,
}: {
  name: string
  price: string
  period: string
  badge?: string
  description: string
  features: string[]
  cta: string
  ctaDisabled: boolean
  onCTA: () => void
  highlight: boolean
  tier: string
}) {
  return (
    <div
      className="rounded-2xl p-6 md:p-8 relative"
      style={{
        backgroundColor: highlight ? '#FAEEDA' : 'var(--card)',
        border: highlight ? '2px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: highlight
          ? '0 4px 20px rgba(186, 117, 23, 0.12)'
          : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {badge && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-sora)',
          }}
        >
          {badge}
        </span>
      )}

      <div className="mb-6">
        <h3
          className="text-lg font-bold mb-1"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          {name}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
        <div className="flex items-baseline gap-1">
          <span
            className="text-4xl font-extrabold"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
          >
            {price}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {period}
          </span>
        </div>
      </div>

      <button
        onClick={onCTA}
        disabled={ctaDisabled}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity mb-6"
        style={{
          backgroundColor: highlight ? 'var(--accent)' : ctaDisabled ? 'var(--border)' : 'var(--text-primary)',
          color: ctaDisabled && !highlight ? 'var(--text-secondary)' : '#fff',
          fontFamily: 'var(--font-sora)',
          cursor: ctaDisabled ? 'default' : 'pointer',
          opacity: ctaDisabled && !highlight ? 0.7 : 1,
        }}
      >
        {cta}
      </button>

      <ul className="space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={highlight ? '#BA7517' : '#16a34a'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 mt-0.5"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {f}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function PricingCards() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <PricingCardsInner />
    </Suspense>
  )
}
