'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ArticleRow } from '@/types/article'
import ArticleSkeleton from '@/components/ArticleSkeleton'
import ArticleView from '@/components/ArticleView'
import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import FactCheckBar from '@/components/ui/FactCheckBar'
import { useAdminMode } from '@/hooks/useAdminMode'
import { useUser } from '@/hooks/useUser'

interface Props {
  initialRow: ArticleRow
}

export default function ArticlePageClient({ initialRow }: Props) {
  const [row, setRow] = useState(initialRow)
  const [wasGenerating, setWasGenerating] = useState(
    initialRow.status === 'generating' || initialRow.status === 'planning'
  )
  const isAdmin = useAdminMode()
  const { user } = useUser()
  const isOwner = isAdmin || (user != null && row.user_id === user.id)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${initialRow.id}`)
      if (!res.ok) return
      const updated: ArticleRow = await res.json()
      setRow(updated)
    } catch {
      // ignore transient fetch errors
    }
  }, [initialRow.id])

  // Poll while generating OR while waiting for fact-check (complete → verified)
  useEffect(() => {
    if (row.status === 'verified' || row.status === 'error') return
    // Don't poll for old articles that are already 'complete' and weren't just generated
    if (row.status === 'complete' && !wasGenerating) return

    const interval = setInterval(poll, 2500)
    return () => clearInterval(interval)
  }, [row.status, wasGenerating, poll])

  // Detect the transition to 'complete' (article ready, fact-check starting)
  useEffect(() => {
    if (row.status === 'complete' && wasGenerating) {
      // Article just finished generating — fact-check is now running in background
      // Keep polling to detect verified status
    }
  }, [row.status, wasGenerating])

  // Determine fact-check status for the UI
  const factCheckStatus: 'none' | 'checking' | 'verified' = (() => {
    if (row.status === 'verified') return 'verified'
    if (row.status === 'complete' && wasGenerating && !row.fact_check) return 'checking'
    return 'none'
  })()

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav — sticky so the logo is always accessible */}
      <nav
        className="px-6 py-4 flex items-center gap-3 sticky top-0 z-50"
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Logo size="sm" />
        <div className="ml-auto">
          <UserMenu />
        </div>
      </nav>

      {/* Content */}
      {row.status === 'error' ? (
        <div className="max-w-[900px] mx-auto px-4 py-20 text-center">
          <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-sora)' }}>
            Something went wrong
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            We couldn&apos;t generate this article. Please go back and try again.
          </p>
        </div>
      ) : (row.status === 'complete' || row.status === 'verified') && row.article ? (
        <ArticleView
          articleRow={row}
          isOwner={isOwner}
          isNew={wasGenerating}
          factCheckStatus={factCheckStatus}
        />
      ) : row.plan ? (
        <ArticleSkeleton plan={row.plan} />
      ) : (
        <div className="max-w-[900px] mx-auto px-4 py-20 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>Preparing your article…</p>
        </div>
      )}

      {/* Fixed bottom fact-check bar */}
      {factCheckStatus !== 'none' && (
        <FactCheckBar
          status={factCheckStatus}
          factCheck={row.fact_check}
        />
      )}
    </div>
  )
}
