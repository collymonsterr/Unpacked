'use client'

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useUser } from '@/hooks/useUser'

/**
 * PostHog provider for client-side product analytics.
 *
 * - Initialises in a useEffect, signals readiness via React state so
 *   child components can safely fire identify/capture only after init.
 * - Captures pageviews on route changes (App Router doesn't auto-fire).
 * - Identifies the user by Supabase user.id when they sign in.
 * - Routes ingestion through /ingest (see next.config.ts rewrites)
 *   to sidestep ad blockers.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    if (posthog.__loaded) {
      setReady(true)
      return
    }
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
      loaded: () => setReady(true),
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview ready={ready} />
      </Suspense>
      <PostHogIdentify ready={ready} />
      {children}
    </PHProvider>
  )
}

/** Fires a $pageview event on every route change. */
function PostHogPageview({ ready }: { ready: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!ready) return
    if (!pathname) return

    let url = window.origin + pathname
    const qs = searchParams?.toString()
    if (qs) url += `?${qs}`

    posthog.capture('$pageview', { $current_url: url })
  }, [ready, pathname, searchParams])

  return null
}

/** Identify the user in PostHog once Supabase auth resolves. */
function PostHogIdentify({ ready }: { ready: boolean }) {
  const { user, loading } = useUser()

  useEffect(() => {
    if (!ready) return
    if (loading) return

    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name,
      })
    } else {
      // Signed out — reset anonymous ID so it doesn't stay tied to the previous user
      posthog.reset()
    }
  }, [ready, user, loading])

  return null
}
