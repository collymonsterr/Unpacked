'use client'

import { useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

interface Props {
  articleId: string
  onDismiss: () => void
}

export default function SignInGate({ articleId, onDismiss }: Props) {
  const [signingIn, setSigningIn] = useState(false)

  const handleSignIn = useCallback(() => {
    setSigningIn(true)
    const supabase = createBrowserSupabase()

    // Redirect-based OAuth — user returns to the same article page after sign-in.
    // The article URL exists and status persists in the DB, so no state is lost.
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    }).then(({ error }) => {
      if (error) {
        console.error('[sign-in-gate] OAuth error:', error.message)
        setSigningIn(false)
      }
    })
  }, [])

  return (
    <div
      className="generation-fade-in"
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
          position: 'relative',
          backgroundColor: '#fff',
          borderRadius: '20px',
          padding: '44px 36px 36px',
          maxWidth: 460,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Dismiss X — subtle, top-right */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#aaa',
            padding: 4,
            lineHeight: 1,
            fontSize: 18,
          }}
        >
          &times;
        </button>

        {/* Unpacked wordmark */}
        <p
          className="text-lg font-bold mb-5"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--accent)', letterSpacing: '-0.02em' }}
        >
          Unpacked.
        </p>

        {/* Title */}
        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)', lineHeight: 1.3 }}
        >
          This article is yours to edit, share, and publish
        </h2>

        {/* Subtitle */}
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Sign in with Google to generate your full article. You&apos;ll be able to refine it, share it, and publish it under your name.
        </p>

        {/* Google sign-in button */}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
        >
          {signingIn ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Redirecting to Google...
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

        {/* Subtext */}
        <p className="text-xs mt-4" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
          It only takes 2 seconds.
        </p>

        {/* Terms agreement */}
        <p className="text-[11px] mt-3" style={{ color: 'var(--text-secondary)', opacity: 0.5, lineHeight: 1.5 }}>
          By signing in, you agree to our{' '}
          <a href="/terms" target="_blank" className="underline" style={{ color: 'var(--text-secondary)' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" className="underline" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
