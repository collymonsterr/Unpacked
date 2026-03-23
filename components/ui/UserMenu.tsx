'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/hooks/useUser'
import { useAdminMode } from '@/hooks/useAdminMode'
import { createBrowserSupabase } from '@/lib/supabase'
import Link from 'next/link'

export default function UserMenu() {
  const { user, loading } = useUser()
  const isAdmin = useAdminMode()
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
            <MenuLink href="/dashboard" onClick={() => setMenuOpen(false)} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }>
              My Articles
            </MenuLink>
            <MenuLink href="/dashboard" onClick={() => setMenuOpen(false)} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            }>
              Saved Articles
            </MenuLink>
            <MenuLink href="/recent" onClick={() => setMenuOpen(false)} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }>
              Recent Articles
            </MenuLink>
            <MenuLink href="/settings/profile" onClick={() => setMenuOpen(false)} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            }>
              Settings
            </MenuLink>

            {/* Admin-only links */}
            {isAdmin && (
              <MenuLink href="/admin" onClick={() => setMenuOpen(false)} icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              } accent>
                Admin Dashboard
              </MenuLink>
            )}

            <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />

            <button
              onClick={handleSignOut}
              className="w-full text-left text-sm px-3 py-2.5 transition-colors flex items-center gap-2.5"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-light)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MenuLink({
  href,
  onClick,
  icon,
  accent,
  children,
}: {
  href: string
  onClick: () => void
  icon: React.ReactNode
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 w-full text-left text-sm px-3 py-2.5 transition-colors no-underline"
      style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--accent-light)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <span style={{ color: accent ? 'var(--accent)' : 'var(--text-secondary)', flexShrink: 0 }}>
        {icon}
      </span>
      {children}
    </Link>
  )
}
