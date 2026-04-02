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
  twitter_url: string
  linkedin_url: string
  medium_url: string
  location: string
  currency: string
  language: string
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
  const [twitterUrl, setTwitterUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [mediumUrl, setMediumUrl] = useState('')
  const [location, setLocation] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [language, setLanguage] = useState('en')

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
        setTwitterUrl(data.twitter_url || '')
        setLinkedinUrl(data.linkedin_url || '')
        setMediumUrl(data.medium_url || '')
        setLocation(data.location || '')
        setCurrency(data.currency || 'USD')
        setLanguage(data.language || 'en')
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
        body: JSON.stringify({ display_name: displayName, bio, website, twitter_url: twitterUrl, linkedin_url: linkedinUrl, medium_url: mediumUrl, location, currency, language }),
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
        <div className="mb-5">
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

        {/* X / Twitter */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            X / Twitter URL
          </label>
          <input
            type="url"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder="https://x.com/yourusername"
          />
        </div>

        {/* LinkedIn */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            LinkedIn URL
          </label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder="https://linkedin.com/in/yourusername"
          />
        </div>

        {/* Medium */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Medium URL
          </label>
          <input
            type="url"
            value={mediumUrl}
            onChange={(e) => setMediumUrl(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder="https://medium.com/@yourusername"
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Not set — articles use global defaults</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AE">United Arab Emirates</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="SG">Singapore</option>
              <option value="IE">Ireland</option>
              <option value="IN">India</option>
              <option value="NZ">New Zealand</option>
              <option value="NL">Netherlands</option>
              <option value="SE">Sweden</option>
              <option value="JP">Japan</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Affects product availability and regional recommendations.
            </p>
          </div>

          {/* Currency */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="AED">AED (د.إ)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="INR">INR (₹)</option>
              <option value="NZD">NZD (NZ$)</option>
              <option value="SEK">SEK (kr)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Prices in your articles will be shown in this currency.
            </p>
          </div>

          {/* Language */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ar">Arabic</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese (Simplified)</option>
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Articles will be written in this language.
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
