'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import { useUser } from '@/hooks/useUser'

interface ProfileData {
  id: string
  email: string
  full_name: string
  avatar_url: string
  display_name: string
  bio: string
  website: string
}

export default function ProfileSettingsPage() {
  const { user, loading: authLoading } = useUser()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
    if (!user) return

    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        setProfile(data)
        setDisplayName(data.display_name || data.full_name || '')
        setBio(data.bio || '')
        setWebsite(data.website || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, authLoading, router])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, bio, website }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
          <Logo size="md" />
        </nav>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <UserMenu />
      </nav>

      <div className="max-w-lg mx-auto px-4 py-10">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: 'var(--font-sora)', color: 'var(--text-primary)' }}
        >
          Account Settings
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Manage your profile and article preferences.
        </p>

        {/* Section header: Profile */}
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--accent)' }}
        >
          Profile
        </p>
        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
          How you appear on your articles and creator profile.
        </p>

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-16 h-16 rounded-full"
              style={{ border: '3px solid var(--border)' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Profile photo
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Synced from your Google account
            </p>
          </div>
        </div>

        {/* Display Name */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder="How your name appears on articles"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            This replaces your Google name on articles and your public profile.
          </p>
        </div>

        {/* Bio */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder="A short bio about you (optional)"
          />
          <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-secondary)' }}>
            {bio.length}/160
          </p>
        </div>

        {/* Website */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder="https://yourwebsite.com (optional)"
          />
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {saved && (
            <span className="text-sm font-medium" style={{ color: '#16a34a' }}>
              ✓ Saved
            </span>
          )}
        </div>

        {/* ─── Preferences Section ─── */}
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--accent)' }}
          >
            Article Preferences
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
            These settings personalise your articles — prices, products, and recommendations will reflect your location and currency.
          </p>

          {/* Location */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Location
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
              disabled
            >
              <option>Not set — articles use global defaults</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>United Arab Emirates</option>
              <option>Australia</option>
              <option>Canada</option>
              <option>Germany</option>
              <option>France</option>
              <option>Singapore</option>
              <option>Ireland</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Affects product availability and regional recommendations. Coming soon.
            </p>
          </div>

          {/* Currency */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Currency
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
              disabled
            >
              <option>USD ($) — default</option>
              <option>GBP (£)</option>
              <option>EUR (€)</option>
              <option>AED (د.إ)</option>
              <option>AUD (A$)</option>
              <option>CAD (C$)</option>
              <option>SGD (S$)</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              All prices in your articles will be shown in this currency. Coming soon.
            </p>
          </div>

          {/* Language */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Language
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
              disabled
            >
              <option>English — default</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              More languages coming soon.
            </p>
          </div>
        </div>

        {/* Public profile link */}
        {profile && (
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <a
              href={`/creator/${profile.id}`}
              className="text-sm font-medium no-underline"
              style={{ color: 'var(--accent)' }}
            >
              View your public profile →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
