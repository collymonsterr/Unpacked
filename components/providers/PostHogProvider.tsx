'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useUser } from '@/hooks/useUser'

/**
 * Initialise PostHog at module load (client-side only).
 *
 * Doing this at module scope — not inside a useEffect — guarantees that
 * posthog.__loaded is true by the time any child component's effects run.
 * Child effects run before parent effects in React, so a useEffect-based
 * init would race the identify effect and never fire for already-signed-in
 * users whose session resolves synchronously from cache.
 */
if (typeof window !== 'undefined') {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key && !posthog.__loaded) {
    posthog.init(key, {
      api_host: '/ingest', // Reverse-proxied via next.config.ts rewrites
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
      capture_pageview: false, // We fire manually on route change below
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only', // Only create profiles for signed-in users
    })
  }
}

/**
 * PostHog provider for client-side product analytics.
 *
 * - Captures pageviews on route changes (App Router doesn't auto-fire).
 * - Identifies the user by Supabase user.id when they sign in.
 * - Routes ingestion through /ingest (see next.config.ts rewrites)
 *   to sidestep ad blockers.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PHProvider>
  )
}

/** Fires a $pageview event on every route change. */
function PostHogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    if (!posthog.__loaded) return

    let url = window.origin + pathname
    const qs = searchParams?.toString()
    if (qs) url += `?${qs}`

    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

/** Identify the user in PostHog once Supabase auth resolves. */
function PostHogIdentify() {
  const { user, loading } = useUser()

  useEffect(() => {
    if (loading) return
    if (!posthog.__loaded) return

    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name,
      })
    } else {
      // Signed out — reset anonymous ID so it doesn't stay tied to the previous user
      posthog.reset()
    }
  }, [user, loading])

  return null
}
