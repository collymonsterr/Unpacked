'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ArticleRow } from '@/types/article'
import ArticleSkeleton from '@/components/ArticleSkeleton'
import ArticleView from '@/components/ArticleView'
import Logo from '@/components/ui/Logo'
import { useAdminMode } from '@/hooks/useAdminMode'

interface Props {
  initialRow: ArticleRow
}

export default function ArticlePageClient({ initialRow }: Props) {
  const [row, setRow] = useState(initialRow)
  const [wasGenerating, setWasGenerating] = useState(
    initialRow.status === 'generating' || initialRow.status === 'planning'
  )
  const isOwner = useAdminMode()

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

  useEffect(() => {
    if (row.status === 'complete' || row.status === 'error') return

    const interval = setInterval(poll, 2500)
    return () => clearInterval(interval)
  }, [row.status, poll])

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Logo size="sm" />
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
      ) : row.status === 'complete' && row.article ? (
        <ArticleView articleRow={row} isOwner={isOwner} isNew={wasGenerating} />
      ) : row.plan ? (
        <ArticleSkeleton plan={row.plan} />
      ) : (
        <div className="max-w-[900px] mx-auto px-4 py-20 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>Preparing your article…</p>
        </div>
      )}
    </div>
  )
}
