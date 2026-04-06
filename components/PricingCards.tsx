'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase'
import { Suspense } from 'react'

interface UsageData {
  tier: string
  articlesUsed: number
  monthlyLimit: number
}

function PricingCardsInner() {
  const { user, loading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkoutState, setCheckoutState] = useState<Record<string, 'idle' | 'loading' | 'error'>>({
    standard: 'idle',
    pro: 'idle',
  })
  const [usage, setUsage] = useState<UsageData | null>(null)

  // Fetch current tier for logged-in users
  useEffect(() => {
    if (!user || loading) return
    fetch('/api/profile/usage')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUsage(data) })
      .catch(() => {})
  }, [user, loading])

  // Handle ?checkout=standard or ?checkout=pro redirect after sign-in
  const autoCheckoutTier = searchParams.get('checkout')
  useEffect(() => {
    if (autoCheckoutTier && user && !loading && ['standard', 'pro'].includes(autoCheckoutTier) && checkoutState[autoCheckoutTier] === 'idle') {
      // Clear param from URL first
      router.replace('/pricing', { scroll: false })
      startCheckout(autoCheckoutTier)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckoutTier, user, loading])

  async function startCheckout(tier: string) {
    if (!user) {
      // Redirect to sign in, then back to /pricing with checkout param
      const supabase = createBrowserSupabase()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/pricing?checkout=${tier}` },
      })
      return
    }

    setCheckoutState(prev => ({ ...prev, [tier]: 'loading' }))
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()

      if (!res.ok) {
        console.error('[pricing] Checkout error:', data.error)
        setCheckoutState(prev => ({ ...prev, [tier]: 'error' }))
        setTimeout(() => setCheckoutState(prev => ({ ...prev, [tier]: 'idle' })), 3000)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setCheckoutState(prev => ({ ...prev, [tier]: 'error' }))
      setTimeout(() => setCheckoutState(prev => ({ ...prev, [tier]: 'idle' })), 3000)
    }
  }

  function handleFreeCTA() {
    if (user) return
    const supabase = createBrowserSupabase()
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  const currentTier = usage?.tier ?? 'free'

  function getCtaForTier(tier: string): { label: string; disabled: boolean; action: () => void } {
    if (tier === 'free') {
      if (user) return { label: "You're on the Free plan", disabled: true, action: () => {} }
      return { label: 'Get started', disabled: false, action: handleFreeCTA }
    }

    // Paid tiers
    if (!user) {
      return {
        label: 'Sign in to subscribe',
        disabled: false,
        action: () => startCheckout(tier),
      }
    }

    // Already on this tier
    if (currentTier === tier) {
      return { label: 'Current plan', disabled: true, action: () => {} }
    }

    // On a higher tier
    if (currentTier === 'pro' && tier === 'standard') {
      return { label: "You're on Pro", disabled: true, action: () => {} }
    }

    // Checkout states
    const state = checkoutState[tier]
    if (state === 'loading') {
      return { label: 'Redirecting...', disabled: true, action: () => {} }
    }
    if (state === 'error') {
      return { label: 'Something went wrong', disabled: true, action: () => {} }
    }

    // Ready to subscribe
    const price = tier === 'standard' ? '$12' : '$29'
    const label = currentTier !== 'free' && currentTier !== tier
      ? `Switch to ${tier === 'standard' ? 'Standard' : 'Pro'} \u2014 ${price}/month`
      : `Subscribe \u2014 ${price}/month`

    return { label, disabled: false, action: () => startCheckout(tier) }
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
      ...getCtaForTier('free'),
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
      ...getCtaForTier('standard'),
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
      ...getCtaForTier('pro'),
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
  label,
  disabled,
  action,
  highlight,
}: {
  name: string
  price: string
  period: string
  badge?: string
  description: string
  features: string[]
  label: string
  disabled: boolean
  action: () => void
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
        onClick={action}
        disabled={disabled}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity mb-6"
        style={{
          backgroundColor: highlight ? 'var(--accent)' : disabled ? 'var(--border)' : 'var(--text-primary)',
          color: disabled && !highlight ? 'var(--text-secondary)' : '#fff',
          fontFamily: 'var(--font-sora)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled && !highlight ? 0.7 : 1,
        }}
      >
        {label}
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
