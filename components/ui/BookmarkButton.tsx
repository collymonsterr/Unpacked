'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'

interface Props {
  articleId: string
  user: User | null
  onSignInNeeded?: () => void
}

export default function BookmarkButton({ articleId, user, onSignInNeeded }: Props) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check if article is saved on mount
  useEffect(() => {
    if (!user) return
    fetch('/api/saved-articles')
      .then(res => res.json())
      .then((ids: string[]) => {
        if (ids.includes(articleId)) setSaved(true)
      })
      .catch(() => {})
  }, [user, articleId])

  const toggle = useCallback(async () => {
    if (!user) {
      onSignInNeeded?.()
      return
    }
    if (loading) return
    setLoading(true)
    const prev = saved
    setSaved(!prev)

    try {
      const res = await fetch('/api/saved-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      })
      const data = await res.json()
      setSaved(data.saved)
    } catch {
      setSaved(prev)
    } finally {
      setLoading(false)
    }
  }, [user, articleId, saved, loading, onSignInNeeded])

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-1 text-sm transition-opacity hover:opacity-70 disabled:opacity-50"
      style={{ color: saved ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      title={saved ? 'Remove bookmark' : 'Save for later'}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  )
}
