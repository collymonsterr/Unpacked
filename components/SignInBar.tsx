'use client'

import { useState, useCallback } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'

export default function SignInBar() {
  const [signingIn, setSigningIn] = useState(false)

  const handleSignIn = useCallback(() => {
    setSigningIn(true)
    const supabase = createBrowserSupabase()
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
        queryParams: { prompt: 'select_account' },
      },
    }).then(({ error }) => {
      if (error) {
        console.error('[sign-in-bar] OAuth error:', error.message)
        setSigningIn(false)
      }
    })
  }, [])

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}
    >
      <div className="max-w-[900px] mx-auto flex items-center justify-between gap-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Sign in to generate your full article
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 whitespace-nowrap"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-sora)' }}
        >
          {signingIn ? (
            <>
              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>
        <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-secondary)', opacity: 0.5, lineHeight: 1.4 }}>
          By signing in, you agree to our{' '}
          <a href="/terms" target="_blank" className="underline" style={{ color: 'var(--text-secondary)' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" className="underline" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
