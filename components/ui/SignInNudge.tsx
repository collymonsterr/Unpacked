'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  articleId?: string
  onSignedIn?: (user: User) => void
  overlay?: boolean
  onDismiss?: () => void
}

export default function SignInNudge({ user, articleId, onSignedIn, overlay = false, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [welcomeName, setWelcomeName] = useState<string | null>(null)
  const [shouldShow, setShouldShow] = useState(false)

  // Check if we should show at all
  useEffect(() => {
    if (user) return // Already signed in
    if (typeof window === 'undefined') return

    // Overlay mode always shows (no localStorage gate)
    if (overlay) {
      setShouldShow(true)
      return
    }

    try {
      const dismissCount = parseInt(localStorage.getItem('signin_nudge_dismissed') ?? '0', 10)
      if (dismissCount >= 3) return // They've said no 3 times
    } catch {}

    setShouldShow(true)
  }, [user, overlay])

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true)
    onDismiss?.()
    if (!overlay) {
      try {
        const count = parseInt(localStorage.getItem('signin_nudge_dismissed') ?? '0', 10)
        localStorage.setItem('signin_nudge_dismissed', String(count + 1))
      } catch {}
    }
  }, [overlay, onDismiss])

  // Handle sign-in via popup
  const handleSignIn = useCallback(async () => {
    setSigningIn(true)
    const supabase = createBrowserSupabase()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: false,
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        console.error('[signin-nudge] OAuth error:', error.message)
        setSigningIn(false)
      }
      // If no error, the page will redirect to Google then come back
    } catch {
      setSigningIn(false)
    }
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createBrowserSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const name = session.user.user_metadata?.full_name ?? 'there'
        setWelcomeName(name)
        onSignedIn?.(session.user)

        // Claim this article for the new user
        if (articleId) {
          try {
            await fetch('/api/articles/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ article_ids: [articleId] }),
            })
          } catch {}
        }

        // Fade out after showing welcome
        setTimeout(() => setDismissed(true), 3000)
      }
    })
    return () => subscription.unsubscribe()
  }, [articleId, onSignedIn])

  if (!shouldShow || dismissed) return null

  // Welcome state after sign-in
  if (welcomeName) {
    const welcomeCard = (
      <div
        className="rounded-xl p-4 mt-4 generation-fade-in flex items-center gap-3"
        style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p className="text-sm font-semibold" style={{ color: '#15803d' }}>
          Welcome, {welcomeName}! This article is now saved to your account.
        </p>
      </div>
    )

    if (overlay) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div style={{ maxWidth: 420, width: '90%' }}>{welcomeCard}</div>
        </div>
      )
    }
    return welcomeCard
  }

  // ── Overlay mode ────────────────────────────────────────────────────────────
  if (overlay) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <div
          className="generation-fade-in"
          style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            padding: '40px 36px',
            maxWidth: 440,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          }}
        >
          {/* Unpacked wordmark */}
          <p
            className="text-lg font-bold mb-6"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)', letterSpacing: '-0.02em' }}
          >
            Unpacked.
          </p>

          <p
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)', lineHeight: 1.3 }}
          >
            Log into Google to edit, refine, publish, and share your article.
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            It only takes 2 seconds.
          </p>

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 mb-4"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
          >
            {signingIn ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="text-xs"
            style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
          >
            Continue without signing in
          </button>
        </div>
      </div>
    )
  }

  // ── Inline card mode (default) ───────────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-5 mt-4 generation-fade-in"
      style={{
        backgroundColor: '#fff',
        borderLeft: '3px solid var(--accent)',
        border: '1px solid var(--border)',
        borderLeftWidth: 3,
        borderLeftColor: 'var(--accent)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      <p
        className="text-sm font-bold mb-1"
        style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
      >
        Sign in to make this article yours
      </p>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        Save articles to your collection. Build a portfolio of your best work. Earn from your recommendations when we launch creator revenue sharing.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {signingIn ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google — takes 2 seconds
            </>
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="text-xs"
          style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
