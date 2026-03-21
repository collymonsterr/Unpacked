'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/hooks/useUser'
import { createBrowserSupabase } from '@/lib/supabase'
import Link from 'next/link'

export default function UserMenu() {
  const { user, loading } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const claimedRef = useRef(false)

  // Claim anonymous articles on sign-in
  useEffect(() => {
    if (!user || claimedRef.current) return
    claimedRef.current = true

    try {
      const owned = JSON.parse(localStorage.getItem('owned_articles') ?? '[]')
      if (owned.length > 0) {
        fetch('/api/articles/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_ids: owned }),
        })
          .then((res) => {
            if (res.ok) {
              localStorage.removeItem('owned_articles')
            }
          })
          .catch(() => {})
      }
    } catch {
      // ignore
    }
  }, [user])

  async function handleSignIn() {
    setSigningIn(true)
    try {
      const supabase = createBrowserSupabase()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
        },
      })
    } catch {
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    setMenuOpen(false)
    window.location.reload()
  }

  // Don't show anything while loading to avoid flash
  if (loading) {
    return <div className="w-8 h-8" />
  }

  // Signed out — show sign-in button
  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        disabled={signingIn}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          backgroundColor: 'transparent',
          cursor: signingIn ? 'not-allowed' : 'pointer',
          opacity: signingIn ? 0.6 : 1,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {signingIn ? 'Signing in...' : 'Sign in'}
      </button>
    )
  }

  // Signed in — show avatar with dropdown
  const avatarUrl = user.user_metadata?.avatar_url
  const fullName = user.user_metadata?.full_name ?? user.email ?? 'User'
  const email = user.email ?? ''

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
        title={fullName}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName}
            className="w-8 h-8 rounded-full"
            style={{ border: '2px solid var(--border)' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
            }}
          >
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 top-11 z-50 w-56 rounded-xl overflow-hidden py-1"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
          >
            {/* User info */}
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {fullName}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {email}
              </p>
            </div>

            {/* Links */}
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-left text-sm px-3 py-2 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-light)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              My Articles
            </Link>

            <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />

            <button
              onClick={handleSignOut}
              className="w-full text-left text-sm px-3 py-2 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-light)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
